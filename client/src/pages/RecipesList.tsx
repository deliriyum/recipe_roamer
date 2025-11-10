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
    category: "Desserts",
    tags: ["Cookies", "Chocolate", "Baking", "Quick"],
    ingredients: ["flour", "butter", "sugar", "eggs", "chocolate chips"],
  },
  {
    id: "2",
    title: "Pasta Carbonara",
    imageUrl: pastaImage,
    prepTime: 10,
    cookTime: 20,
    servings: 4,
    category: "Main Courses",
    tags: ["Italian", "Pasta", "Quick", "Dinner"],
    ingredients: ["pasta", "eggs", "bacon", "parmesan", "black pepper"],
  },
  {
    id: "3",
    title: "Fresh Garden Salad",
    imageUrl: saladImage,
    prepTime: 15,
    cookTime: 0,
    servings: 4,
    category: "Salads",
    tags: ["Vegetarian", "Vegan", "Gluten-Free", "Quick", "Lunch"],
    ingredients: ["lettuce", "tomatoes", "cucumber", "carrots", "olive oil"],
  },
  {
    id: "4",
    title: "Blueberry Muffins",
    prepTime: 20,
    cookTime: 25,
    servings: 12,
    category: "Breakfast",
    tags: ["Baking", "Breakfast", "Quick"],
    ingredients: ["flour", "blueberries", "eggs", "milk", "sugar"],
  },
  {
    id: "5",
    title: "Chicken Stir Fry",
    prepTime: 15,
    cookTime: 15,
    servings: 4,
    category: "Main Courses",
    tags: ["Asian", "Quick", "Dinner"],
    ingredients: ["chicken", "vegetables", "soy sauce", "ginger", "garlic"],
  },
  {
    id: "6",
    title: "Apple Pie",
    prepTime: 30,
    cookTime: 60,
    servings: 8,
    category: "Desserts",
    tags: ["Baking", "Dessert"],
    ingredients: ["apples", "flour", "butter", "sugar", "cinnamon"],
  },
];

export default function RecipesList() {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterState>({
    ingredients: [],
    tags: [],
    maxTime: 120,
  });
  const [showConverter, setShowConverter] = useState(false);
  const [, setLocation] = useLocation();

  const filteredRecipes = useMemo(() => {
    return mockRecipes.filter((recipe) => {
      const matchesSearch = recipe.title.toLowerCase().includes(search.toLowerCase());
      
      const matchesIngredients =
        filters.ingredients.length === 0 ||
        filters.ingredients.every((ing) =>
          recipe.ingredients.some((recipeIng) =>
            recipeIng.toLowerCase().includes(ing.toLowerCase())
          )
        );
      
      const matchesTags =
        filters.tags.length === 0 ||
        filters.tags.some((tag) => recipe.tags?.includes(tag));
      
      const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);
      const matchesTime = totalTime <= filters.maxTime;

      return matchesSearch && matchesIngredients && matchesTags && matchesTime;
    });
  }, [search, filters]);

  const groupedByCategory = useMemo(() => {
    const groups: Record<string, typeof filteredRecipes> = {};
    filteredRecipes.forEach((recipe) => {
      const category = recipe.category || "Uncategorized";
      if (!groups[category]) {
        groups[category] = [];
      }
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
          <div className="flex items-center justify-between gap-4 mb-3">
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
        {Object.keys(groupedByCategory).length === 0 ? (
          <EmptyState
            title={search || filters.ingredients.length > 0 || filters.tags.length > 0 ? "No recipes found" : "No recipes yet"}
            description={
              search || filters.ingredients.length > 0 || filters.tags.length > 0
                ? "Try adjusting your search or filters to find what you're looking for."
                : "Start building your collection by adding your first recipe or importing from a URL."
            }
            actionLabel={search || filters.ingredients.length > 0 || filters.tags.length > 0 ? undefined : "Add Your First Recipe"}
            onAction={() => setLocation("/add")}
          />
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedByCategory).map(([category, recipes]) => (
              <CategorySection
                key={category}
                category={category}
                recipes={recipes}
                icon={categoryIcons[category] || <Book className="w-5 h-5" />}
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
