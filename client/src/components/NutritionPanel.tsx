import { Card } from "@/components/ui/card";

interface NutritionPanelProps {
  calories?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
}

export function NutritionPanel({
  calories,
  protein,
  carbs,
  fats,
}: NutritionPanelProps) {
  const hasData = calories || protein || carbs || fats;

  if (!hasData) {
    return null;
  }

  const nutritionItems = [
    { label: "Calories", value: calories, unit: "kcal" },
    { label: "Protein", value: protein, unit: "g" },
    { label: "Carbs", value: carbs, unit: "g" },
    { label: "Fats", value: fats, unit: "g" },
  ];

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Nutrition per Serving</h3>
      <div className="grid grid-cols-2 gap-4">
        {nutritionItems.map((item) => (
          item.value !== undefined && (
            <div key={item.label} className="text-center" data-testid={`nutrition-${item.label.toLowerCase()}`}>
              <div className="text-2xl font-bold text-primary">
                {Math.round(item.value)}
              </div>
              <div className="text-sm text-muted-foreground">
                {item.label} ({item.unit})
              </div>
            </div>
          )
        ))}
      </div>
    </Card>
  );
}
