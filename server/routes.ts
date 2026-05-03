import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Prep-descriptor words that should be stripped from ingredient names into notes
const PREP_WORDS_RE = /,?\s*(thinly|finely|roughly|coarsely|lightly|freshly|evenly|well[\s-]|into\b|cut\b|about\b|sliced|chopped|diced|minced|grated|shredded|peeled|seeded|trimmed|halved|quartered|torn|crushed|pressed|julienned|cubed|crumbled|softened|melted|beaten|whisked|thawed|cooked|roasted|toasted|drained|rinsed|patted dry|pitted|deveined|butterflied|deboned|zested|squeezed|stemmed|cored|flaked|pur[ée]ed|mashed|blanched|divided|at room temp\w*|room temp\w*|to taste|as needed|if needed|optional|such as\b|plus more\b|more for\b|for serving\b|for garnish\b|for topping\b|for dipping\b)[^,]*/gi;

function stripPrepIntoNotes(name: string): { cleanName: string; prepNotes: string | null } {
  const preps: string[] = [];
  // Capture anything inside parens as prep notes
  const noParens = name.replace(/\s*\(([^)]*)\)?/g, (_, inner) => {
    if (inner.trim()) preps.push(inner.trim());
    return "";
  }).replace(/\s*\)/g, "").trim();
  // Capture comma-separated prep segments
  const parts = noParens.split(",");
  const kept: string[] = [];
  parts.forEach((part, idx) => {
    if (idx === 0) { kept.push(part); return; }
    if (PREP_WORDS_RE.test(part.trim())) {
      preps.push(part.trim());
    } else {
      kept.push(part);
    }
    PREP_WORDS_RE.lastIndex = 0;
  });
  const cleanName = kept.join(",").trim().replace(/,\s*$/, "").trim();
  const prepNotes = preps.length > 0 ? preps.join(", ") : null;
  return { cleanName, prepNotes };
}

function parseIngredientStrings(strings: string[]) {
  return strings.map((s) => {
    const match = s.match(/^([\d./\s]+)?\s*([a-zA-Z]+)?\s+(.+)$/);
    if (match) {
      const qtyStr = match[1]?.trim();
      let qty: number | undefined;
      if (qtyStr) {
        if (qtyStr.includes("/")) {
          const [n, d] = qtyStr.split("/").map(Number);
          qty = n / d;
        } else {
          qty = parseFloat(qtyStr);
        }
      }
      const rawName = match[3]?.trim() ?? s;
      const { cleanName, prepNotes } = stripPrepIntoNotes(rawName);
      return {
        ingredientName: cleanName,
        quantity: qty ?? null,
        unit: match[2]?.trim() ?? null,
        notes: prepNotes,
      };
    }
    const { cleanName, prepNotes } = stripPrepIntoNotes(s);
    return { ingredientName: cleanName, quantity: null, unit: null, notes: prepNotes };
  });
}

// ── SHARED RECIPE PARSER ────────────────────────────────────────────────────

async function parseRecipeWithOpenAI(content: string, hint = "recipe text"): Promise<{
  title: string; description?: string; prepTime?: number; cookTime?: number;
  servings?: number; category?: string; tags?: string[]; instructions?: string[];
  calories?: number | null; protein?: number | null; carbs?: number | null; fats?: number | null;
  ingredients?: Array<{ ingredientName: string; quantity?: number | null; unit?: string | null; notes?: string | null }>;
}> {
  const prompt = `Extract the full recipe from this ${hint} and return structured JSON.
Return ONLY valid JSON with this exact shape (no markdown, no explanation):
{
  "title": string,
  "description": string | null,
  "prepTime": number | null,       // minutes
  "cookTime": number | null,       // minutes — if not listed but prepTime and totalTime are, compute cookTime = totalTime - prepTime
  "servings": number | null,
  "category": string,              // e.g. Breakfast, Desserts, Main Courses, Salads, Sides, Snacks
  "tags": string[],
  "calories": number | null,       // kcal per serving
  "protein": number | null,        // grams per serving
  "carbs": number | null,          // grams per serving
  "fats": number | null,           // grams per serving
  "instructions": string[],
  "ingredients": [
    { "ingredientName": string, "quantity": number | null, "unit": string | null, "notes": string | null }
  ]
}

${hint === "recipe text" ? "Content:" : ""}
${content.slice(0, 12000)}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });
  return JSON.parse(response.choices[0].message.content ?? "{}");
}

function schemaOrgToRecipe(schema: Record<string, unknown>) {
  const toMins = (v: unknown): number | null => {
    if (!v) return null;
    const s = String(v);
    const match = s.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (match) return (parseInt(match[1] ?? "0") * 60) + parseInt(match[2] ?? "0");
    const n = parseInt(s);
    return isNaN(n) ? null : n;
  };
  const toStringArray = (v: unknown): string[] => {
    if (!v) return [];
    // Recursively extracts text from HowToStep, HowToSection, or plain strings.
    // Schema.org recipeInstructions can be:
    //   - string[]
    //   - HowToStep[]  { "@type": "HowToStep", "text": "..." }
    //   - HowToSection[] { "@type": "HowToSection", "itemListElement": [HowToStep, ...] }
    //   - mixed nesting of the above
    const extractText = (x: unknown): string[] => {
      if (typeof x === "string") return x ? [x] : [];
      if (typeof x === "object" && x !== null) {
        const obj = x as Record<string, unknown>;
        // HowToSection — recurse into itemListElement
        if (Array.isArray(obj.itemListElement)) {
          return (obj.itemListElement as unknown[]).flatMap(extractText);
        }
        // HowToStep — use text, falling back to name
        const text = obj.text ?? obj.name;
        if (text) return [String(text)];
      }
      return [];
    };
    if (Array.isArray(v)) return v.flatMap(extractText).filter(Boolean);
    return extractText(v).filter(Boolean);
  };
  const rawIngs: string[] = Array.isArray(schema.recipeIngredient)
    ? (schema.recipeIngredient as string[])
    : [];
  // Convert unicode fractions and mixed numbers to decimals before regex parsing
  const normalizeFractions = (s: string): string => {
    // Unicode fractions
    s = s.replace(/[¼½¾⅓⅔⅛⅜⅝⅞]/g, (c) => ({
      "¼": "0.25", "½": "0.5", "¾": "0.75", "⅓": "0.333", "⅔": "0.667",
      "⅛": "0.125", "⅜": "0.375", "⅝": "0.625", "⅞": "0.875",
    }[c] ?? c));
    // Mixed numbers: "1 1/2" → "1.5"
    s = s.replace(/\b(\d+)\s+(\d+)\/(\d+)\b/g, (_, w, n, d) => {
      const dv = parseInt(d);
      return dv !== 0 ? String(parseFloat(w) + parseInt(n) / dv) : _;
    });
    // Simple fractions: "1/2" → "0.5"
    s = s.replace(/\b(\d+)\/(\d+)\b/g, (_, n, d) => {
      const dv = parseInt(d);
      return dv !== 0 ? String(parseInt(n) / dv) : _;
    });
    return s;
  };

  const ingredients = rawIngs.map((s) => {
    const norm = normalizeFractions(s);
    // Unit regex allows trailing period: c., tbsp., tsp., oz., lb., pkg., etc.
    const m = norm.match(/^([\d.\s]+)?\s*([a-zA-Z]+\.?)?\s+(.+)$/);
    if (m) {
      const qty = m[1] ? (parseFloat(m[1]) || null) : null;
      return {
        ingredientName: m[3]?.trim() ?? s,
        quantity: qty,
        unit: m[2]?.trim() ?? null,
        notes: null,
      };
    }
    return { ingredientName: s, quantity: null, unit: null, notes: null };
  });

  const servings = (() => {
    const v = schema.recipeYield;
    if (!v) return null;
    const n = parseInt(Array.isArray(v) ? String(v[0]) : String(v));
    return isNaN(n) ? null : n;
  })();

  // Derive cookTime = totalTime - prepTime when cookTime is absent or zero (e.g. PT0S)
  const prepTime = toMins(schema.prepTime);
  const rawCookTime = toMins(schema.cookTime);
  const cookTime = (rawCookTime == null || rawCookTime === 0) ? (() => {
    const total = toMins(schema.totalTime);
    if (total != null && prepTime != null && total > prepTime) return total - prepTime;
    return total ?? null;
  })() : rawCookTime;

  // Extract image URL — string, string[], ImageObject, or ImageObject[]
  const extractImageUrl = (img: unknown): string | null => {
    if (!img) return null;
    if (typeof img === "string") return img;
    if (Array.isArray(img)) {
      for (const item of img) { const found = extractImageUrl(item); if (found) return found; }
      return null;
    }
    if (typeof img === "object" && img !== null) return (img as any).url ?? (img as any).contentUrl ?? null;
    return null;
  };

  // Extract nutrition — Schema.org NutritionInformation stores values as strings like "285 calories"
  const parseNutritionNum = (v: unknown): number | null => {
    if (!v) return null;
    const n = parseFloat(String(v).replace(/[^\d.]/g, ""));
    return isNaN(n) ? null : n;
  };
  const nutr = schema.nutrition as Record<string, unknown> | null | undefined;

  return {
    title: String(schema.name ?? "Untitled Recipe"),
    description: schema.description ? String(schema.description) : null,
    imageUrl: extractImageUrl(schema.image),
    prepTime,
    cookTime,
    servings: servings ?? 4,
    category: String((schema.recipeCategory as string) ?? "Uncategorized"),
    tags: (() => {
      // keywords can be a string "a,b,c" or an array ["a,b,c"] or ["a","b","c"]
      const raw: string[] = Array.isArray(schema.keywords)
        ? (schema.keywords as string[]).flatMap(k => String(k).split(",").map(s => s.trim()))
        : schema.keywords ? String(schema.keywords).split(",").map(s => s.trim()) : [];
      const PREDEFINED_LOWER = ["breakfast","lunch","dinner","snack","soup","appetizer","dessert","pastry","party"];
      const PREDEFINED_TITLE = ["Breakfast","Lunch","Dinner","Snack","Soup","Appetizer","Dessert","Pastry","Party"];
      return raw
        .map(t => t.trim())
        .map(t => { const i = PREDEFINED_LOWER.indexOf(t.toLowerCase()); return i !== -1 ? PREDEFINED_TITLE[i] : null; })
        .filter((t): t is string => t !== null);
    })(),
    instructions: toStringArray(schema.recipeInstructions),
    calories: parseNutritionNum(nutr?.calories),
    protein: parseNutritionNum(nutr?.proteinContent),
    carbs: parseNutritionNum(nutr?.carbohydrateContent),
    fats: parseNutritionNum(nutr?.fatContent),
    ingredients,
  };
}

// Helper: wraps async Express handlers so thrown errors reach next()
function wrap(fn: (req: any, res: any) => Promise<void>) {
  return (req: any, res: any, next: any) => fn(req, res).catch(next);
}

export async function registerRoutes(app: Express): Promise<Server> {
  // ── IMPORT ───────────────────────────────────────────────────────────────────

  app.post("/api/import/url", wrap(async (req, res) => {
    const { url } = (req.body ?? {}) as { url?: string };
    if (!url) { res.status(400).json({ error: "url required" }); return; }

    // Fetch the page
    let html: string;
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok && response.status !== 402) {
        res.status(502).json({ error: `Could not fetch page: HTTP ${response.status}` }); return;
      }
      html = await response.text();
    } catch (err) {
      console.error("URL fetch error:", err);
      res.status(502).json({ error: `Could not reach URL: ${String(err)}` }); return;
    }

    // Check for duplicate by URL first
    const existingByUrl = await storage.findDuplicateRecipe(url);
    if (existingByUrl) {
      res.status(409).json({ duplicate: true, recipe: existingByUrl }); return;
    }

    // Try Schema.org JSON-LD first
    const jsonLdRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    for (const match of html.matchAll(jsonLdRe)) {
      try {
        let data = JSON.parse(match[1]);
        if (Array.isArray(data)) data = data.find((d: any) => d["@type"] === "Recipe") ?? null;
        if (data?.["@graph"]) data = (data["@graph"] as any[]).find((d: any) => d["@type"] === "Recipe") ?? null;
        if (data?.["@type"] === "Recipe") {
          const parsed = schemaOrgToRecipe(data);
          const dupByTitle = await storage.findDuplicateRecipe(null, parsed.title);
          if (dupByTitle) { res.status(409).json({ duplicate: true, recipe: dupByTitle }); return; }
          const recipe = await storage.createRecipe({ ...parsed, sourceUrl: url }, parsed.ingredients);
          res.status(201).json(recipe); return;
        }
      } catch { /* try next block */ }
    }

    // Grab og:image / twitter:image before stripping tags
    const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
      ?? html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
    const ogImage = ogImageMatch?.[1] ?? null;

    // Fallback: strip HTML and ask OpenAI
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();

    const parsed = await parseRecipeWithOpenAI(text, "webpage text");
    const dupByTitle = await storage.findDuplicateRecipe(null, parsed.title);
    if (dupByTitle) { res.status(409).json({ duplicate: true, recipe: dupByTitle }); return; }
    const recipe = await storage.createRecipe({ ...parsed, sourceUrl: url, imageUrl: parsed.imageUrl ?? ogImage }, parsed.ingredients ?? []);
    res.status(201).json(recipe);
  }));

  app.post("/api/import/json", wrap(async (req, res) => {
    const { json } = (req.body ?? {}) as { json?: string };
    if (!json) { res.status(400).json({ error: "json required" }); return; }
    let data: any;
    try { data = JSON.parse(json); } catch {
      res.status(400).json({ error: "Invalid JSON" }); return;
    }
    if (Array.isArray(data)) data = data.find((d: any) => d["@type"] === "Recipe") ?? data[0];
    if (data?.["@graph"]) data = (data["@graph"] as any[]).find((d: any) => d["@type"] === "Recipe") ?? data;
    const parsed = data?.["@type"] === "Recipe"
      ? schemaOrgToRecipe(data)
      : await parseRecipeWithOpenAI(json, "JSON data");
    const recipe = await storage.createRecipe(parsed, parsed.ingredients ?? []);
    res.status(201).json(recipe);
  }));

  app.post("/api/import/ocr", wrap(async (req, res) => {
    const { imageBase64 } = (req.body ?? {}) as { imageBase64?: string };
    if (!imageBase64) { res.status(400).json({ error: "imageBase64 required" }); return; }
    const dataUrl = imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`;
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: `Extract the complete recipe from this image. Return ONLY valid JSON:
{ "title": string, "description": string|null, "prepTime": number|null, "cookTime": number|null, "servings": number|null, "category": string, "tags": string[], "instructions": string[], "ingredients": [{"ingredientName":string,"quantity":number|null,"unit":string|null,"notes":string|null}] }`,
          },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      }],
      response_format: { type: "json_object" },
    });
    const parsed = JSON.parse(response.choices[0].message.content ?? "{}");
    const recipe = await storage.createRecipe(parsed, parsed.ingredients ?? []);
    res.status(201).json(recipe);
  }));

  // ── RECIPES ─────────────────────────────────────────────────────────────────

  app.get("/api/recipes", async (_req, res) => {
    const recipes = await storage.getRecipes();
    res.json(recipes);
  });

  app.get("/api/recipes/search", async (req, res) => {
    const q = (req.query.q as string) ?? "";
    const results = await storage.searchRecipes(q);
    res.json(results);
  });

  app.get("/api/recipes/:id", async (req, res) => {
    const recipe = await storage.getRecipeById(req.params.id);
    if (!recipe) return res.status(404).json({ error: "Recipe not found" });
    res.json(recipe);
  });

  app.post("/api/recipes", async (req, res) => {
    try {
      const { ingredients: rawIngredients, recipeIngredients, ...rest } = req.body;
      let ingredients = recipeIngredients;
      if (!ingredients && rawIngredients && Array.isArray(rawIngredients)) {
        ingredients = parseIngredientStrings(rawIngredients as string[]);
      }
      const recipe = await storage.createRecipe(rest, ingredients ?? []);
      res.status(201).json(recipe);
    } catch (err) {
      res.status(400).json({ error: String(err) });
    }
  });

  app.put("/api/recipes/:id", async (req, res) => {
    try {
      const { ingredients: rawIngredients, recipeIngredients, ...rest } = req.body;
      let ingredients = recipeIngredients;
      if (!ingredients && rawIngredients && Array.isArray(rawIngredients)) {
        ingredients = parseIngredientStrings(rawIngredients as string[]);
      }
      const recipe = await storage.updateRecipe(req.params.id, rest, ingredients);
      if (!recipe) return res.status(404).json({ error: "Recipe not found" });
      res.json(recipe);
    } catch (err) {
      res.status(400).json({ error: String(err) });
    }
  });

  app.delete("/api/recipes/:id", async (req, res) => {
    await storage.deleteRecipe(req.params.id);
    res.status(204).send();
  });

  // ── MEAL PLANS ───────────────────────────────────────────────────────────────

  app.get("/api/meal-plans", async (_req, res) => {
    const plans = await storage.getMealPlans();
    res.json(plans);
  });

  app.get("/api/meal-plans/week/:weekStart", async (req, res) => {
    const plan = await storage.getMealPlanByWeek(req.params.weekStart);
    if (!plan) return res.status(404).json({ error: "No plan for this week" });
    res.json(plan);
  });

  app.get("/api/meal-plans/:id", async (req, res) => {
    const plan = await storage.getMealPlanById(req.params.id);
    if (!plan) return res.status(404).json({ error: "Meal plan not found" });
    res.json(plan);
  });

  app.post("/api/meal-plans", async (req, res) => {
    try {
      const schema = z.object({ weekStart: z.string() });
      const data = schema.parse(req.body);
      const plan = await storage.createMealPlan(data);
      res.status(201).json(plan);
    } catch (err) {
      res.status(400).json({ error: String(err) });
    }
  });

  app.post("/api/meal-plans/:id/entries", async (req, res) => {
    try {
      const schema = z.object({
        dayOfWeek: z.number().int().min(0).max(6),
        mealSlot: z.enum(["breakfast", "lunch", "dinner", "snack"]),
        recipeId: z.string().nullable().optional(),
        customMeal: z.string().nullable().optional(),
        servingsOverride: z.number().int().nullable().optional(),
      });
      const raw = schema.parse(req.body);
      const data = {
        ...raw,
        recipeId: raw.recipeId ?? undefined,
        customMeal: raw.customMeal ?? undefined,
        servingsOverride: raw.servingsOverride ?? undefined,
      };
      const entry = await storage.addMealPlanEntry(req.params.id, data);
      res.status(201).json(entry);
    } catch (err) {
      res.status(400).json({ error: String(err) });
    }
  });

  app.put("/api/meal-plans/:id/entries/:entryId", async (req, res) => {
    try {
      const entry = await storage.updateMealPlanEntry(req.params.id, req.params.entryId, req.body);
      if (!entry) return res.status(404).json({ error: "Entry not found" });
      res.json(entry);
    } catch (err) {
      res.status(400).json({ error: String(err) });
    }
  });

  app.delete("/api/meal-plans/:id/entries/:entryId", async (req, res) => {
    await storage.deleteMealPlanEntry(req.params.id, req.params.entryId);
    res.status(204).send();
  });

  // ── SHOPPING LISTS ───────────────────────────────────────────────────────────

  app.get("/api/shopping-lists", async (_req, res) => {
    const lists = await storage.getShoppingLists();
    res.json(lists);
  });

  app.get("/api/shopping-lists/master", async (_req, res) => {
    const list = await storage.getOrCreateMasterList();
    res.json(list);
  });

  app.get("/api/shopping-lists/:id", async (req, res) => {
    const list = await storage.getShoppingListById(req.params.id);
    if (!list) return res.status(404).json({ error: "Shopping list not found" });
    res.json(list);
  });

  app.post("/api/shopping-lists", async (req, res) => {
    try {
      const list = await storage.createShoppingList(req.body);
      res.status(201).json(list);
    } catch (err) {
      res.status(400).json({ error: String(err) });
    }
  });

  // Strip prep notes from ingredient names for shopping lists.
  // Keeps meaningful qualifiers (skinless, low-sodium, boneless) but removes
  // cooking instructions (chopped, drained, cut into thirds, for serving, etc.)
  function cleanIngredientName(name: string): string {
    // Remove any content inside parentheses (always prep notes), including unclosed parens
    let result = name.replace(/\s*\([^)]*\)?/g, "").trim();
    // Remove any orphaned closing parens left over (e.g. "soy sauce)")
    result = result.replace(/\s*\)/g, "").trim();
    // Remove "for serving/garnish/topping/etc." and everything after
    result = result.replace(/,?\s*for\s+(serving|garnish|topping|dipping|decoration|drizzling|coating)\b.*/i, "");
    // Split on commas; drop any segment (after the first) that starts with a prep word
    const PREP_START = /^\s*(thinly|finely|roughly|coarsely|lightly|freshly|evenly|well\s|into\b|cut\b|about\b|sliced|chopped|diced|minced|grated|shredded|peeled|seeded|trimmed|halved|quartered|torn|crushed|pressed|julienned|cubed|crumbled|softened|melted|beaten|whisked|dried|thawed|cooked|roasted|toasted|drained|rinsed|patted|pitted|deveined|butterflied|deboned|zested|squeezed|stemmed|cored|flaked|pur[ée]ed|mashed|blanched|divided|at\s+room|room\s+temp|to\s+taste|as\s+needed|if\s+needed|optional|such\b|plus\b|more\b)/i;
    const parts = result.split(",");
    const kept = parts.filter((part, idx) => idx === 0 || !PREP_START.test(part));
    return kept.join(",").trim().replace(/,\s*$/, "").trim();
  }

  // ── Server-side ingredient parsing + consolidation ──────────────────────────

  const UNIT_NORMALIZE_MAP: Record<string, string> = {
    tsp: "teaspoon", tsps: "teaspoon", teaspoons: "teaspoon",
    tbsp: "tablespoon", tbsps: "tablespoon", tablespoons: "tablespoon",
    c: "cup", cups: "cup",
    oz: "ounce", ounces: "ounce",
    lb: "pound", lbs: "pound", pounds: "pound",
    g: "gram", grams: "gram",
    clove: "cloves",
    sprig: "sprigs", spring: "sprigs", springs: "sprigs",
    bunch: "bunches", head: "heads", stalk: "stalks",
  };

  // Match any unit word at the CURRENT start of the string (after qty + prep stripping)
  const UNIT_WORD_RE = /^(cups?|tablespoons?|tbsps?|teaspoons?|tsps?|ounces?|oz|pounds?|lbs?|grams?|kg|cloves?|cans?|slices?|pieces?|springs?|sprigs?|bunches?|heads?|stalks?|boxes?|ribs?|eggs?|sheets?)\b/i;

  const PREP_WORD_RE = /\b(finely|roughly|thinly|coarsely|freshly|lightly|evenly|reconstituted|minced|chopped|diced|sliced|grated|shredded|peeled|seeded|trimmed|halved|quartered|torn|crushed|pressed|beaten|whisked|thawed|roasted|toasted|drained|rinsed|pitted|zested|stemmed|cored|mashed|blanched|divided|small[ -]diced|medium[ -]diced|large[ -]diced)\b\s*/gi;
  // Trailing phrases to strip from clean names (e.g. "chicken broken down into parts" → "chicken")
  const TRAILING_PHRASE_RE = /\s+(broken\s+down[^,]*|cut\s+into[^,]*|such\s+as[^,]*|or\s+more[^,]*)$/i;

  function normalUnit(raw: string | null): string | null {
    if (!raw) return null;
    const key = raw.toLowerCase().trim().replace(/s$/, ""); // singularize for lookup
    const singular = UNIT_NORMALIZE_MAP[key] ?? UNIT_NORMALIZE_MAP[raw.toLowerCase().trim()];
    if (singular) return singular;
    // Return pluralized canonical form for count units
    const u = raw.toLowerCase().trim();
    if (/^eggs?$/.test(u)) return null; // "eggs" is the ingredient, not a unit
    return u;
  }

  // Strip nested parenthetical content iteratively until none remain
  function stripParens(s: string): string {
    let result = s;
    let prev = "";
    while (prev !== result) {
      prev = result;
      result = result.replace(/\([^()]*\)/g, " ");
    }
    // Also strip unclosed opening parens and everything after them
    result = result.replace(/\([^)]*$/, "");
    // Strip orphaned closing parens
    result = result.replace(/\)/g, "");
    return result.replace(/\s+/g, " ").trim();
  }

  function parseAndClean(rawLine: string): { cleanName: string; qty: number | null; unit: string | null } {
    let s = rawLine.trim();
    // 1. Strip trailing "[Recipe]" annotation tags
    s = s.replace(/\s*\[.*?\]\s*$/, "").trim();
    // 2. Strip ALL parenthetical content (footnotes, alternatives, prep notes)
    s = stripParens(s);
    // 3. Extract leading quantity (supports decimals)
    let qty: number | null = null;
    const qtyM = s.match(/^(\d+(?:\.\d+)?)\s*/);
    if (qtyM) { qty = parseFloat(qtyM[1]); s = s.slice(qtyM[0].length); }
    // 4. Strip prep/descriptor words BEFORE unit extraction
    //    This handles cases like "finely minced cloves of garlic" → "cloves of garlic"
    s = s.replace(PREP_WORD_RE, " ").replace(/\s+/g, " ").trim();
    // 5. Extract unit word (now at start after prep stripping)
    let unit: string | null = null;
    const unitM = s.match(UNIT_WORD_RE);
    if (unitM) {
      const u = normalUnit(unitM[0]);
      if (u !== null) { unit = u; s = s.slice(unitM[0].length).trim(); }
    }
    // 6. Remove "of" connector after unit ("cloves of garlic" → "garlic")
    s = s.replace(/^of\s+/i, "");
    // 7. Remove "and" at start (artifact of "peeled and diced" → "and onion")
    s = s.replace(/^and\s+/i, "");
    // 8. Remove trailing prep phrases (e.g. "broken down into parts", "cut into 1-inch pieces")
    s = s.replace(TRAILING_PHRASE_RE, "");
    // 9. Remove "to taste", "for serving", "etc.", trailing qualifiers
    s = s.replace(/,?\s*(to taste|for serving|for garnish|as needed|optional|etc\.?)\s*$/i, "");
    // 10. Remove everything after comma (prep info that survived)
    s = s.replace(/,.*$/, "");
    // 11. Final whitespace cleanup
    s = s.replace(/\s+/g, " ").trim();
    return { cleanName: s, qty, unit };
  }

  // Canonical display names for normalized keys (overrides the first-seen raw name)
  const KEY_DISPLAY_NAME: Record<string, string> = {
    "salt": "Salt",
    "black pepper": "Black pepper",
    "green onions": "Green onions",
    "garlic": "Garlic",
    "olive oil": "Olive oil",
    "eggs": "Eggs",
  };

  function ingredientKey(cleanName: string): string {
    let k = cleanName.toLowerCase().trim();
    // Normalize salt variants → single key
    if (/\bkosher salt\b|\bsea salt\b|\btable salt\b|\bsalt\b/.test(k)) return "salt";
    // Normalize pepper variants → single key
    if (/\bblack pepper\b|\bground pepper\b|\bcracked pepper\b|\bfresh[- ]ground pepper\b/.test(k)) return "black pepper";
    // Normalize scallion → green onions
    k = k.replace(/\bscallions?\b/, "green onions");
    return k;
  }

  // Shared AI consolidation helper used by both from-recipe and generate routes
  async function aiConsolidateItems(
    rawItems: Array<{ name: string; qty: number | null; unit: string | null; recipeName?: string }>,
    pantry: Awaited<ReturnType<typeof storage.getPantryItems>>,
    listId: string,
  ): Promise<InsertShoppingListItem[]> {
    if (rawItems.length === 0) return [];

    const pantryNames = new Set(pantry.map((p) => p.ingredientName.toLowerCase().trim()));

    // ── Pass 1: exact-string dedup (handles same recipe appearing N times in a plan) ──
    const exactDedupMap = new Map<string, { name: string; qty: number | null; recipes: Set<string> }>();
    for (const item of rawItems) {
      const key = item.name.toLowerCase().trim();
      if (exactDedupMap.has(key)) {
        const ex = exactDedupMap.get(key)!;
        if (ex.qty !== null && item.qty !== null) ex.qty = Math.round((ex.qty + item.qty) * 100) / 100;
        else if (item.qty !== null) ex.qty = item.qty;
        if (item.recipeName) ex.recipes.add(item.recipeName);
      } else {
        const recipes = new Set<string>();
        if (item.recipeName) recipes.add(item.recipeName);
        exactDedupMap.set(key, { name: item.name, qty: item.qty, recipes });
      }
    }

    // ── Pass 2: server-side semantic consolidation ────────────────────────────
    // Parse each line → clean name + qty + unit, then group by ingredient key
    type Consolidated = { cleanName: string; qty: number | null; unit: string | null; recipes: Set<string>; notes: string | null };
    const consolidationMap = new Map<string, Consolidated>();

    for (const item of exactDedupMap.values()) {
      // Handle compound "sea salt and fresh cracked pepper to taste" → two items
      const parts = item.name.split(/\band\b/i).map(p => p.trim()).filter(Boolean);
      const subItems = parts.length > 1 && /\b(salt|pepper|spice)\b/i.test(item.name) ? parts : [item.name];

      for (const sub of subItems) {
        const { cleanName, qty, unit } = parseAndClean(sub);
        if (!cleanName || cleanName.length < 2) continue;
        const key = ingredientKey(cleanName);
        if (!key || key.length < 2) continue;

        if (consolidationMap.has(key)) {
          const ex = consolidationMap.get(key)!;
          // Sum quantities when units match
          if (ex.qty !== null && qty !== null && ex.unit === unit) {
            ex.qty = Math.round((ex.qty + qty) * 100) / 100;
          } else if (qty !== null && ex.qty === null) {
            ex.qty = qty; ex.unit = unit;
          } else if (qty !== null && ex.unit !== unit && ex.qty !== null) {
            // Incompatible units — add note
            ex.notes = ex.notes
              ? `${ex.notes}; plus ${qty} ${unit ?? ""} from another recipe`.trim()
              : `plus ${qty} ${unit ?? ""} from another recipe`.trim();
          }
          item.recipes.forEach(r => ex.recipes.add(r));
        } else {
          // Use canonical display name if key has one, otherwise capitalize raw clean name
          const displayName = KEY_DISPLAY_NAME[key]
            ?? (cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
          consolidationMap.set(key, {
            cleanName: displayName,
            qty,
            unit,
            recipes: new Set(item.recipes),
            notes: null,
          });
        }
      }
    }

    const serverConsolidated = Array.from(consolidationMap.values());
    if (serverConsolidated.length === 0) return [];

    // ── Pass 3: Rule-based category assignment ────────────────────────────────
    // Keyword maps for deterministic, AI-free categorization
    const CATEGORY_RULES: [string, RegExp][] = [
      ["meat",      /\b(beef|chicken|pork|lamb|turkey|veal|duck|bison|steak|tenderloin|rib\s?eye|ribeye|prosciutto|bacon|sausage|chorizo|pancetta|salami|pepperoni|lardons?)\b/i],
      ["seafood",   /\b(fish|salmon|tuna|shrimp|prawn|crab|lobster|clam|mussel|oyster(?!\s+sauce)|scallop|cod|halibut|anchovy|tilapia)\b/i],
      ["dairy",     /\b(butter|cream|milk|cheese|yogurt|egg|cheddar|parmesan|mozzarella|brie|gouda|ricotta|sour cream|half[- ]and[- ]half)\b/i],
      ["bakery",    /\b(bread|puff\s+pastry|pastry\s+dough|dough|flour|baguette|croissant|roll|tortilla|pita|naan)\b/i],
      ["frozen",    /\b(frozen)\b/i],
      ["beverages", /\b(juice|soda|water|beer|wine|broth|stock|sake|mirin|shaoxing|dry\s+sherry)\b/i],
      ["spices",    /\b(salt|pepper|cumin|coriander|turmeric|paprika|cayenne|chili|cinnamon|nutmeg|allspice|gochujang|miso|soy\s+sauce|sesame\s+seeds|sesame\s+oil|ginger|bay\s+leaf|cardamom|clove|star\s+anise|oregano|thyme|rosemary|basil|parsley|sage|tarragon|dill|sumac|za.atar|harissa|cornstarch|sugar|vinegar|mustard|curry|caraway|fennel\s+seed)\b/i],
      ["produce",   /\b(onion|shallot|garlic|carrot|celery|mushroom|portabella|portobello|cremini|porcini|tomato|potato|pepper|zucchini|eggplant|spinach|kale|lettuce|cabbage|broccoli|cauliflower|leek|scallion|green\s+onion|parsley|cilantro|thyme|rosemary|basil|mint|chive|lemon|lime|orange|apple|pear|pineapple|mango|avocado|corn|pea|bean|lentil|artichoke|asparagus|cucumber|radish|beet|bok\s+choy|edamame|ginger|turmeric)\b/i],
      ["pantry",    /\b(oil|sauce|vinegar|paste|stock|broth|coconut\s+milk|canned|can|jar|bag|rice|noodle|pasta|flour|cornstarch|starch|sugar|honey|syrup|jam|salt|spice|seasoning|bouillon|bread\s+crumbs|panko|cracker|chip|nut|seed|dried|porcini|shiitake|oyster\s+sauce|fish\s+sauce|hoisin|sriracha|worcestershire|soy|tamari|mirin|sake|wine|sherry|beer|broth)\b/i],
    ];

    function categorizeIngredient(name: string): string {
      const lower = name.toLowerCase();
      // Simple plural → singular: strip trailing 's' from words ≥4 chars
      // e.g. "mushrooms"→"mushroom", "carrots"→"carrot", "eggs"→"egg"
      const singular = lower.replace(/\b([a-z]{3,})s\b/g, (_, stem) => stem);
      for (const [cat, re] of CATEGORY_RULES) {
        if (re.test(lower) || re.test(singular)) return cat;
      }
      return "other";
    }

    // ── Map to shopping list items ─────────────────────────────────────────────
    return serverConsolidated.map((item) => {
      const nameKey = item.cleanName.toLowerCase().trim();
      const inPantry = pantryNames.has(nameKey) || pantryNames.has(ingredientKey(nameKey));
      const srcList = Array.from(item.recipes);
      const noteParts: string[] = [];
      if (srcList.length > 0) noteParts.push(`for: ${srcList.join(", ")}`);
      if (item.notes) noteParts.push(item.notes);
      const combinedNotes = noteParts.length > 0 ? noteParts.join(" • ") : null;
      return {
        ingredientName: item.cleanName,
        quantity: item.qty,
        unit: item.unit ?? null,
        category: categorizeIngredient(item.cleanName),
        isChecked: inPantry,
        isManual: false,
        sourceRecipeId: null,
        notes: inPantry ? "In pantry" : combinedNotes,
        shoppingListId: listId,
      };
    });
  }

  app.post("/api/shopping-lists/from-recipe", wrap(async (req, res) => {
    const { recipeId, servings } = req.body;
    if (!recipeId) return res.status(400).json({ error: "recipeId required" });
    const recipe = await storage.getRecipeById(recipeId);
    if (!recipe) return res.status(404).json({ error: "Recipe not found" });

    const master = await storage.getOrCreateMasterList();
    const ratio = servings && recipe.servings > 0 ? servings / recipe.servings : 1;

    // Collect existing auto-items already in the list — reconstruct as full strings for the AI
    const existingRaw = master.items
      .filter((i) => !i.isManual)
      .map((i) => ({
        name: [i.quantity != null ? i.quantity : "", i.unit ?? "", i.ingredientName]
          .map(String).map(s => s.trim()).filter(Boolean).join(" "),
        qty: null as null,
        unit: null as null,
        recipeName: undefined as string | undefined,
      }));

    // Reconstruct full ingredient strings (qty scaled) — let AI parse/clean/consolidate
    const newRaw = recipe.recipeIngredients.map((ing) => {
      const scaledQty = ing.quantity != null ? Math.round(ing.quantity * ratio * 100) / 100 : null;
      return {
        name: [scaledQty != null ? scaledQty : "", ing.unit ?? "", ing.ingredientName]
          .map(String).map(s => s.trim()).filter(Boolean).join(" "),
        qty: null as null,
        unit: null as null,
        recipeName: recipe.title,
      };
    });

    const pantry = await storage.getPantryItems();
    const consolidated = await aiConsolidateItems([...existingRaw, ...newRaw], pantry, master.id);
    const list = await storage.replaceAutoItems(master.id, consolidated);
    res.status(201).json(list);
  }));

  app.post("/api/shopping-lists/generate", wrap(async (req, res) => {
    const { mealPlanId, servingsMultiplier = 1 } = req.body;
    if (!mealPlanId) return res.status(400).json({ error: "mealPlanId required" });

    const plan = await storage.getMealPlanById(mealPlanId);
    if (!plan) return res.status(404).json({ error: "Meal plan not found" });

    // Reconstruct full ingredient strings (qty scaled) — let AI parse/clean/consolidate
    const rawIngredients: { name: string; qty: null; unit: null; recipeName: string }[] = [];
    for (const entry of plan.entries) {
      if (!entry.recipe) continue;
      const recipe = entry.recipe;
      const ratio = ((entry.servingsOverride ?? recipe.servings) / recipe.servings) * servingsMultiplier;
      for (const ing of recipe.recipeIngredients) {
        const scaledQty = ing.quantity != null ? Math.round(ing.quantity * ratio * 100) / 100 : null;
        rawIngredients.push({
          name: [scaledQty != null ? scaledQty : "", ing.unit ?? "", ing.ingredientName]
            .map(String).map(s => s.trim()).filter(Boolean).join(" "),
          qty: null,
          unit: null,
          recipeName: recipe.title,
        });
      }
    }

    const master = await storage.getOrCreateMasterList();
    const pantry = await storage.getPantryItems();
    const consolidated = await aiConsolidateItems(rawIngredients, pantry, master.id);
    const list = await storage.replaceAutoItems(master.id, consolidated);
    res.status(201).json(list);
  }));

  app.put("/api/shopping-lists/:id/items/:itemId", async (req, res) => {
    try {
      const item = await storage.updateShoppingListItem(req.params.id, req.params.itemId, req.body);
      if (!item) return res.status(404).json({ error: "Item not found" });
      res.json(item);
    } catch (err) {
      res.status(400).json({ error: String(err) });
    }
  });

  app.post("/api/shopping-lists/:id/items", async (req, res) => {
    try {
      let itemData = req.body;
      if (req.body.rawText && !req.body.ingredientName) {
        try {
          const prompt = `Parse this ingredient string into JSON: "${req.body.rawText}". Return only: { "ingredient_name": string, "quantity": number|null, "unit": string|null, "category": string }`;
          const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
          });
          const parsed = JSON.parse(response.choices[0].message.content ?? "{}");
          itemData = {
            ingredientName: parsed.ingredient_name ?? req.body.rawText,
            quantity: parsed.quantity ?? null,
            unit: parsed.unit ?? null,
            category: parsed.category ?? null,
            isManual: true,
          };
        } catch {
          itemData = { ingredientName: req.body.rawText, isManual: true };
        }
      }
      const item = await storage.addShoppingListItem(req.params.id, itemData);
      res.status(201).json(item);
    } catch (err) {
      res.status(400).json({ error: String(err) });
    }
  });

  app.delete("/api/shopping-lists/:id/items/:itemId", async (req, res) => {
    await storage.deleteShoppingListItem(req.params.id, req.params.itemId);
    res.status(204).send();
  });

  app.delete("/api/shopping-lists/:id/checked", async (req, res) => {
    await storage.clearCheckedItems(req.params.id);
    res.status(204).send();
  });

  app.put("/api/shopping-lists/:id/check-all", async (req, res) => {
    const { isChecked } = req.body;
    await storage.checkAllItems(req.params.id, !!isChecked);
    res.status(204).send();
  });

  // ── PANTRY ───────────────────────────────────────────────────────────────────

  app.get("/api/pantry", async (_req, res) => {
    const items = await storage.getPantryItems();
    res.json(items);
  });

  app.post("/api/pantry", async (req, res) => {
    try {
      const item = await storage.addPantryItem(req.body);
      res.status(201).json(item);
    } catch (err) {
      res.status(400).json({ error: String(err) });
    }
  });

  app.put("/api/pantry/:id", async (req, res) => {
    try {
      const item = await storage.updatePantryItem(req.params.id, req.body);
      if (!item) return res.status(404).json({ error: "Pantry item not found" });
      res.json(item);
    } catch (err) {
      res.status(400).json({ error: String(err) });
    }
  });

  app.delete("/api/pantry/:id", async (req, res) => {
    await storage.deletePantryItem(req.params.id);
    res.status(204).send();
  });

  app.post("/api/pantry/bulk-add", async (req, res) => {
    try {
      const items = await storage.bulkAddPantryItems(req.body);
      res.status(201).json(items);
    } catch (err) {
      res.status(400).json({ error: String(err) });
    }
  });

  app.post("/api/pantry/from-shopping-list", async (req, res) => {
    try {
      const { itemIds, listId } = req.body as { itemIds: string[]; listId: string };
      const list = await storage.getShoppingListById(listId);
      if (!list) return res.status(404).json({ error: "List not found" });
      const toAdd = list.items.filter((i) => itemIds.includes(i.id));
      const added = await storage.bulkAddPantryItems(
        toAdd.map((i) => ({
          ingredientName: i.ingredientName,
          quantity: null,
          unit: null,
          category: i.category,
          expiryDate: null,
        }))
      );
      res.status(201).json(added);
    } catch (err) {
      res.status(400).json({ error: String(err) });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
