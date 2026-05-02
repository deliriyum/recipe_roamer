import { useState } from "react";
import { ArrowLeft, Share2, Heart, Edit, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ServingsCalculator } from "@/components/ServingsCalculator";
import { IngredientsList } from "@/components/IngredientsList";
import { InstructionsList } from "@/components/InstructionsList";
import { NutritionPanel } from "@/components/NutritionPanel";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { RecipeWithIngredients } from "@shared/schema";

export default function RecipeDetail() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const [isFavorite, setIsFavorite] = useState(false);
  const { toast } = useToast();

  const { data: recipe, isLoading, error } = useQuery<RecipeWithIngredients>({
    queryKey: ["/api/recipes", params.id],
  });

  const [servings, setServings] = useState<number | null>(null);
  const currentServings = servings ?? recipe?.servings ?? 4;

  const addToListMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/shopping-lists/from-recipe", {
        recipeId: recipe!.id,
        servings: currentServings,
      });
      return res.json();
    },
    onSuccess: (list) => {
      queryClient.invalidateQueries({ queryKey: ["/api/shopping-lists"] });
      toast({
        title: "Added to shopping list",
        description: `${recipe!.recipeIngredients.length} ingredients added.`,
        action: (
          <Button variant="outline" size="sm" onClick={() => setLocation("/shopping")}>
            View List
          </Button>
        ),
      });
    },
    onError: () => {
      toast({ title: "Failed to add to shopping list", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Skeleton className="aspect-video w-full" />
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Recipe not found.</p>
          <Button onClick={() => setLocation("/")}>Back to Recipes</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="relative">
        {recipe.imageUrl ? (
          <div className="aspect-video bg-muted overflow-hidden">
            <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/20" />
          </div>
        ) : (
          <div className="aspect-video bg-muted flex items-center justify-center">
            <span className="text-muted-foreground text-lg font-serif">{recipe.category}</span>
          </div>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm"
          onClick={() => setLocation("/")}
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div className="absolute top-4 right-4 flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="bg-background/90 backdrop-blur-sm"
            onClick={() => setIsFavorite(!isFavorite)}
            data-testid="button-favorite"
          >
            <Heart className={`w-5 h-5 ${isFavorite ? "fill-red-500 text-red-500" : ""}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="bg-background/90 backdrop-blur-sm"
            onClick={() => window.print()}
            data-testid="button-share"
          >
            <Share2 className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="bg-background/90 backdrop-blur-sm"
            onClick={() => console.log("Edit recipe:", recipe.id)}
            data-testid="button-edit"
          >
            <Edit className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="font-serif text-3xl font-bold mb-2">{recipe.title}</h1>
          {recipe.description && (
            <p className="text-muted-foreground">{recipe.description}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {recipe.prepTime != null && (
            <Badge variant="secondary">Prep: {recipe.prepTime} min</Badge>
          )}
          {recipe.cookTime != null && (
            <Badge variant="secondary">Cook: {recipe.cookTime} min</Badge>
          )}
          {recipe.prepTime != null && recipe.cookTime != null && (
            <Badge variant="secondary">Total: {recipe.prepTime + recipe.cookTime} min</Badge>
          )}
          <Badge>{recipe.category}</Badge>
        </div>

        <Card className="p-6">
          <ServingsCalculator
            servings={currentServings}
            onServingsChange={setServings}
          />
        </Card>

        <Card className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h2 className="text-xl font-semibold">Ingredients</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => addToListMutation.mutate()}
              disabled={addToListMutation.isPending || !recipe.recipeIngredients.length}
              data-testid="button-add-to-shopping-list"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              {addToListMutation.isPending ? "Adding…" : "Add to Shopping List"}
            </Button>
          </div>
          <IngredientsList
            ingredients={recipe.recipeIngredients}
            originalServings={recipe.servings}
            currentServings={currentServings}
          />
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Instructions</h2>
          <InstructionsList instructions={recipe.instructions ?? []} />
        </Card>

        {(recipe.calories || recipe.protein || recipe.carbs || recipe.fats) && (
          <NutritionPanel
            calories={recipe.calories}
            protein={recipe.protein}
            carbs={recipe.carbs}
            fats={recipe.fats}
          />
        )}

        {recipe.tags && recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {recipe.tags.map((tag) => (
              <Badge key={tag} variant="outline">{tag}</Badge>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
