import { Badge } from "@/components/ui/badge";
import { Clock, Users } from "lucide-react";

interface RecipeListItemProps {
  id: string;
  title: string;
  imageUrl?: string;
  prepTime?: number;
  cookTime?: number;
  servings: number;
  tags?: string[];
  onClick?: () => void;
}

export function RecipeListItem({
  title,
  imageUrl,
  prepTime,
  cookTime,
  servings,
  tags,
  onClick,
}: RecipeListItemProps) {
  const totalTime = (prepTime || 0) + (cookTime || 0);

  return (
    <div
      className="flex gap-4 p-3 rounded-md hover-elevate active-elevate-2 cursor-pointer border border-card-border bg-card"
      onClick={onClick}
      data-testid="item-recipe"
    >
      <div className="w-20 h-20 flex-shrink-0 rounded-md overflow-hidden bg-muted">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <h3 className="font-serif text-base font-semibold mb-1 line-clamp-1" data-testid="text-recipe-title">
          {title}
        </h3>
        
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
          {totalTime > 0 && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{totalTime}m</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            <span>{servings}</span>
          </div>
        </div>
        
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs px-2 py-0">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
