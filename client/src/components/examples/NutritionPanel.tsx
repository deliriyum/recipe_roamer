import { NutritionPanel } from "../NutritionPanel";

export default function NutritionPanelExample() {
  return (
    <div className="p-6 max-w-md">
      <NutritionPanel calories={250} protein={8} carbs={35} fats={12} />
    </div>
  );
}
