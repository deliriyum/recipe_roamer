import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real } from "drizzle-orm/pg-core";
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
  ingredients: text("ingredients").array().notNull(),
  instructions: text("instructions").array().notNull(),
  category: text("category").notNull().default("Uncategorized"),
  tags: text("tags").array(),
  calories: real("calories"),
  protein: real("protein"),
  carbs: real("carbs"),
  fats: real("fats"),
});

export const insertRecipeSchema = createInsertSchema(recipes).omit({
  id: true,
});

export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
export type Recipe = typeof recipes.$inferSelect;
