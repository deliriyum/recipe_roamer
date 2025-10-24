import { useState } from "react";
import { ArrowLeft, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ImageUpload } from "@/components/ImageUpload";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";

export default function AddRecipe() {
  const [, setLocation] = useLocation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<string>();
  const [prepTime, setPrepTime] = useState("");
  const [cookTime, setCookTime] = useState("");
  const [servings, setServings] = useState("");
  const [ingredients, setIngredients] = useState<string[]>([""]);
  const [instructions, setInstructions] = useState<string[]>([""]);

  const addIngredient = () => {
    setIngredients([...ingredients, ""]);
  };

  const updateIngredient = (index: number, value: string) => {
    const newIngredients = [...ingredients];
    newIngredients[index] = value;
    setIngredients(newIngredients);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const addInstruction = () => {
    setInstructions([...instructions, ""]);
  };

  const updateInstruction = (index: number, value: string) => {
    const newInstructions = [...instructions];
    newInstructions[index] = value;
    setInstructions(newInstructions);
  };

  const removeInstruction = (index: number) => {
    setInstructions(instructions.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    console.log("Recipe submitted:", {
      title,
      description,
      image,
      prepTime,
      cookTime,
      servings,
      ingredients: ingredients.filter((i) => i.trim()),
      instructions: instructions.filter((i) => i.trim()),
    });
    setLocation("/");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/")}
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-serif text-2xl font-bold">Add Recipe</h1>
          </div>
          <Button onClick={handleSubmit} data-testid="button-save-recipe">
            Save Recipe
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <Card className="p-6">
          <Label className="text-base font-semibold mb-2 block">
            Recipe Image
          </Label>
          <ImageUpload value={image} onChange={setImage} />
        </Card>

        <Card className="p-6 space-y-4">
          <div>
            <Label htmlFor="title" className="text-base font-semibold">
              Recipe Title
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Chocolate Chip Cookies"
              className="mt-2"
              data-testid="input-title"
            />
          </div>

          <div>
            <Label htmlFor="description" className="text-base font-semibold">
              Description (Optional)
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description of your recipe..."
              className="mt-2 min-h-20"
              data-testid="input-description"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="prepTime" className="text-sm font-medium">
                Prep Time (min)
              </Label>
              <Input
                id="prepTime"
                type="number"
                value={prepTime}
                onChange={(e) => setPrepTime(e.target.value)}
                placeholder="15"
                className="mt-2"
                data-testid="input-prep-time"
              />
            </div>
            <div>
              <Label htmlFor="cookTime" className="text-sm font-medium">
                Cook Time (min)
              </Label>
              <Input
                id="cookTime"
                type="number"
                value={cookTime}
                onChange={(e) => setCookTime(e.target.value)}
                placeholder="30"
                className="mt-2"
                data-testid="input-cook-time"
              />
            </div>
            <div>
              <Label htmlFor="servings" className="text-sm font-medium">
                Servings
              </Label>
              <Input
                id="servings"
                type="number"
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                placeholder="4"
                className="mt-2"
                data-testid="input-servings"
              />
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Ingredients</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={addIngredient}
              data-testid="button-add-ingredient"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>

          <div className="space-y-3">
            {ingredients.map((ingredient, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={ingredient}
                  onChange={(e) => updateIngredient(index, e.target.value)}
                  placeholder={`Ingredient ${index + 1}`}
                  data-testid={`input-ingredient-${index}`}
                />
                {ingredients.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeIngredient(index)}
                    data-testid={`button-remove-ingredient-${index}`}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Instructions</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={addInstruction}
              data-testid="button-add-instruction"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Step
            </Button>
          </div>

          <div className="space-y-3">
            {instructions.map((instruction, index) => (
              <div key={index} className="flex gap-2">
                <div className="flex-shrink-0 w-8 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                  {index + 1}
                </div>
                <Textarea
                  value={instruction}
                  onChange={(e) => updateInstruction(index, e.target.value)}
                  placeholder={`Step ${index + 1}`}
                  className="min-h-9 resize-none"
                  rows={2}
                  data-testid={`input-instruction-${index}`}
                />
                {instructions.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeInstruction(index)}
                    data-testid={`button-remove-instruction-${index}`}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>
      </main>
    </div>
  );
}
