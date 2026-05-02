import { ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Users } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface RecipeListItemProps {
  id: string;
  title: string;
  imageUrl?: string | null;
  prepTime?: number | null;
  cookTime?: number | null;
  servings: number;
  tags?: string[] | null;
  onClick?: () => void;
}

export function RecipeListItem({
  id,
  title,
  imageUrl,
  prepTime,
  cookTime,
  servings,
  tags,
  onClick,
}: RecipeListItemProps) {
  const { toast } = useToast();
  const totalTime = (prepTime || 0) + (cookTime || 0);

  const addToListMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/shopping-lists/from-recipe", { recipeId: id, servings });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shopping-lists"] });
      toast({ title: `${title} added to shopping list` });
    },
    onError: () => {
      toast({ title: "Could not add to shopping list", variant: "destructive" });
    },
  });

  return (
    <div
      className="flex gap-3 p-3 rounded-md hover-elevate active-elevate-2 cursor-pointer border border-card-border bg-card"
      onClick={onClick}
      data-testid="item-recipe"
    >
      <div className="w-16 h-16 flex-shrink-0 rounded-md overflow-hidden bg-muted">
        {imageUrl ? (
          <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
            <Users className="w-6 h-6 text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-serif text-base font-semibold mb-1 line-clamp-1" data-testid="text-recipe-title">
          {title}
        </h3>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-1">
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

      <Button
        variant="ghost"
        size="icon"
        className="flex-shrink-0 self-center"
        disabled={addToListMutation.isPending}
        onClick={(e) => { e.stopPropagation(); addToListMutation.mutate(); }}
        data-testid={`button-add-to-list-${id}`}
        title="Add to shopping list"
      >
        <ShoppingCart className="w-4 h-4" />
      </Button>
    </div>
  );
}
