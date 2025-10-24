import { useState } from "react";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RecipeCard } from "@/components/RecipeCard";
import { SearchBar } from "@/components/SearchBar";
import { EmptyState } from "@/components/EmptyState";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useLocation } from "wouter";
import cookiesImage from "@assets/generated_images/chocolate_chip_cookies_recipe_2fbf360c.png";
import pastaImage from "@assets/generated_images/pasta_carbonara_recipe_image_0e830503.png";
import saladImage from "@assets/generated_images/fresh_garden_salad_recipe_a3153931.png";

// TODO: remove mock functionality
const mockRecipes = [
  {
    id: "1",
    title: "Chocolate Chip Cookies",
    imageUrl: cookiesImage,
    prepTime: 15,
    cookTime: 12,
    servings: 24,
    calories: 150,
  },
  {
    id: "2",
    title: "Pasta Carbonara",
    imageUrl: pastaImage,
    prepTime: 10,
    cookTime: 20,
    servings: 4,
    calories: 450,
  },
  {
    id: "3",
    title: "Fresh Garden Salad",
    imageUrl: saladImage,
    prepTime: 15,
    cookTime: 0,
    servings: 4,
    calories: 120,
  },
];

export default function RecipesList() {
  const [search, setSearch] = useState("");
  const [, setLocation] = useLocation();

  const filteredRecipes = mockRecipes.filter((recipe) =>
    recipe.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <h1 className="font-serif text-2xl font-bold">My Recipes</h1>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" data-testid="button-filter">
              <Filter className="w-5 h-5" />
            </Button>
            <ThemeToggle />
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-4 pb-3">
          <SearchBar value={search} onChange={setSearch} />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {filteredRecipes.length === 0 ? (
          <EmptyState
            title={search ? "No recipes found" : "No recipes yet"}
            description={
              search
                ? "Try adjusting your search to find what you're looking for."
                : "Start building your collection by adding your first recipe or importing from a URL."
            }
            actionLabel={search ? undefined : "Add Your First Recipe"}
            onAction={() => setLocation("/add")}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                {...recipe}
                onClick={() => setLocation(`/recipe/${recipe.id}`)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
