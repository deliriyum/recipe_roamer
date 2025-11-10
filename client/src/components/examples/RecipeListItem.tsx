import { RecipeListItem } from "../RecipeListItem";
import cookiesImage from "@assets/generated_images/chocolate_chip_cookies_recipe_2fbf360c.png";

export default function RecipeListItemExample() {
  return (
    <div className="p-6 max-w-md">
      <RecipeListItem
        id="1"
        title="Chocolate Chip Cookies"
        imageUrl={cookiesImage}
        prepTime={15}
        cookTime={12}
        servings={24}
        tags={["Dessert", "Baking", "Quick"]}
        onClick={() => console.log("Recipe clicked")}
      />
    </div>
  );
}
