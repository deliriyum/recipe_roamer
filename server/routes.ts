import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
      return {
        ingredientName: match[3]?.trim() ?? s,
        quantity: qty ?? null,
        unit: match[2]?.trim() ?? null,
        notes: null,
      };
    }
    return { ingredientName: s, quantity: null, unit: null, notes: null };
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
    // Remove "for serving/garnish/topping/etc." and everything after
    result = result.replace(/,?\s*for\s+(serving|garnish|topping|dipping|decoration|drizzling|coating)\b.*/i, "");
    // Split on commas; drop any segment (after the first) that starts with a prep word
    const PREP_START = /^\s*(thinly|finely|roughly|coarsely|lightly|freshly|evenly|well\s|into\b|cut\b|about\b|sliced|chopped|diced|minced|grated|shredded|peeled|seeded|trimmed|halved|quartered|torn|crushed|pressed|julienned|cubed|crumbled|softened|melted|beaten|whisked|dried|thawed|cooked|roasted|toasted|drained|rinsed|patted|pitted|deveined|butterflied|deboned|zested|squeezed|stemmed|cored|flaked|pur[ée]ed|mashed|blanched|divided|at\s+room|room\s+temp|to\s+taste|as\s+needed|if\s+needed|optional|such\b|plus\b|more\b)/i;
    const parts = result.split(",");
    const kept = parts.filter((part, idx) => idx === 0 || !PREP_START.test(part));
    return kept.join(",").trim().replace(/,\s*$/, "").trim();
  }

  // Shared AI consolidation helper used by both from-recipe and generate routes
  async function aiConsolidateItems(
    rawItems: Array<{ name: string; qty: number | null; unit: string | null }>,
    pantry: Awaited<ReturnType<typeof storage.getPantryItems>>,
    listId: string,
  ): Promise<InsertShoppingListItem[]> {
    if (rawItems.length === 0) return [];

    let consolidated: Array<{ ingredient_name: string; quantity: number | null; unit: string | null; category: string | null }> = [];

    try {
      const prompt = `Parse these ingredient strings and consolidate duplicates.
Return JSON array of: { ingredient_name, quantity, unit, category }.
Combine identical ingredients (e.g. '2 cups flour' + '1 cup flour' = '3 cups flour'). Normalize units (tbsp→tablespoon, tsp→teaspoon, c→cup, oz→ounce, lb→pound). Categorize each item as one of: produce, dairy, meat, seafood, bakery, pantry, frozen, beverages, spices, other.

Ingredients:
${rawItems.map((i) => `${i.qty ?? ""} ${i.unit ?? ""} ${i.name}`.trim()).join("\n")}

Return ONLY a JSON object with an "items" array, no markdown. Each element: { "ingredient_name": string, "quantity": number|null, "unit": string|null, "category": string }`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });
      const text = response.choices[0].message.content ?? "{}";
      const parsed = JSON.parse(text);
      consolidated = Array.isArray(parsed) ? parsed : (parsed.items ?? parsed.ingredients ?? []);
    } catch {
      // Fallback: no consolidation, pass items through as-is
      consolidated = rawItems.map((i) => ({
        ingredient_name: i.name,
        quantity: i.qty,
        unit: i.unit,
        category: "other",
      }));
    }

    return consolidated.map((item) => {
      const pantryMatch = pantry.find(
        (p) =>
          p.ingredientName.toLowerCase() === item.ingredient_name.toLowerCase() &&
          (p.quantity ?? 0) >= (item.quantity ?? 0),
      );
      return {
        ingredientName: item.ingredient_name,
        quantity: item.quantity != null ? Math.ceil(item.quantity) : null,
        unit: item.unit,
        category: item.category,
        isChecked: !!pantryMatch,
        isManual: false,
        sourceRecipeId: null,
        notes: pantryMatch ? "In pantry" : null,
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

    // Collect existing auto-items already in the list
    const existingRaw = master.items
      .filter((i) => !i.isManual)
      .map((i) => ({ name: i.ingredientName, qty: i.quantity, unit: i.unit }));

    // Build raw items from this recipe
    const newRaw = recipe.recipeIngredients.map((ing) => ({
      name: cleanIngredientName(ing.ingredientName),
      qty: ing.quantity != null ? ing.quantity * ratio : null,
      unit: ing.unit ?? null,
    }));

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

    const rawIngredients: { name: string; qty: number | null; unit: string | null }[] = [];
    for (const entry of plan.entries) {
      if (!entry.recipe) continue;
      const recipe = entry.recipe;
      const ratio = ((entry.servingsOverride ?? recipe.servings) / recipe.servings) * servingsMultiplier;
      for (const ing of recipe.recipeIngredients) {
        rawIngredients.push({
          name: cleanIngredientName(ing.ingredientName),
          qty: ing.quantity != null ? ing.quantity * ratio : null,
          unit: ing.unit ?? null,
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
          quantity: i.quantity,
          unit: i.unit,
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
