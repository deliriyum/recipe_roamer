import { useState, useMemo } from "react";
import { Printer, Scale, Book, Coffee, Utensils, UtensilsCrossed, Apple, Flame, Salad, IceCream, Cookie, PartyPopper } from "lucide-react";
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
import { PREDEFINED_TAGS } from "@/lib/tags";

const TAG_ICONS: Record<string, React.ReactNode> = {
  Breakfast:  <Coffee className="w-5 h-5" />,
  Lunch:      <Utensils className="w-5 h-5" />,
  Dinner:     <UtensilsCrossed className="w-5 h-5" />,
  Snack:      <Apple className="w-5 h-5" />,
  Soup:       <Flame className="w-5 h-5" />,
  Appetizer:  <Salad className="w-5 h-5" />,
  Dessert:    <IceCream className="w-5 h-5" />,
  Pastry:     <Cookie className="w-5 h-5" />,
  Party:      <PartyPopper className="w-5 h-5" />,
};

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

  // Normalize "dinner" → "Dinner" etc. for imported recipes with lowercase tags
  const normalizeTag = (tag: string): string => {
    const match = PREDEFINED_TAGS.find((p) => p.toLowerCase() === tag.toLowerCase());
    return match ?? tag;
  };

  // Group by tags — a recipe with multiple tags appears in each matching section
  const groupedByTag = useMemo(() => {
    const groups: Record<string, typeof filteredRecipes> = {};

    filteredRecipes.forEach((recipe) => {
      const recipeTags = recipe.tags && recipe.tags.length > 0 ? recipe.tags : ["Uncategorized"];
      recipeTags.forEach((rawTag) => {
        const tag = normalizeTag(rawTag);
        if (!groups[tag]) groups[tag] = [];
        groups[tag].push(recipe);
      });
    });

    // Sort: predefined tags first (in order), then custom alphabetically, Uncategorized last
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      const ai = PREDEFINED_TAGS.indexOf(a as typeof PREDEFINED_TAGS[number]);
      const bi = PREDEFINED_TAGS.indexOf(b as typeof PREDEFINED_TAGS[number]);
      if (a === "Uncategorized") return 1;
      if (b === "Uncategorized") return -1;
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.localeCompare(b);
    });

    const sorted: Record<string, typeof filteredRecipes> = {};
    sortedKeys.forEach((k) => { sorted[k] = groups[k]; });
    return sorted;
  }, [filteredRecipes]);

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
        ) : Object.keys(groupedByTag).length === 0 ? (
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
            {Object.entries(groupedByTag).map(([tag, tagRecipes]) => (
              <CategorySection
                key={tag}
                category={tag}
                recipes={tagRecipes}
                icon={TAG_ICONS[tag] ?? <Book className="w-5 h-5" />}
                defaultOpen={Object.keys(groupedByTag).length === 1}
                onRecipeClick={(id) => setLocation(`/recipe/${id}`)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
