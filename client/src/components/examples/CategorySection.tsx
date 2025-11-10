import { CategorySection } from "../CategorySection";
import cookiesImage from "@assets/generated_images/chocolate_chip_cookies_recipe_2fbf360c.png";
import pastaImage from "@assets/generated_images/pasta_carbonara_recipe_image_0e830503.png";

export default function CategorySectionExample() {
  const recipes = [
    {
      id: "1",
      title: "Chocolate Chip Cookies",
      imageUrl: cookiesImage,
      prepTime: 15,
      cookTime: 12,
      servings: 24,
      tags: ["Cookies", "Chocolate", "Baking"],
    },
    {
      id: "2",
      title: "Pasta Carbonara",
      imageUrl: pastaImage,
      prepTime: 10,
      cookTime: 20,
      servings: 4,
      tags: ["Italian", "Pasta", "Quick"],
    },
  ];

  return (
    <div className="p-6 max-w-2xl">
      <CategorySection
        category="Desserts"
        recipes={recipes}
        icon="🍰"
        defaultOpen={true}
        onRecipeClick={(id) => console.log("Recipe clicked:", id)}
      />
    </div>
  );
}
