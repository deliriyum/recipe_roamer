import { useState } from "react";
import { ArrowLeft, Plus, X, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ImageUpload } from "@/components/ImageUpload";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = ["Breakfast", "Lunch", "Dinner", "Desserts", "Salads", "Main Courses", "Sides", "Snacks", "Uncategorized"];

export default function AddRecipe() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<string>();
  const [prepTime, setPrepTime] = useState("");
  const [cookTime, setCookTime] = useState("");
  const [servings, setServings] = useState("");
  const [category, setCategory] = useState("Uncategorized");
  const [tags, setTags] = useState("");
  const [ingredients, setIngredients] = useState<string[]>([""]);
  const [instructions, setInstructions] = useState<string[]>([""]);

  const createMutation = useMutation({
    mutationFn: async (data: unknown) => {
      const res = await apiRequest("POST", "/api/recipes", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
      toast({ title: "Recipe saved!", description: "Your recipe has been added to the collection." });
      setLocation("/");
    },
    onError: (err) => {
      toast({ title: "Error saving recipe", description: String(err), variant: "destructive" });
    },
  });

  const addIngredient = () => setIngredients([...ingredients, ""]);
  const updateIngredient = (i: number, v: string) => {
    const next = [...ingredients];
    next[i] = v;
    setIngredients(next);
  };
  const removeIngredient = (i: number) => setIngredients(ingredients.filter((_, idx) => idx !== i));

  const addInstruction = () => setInstructions([...instructions, ""]);
  const updateInstruction = (i: number, v: string) => {
    const next = [...instructions];
    next[i] = v;
    setInstructions(next);
  };
  const removeInstruction = (i: number) => setInstructions(instructions.filter((_, idx) => idx !== i));

  const handleSubmit = () => {
    if (!title.trim()) {
      toast({ title: "Title required", description: "Please enter a recipe title.", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      title: title.trim(),
      description: description.trim() || null,
      imageUrl: image ?? null,
      prepTime: prepTime ? parseInt(prepTime) : null,
      cookTime: cookTime ? parseInt(cookTime) : null,
      servings: servings ? parseInt(servings) : 4,
      category,
      tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      instructions: instructions.filter((i) => i.trim()),
      ingredients: ingredients.filter((i) => i.trim()),
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/")} data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-serif text-2xl font-bold">Add Recipe</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setLocation("/import")} data-testid="button-go-import">
              <LinkIcon className="w-4 h-4 mr-2" />Import
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending} data-testid="button-save-recipe">
              {createMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <Card className="p-6">
          <Label className="text-base font-semibold mb-2 block">Recipe Image</Label>
          <ImageUpload value={image} onChange={setImage} />
        </Card>

        <Card className="p-6 space-y-4">
          <div>
            <Label htmlFor="title" className="text-base font-semibold">Recipe Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Chocolate Chip Cookies" className="mt-2" data-testid="input-title" />
          </div>
          <div>
            <Label htmlFor="description" className="text-base font-semibold">Description (Optional)</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description…" className="mt-2 min-h-20" data-testid="input-description" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-2" data-testid="select-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="tags" className="text-sm font-medium">Tags (comma-separated)</Label>
              <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)}
                placeholder="Quick, Vegetarian…" className="mt-2" data-testid="input-tags" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="prepTime" className="text-sm font-medium">Prep Time (min)</Label>
              <Input id="prepTime" type="number" value={prepTime} onChange={(e) => setPrepTime(e.target.value)}
                placeholder="15" className="mt-2" data-testid="input-prep-time" />
            </div>
            <div>
              <Label htmlFor="cookTime" className="text-sm font-medium">Cook Time (min)</Label>
              <Input id="cookTime" type="number" value={cookTime} onChange={(e) => setCookTime(e.target.value)}
                placeholder="30" className="mt-2" data-testid="input-cook-time" />
            </div>
            <div>
              <Label htmlFor="servings" className="text-sm font-medium">Servings</Label>
              <Input id="servings" type="number" value={servings} onChange={(e) => setServings(e.target.value)}
                placeholder="4" className="mt-2" data-testid="input-servings" />
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Ingredients</Label>
            <Button variant="outline" size="sm" onClick={addIngredient} data-testid="button-add-ingredient">
              <Plus className="w-4 h-4 mr-1" />Add
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Format: "2 cups flour, sifted" — quantity, unit, name</p>
          <div className="space-y-3">
            {ingredients.map((ing, i) => (
              <div key={i} className="flex gap-2">
                <Input value={ing} onChange={(e) => updateIngredient(i, e.target.value)}
                  placeholder={`e.g., 2 cups flour`} data-testid={`input-ingredient-${i}`} />
                {ingredients.length > 1 && (
                  <Button variant="ghost" size="icon" onClick={() => removeIngredient(i)}
                    data-testid={`button-remove-ingredient-${i}`}>
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
            <Button variant="outline" size="sm" onClick={addInstruction} data-testid="button-add-instruction">
              <Plus className="w-4 h-4 mr-1" />Add Step
            </Button>
          </div>
          <div className="space-y-3">
            {instructions.map((ins, i) => (
              <div key={i} className="flex gap-2">
                <div className="flex-shrink-0 w-8 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                  {i + 1}
                </div>
                <Textarea value={ins} onChange={(e) => updateInstruction(i, e.target.value)}
                  placeholder={`Step ${i + 1}`} className="min-h-9 resize-none" rows={2}
                  data-testid={`input-instruction-${i}`} />
                {instructions.length > 1 && (
                  <Button variant="ghost" size="icon" onClick={() => removeInstruction(i)}
                    data-testid={`button-remove-instruction-${i}`}>
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
