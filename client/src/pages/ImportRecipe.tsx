import { useState } from "react";
import { ArrowLeft, Link as LinkIcon, FileJson, Camera, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import { ImageUpload } from "@/components/ImageUpload";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { RecipeWithIngredients } from "@shared/schema";
import handwrittenRecipe from "@assets/generated_images/handwritten_recipe_card_example_9ba00a61.png";

export default function ImportRecipe() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [url, setUrl] = useState("");
  const [jsonInput, setJsonInput] = useState("");
  const [ocrImage, setOcrImage] = useState<string>();
  const [imported, setImported] = useState<RecipeWithIngredients | null>(null);

  const onSuccess = (recipe: RecipeWithIngredients) => {
    queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
    setImported(recipe);
    toast({
      title: "Recipe imported!",
      description: `"${recipe.title}" has been added to your collection.`,
    });
  };

  const urlMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/import/url", { url });
      if (res.status === 409) {
        const data = await res.json();
        return { __duplicate: true, recipe: data.recipe as RecipeWithIngredients };
      }
      return res.json() as Promise<RecipeWithIngredients>;
    },
    onSuccess: (data: any) => {
      if (data.__duplicate) {
        setImported(data.recipe);
        toast({
          title: "Already in your collection",
          description: `"${data.recipe.title}" was imported before — showing the existing recipe.`,
        });
        return;
      }
      onSuccess(data);
    },
    onError: (err) =>
      toast({ title: "Import failed", description: String(err), variant: "destructive" }),
  });

  const jsonMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/import/json", { json: jsonInput });
      return res.json() as Promise<RecipeWithIngredients>;
    },
    onSuccess,
    onError: (err) =>
      toast({ title: "Import failed", description: String(err), variant: "destructive" }),
  });

  const ocrMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/import/ocr", { imageBase64: ocrImage });
      return res.json() as Promise<RecipeWithIngredients>;
    },
    onSuccess,
    onError: (err) =>
      toast({ title: "OCR failed", description: String(err), variant: "destructive" }),
  });

  if (imported) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-6">
          <CheckCircle className="w-16 h-16 text-primary mx-auto" />
          <div>
            <h2 className="font-serif text-2xl font-bold mb-1">Recipe Imported!</h2>
            <p className="text-muted-foreground text-sm">
              "{imported.title}" has been added to your collection.
            </p>
          </div>
          <Card className="p-4 text-left space-y-2">
            <p className="font-semibold text-sm">{imported.title}</p>
            <div className="text-xs text-muted-foreground space-y-1">
              {imported.prepTime != null && <p>Prep: {imported.prepTime} min</p>}
              {imported.cookTime != null && <p>Cook: {imported.cookTime} min</p>}
              <p>Servings: {imported.servings}</p>
              <p>{imported.recipeIngredients.length} ingredients · {imported.instructions?.length ?? 0} steps</p>
            </div>
          </Card>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setImported(null);
                setUrl("");
                setJsonInput("");
                setOcrImage(undefined);
              }}
              data-testid="button-import-another"
            >
              Import Another
            </Button>
            <Button
              className="flex-1"
              onClick={() => setLocation(`/recipe/${imported.id}`)}
              data-testid="button-view-recipe"
            >
              View Recipe
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/")}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-serif text-2xl font-bold">Import Recipe</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <Tabs defaultValue="url" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="url" data-testid="tab-url">
              <LinkIcon className="w-4 h-4 mr-2" />URL
            </TabsTrigger>
            <TabsTrigger value="json" data-testid="tab-json">
              <FileJson className="w-4 h-4 mr-2" />JSON
            </TabsTrigger>
            <TabsTrigger value="ocr" data-testid="tab-ocr">
              <Camera className="w-4 h-4 mr-2" />Photo
            </TabsTrigger>
          </TabsList>

          {/* ── URL TAB ── */}
          <TabsContent value="url" className="space-y-4">
            <Card className="p-6 space-y-4">
              <div>
                <Label htmlFor="url" className="text-base font-semibold">Recipe URL</Label>
                <p className="text-sm text-muted-foreground mt-1 mb-3">
                  Paste a link from any recipe website. We'll extract it automatically — works best with sites that use Schema.org (AllRecipes, Food Network, NYT Cooking, etc.).
                </p>
                <Input
                  id="url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && url.trim()) urlMutation.mutate(); }}
                  placeholder="https://www.allrecipes.com/recipe/…"
                  data-testid="input-url"
                />
              </div>
              <Button
                onClick={() => urlMutation.mutate()}
                disabled={!url.trim() || urlMutation.isPending}
                className="w-full"
                data-testid="button-import-url"
              >
                {urlMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Fetching &amp; Parsing…</>
                ) : "Import from URL"}
              </Button>
              {urlMutation.isPending && (
                <p className="text-xs text-center text-muted-foreground">
                  Fetching the page and extracting recipe data — this takes a few seconds…
                </p>
              )}
            </Card>
          </TabsContent>

          {/* ── JSON TAB ── */}
          <TabsContent value="json" className="space-y-4">
            <Card className="p-6 space-y-4">
              <div>
                <Label htmlFor="json" className="text-base font-semibold">Recipe JSON</Label>
                <p className="text-sm text-muted-foreground mt-1 mb-3">
                  Paste Schema.org Recipe JSON-LD (the structured data embedded in recipe sites). You can find it by right-clicking any recipe page → View Source → search for <code className="bg-muted px-1 rounded text-xs">"@type":"Recipe"</code>.
                </p>
                <Textarea
                  id="json"
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder={'{\n  "@type": "Recipe",\n  "name": "…",\n  "recipeIngredient": […],\n  …\n}'}
                  className="font-mono text-sm min-h-48"
                  data-testid="input-json"
                />
              </div>
              <Button
                onClick={() => jsonMutation.mutate()}
                disabled={!jsonInput.trim() || jsonMutation.isPending}
                className="w-full"
                data-testid="button-import-json"
              >
                {jsonMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Parsing…</>
                ) : "Import from JSON"}
              </Button>
            </Card>
          </TabsContent>

          {/* ── OCR TAB ── */}
          <TabsContent value="ocr" className="space-y-4">
            <Card className="p-6 space-y-4">
              <div>
                <Label className="text-base font-semibold">Upload Recipe Photo</Label>
                <p className="text-sm text-muted-foreground mt-1 mb-3">
                  Take a photo of a handwritten or printed recipe card and AI will extract all the details automatically.
                </p>
                {!ocrImage && (
                  <div className="mb-4 p-4 bg-muted rounded-lg">
                    <img
                      src={handwrittenRecipe}
                      alt="Example handwritten recipe"
                      className="w-full rounded-md"
                    />
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      Example: handwritten recipe card
                    </p>
                  </div>
                )}
                <ImageUpload value={ocrImage} onChange={setOcrImage} />
              </div>

              {ocrImage && (
                <Button
                  onClick={() => ocrMutation.mutate()}
                  disabled={ocrMutation.isPending}
                  className="w-full"
                  data-testid="button-process-ocr"
                >
                  {ocrMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing Image…</>
                  ) : "Extract & Import Recipe"}
                </Button>
              )}
              {ocrMutation.isPending && (
                <p className="text-xs text-center text-muted-foreground">
                  AI is reading your recipe photo — usually takes 5–10 seconds…
                </p>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
