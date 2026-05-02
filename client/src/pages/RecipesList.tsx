import { useState, useMemo } from "react";
import { Printer, Scale, Utensils, Coffee, Cake, Salad, Book } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/SearchBar";
import { EmptyState } from "@/components/EmptyState";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CategorySection } from "@/components/CategorySection";
import { AdvancedFilters, type FilterState } from "@/components/AdvancedFilters";
import { MeasurementConverter } from "@/components/MeasurementConverter";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { RecipeWithIngredients } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

export default function RecipesList() {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterState>({ ingredients: [], tags: [], maxTime: 120 });
  const [showConverter, setShowConverter] = useState(false);
  const [, setLocation] = useLocation();

  const { data: recipes = [], isLoading } = useQuery<RecipeWithIngredients[]>({
    queryKey: ["/api/recipes"],
  });

  const filteredRecipes = useMemo(() => {
    return recipes.filter((recipe) => {
      const matchesSearch = recipe.title.toLowerCase().includes(search.toLowerCase());

      const ingredientNames = recipe.recipeIngredients.map((i) => i.ingredientName.toLowerCase());
      const matchesIngredients =
        filters.ingredients.length === 0 ||
        filters.ingredients.every((ing) =>
          ingredientNames.some((n) => n.includes(ing.toLowerCase()))
        );

      const matchesTags =
        filters.tags.length === 0 ||
        filters.tags.some((tag) => recipe.tags?.includes(tag));

      const totalTime = (recipe.prepTime ?? 0) + (recipe.cookTime ?? 0);
      const matchesTime = totalTime <= filters.maxTime;

      return matchesSearch && matchesIngredients && matchesTags && matchesTime;
    });
  }, [recipes, search, filters]);

  const groupedByCategory = useMemo(() => {
    const groups: Record<string, typeof filteredRecipes> = {};
    filteredRecipes.forEach((recipe) => {
      const category = recipe.category ?? "Uncategorized";
      if (!groups[category]) groups[category] = [];
      groups[category].push(recipe);
    });
    return groups;
  }, [filteredRecipes]);

  const categoryIcons: Record<string, React.ReactNode> = {
    Breakfast: <Coffee className="w-5 h-5" />,
    "Main Courses": <Utensils className="w-5 h-5" />,
    Desserts: <Cake className="w-5 h-5" />,
    Salads: <Salad className="w-5 h-5" />,
    Uncategorized: <Book className="w-5 h-5" />,
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
            <h1 className="font-serif text-3xl font-bold text-primary cookbook-corner">
              My Recipe Collection
            </h1>
            <div className="flex items-center gap-2 no-print">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowConverter(!showConverter)}
                title="Measurement Converter"
                data-testid="button-toggle-converter"
              >
                <Scale className="w-5 h-5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => window.print()}
                title="Print Recipes"
                data-testid="button-print"
              >
                <Printer className="w-5 h-5" />
              </Button>
              <AdvancedFilters onFilterChange={setFilters} />
              <ThemeToggle />
            </div>
          </div>
          <div className="no-print">
            <SearchBar value={search} onChange={setSearch} />
          </div>
        </div>
        <div className="vintage-divider max-w-5xl mx-auto" />
      </header>

      {showConverter && (
        <div className="max-w-5xl mx-auto px-4 py-4 no-print">
          <MeasurementConverter />
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-md" />
            ))}
          </div>
        ) : Object.keys(groupedByCategory).length === 0 ? (
          <EmptyState
            title={search || filters.ingredients.length > 0 || filters.tags.length > 0 ? "No recipes found" : "No recipes yet"}
            description={
              search || filters.ingredients.length > 0 || filters.tags.length > 0
                ? "Try adjusting your search or filters."
                : "Start building your collection by adding your first recipe or importing from a URL."
            }
            actionLabel={search || filters.ingredients.length > 0 || filters.tags.length > 0 ? undefined : "Add Your First Recipe"}
            onAction={() => setLocation("/add")}
          />
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedByCategory).map(([category, cats]) => (
              <CategorySection
                key={category}
                category={category}
                recipes={cats}
                icon={categoryIcons[category] ?? <Book className="w-5 h-5" />}
                defaultOpen={Object.keys(groupedByCategory).length === 1}
                onRecipeClick={(id) => setLocation(`/recipe/${id}`)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
