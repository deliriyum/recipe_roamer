// PDF Export utility
export function exportRecipesAsPdf() {
  window.print();
}

export function printRecipe(recipeId: string) {
  console.log("Printing recipe:", recipeId);
  window.print();
}
