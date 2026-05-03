import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, and, ilike, or, sql, inArray } from "drizzle-orm";
import {
  recipes, recipeIngredients, mealPlans, mealPlanEntries,
  shoppingLists, shoppingListItems, pantryItems,
} from "@shared/schema";
import type {
  Recipe, InsertRecipe, RecipeIngredient, InsertRecipeIngredient,
  RecipeWithIngredients, MealPlan, InsertMealPlan, MealPlanEntry,
  InsertMealPlanEntry, MealPlanWithEntries, ShoppingList, InsertShoppingList,
  ShoppingListItem, InsertShoppingListItem, ShoppingListWithItems,
  PantryItem, InsertPantryItem,
} from "@shared/schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

export interface IStorage {
  // Recipes
  getRecipes(): Promise<RecipeWithIngredients[]>;
  getRecipeById(id: string): Promise<RecipeWithIngredients | undefined>;
  createRecipe(data: InsertRecipe, ingredients?: InsertRecipeIngredient[]): Promise<RecipeWithIngredients>;
  updateRecipe(id: string, data: Partial<InsertRecipe>, ingredients?: InsertRecipeIngredient[]): Promise<RecipeWithIngredients | undefined>;
  deleteRecipe(id: string): Promise<void>;
  searchRecipes(query: string): Promise<RecipeWithIngredients[]>;

  // Meal Plans
  getMealPlans(): Promise<MealPlan[]>;
  getMealPlanById(id: string): Promise<MealPlanWithEntries | undefined>;
  getMealPlanByWeek(weekStart: string): Promise<MealPlanWithEntries | undefined>;
  createMealPlan(data: InsertMealPlan): Promise<MealPlan>;
  addMealPlanEntry(mealPlanId: string, data: InsertMealPlanEntry): Promise<MealPlanEntry>;
  updateMealPlanEntry(mealPlanId: string, entryId: string, data: Partial<InsertMealPlanEntry>): Promise<MealPlanEntry | undefined>;
  deleteMealPlanEntry(mealPlanId: string, entryId: string): Promise<void>;

  // Shopping Lists
  getShoppingLists(): Promise<ShoppingList[]>;
  getShoppingListById(id: string): Promise<ShoppingListWithItems | undefined>;
  getOrCreateMasterList(): Promise<ShoppingListWithItems>;
  createShoppingList(data: InsertShoppingList): Promise<ShoppingList>;
  createShoppingListWithItems(list: InsertShoppingList, items: InsertShoppingListItem[]): Promise<ShoppingListWithItems>;
  appendItemsToList(listId: string, items: InsertShoppingListItem[]): Promise<ShoppingListWithItems>;
  replaceAutoItems(listId: string, items: InsertShoppingListItem[]): Promise<ShoppingListWithItems>;
  updateShoppingListItem(listId: string, itemId: string, data: Partial<InsertShoppingListItem>): Promise<ShoppingListItem | undefined>;
  addShoppingListItem(listId: string, data: InsertShoppingListItem): Promise<ShoppingListItem>;
  deleteShoppingListItem(listId: string, itemId: string): Promise<void>;
  clearCheckedItems(listId: string): Promise<void>;
  checkAllItems(listId: string, isChecked: boolean): Promise<void>;

  // Pantry
  getPantryItems(): Promise<PantryItem[]>;
  addPantryItem(data: InsertPantryItem): Promise<PantryItem>;
  updatePantryItem(id: string, data: Partial<InsertPantryItem>): Promise<PantryItem | undefined>;
  deletePantryItem(id: string): Promise<void>;
  bulkAddPantryItems(items: InsertPantryItem[]): Promise<PantryItem[]>;
}

class DbStorage implements IStorage {
  private now(): string {
    return new Date().toISOString();
  }

  // ── Recipes ───────────────────────────────────────────────────────────────

  private async attachIngredients(recipe: Recipe): Promise<RecipeWithIngredients> {
    const ings = await db.select().from(recipeIngredients).where(eq(recipeIngredients.recipeId, recipe.id));
    return { ...recipe, recipeIngredients: ings };
  }

  async getRecipes(): Promise<RecipeWithIngredients[]> {
    const rows = await db.select().from(recipes);
    return Promise.all(rows.map((r) => this.attachIngredients(r)));
  }

  async getRecipeById(id: string): Promise<RecipeWithIngredients | undefined> {
    const [recipe] = await db.select().from(recipes).where(eq(recipes.id, id));
    if (!recipe) return undefined;
    return this.attachIngredients(recipe);
  }

  async createRecipe(data: InsertRecipe, ingredients: InsertRecipeIngredient[] = []): Promise<RecipeWithIngredients> {
    const [recipe] = await db.insert(recipes).values(data).returning();
    if (ingredients.length > 0) {
      await db.insert(recipeIngredients).values(
        ingredients.map((ing) => ({ ...ing, recipeId: recipe.id }))
      );
    }
    return this.attachIngredients(recipe);
  }

  async updateRecipe(id: string, data: Partial<InsertRecipe>, ingredients?: InsertRecipeIngredient[]): Promise<RecipeWithIngredients | undefined> {
    const [recipe] = await db.update(recipes).set(data).where(eq(recipes.id, id)).returning();
    if (!recipe) return undefined;
    if (ingredients !== undefined) {
      await db.delete(recipeIngredients).where(eq(recipeIngredients.recipeId, id));
      if (ingredients.length > 0) {
        await db.insert(recipeIngredients).values(
          ingredients.map((ing) => ({ ...ing, recipeId: id }))
        );
      }
    }
    return this.attachIngredients(recipe);
  }

  async deleteRecipe(id: string): Promise<void> {
    await db.delete(recipeIngredients).where(eq(recipeIngredients.recipeId, id));
    await db.delete(recipes).where(eq(recipes.id, id));
  }

  async searchRecipes(query: string): Promise<RecipeWithIngredients[]> {
    const q = `%${query}%`;
    const matchingIngredientRecipeIds = await db
      .selectDistinct({ recipeId: recipeIngredients.recipeId })
      .from(recipeIngredients)
      .where(ilike(recipeIngredients.ingredientName, q));
    const ingredientRecipeIds = matchingIngredientRecipeIds.map((r) => r.recipeId);

    const conditions = [ilike(recipes.title, q), ilike(recipes.category, q)];
    if (ingredientRecipeIds.length > 0) {
      conditions.push(inArray(recipes.id, ingredientRecipeIds));
    }

    const rows = await db.select().from(recipes).where(or(...conditions));
    return Promise.all(rows.map((r) => this.attachIngredients(r)));
  }

  // ── Meal Plans ────────────────────────────────────────────────────────────

  private async buildMealPlanWithEntries(plan: MealPlan): Promise<MealPlanWithEntries> {
    const entries = await db
      .select()
      .from(mealPlanEntries)
      .where(eq(mealPlanEntries.mealPlanId, plan.id));

    const enriched = await Promise.all(
      entries.map(async (entry) => {
        const recipe = entry.recipeId ? await this.getRecipeById(entry.recipeId) : undefined;
        return { ...entry, recipe };
      })
    );
    return { ...plan, entries: enriched };
  }

  async getMealPlans(): Promise<MealPlan[]> {
    return db.select().from(mealPlans).orderBy(sql`${mealPlans.weekStart} DESC`);
  }

  async getMealPlanById(id: string): Promise<MealPlanWithEntries | undefined> {
    const [plan] = await db.select().from(mealPlans).where(eq(mealPlans.id, id));
    if (!plan) return undefined;
    return this.buildMealPlanWithEntries(plan);
  }

  async getMealPlanByWeek(weekStart: string): Promise<MealPlanWithEntries | undefined> {
    const [plan] = await db.select().from(mealPlans).where(eq(mealPlans.weekStart, weekStart));
    if (!plan) return undefined;
    return this.buildMealPlanWithEntries(plan);
  }

  async createMealPlan(data: InsertMealPlan): Promise<MealPlan> {
    const [plan] = await db
      .insert(mealPlans)
      .values({ ...data, createdAt: this.now(), updatedAt: this.now() })
      .returning();
    return plan;
  }

  async addMealPlanEntry(mealPlanId: string, data: InsertMealPlanEntry): Promise<MealPlanEntry> {
    const [entry] = await db
      .insert(mealPlanEntries)
      .values({ ...data, mealPlanId })
      .returning();
    return entry;
  }

  async updateMealPlanEntry(mealPlanId: string, entryId: string, data: Partial<InsertMealPlanEntry>): Promise<MealPlanEntry | undefined> {
    const [entry] = await db
      .update(mealPlanEntries)
      .set(data)
      .where(and(eq(mealPlanEntries.id, entryId), eq(mealPlanEntries.mealPlanId, mealPlanId)))
      .returning();
    return entry ?? undefined;
  }

  async deleteMealPlanEntry(mealPlanId: string, entryId: string): Promise<void> {
    await db
      .delete(mealPlanEntries)
      .where(and(eq(mealPlanEntries.id, entryId), eq(mealPlanEntries.mealPlanId, mealPlanId)));
  }

  // ── Shopping Lists ────────────────────────────────────────────────────────

  private async attachItems(list: ShoppingList): Promise<ShoppingListWithItems> {
    const items = await db
      .select()
      .from(shoppingListItems)
      .where(eq(shoppingListItems.shoppingListId, list.id));
    return { ...list, items };
  }

  async getShoppingLists(): Promise<ShoppingList[]> {
    return db.select().from(shoppingLists).orderBy(sql`${shoppingLists.createdAt} DESC`);
  }

  async getShoppingListById(id: string): Promise<ShoppingListWithItems | undefined> {
    const [list] = await db.select().from(shoppingLists).where(eq(shoppingLists.id, id));
    if (!list) return undefined;
    return this.attachItems(list);
  }

  async getOrCreateMasterList(): Promise<ShoppingListWithItems> {
    const [existing] = await db
      .select()
      .from(shoppingLists)
      .where(eq(shoppingLists.name, "Shopping List"))
      .limit(1);
    if (existing) return this.attachItems(existing);
    return this.createShoppingList({ name: "Shopping List" }).then((l) => this.attachItems(l));
  }

  async createShoppingList(data: InsertShoppingList): Promise<ShoppingList> {
    const [list] = await db
      .insert(shoppingLists)
      .values({ ...data, createdAt: this.now(), updatedAt: this.now() })
      .returning();
    return list;
  }

  async createShoppingListWithItems(listData: InsertShoppingList, items: InsertShoppingListItem[]): Promise<ShoppingListWithItems> {
    const list = await this.createShoppingList(listData);
    if (items.length > 0) {
      await db.insert(shoppingListItems).values(items.map((i) => ({ ...i, shoppingListId: list.id })));
    }
    return this.attachItems(list);
  }

  async appendItemsToList(listId: string, items: InsertShoppingListItem[]): Promise<ShoppingListWithItems> {
    if (items.length > 0) {
      await db.insert(shoppingListItems).values(items.map((i) => ({ ...i, shoppingListId: listId })));
    }
    const [list] = await db.select().from(shoppingLists).where(eq(shoppingLists.id, listId));
    return this.attachItems(list);
  }

  async replaceAutoItems(listId: string, items: InsertShoppingListItem[]): Promise<ShoppingListWithItems> {
    await db
      .delete(shoppingListItems)
      .where(and(eq(shoppingListItems.shoppingListId, listId), eq(shoppingListItems.isManual, false)));
    if (items.length > 0) {
      await db.insert(shoppingListItems).values(
        items.map((i) => ({ ...i, shoppingListId: listId, isManual: false }))
      );
    }
    const [list] = await db.select().from(shoppingLists).where(eq(shoppingLists.id, listId));
    return this.attachItems(list);
  }

  async updateShoppingListItem(listId: string, itemId: string, data: Partial<InsertShoppingListItem>): Promise<ShoppingListItem | undefined> {
    const [item] = await db
      .update(shoppingListItems)
      .set(data)
      .where(and(eq(shoppingListItems.id, itemId), eq(shoppingListItems.shoppingListId, listId)))
      .returning();
    return item ?? undefined;
  }

  async addShoppingListItem(listId: string, data: InsertShoppingListItem): Promise<ShoppingListItem> {
    const [item] = await db
      .insert(shoppingListItems)
      .values({ ...data, shoppingListId: listId })
      .returning();
    return item;
  }

  async deleteShoppingListItem(listId: string, itemId: string): Promise<void> {
    await db
      .delete(shoppingListItems)
      .where(and(eq(shoppingListItems.id, itemId), eq(shoppingListItems.shoppingListId, listId)));
  }

  async clearCheckedItems(listId: string): Promise<void> {
    await db
      .delete(shoppingListItems)
      .where(and(eq(shoppingListItems.shoppingListId, listId), eq(shoppingListItems.isChecked, true)));
  }

  async checkAllItems(listId: string, isChecked: boolean): Promise<void> {
    await db
      .update(shoppingListItems)
      .set({ isChecked })
      .where(eq(shoppingListItems.shoppingListId, listId));
  }

  // ── Pantry ────────────────────────────────────────────────────────────────

  async getPantryItems(): Promise<PantryItem[]> {
    return db.select().from(pantryItems).orderBy(pantryItems.ingredientName);
  }

  async addPantryItem(data: InsertPantryItem): Promise<PantryItem> {
    const [item] = await db
      .insert(pantryItems)
      .values({ ...data, addedAt: this.now(), updatedAt: this.now() })
      .returning();
    return item;
  }

  async updatePantryItem(id: string, data: Partial<InsertPantryItem>): Promise<PantryItem | undefined> {
    const [item] = await db
      .update(pantryItems)
      .set({ ...data, updatedAt: this.now() })
      .where(eq(pantryItems.id, id))
      .returning();
    return item ?? undefined;
  }

  async deletePantryItem(id: string): Promise<void> {
    await db.delete(pantryItems).where(eq(pantryItems.id, id));
  }

  async bulkAddPantryItems(items: InsertPantryItem[]): Promise<PantryItem[]> {
    if (items.length === 0) return [];
    const rows = await db
      .insert(pantryItems)
      .values(items.map((i) => ({ ...i, addedAt: this.now(), updatedAt: this.now() })))
      .returning();
    return rows;
  }
}

export const storage = new DbStorage();
