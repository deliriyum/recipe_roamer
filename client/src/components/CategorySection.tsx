import { ChevronDown } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { RecipeListItem } from "./RecipeListItem";

interface Recipe {
  id: string;
  title: string;
  imageUrl?: string;
  prepTime?: number;
  cookTime?: number;
  servings: number;
  tags?: string[];
}

interface CategorySectionProps {
  category: string;
  recipes: Recipe[];
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  onRecipeClick: (id: string) => void;
}

export function CategorySection({
  category,
  recipes,
  icon,
  defaultOpen = false,
  onRecipeClick,
}: CategorySectionProps) {
  return (
    <Accordion type="single" collapsible defaultValue={defaultOpen ? category : undefined}>
      <AccordionItem value={category} className="border-none">
        <AccordionTrigger 
          className="cookbook-header px-4 py-3 hover:no-underline hover-elevate rounded-md"
          data-testid={`category-${category.toLowerCase()}`}
        >
          <div className="flex items-center gap-3 cookbook-corner">
            {icon && <span className="text-primary">{icon}</span>}
            <span className="font-serif text-xl font-semibold">{category}</span>
            <span className="text-sm text-muted-foreground ml-auto mr-2">
              ({recipes.length})
            </span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pt-2 pb-4">
          <div className="space-y-2">
            {recipes.map((recipe) => (
              <RecipeListItem
                key={recipe.id}
                {...recipe}
                onClick={() => onRecipeClick(recipe.id)}
              />
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
