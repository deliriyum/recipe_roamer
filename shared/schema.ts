import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const recipes = pgTable("recipes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  prepTime: integer("prep_time"),
  cookTime: integer("cook_time"),
  servings: integer("servings").notNull().default(4),
  instructions: text("instructions").array().notNull().default([]),
  category: text("category").notNull().default("Uncategorized"),
  tags: text("tags").array(),
  calories: real("calories"),
  protein: real("protein"),
  carbs: real("carbs"),
  fats: real("fats"),
});

export const recipeIngredients = pgTable("recipe_ingredients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  recipeId: varchar("recipe_id").notNull(),
  ingredientName: text("ingredient_name").notNull(),
  quantity: real("quantity"),
  unit: text("unit"),
  notes: text("notes"),
});

export const mealPlans = pgTable("meal_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  weekStart: text("week_start").notNull(),
  createdAt: text("created_at"),
  updatedAt: text("updated_at"),
});

export const mealPlanEntries = pgTable("meal_plan_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mealPlanId: varchar("meal_plan_id").notNull(),
  dayOfWeek: integer("day_of_week").notNull(),
  mealSlot: text("meal_slot").notNull(),
  recipeId: varchar("recipe_id"),
  customMeal: text("custom_meal"),
  servingsOverride: integer("servings_override"),
});

export const shoppingLists = pgTable("shopping_lists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mealPlanId: varchar("meal_plan_id"),
  name: text("name").notNull().default("Shopping List"),
  createdAt: text("created_at"),
  updatedAt: text("updated_at"),
});

export const shoppingListItems = pgTable("shopping_list_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shoppingListId: varchar("shopping_list_id").notNull(),
  ingredientName: text("ingredient_name").notNull(),
  quantity: real("quantity"),
  unit: text("unit"),
  category: text("category"),
  isChecked: boolean("is_checked").default(false),
  isManual: boolean("is_manual").default(false),
  sourceRecipeId: varchar("source_recipe_id"),
  notes: text("notes"),
});

export const pantryItems = pgTable("pantry_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ingredientName: text("ingredient_name").notNull(),
  quantity: real("quantity"),
  unit: text("unit"),
  category: text("category"),
  expiryDate: text("expiry_date"),
  addedAt: text("added_at"),
  updatedAt: text("updated_at"),
});

export const insertRecipeSchema = createInsertSchema(recipes).omit({ id: true });
export const insertRecipeIngredientSchema = createInsertSchema(recipeIngredients).omit({ id: true });
export const insertMealPlanSchema = createInsertSchema(mealPlans).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMealPlanEntrySchema = createInsertSchema(mealPlanEntries).omit({ id: true });
export const insertShoppingListSchema = createInsertSchema(shoppingLists).omit({ id: true, createdAt: true, updatedAt: true });
export const insertShoppingListItemSchema = createInsertSchema(shoppingListItems).omit({ id: true });
export const insertPantryItemSchema = createInsertSchema(pantryItems).omit({ id: true, addedAt: true, updatedAt: true });

export type Recipe = typeof recipes.$inferSelect;
export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
export type RecipeIngredient = typeof recipeIngredients.$inferSelect;
export type InsertRecipeIngredient = z.infer<typeof insertRecipeIngredientSchema>;
export type MealPlan = typeof mealPlans.$inferSelect;
export type InsertMealPlan = z.infer<typeof insertMealPlanSchema>;
export type MealPlanEntry = typeof mealPlanEntries.$inferSelect;
export type InsertMealPlanEntry = z.infer<typeof insertMealPlanEntrySchema>;
export type ShoppingList = typeof shoppingLists.$inferSelect;
export type InsertShoppingList = z.infer<typeof insertShoppingListSchema>;
export type ShoppingListItem = typeof shoppingListItems.$inferSelect;
export type InsertShoppingListItem = z.infer<typeof insertShoppingListItemSchema>;
export type PantryItem = typeof pantryItems.$inferSelect;
export type InsertPantryItem = z.infer<typeof insertPantryItemSchema>;

export type RecipeWithIngredients = Recipe & { recipeIngredients: RecipeIngredient[] };
export type MealPlanWithEntries = MealPlan & { entries: (MealPlanEntry & { recipe?: RecipeWithIngredients })[] };
export type ShoppingListWithItems = ShoppingList & { items: ShoppingListItem[] };
