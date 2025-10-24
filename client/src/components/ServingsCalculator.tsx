import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ServingsCalculatorProps {
  servings: number;
  onServingsChange: (servings: number) => void;
}

export function ServingsCalculator({
  servings,
  onServingsChange,
}: ServingsCalculatorProps) {
  const handleDecrease = () => {
    if (servings > 1) {
      onServingsChange(servings - 1);
    }
  };

  const handleIncrease = () => {
    if (servings < 99) {
      onServingsChange(servings + 1);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm font-medium text-foreground">Servings:</span>
      <div className="flex items-center gap-2">
        <Button
          size="icon"
          variant="outline"
          onClick={handleDecrease}
          disabled={servings <= 1}
          data-testid="button-decrease-servings"
        >
          <Minus className="w-4 h-4" />
        </Button>
        <div
          className="w-12 text-center font-semibold text-lg"
          data-testid="text-servings-count"
        >
          {servings}
        </div>
        <Button
          size="icon"
          variant="outline"
          onClick={handleIncrease}
          disabled={servings >= 99}
          data-testid="button-increase-servings"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
