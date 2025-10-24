import { useState } from "react";
import { ArrowLeft, Share2, Heart, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ServingsCalculator } from "@/components/ServingsCalculator";
import { IngredientsList } from "@/components/IngredientsList";
import { InstructionsList } from "@/components/InstructionsList";
import { NutritionPanel } from "@/components/NutritionPanel";
import { useLocation } from "wouter";
import cookiesImage from "@assets/generated_images/chocolate_chip_cookies_recipe_2fbf360c.png";

// TODO: remove mock functionality
const mockRecipe = {
  id: "1",
  title: "Chocolate Chip Cookies",
  description: "Classic homemade chocolate chip cookies with a crispy edge and chewy center. Perfect for any occasion!",
  imageUrl: cookiesImage,
  prepTime: 15,
  cookTime: 12,
  servings: 24,
  ingredients: [
    "2 1/4 cups all-purpose flour",
    "1 cup butter, softened",
    "3/4 cup granulated sugar",
    "3/4 cup packed brown sugar",
    "2 large eggs",
    "2 tsp vanilla extract",
    "1 tsp baking soda",
    "1/2 tsp salt",
    "2 cups chocolate chips",
  ],
  instructions: [
    "Preheat oven to 375°F (190°C).",
    "In a large bowl, cream together butter and sugars until light and fluffy, about 3-4 minutes.",
    "Beat in eggs one at a time, then stir in vanilla extract.",
    "In a separate bowl, whisk together flour, baking soda, and salt.",
    "Gradually blend the dry ingredients into the butter mixture.",
    "Fold in chocolate chips until evenly distributed.",
    "Drop rounded tablespoons of dough onto ungreased cookie sheets, spacing them 2 inches apart.",
    "Bake for 9 to 11 minutes or until golden brown around the edges.",
    "Cool on baking sheet for 2 minutes before removing to a wire rack.",
  ],
  category: "Dessert",
  tags: ["Cookies", "Chocolate", "Baking"],
  calories: 150,
  protein: 2,
  carbs: 20,
  fats: 7,
};

export default function RecipeDetail() {
  const [, setLocation] = useLocation();
  const [servings, setServings] = useState(mockRecipe.servings);
  const [isFavorite, setIsFavorite] = useState(false);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="relative">
        <div className="aspect-video bg-muted overflow-hidden">
          <img
            src={mockRecipe.imageUrl}
            alt={mockRecipe.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/20" />
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm hover:bg-background"
          onClick={() => setLocation("/")}
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div className="absolute top-4 right-4 flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="bg-background/90 backdrop-blur-sm hover:bg-background"
            onClick={() => console.log("Share clicked")}
            data-testid="button-share"
          >
            <Share2 className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="bg-background/90 backdrop-blur-sm hover:bg-background"
            onClick={() => setIsFavorite(!isFavorite)}
            data-testid="button-favorite"
          >
            <Heart
              className={`w-5 h-5 ${
                isFavorite ? "fill-red-500 text-red-500" : ""
              }`}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="bg-background/90 backdrop-blur-sm hover:bg-background"
            onClick={() => console.log("Edit clicked")}
            data-testid="button-edit"
          >
            <Edit className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="font-serif text-3xl font-bold mb-2">
            {mockRecipe.title}
          </h1>
          {mockRecipe.description && (
            <p className="text-muted-foreground">{mockRecipe.description}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">
            Prep: {mockRecipe.prepTime} min
          </Badge>
          <Badge variant="secondary">
            Cook: {mockRecipe.cookTime} min
          </Badge>
          <Badge variant="secondary">
            Total: {mockRecipe.prepTime + mockRecipe.cookTime} min
          </Badge>
          {mockRecipe.category && (
            <Badge>{mockRecipe.category}</Badge>
          )}
        </div>

        <Card className="p-6">
          <ServingsCalculator
            servings={servings}
            onServingsChange={setServings}
          />
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Ingredients</h2>
          <IngredientsList
            ingredients={mockRecipe.ingredients}
            originalServings={mockRecipe.servings}
            currentServings={servings}
          />
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Instructions</h2>
          <InstructionsList instructions={mockRecipe.instructions} />
        </Card>

        <NutritionPanel
          calories={mockRecipe.calories}
          protein={mockRecipe.protein}
          carbs={mockRecipe.carbs}
          fats={mockRecipe.fats}
        />

        {mockRecipe.tags && mockRecipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {mockRecipe.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
