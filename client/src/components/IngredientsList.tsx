import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import type { RecipeIngredient } from "@shared/schema";

interface IngredientsListProps {
  ingredients: RecipeIngredient[];
  originalServings: number;
  currentServings: number;
}

function formatIngredient(ing: RecipeIngredient, ratio: number): string {
  const parts: string[] = [];
  if (ing.quantity != null) {
    const adjusted = ing.quantity * ratio;
    const rounded = Math.round(adjusted * 100) / 100;
    parts.push(String(rounded));
  }
  if (ing.unit) parts.push(ing.unit);
  parts.push(ing.ingredientName);
  if (ing.notes) parts.push(`(${ing.notes})`);
  return parts.join(" ");
}

export function IngredientsList({ ingredients, originalServings, currentServings }: IngredientsListProps) {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const ratio = originalServings > 0 ? currentServings / originalServings : 1;

  const toggle = (id: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!ingredients || ingredients.length === 0) {
    return <p className="text-muted-foreground text-sm">No ingredients listed.</p>;
  }

  return (
    <div className="space-y-3">
      {ingredients.map((ing) => {
        const isChecked = checkedItems.has(ing.id);
        return (
          <div
            key={ing.id}
            className="flex items-start gap-3"
            data-testid={`ingredient-item-${ing.id}`}
          >
            <Checkbox
              id={`ing-${ing.id}`}
              checked={isChecked}
              onCheckedChange={() => toggle(ing.id)}
              className="mt-1"
              data-testid={`checkbox-ingredient-${ing.id}`}
            />
            <label
              htmlFor={`ing-${ing.id}`}
              className={`flex-1 cursor-pointer leading-relaxed ${isChecked ? "line-through text-muted-foreground" : "text-foreground"}`}
            >
              {formatIngredient(ing, ratio)}
            </label>
          </div>
        );
      })}
    </div>
  );
}
