import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Users } from "lucide-react";

interface RecipeCardProps {
  id: string;
  title: string;
  imageUrl?: string;
  prepTime?: number;
  cookTime?: number;
  servings: number;
  calories?: number;
  onClick?: () => void;
}

export function RecipeCard({
  title,
  imageUrl,
  prepTime,
  cookTime,
  servings,
  calories,
  onClick,
}: RecipeCardProps) {
  const totalTime = (prepTime || 0) + (cookTime || 0);

  return (
    <Card
      className="overflow-hidden cursor-pointer hover-elevate active-elevate-2"
      onClick={onClick}
      data-testid="card-recipe"
    >
      <div className="relative aspect-[4/3] bg-muted">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <Users className="w-12 h-12 text-muted-foreground" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent" />
        {calories && (
          <Badge className="absolute top-2 right-2 bg-background/90 text-foreground backdrop-blur-sm border-0">
            {Math.round(calories)} cal
          </Badge>
        )}
        <h3 className="absolute bottom-0 left-0 right-0 p-4 font-serif text-lg font-semibold text-white line-clamp-2">
          {title}
        </h3>
      </div>
      <div className="p-4 flex items-center gap-4 text-sm text-muted-foreground">
        {totalTime > 0 && (
          <div className="flex items-center gap-1" data-testid="text-time">
            <Clock className="w-4 h-4" />
            <span>{totalTime} min</span>
          </div>
        )}
        <div className="flex items-center gap-1" data-testid="text-servings">
          <Users className="w-4 h-4" />
          <span>{servings} servings</span>
        </div>
      </div>
    </Card>
  );
}
