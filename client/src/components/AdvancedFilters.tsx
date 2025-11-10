import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

interface AdvancedFiltersProps {
  onFilterChange: (filters: FilterState) => void;
}

export interface FilterState {
  ingredients: string[];
  tags: string[];
  maxTime: number;
}

const availableTags = [
  "Vegetarian",
  "Vegan",
  "Gluten-Free",
  "Quick",
  "Baking",
  "Dessert",
  "Breakfast",
  "Lunch",
  "Dinner",
  "Italian",
  "Mexican",
  "Asian",
];

export function AdvancedFilters({ onFilterChange }: AdvancedFiltersProps) {
  const [open, setOpen] = useState(false);
  const [ingredientInput, setIngredientInput] = useState("");
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [maxTime, setMaxTime] = useState([120]);

  const addIngredient = () => {
    if (ingredientInput.trim() && !selectedIngredients.includes(ingredientInput.trim())) {
      const newIngredients = [...selectedIngredients, ingredientInput.trim()];
      setSelectedIngredients(newIngredients);
      setIngredientInput("");
    }
  };

  const removeIngredient = (ingredient: string) => {
    setSelectedIngredients(selectedIngredients.filter((i) => i !== ingredient));
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const applyFilters = () => {
    onFilterChange({
      ingredients: selectedIngredients,
      tags: selectedTags,
      maxTime: maxTime[0],
    });
    setOpen(false);
  };

  const clearFilters = () => {
    setSelectedIngredients([]);
    setSelectedTags([]);
    setMaxTime([120]);
    onFilterChange({
      ingredients: [],
      tags: [],
      maxTime: 120,
    });
  };

  const activeFilterCount =
    selectedIngredients.length + selectedTags.length + (maxTime[0] < 120 ? 1 : 0);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative" data-testid="button-filters">
          <SlidersHorizontal className="w-5 h-5" />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Advanced Filters</SheetTitle>
          <SheetDescription>
            Filter recipes by ingredients, tags, and cooking time
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          <div>
            <Label htmlFor="ingredient" className="text-base font-semibold mb-2 block">
              Search by Ingredient
            </Label>
            <div className="flex gap-2">
              <Input
                id="ingredient"
                value={ingredientInput}
                onChange={(e) => setIngredientInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addIngredient()}
                placeholder="e.g., chicken, tomato"
                data-testid="input-ingredient"
              />
              <Button onClick={addIngredient} data-testid="button-add-ingredient">
                Add
              </Button>
            </div>
            {selectedIngredients.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {selectedIngredients.map((ingredient) => (
                  <Badge
                    key={ingredient}
                    variant="secondary"
                    className="gap-1 pr-1"
                  >
                    {ingredient}
                    <button
                      onClick={() => removeIngredient(ingredient)}
                      className="hover-elevate rounded-full p-0.5"
                      data-testid={`button-remove-ingredient-${ingredient}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label className="text-base font-semibold mb-3 block">Filter by Tags</Label>
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer hover-elevate active-elevate-2"
                  onClick={() => toggleTag(tag)}
                  data-testid={`badge-tag-${tag.toLowerCase()}`}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-base font-semibold mb-3 block">
              Maximum Cooking Time: {maxTime[0]} minutes
            </Label>
            <Slider
              value={maxTime}
              onValueChange={setMaxTime}
              max={120}
              step={5}
              className="mt-2"
              data-testid="slider-max-time"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>0 min</span>
              <span>120 min</span>
            </div>
          </div>
        </div>

        <SheetFooter className="flex gap-2">
          <Button variant="outline" onClick={clearFilters} className="flex-1" data-testid="button-clear-filters">
            Clear All
          </Button>
          <Button onClick={applyFilters} className="flex-1" data-testid="button-apply-filters">
            Apply Filters
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
