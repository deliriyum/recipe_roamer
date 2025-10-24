import { RecipeCard } from "../RecipeCard";
import cookiesImage from "@assets/generated_images/chocolate_chip_cookies_recipe_2fbf360c.png";

export default function RecipeCardExample() {
  return (
    <div className="p-6 max-w-sm">
      <RecipeCard
        id="1"
        title="Chocolate Chip Cookies"
        imageUrl={cookiesImage}
        prepTime={15}
        cookTime={12}
        servings={24}
        calories={150}
        onClick={() => console.log("Recipe clicked")}
      />
    </div>
  );
}
