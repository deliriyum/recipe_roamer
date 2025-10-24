import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";

interface IngredientsListProps {
  ingredients: string[];
  originalServings: number;
  currentServings: number;
}

export function IngredientsList({
  ingredients,
  originalServings,
  currentServings,
}: IngredientsListProps) {
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

  const toggleItem = (index: number) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(index)) {
      newChecked.delete(index);
    } else {
      newChecked.add(index);
    }
    setCheckedItems(newChecked);
  };

  const adjustQuantity = (ingredient: string) => {
    if (originalServings === currentServings) {
      return ingredient;
    }

    const ratio = currentServings / originalServings;
    const numberPattern = /(\d+(?:\.\d+)?(?:\/\d+)?)/g;
    
    return ingredient.replace(numberPattern, (match) => {
      if (match.includes('/')) {
        const [num, denom] = match.split('/').map(Number);
        const decimal = num / denom;
        const adjusted = decimal * ratio;
        
        if (adjusted < 1) {
          const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;
          const denominator = Math.round(1 / adjusted);
          const numerator = 1;
          const divisor = gcd(numerator, denominator);
          return `${numerator / divisor}/${denominator / divisor}`;
        }
        return adjusted.toFixed(2).replace(/\.?0+$/, '');
      }
      
      const num = parseFloat(match);
      const adjusted = num * ratio;
      return adjusted.toFixed(2).replace(/\.?0+$/, '');
    });
  };

  return (
    <div className="space-y-3">
      {ingredients.map((ingredient, index) => {
        const isChecked = checkedItems.has(index);
        const displayIngredient = adjustQuantity(ingredient);

        return (
          <div
            key={index}
            className="flex items-start gap-3 group"
            data-testid={`ingredient-item-${index}`}
          >
            <Checkbox
              id={`ingredient-${index}`}
              checked={isChecked}
              onCheckedChange={() => toggleItem(index)}
              className="mt-1"
              data-testid={`checkbox-ingredient-${index}`}
            />
            <label
              htmlFor={`ingredient-${index}`}
              className={`flex-1 cursor-pointer leading-relaxed ${
                isChecked
                  ? "line-through text-muted-foreground"
                  : "text-foreground"
              }`}
            >
              {displayIngredient}
            </label>
          </div>
        );
      })}
    </div>
  );
}
