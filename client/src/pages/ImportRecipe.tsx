import { useState } from "react";
import { ArrowLeft, Link as LinkIcon, FileJson, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import { ImageUpload } from "@/components/ImageUpload";
import handwrittenRecipe from "@assets/generated_images/handwritten_recipe_card_example_9ba00a61.png";

export default function ImportRecipe() {
  const [, setLocation] = useLocation();
  const [url, setUrl] = useState("");
  const [jsonInput, setJsonInput] = useState("");
  const [ocrImage, setOcrImage] = useState<string>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedText, setExtractedText] = useState("");

  const handleUrlImport = () => {
    console.log("Importing from URL:", url);
    setLocation("/");
  };

  const handleJsonImport = () => {
    console.log("Importing from JSON:", jsonInput);
    setLocation("/");
  };

  const handleOcrProcess = () => {
    if (!ocrImage) return;
    
    setIsProcessing(true);
    
    // TODO: remove mock functionality - simulate OCR processing
    setTimeout(() => {
      setExtractedText(`Chocolate Chip Cookies

Ingredients:
- 2 1/4 cups all-purpose flour
- 1 cup butter, softened
- 3/4 cup sugar
- 2 eggs
- 2 tsp vanilla extract
- 1 tsp baking soda
- 1/2 tsp salt
- 2 cups chocolate chips

Instructions:
1. Preheat oven to 375°F
2. Cream butter and sugar until fluffy
3. Beat in eggs and vanilla
4. Mix in dry ingredients
5. Fold in chocolate chips
6. Drop spoonfuls onto baking sheet
7. Bake for 9-11 minutes`);
      setIsProcessing(false);
    }, 2000);
  };

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
              <LinkIcon className="w-4 h-4 mr-2" />
              URL
            </TabsTrigger>
            <TabsTrigger value="json" data-testid="tab-json">
              <FileJson className="w-4 h-4 mr-2" />
              JSON
            </TabsTrigger>
            <TabsTrigger value="ocr" data-testid="tab-ocr">
              <Camera className="w-4 h-4 mr-2" />
              OCR
            </TabsTrigger>
          </TabsList>

          <TabsContent value="url" className="space-y-4">
            <Card className="p-6 space-y-4">
              <div>
                <Label htmlFor="url" className="text-base font-semibold">
                  Recipe URL
                </Label>
                <p className="text-sm text-muted-foreground mt-1 mb-3">
                  Paste a URL from popular recipe sites that support Schema.org Recipe format
                </p>
                <Input
                  id="url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/recipe"
                  data-testid="input-url"
                />
              </div>
              <Button
                onClick={handleUrlImport}
                disabled={!url}
                className="w-full"
                data-testid="button-import-url"
              >
                Import from URL
              </Button>
            </Card>
          </TabsContent>

          <TabsContent value="json" className="space-y-4">
            <Card className="p-6 space-y-4">
              <div>
                <Label htmlFor="json" className="text-base font-semibold">
                  Recipe JSON
                </Label>
                <p className="text-sm text-muted-foreground mt-1 mb-3">
                  Paste Schema.org Recipe JSON-LD format
                </p>
                <Textarea
                  id="json"
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder='{"@type": "Recipe", "name": "...", ...}'
                  className="font-mono text-sm min-h-48"
                  data-testid="input-json"
                />
              </div>
              <Button
                onClick={handleJsonImport}
                disabled={!jsonInput}
                className="w-full"
                data-testid="button-import-json"
              >
                Import from JSON
              </Button>
            </Card>
          </TabsContent>

          <TabsContent value="ocr" className="space-y-4">
            <Card className="p-6 space-y-4">
              <div>
                <Label className="text-base font-semibold">
                  Upload Recipe Image
                </Label>
                <p className="text-sm text-muted-foreground mt-1 mb-3">
                  Upload a photo of a handwritten or printed recipe, and we'll extract the text using AI
                </p>
                {!ocrImage && (
                  <div className="mb-4 p-4 bg-muted rounded-lg">
                    <img
                      src={handwrittenRecipe}
                      alt="Example handwritten recipe"
                      className="w-full rounded-md"
                    />
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      Example: Handwritten recipe card
                    </p>
                  </div>
                )}
                <ImageUpload value={ocrImage} onChange={setOcrImage} />
              </div>

              {ocrImage && !extractedText && (
                <Button
                  onClick={handleOcrProcess}
                  disabled={isProcessing}
                  className="w-full"
                  data-testid="button-process-ocr"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin mr-2" />
                      Analyzing Recipe...
                    </>
                  ) : (
                    "Extract Text from Image"
                  )}
                </Button>
              )}

              {extractedText && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="extracted" className="text-base font-semibold">
                      Extracted Text
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1 mb-3">
                      Review and edit the extracted text before creating the recipe
                    </p>
                    <Textarea
                      id="extracted"
                      value={extractedText}
                      onChange={(e) => setExtractedText(e.target.value)}
                      className="min-h-64 font-mono text-sm"
                      data-testid="textarea-extracted-text"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setExtractedText("");
                        setOcrImage(undefined);
                      }}
                      className="flex-1"
                      data-testid="button-try-again"
                    >
                      Try Again
                    </Button>
                    <Button
                      onClick={() => {
                        console.log("Creating recipe from OCR:", extractedText);
                        setLocation("/add");
                      }}
                      className="flex-1"
                      data-testid="button-create-recipe"
                    >
                      Create Recipe
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
