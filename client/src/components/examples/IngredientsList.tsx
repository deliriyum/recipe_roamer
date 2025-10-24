import { IngredientsList } from "../IngredientsList";

export default function IngredientsListExample() {
  const ingredients = [
    "2 cups all-purpose flour",
    "1 cup butter, softened",
    "3/4 cup sugar",
    "2 large eggs",
    "1 tsp vanilla extract",
    "1/2 tsp salt",
  ];

  return (
    <div className="p-6 max-w-md">
      <h3 className="text-lg font-semibold mb-4">Ingredients</h3>
      <IngredientsList
        ingredients={ingredients}
        originalServings={4}
        currentServings={6}
      />
    </div>
  );
}
