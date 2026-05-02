import { randomUUID } from "crypto";
import type {
  Recipe, InsertRecipe, RecipeIngredient, InsertRecipeIngredient,
  RecipeWithIngredients, MealPlan, InsertMealPlan, MealPlanEntry,
  InsertMealPlanEntry, MealPlanWithEntries, ShoppingList, InsertShoppingList,
  ShoppingListItem, InsertShoppingListItem, ShoppingListWithItems,
  PantryItem, InsertPantryItem,
} from "@shared/schema";

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
  createShoppingList(data: InsertShoppingList): Promise<ShoppingList>;
  createShoppingListWithItems(list: InsertShoppingList, items: InsertShoppingListItem[]): Promise<ShoppingListWithItems>;
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

export class MemStorage implements IStorage {
  private recipes: Map<string, Recipe> = new Map();
  private recipeIngredients: Map<string, RecipeIngredient[]> = new Map();
  private mealPlans: Map<string, MealPlan> = new Map();
  private mealPlanEntries: Map<string, MealPlanEntry[]> = new Map();
  private shoppingLists: Map<string, ShoppingList> = new Map();
  private shoppingListItems: Map<string, ShoppingListItem[]> = new Map();
  private pantry: Map<string, PantryItem> = new Map();

  private now(): string {
    return new Date().toISOString();
  }

  private buildRecipeWithIngredients(recipe: Recipe): RecipeWithIngredients {
    return {
      ...recipe,
      recipeIngredients: this.recipeIngredients.get(recipe.id) ?? [],
    };
  }

  async getRecipes(): Promise<RecipeWithIngredients[]> {
    return Array.from(this.recipes.values()).map((r) => this.buildRecipeWithIngredients(r));
  }

  async getRecipeById(id: string): Promise<RecipeWithIngredients | undefined> {
    const recipe = this.recipes.get(id);
    if (!recipe) return undefined;
    return this.buildRecipeWithIngredients(recipe);
  }

  async createRecipe(data: InsertRecipe, ingredients?: InsertRecipeIngredient[]): Promise<RecipeWithIngredients> {
    const id = randomUUID();
    const recipe: Recipe = {
      id,
      title: data.title,
      description: data.description ?? null,
      imageUrl: data.imageUrl ?? null,
      prepTime: data.prepTime ?? null,
      cookTime: data.cookTime ?? null,
      servings: data.servings ?? 4,
      instructions: data.instructions ?? [],
      category: data.category ?? "Uncategorized",
      tags: data.tags ?? null,
      calories: data.calories ?? null,
      protein: data.protein ?? null,
      carbs: data.carbs ?? null,
      fats: data.fats ?? null,
    };
    this.recipes.set(id, recipe);

    const recipeIngredientList: RecipeIngredient[] = (ingredients ?? []).map((ing) => ({
      id: randomUUID(),
      recipeId: id,
      ingredientName: ing.ingredientName,
      quantity: ing.quantity ?? null,
      unit: ing.unit ?? null,
      notes: ing.notes ?? null,
    }));
    this.recipeIngredients.set(id, recipeIngredientList);

    return this.buildRecipeWithIngredients(recipe);
  }

  async updateRecipe(id: string, data: Partial<InsertRecipe>, ingredients?: InsertRecipeIngredient[]): Promise<RecipeWithIngredients | undefined> {
    const existing = this.recipes.get(id);
    if (!existing) return undefined;
    const updated: Recipe = { ...existing, ...data };
    this.recipes.set(id, updated);
    if (ingredients !== undefined) {
      const list: RecipeIngredient[] = ingredients.map((ing) => ({
        id: randomUUID(),
        recipeId: id,
        ingredientName: ing.ingredientName,
        quantity: ing.quantity ?? null,
        unit: ing.unit ?? null,
        notes: ing.notes ?? null,
      }));
      this.recipeIngredients.set(id, list);
    }
    return this.buildRecipeWithIngredients(updated);
  }

  async deleteRecipe(id: string): Promise<void> {
    this.recipes.delete(id);
    this.recipeIngredients.delete(id);
  }

  async searchRecipes(query: string): Promise<RecipeWithIngredients[]> {
    const q = query.toLowerCase();
    return Array.from(this.recipes.values())
      .filter((r) => {
        const ingredientNames = (this.recipeIngredients.get(r.id) ?? [])
          .map((i) => i.ingredientName.toLowerCase());
        return (
          r.title.toLowerCase().includes(q) ||
          (r.category ?? "").toLowerCase().includes(q) ||
          (r.tags ?? []).some((t) => t.toLowerCase().includes(q)) ||
          ingredientNames.some((n) => n.includes(q))
        );
      })
      .map((r) => this.buildRecipeWithIngredients(r));
  }

  async getMealPlans(): Promise<MealPlan[]> {
    return Array.from(this.mealPlans.values()).sort(
      (a, b) => new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime()
    );
  }

  private async buildMealPlanWithEntries(plan: MealPlan): Promise<MealPlanWithEntries> {
    const entries = this.mealPlanEntries.get(plan.id) ?? [];
    const enriched = await Promise.all(
      entries.map(async (entry) => {
        const recipe = entry.recipeId ? await this.getRecipeById(entry.recipeId) : undefined;
        return { ...entry, recipe };
      })
    );
    return { ...plan, entries: enriched };
  }

  async getMealPlanById(id: string): Promise<MealPlanWithEntries | undefined> {
    const plan = this.mealPlans.get(id);
    if (!plan) return undefined;
    return this.buildMealPlanWithEntries(plan);
  }

  async getMealPlanByWeek(weekStart: string): Promise<MealPlanWithEntries | undefined> {
    const plan = Array.from(this.mealPlans.values()).find((p) => p.weekStart === weekStart);
    if (!plan) return undefined;
    return this.buildMealPlanWithEntries(plan);
  }

  async createMealPlan(data: InsertMealPlan): Promise<MealPlan> {
    const id = randomUUID();
    const plan: MealPlan = {
      id,
      weekStart: data.weekStart,
      createdAt: this.now(),
      updatedAt: this.now(),
    };
    this.mealPlans.set(id, plan);
    this.mealPlanEntries.set(id, []);
    return plan;
  }

  async addMealPlanEntry(mealPlanId: string, data: InsertMealPlanEntry): Promise<MealPlanEntry> {
    const entry: MealPlanEntry = {
      id: randomUUID(),
      mealPlanId,
      dayOfWeek: data.dayOfWeek,
      mealSlot: data.mealSlot,
      recipeId: data.recipeId ?? null,
      customMeal: data.customMeal ?? null,
      servingsOverride: data.servingsOverride ?? null,
    };
    const entries = this.mealPlanEntries.get(mealPlanId) ?? [];
    entries.push(entry);
    this.mealPlanEntries.set(mealPlanId, entries);
    return entry;
  }

  async updateMealPlanEntry(mealPlanId: string, entryId: string, data: Partial<InsertMealPlanEntry>): Promise<MealPlanEntry | undefined> {
    const entries = this.mealPlanEntries.get(mealPlanId) ?? [];
    const idx = entries.findIndex((e) => e.id === entryId);
    if (idx === -1) return undefined;
    entries[idx] = { ...entries[idx], ...data };
    this.mealPlanEntries.set(mealPlanId, entries);
    return entries[idx];
  }

  async deleteMealPlanEntry(mealPlanId: string, entryId: string): Promise<void> {
    const entries = this.mealPlanEntries.get(mealPlanId) ?? [];
    this.mealPlanEntries.set(mealPlanId, entries.filter((e) => e.id !== entryId));
  }

  async getShoppingLists(): Promise<ShoppingList[]> {
    return Array.from(this.shoppingLists.values()).sort(
      (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
    );
  }

  async getShoppingListById(id: string): Promise<ShoppingListWithItems | undefined> {
    const list = this.shoppingLists.get(id);
    if (!list) return undefined;
    return { ...list, items: this.shoppingListItems.get(id) ?? [] };
  }

  async createShoppingList(data: InsertShoppingList): Promise<ShoppingList> {
    const id = randomUUID();
    const list: ShoppingList = {
      id,
      mealPlanId: data.mealPlanId ?? null,
      name: data.name ?? "Shopping List",
      createdAt: this.now(),
      updatedAt: this.now(),
    };
    this.shoppingLists.set(id, list);
    this.shoppingListItems.set(id, []);
    return list;
  }

  async createShoppingListWithItems(listData: InsertShoppingList, items: InsertShoppingListItem[]): Promise<ShoppingListWithItems> {
    const list = await this.createShoppingList(listData);
    const createdItems: ShoppingListItem[] = items.map((item) => ({
      id: randomUUID(),
      shoppingListId: list.id,
      ingredientName: item.ingredientName,
      quantity: item.quantity ?? null,
      unit: item.unit ?? null,
      category: item.category ?? null,
      isChecked: item.isChecked ?? false,
      isManual: item.isManual ?? false,
      sourceRecipeId: item.sourceRecipeId ?? null,
      notes: item.notes ?? null,
    }));
    this.shoppingListItems.set(list.id, createdItems);
    return { ...list, items: createdItems };
  }

  async updateShoppingListItem(listId: string, itemId: string, data: Partial<InsertShoppingListItem>): Promise<ShoppingListItem | undefined> {
    const items = this.shoppingListItems.get(listId) ?? [];
    const idx = items.findIndex((i) => i.id === itemId);
    if (idx === -1) return undefined;
    items[idx] = { ...items[idx], ...data };
    this.shoppingListItems.set(listId, items);
    return items[idx];
  }

  async addShoppingListItem(listId: string, data: InsertShoppingListItem): Promise<ShoppingListItem> {
    const item: ShoppingListItem = {
      id: randomUUID(),
      shoppingListId: listId,
      ingredientName: data.ingredientName,
      quantity: data.quantity ?? null,
      unit: data.unit ?? null,
      category: data.category ?? null,
      isChecked: data.isChecked ?? false,
      isManual: data.isManual ?? true,
      sourceRecipeId: data.sourceRecipeId ?? null,
      notes: data.notes ?? null,
    };
    const items = this.shoppingListItems.get(listId) ?? [];
    items.push(item);
    this.shoppingListItems.set(listId, items);
    return item;
  }

  async deleteShoppingListItem(listId: string, itemId: string): Promise<void> {
    const items = this.shoppingListItems.get(listId) ?? [];
    this.shoppingListItems.set(listId, items.filter((i) => i.id !== itemId));
  }

  async clearCheckedItems(listId: string): Promise<void> {
    const items = this.shoppingListItems.get(listId) ?? [];
    this.shoppingListItems.set(listId, items.filter((i) => !i.isChecked));
  }

  async checkAllItems(listId: string, isChecked: boolean): Promise<void> {
    const items = this.shoppingListItems.get(listId) ?? [];
    this.shoppingListItems.set(listId, items.map((i) => ({ ...i, isChecked })));
  }

  async getPantryItems(): Promise<PantryItem[]> {
    return Array.from(this.pantry.values()).sort((a, b) =>
      a.ingredientName.localeCompare(b.ingredientName)
    );
  }

  async addPantryItem(data: InsertPantryItem): Promise<PantryItem> {
    const id = randomUUID();
    const item: PantryItem = {
      id,
      ingredientName: data.ingredientName,
      quantity: data.quantity ?? null,
      unit: data.unit ?? null,
      category: data.category ?? null,
      expiryDate: data.expiryDate ?? null,
      addedAt: this.now(),
      updatedAt: this.now(),
    };
    this.pantry.set(id, item);
    return item;
  }

  async updatePantryItem(id: string, data: Partial<InsertPantryItem>): Promise<PantryItem | undefined> {
    const existing = this.pantry.get(id);
    if (!existing) return undefined;
    const updated: PantryItem = { ...existing, ...data, updatedAt: this.now() };
    this.pantry.set(id, updated);
    return updated;
  }

  async deletePantryItem(id: string): Promise<void> {
    this.pantry.delete(id);
  }

  async bulkAddPantryItems(items: InsertPantryItem[]): Promise<PantryItem[]> {
    return Promise.all(items.map((item) => this.addPantryItem(item)));
  }
}

export const storage = new MemStorage();
