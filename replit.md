# RecipeRoamer

A mobile-first recipe collection app with a vintage 1950s cookbook aesthetic.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Routing | Wouter |
| Backend | Node.js + Express |
| Storage | In-memory (MemStorage) |
| ORM/Schema | Drizzle ORM (schema only, no real DB) |
| Styling | Tailwind CSS + shadcn/ui |
| Data fetching | TanStack React Query v5 |
| Forms | React Hook Form + Zod |
| AI | OpenAI API (shopping list consolidation, ingredient parsing) |

## Features

- **Recipe Collection**: Browse recipes grouped by category with expandable accordion sections
- **Compact Listings**: Thumbnail + name + time + tags layout (no heavy image cards)
- **Add Recipe**: Manual recipe entry with structured ingredient input
- **Import Recipe**: URL/OCR import pipeline
- **Measurement Converter**: Metric ↔ imperial, volume, temperature conversions
- **Advanced Filters**: Filter by ingredient, tag, and total cook time
- **Weekly Meal Planner**: Mon–Sun grid with Breakfast/Lunch/Dinner/Snack slots, recipe search, servings override
- **Smart Shopping List**: Auto-generated from meal plans via OpenAI consolidation, pantry cross-reference, grouped by category, check off items
- **Pantry Tracker**: Track what you have on hand with expiry date warnings
- **Print Support**: Print-friendly CSS for recipes, meal plan, and shopping list

## Design

- Vintage 1950s cookbook aesthetic: warm creams, sage green, peachy accents
- Playfair Display serif for headings, Inter for body
- Mobile-first responsive layout
- Dark mode support

## Architecture

```
client/src/
  pages/         RecipesList, RecipeDetail, AddRecipe, ImportRecipe,
                 MealPlanner, ShoppingList, Pantry
  components/    CategorySection, RecipeListItem, IngredientsList,
                 MeasurementConverter, AdvancedFilters, BottomNav, …
  lib/           queryClient.ts (TanStack Query setup)

server/
  index.ts       Express app entry
  routes.ts      All API routes (/api/recipes, /api/meal-plans,
                 /api/shopping-lists, /api/pantry)
  storage.ts     MemStorage implementation (in-memory Maps)

shared/
  schema.ts      Drizzle schema for all tables (type definitions)
```

## API Routes

### Recipes
- `GET /api/recipes` — list all
- `GET /api/recipes/:id` — single recipe with structured ingredients
- `GET /api/recipes/search?q=` — search by title/tags/category/ingredients
- `POST /api/recipes` — create (accepts `ingredients` string array or `recipeIngredients` structured)
- `PUT /api/recipes/:id` — update
- `DELETE /api/recipes/:id` — delete

### Meal Plans
- `GET /api/meal-plans` — list all plans
- `GET /api/meal-plans/week/:weekStart` — plan for a specific week (YYYY-MM-DD)
- `GET /api/meal-plans/:id` — plan with all entries and linked recipes
- `POST /api/meal-plans` — create plan for a week
- `POST /api/meal-plans/:id/entries` — add meal entry
- `PUT /api/meal-plans/:id/entries/:entryId` — update entry
- `DELETE /api/meal-plans/:id/entries/:entryId` — remove entry

### Shopping Lists
- `GET /api/shopping-lists` — list all
- `GET /api/shopping-lists/:id` — list with items
- `POST /api/shopping-lists` — create empty list
- `POST /api/shopping-lists/generate` — generate from meal plan (OpenAI consolidation)
- `PUT /api/shopping-lists/:id/items/:itemId` — update item (check/uncheck, qty, etc.)
- `POST /api/shopping-lists/:id/items` — add manual item (OpenAI parses freeform text)
- `DELETE /api/shopping-lists/:id/items/:itemId` — delete item
- `DELETE /api/shopping-lists/:id/checked` — clear all checked items

### Pantry
- `GET /api/pantry` — list all items
- `POST /api/pantry` — add item
- `PUT /api/pantry/:id` — update item
- `DELETE /api/pantry/:id` — delete item
- `POST /api/pantry/bulk-add` — add multiple items at once
- `POST /api/pantry/from-shopping-list` — move checked shopping items to pantry

## Notes

- Storage is in-memory (resets on server restart). Switch to Neon Postgres + Drizzle migrations when ready for persistence.
- OpenAI is used for: (1) consolidating shopping list ingredients, (2) parsing freeform ingredient text when manually adding to a shopping list.
- The `ingredients` string[] field on recipes is accepted at POST time and auto-converted to structured `recipeIngredients` via a simple parser; OpenAI is not used for this by default (to avoid latency on manual recipe add).
