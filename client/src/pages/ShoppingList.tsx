import { useState } from "react";
import { ShoppingCart, Plus, X, Trash2, RefreshCw, Archive, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ShoppingListWithItems, ShoppingListItem, MealPlan, PantryItem } from "@shared/schema";

const CATEGORY_ORDER = ["produce", "dairy", "meat", "seafood", "bakery", "pantry", "frozen", "beverages", "spices", "other"];

function groupByCategory(items: ShoppingListItem[]): Record<string, ShoppingListItem[]> {
  const groups: Record<string, ShoppingListItem[]> = {};
  items.forEach((item) => {
    const cat = (item.category ?? "other").toLowerCase();
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(item);
  });
  return groups;
}

interface GenerateDialogProps {
  open: boolean;
  onClose: () => void;
}
function GenerateDialog({ open, onClose }: GenerateDialogProps) {
  const { toast } = useToast();
  const [selectedPlanId, setSelectedPlanId] = useState("");

  const { data: plans = [] } = useQuery<MealPlan[]>({
    queryKey: ["/api/meal-plans"],
    staleTime: 0,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/shopping-lists/generate", { mealPlanId: selectedPlanId });
      return res.json();
    },
    onSuccess: (data: ShoppingListWithItems) => {
      queryClient.invalidateQueries({ queryKey: ["/api/shopping-lists/master"] });
      toast({ title: "Shopping list updated!", description: `${data.items.length} items added from meal plan.` });
      onClose();
    },
    onError: () => toast({ title: "Failed to generate list", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="font-serif">Generate from Meal Plan</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Select a meal plan week. Ingredients will be consolidated with AI and cross-referenced with your pantry. Your manually-added items will be kept.
          </p>
          {plans.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No meal plans found. Create one in the Meal Planner first.</p>
          ) : (
            <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
              <SelectTrigger data-testid="select-meal-plan">
                <SelectValue placeholder="Select a meal plan week…" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    Week of {new Date(p.weekStart).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={!selectedPlanId || generateMutation.isPending}
            data-testid="button-generate-list"
          >
            {generateMutation.isPending ? (
              <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Generating…</>
            ) : "Generate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ShoppingList() {
  const { toast } = useToast();
  const [showGenerate, setShowGenerate] = useState(false);
  const [newItemText, setNewItemText] = useState("");
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editQty, setEditQty] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editName, setEditName] = useState("");

  const { data: masterList, isLoading } = useQuery<ShoppingListWithItems>({
    queryKey: ["/api/shopping-lists/master"],
    queryFn: async () => {
      const res = await fetch("/api/shopping-lists/master");
      if (!res.ok) throw new Error("Failed to fetch shopping list");
      return res.json();
    },
  });

  const { data: pantryItems = [] } = useQuery<PantryItem[]>({
    queryKey: ["/api/pantry"],
  });

  const pantryNames = new Set(pantryItems.map((p) => p.ingredientName.toLowerCase().trim()));

  const isInPantry = (name: string) => pantryNames.has(name.toLowerCase().trim());

  const listId = masterList?.id ?? null;

  const invalidateMaster = () => queryClient.invalidateQueries({ queryKey: ["/api/shopping-lists/master"] });

  const checkMutation = useMutation({
    mutationFn: async ({ itemId, isChecked }: { itemId: string; isChecked: boolean }) => {
      const res = await apiRequest("PUT", `/api/shopping-lists/${listId}/items/${itemId}`, { isChecked });
      return res.json();
    },
    onSuccess: () => invalidateMaster(),
  });

  const addItemMutation = useMutation({
    mutationFn: async (rawText: string) => {
      const res = await apiRequest("POST", `/api/shopping-lists/${listId}/items`, { rawText });
      return res.json();
    },
    onSuccess: () => {
      invalidateMaster();
      setNewItemText("");
    },
    onError: () => toast({ title: "Failed to add item", variant: "destructive" }),
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await apiRequest("DELETE", `/api/shopping-lists/${listId}/items/${itemId}`);
    },
    onSuccess: () => invalidateMaster(),
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ itemId, data }: { itemId: string; data: object }) => {
      const res = await apiRequest("PUT", `/api/shopping-lists/${listId}/items/${itemId}`, data);
      return res.json();
    },
    onSuccess: () => {
      invalidateMaster();
      setEditingItem(null);
    },
  });

  const clearCheckedMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/shopping-lists/${listId}/checked`);
    },
    onSuccess: () => invalidateMaster(),
  });

  const checkAllMutation = useMutation({
    mutationFn: async (isChecked: boolean) => {
      await apiRequest("PUT", `/api/shopping-lists/${listId}/check-all`, { isChecked });
    },
    onSuccess: () => invalidateMaster(),
  });

  const addToPantryMutation = useMutation({
    mutationFn: async (itemIds: string[]) => {
      const res = await apiRequest("POST", "/api/pantry/from-shopping-list", { itemIds, listId });
      return res.json();
    },
    onSuccess: (data, itemIds) => {
      invalidateMaster();
      queryClient.invalidateQueries({ queryKey: ["/api/pantry"] });
      const added = Array.isArray(data) ? data.length : itemIds.length;
      const skipped = itemIds.length - (Array.isArray(data) ? data.length : 0);
      const desc = skipped > 0
        ? `${added} added, ${skipped} already in pantry.`
        : `${added} item${added !== 1 ? "s" : ""} added to your pantry.`;
      toast({ title: "Pantry updated!", description: desc });
    },
    onError: () => toast({ title: "Failed to add to pantry", variant: "destructive" }),
  });

  const items = masterList?.items ?? [];
  const checkedItems = items.filter((i) => i.isChecked);
  const allChecked = items.length > 0 && items.every((i) => i.isChecked);
  const grouped = groupByCategory(items);

  const allCategories = [
    ...CATEGORY_ORDER.filter((c) => grouped[c]?.length > 0),
    ...Object.keys(grouped).filter((k) => !CATEGORY_ORDER.includes(k) && grouped[k]?.length > 0),
  ];

  const startEdit = (item: ShoppingListItem) => {
    setEditingItem(item.id);
    setEditQty(item.quantity?.toString() ?? "");
    setEditUnit(item.unit ?? "");
    setEditName(item.ingredientName);
  };

  const saveEdit = (itemId: string) => {
    updateItemMutation.mutate({
      itemId,
      data: {
        ingredientName: editName,
        quantity: editQty ? parseFloat(editQty) : null,
        unit: editUnit || null,
      },
    });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-primary" />
              <h1 className="font-serif text-2xl font-bold text-primary">Shopping List</h1>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => setShowGenerate(true)}
                data-testid="button-generate-from-plan">
                <RefreshCw className="w-4 h-4 mr-1" />Generate from Plan
              </Button>
              {items.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => checkAllMutation.mutate(!allChecked)}
                  disabled={checkAllMutation.isPending}
                  data-testid="button-select-all"
                >
                  {allChecked ? "Deselect All" : "Select All"}
                </Button>
              )}
              {items.length > 0 && (
                <Button
                  size="sm"
                  onClick={() => {
                    const targets = checkedItems.length > 0 ? checkedItems : items;
                    addToPantryMutation.mutate(targets.map((i) => i.id));
                  }}
                  disabled={addToPantryMutation.isPending}
                  data-testid="button-add-all-to-pantry"
                >
                  <Archive className="w-4 h-4 mr-1" />
                  {checkedItems.length > 0 ? `Add ${checkedItems.length} to Pantry` : "Add All to Pantry"}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => clearCheckedMutation.mutate()}
                disabled={checkedItems.length === 0 || clearCheckedMutation.isPending}
                data-testid="button-clear-checked">
                <Trash2 className="w-4 h-4 mr-1" />Clear Checked
              </Button>
            </div>
          </div>
        </div>
        <div className="vintage-divider max-w-3xl mx-auto" />
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : (
          <div className="space-y-6">
            {items.length === 0 && (
              <div className="text-center py-12 space-y-3">
                <ShoppingCart className="w-10 h-10 mx-auto text-muted-foreground/30" />
                <p className="text-muted-foreground text-sm">Your list is empty. Add items below or generate from a meal plan.</p>
              </div>
            )}

            {allCategories.map((cat) => (
              <div key={cat}>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-2">
                  <span className="flex-1 border-t border-border" />
                  {cat}
                  <span className="flex-1 border-t border-border" />
                </h3>
                <div className="space-y-2">
                  {grouped[cat].map((item) => {
                    const inPantry = isInPantry(item.ingredientName);
                    return (
                      <div key={item.id}
                        className={`flex items-center gap-3 p-3 rounded-md border transition-colors ${item.isChecked ? "opacity-60 bg-muted/50" : inPantry ? "bg-primary/5 border-primary/20" : "bg-card"}`}
                        data-testid={`shopping-item-${item.id}`}>
                        <Checkbox
                          checked={item.isChecked ?? false}
                          onCheckedChange={(checked) => checkMutation.mutate({ itemId: item.id, isChecked: !!checked })}
                          data-testid={`checkbox-item-${item.id}`}
                        />
                        {editingItem === item.id ? (
                          <div className="flex-1 flex gap-2 items-center flex-wrap">
                            <Input value={editQty} onChange={(e) => setEditQty(e.target.value)}
                              placeholder="Qty" className="w-16" data-testid="input-edit-qty" />
                            <Input value={editUnit} onChange={(e) => setEditUnit(e.target.value)}
                              placeholder="Unit" className="w-20" data-testid="input-edit-unit" />
                            <Input value={editName} onChange={(e) => setEditName(e.target.value)}
                              placeholder="Ingredient" className="flex-1 min-w-24" data-testid="input-edit-name" />
                            <Button size="sm" onClick={() => saveEdit(item.id)} data-testid="button-save-edit">Save</Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingItem(null)}>Cancel</Button>
                          </div>
                        ) : (
                          <>
                            <div className="flex-1 min-w-0" onClick={() => startEdit(item)}>
                              <p className={`text-sm font-medium cursor-pointer ${item.isChecked ? "line-through" : ""}`}>
                                {item.quantity != null ? `${item.quantity} ` : ""}
                                {item.unit ? `${item.unit} ` : ""}
                                {item.ingredientName}
                              </p>
                              {item.notes && (
                                <p className="text-xs text-muted-foreground">{item.notes}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {inPantry && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="flex items-center" data-testid={`pantry-indicator-${item.id}`}>
                                      <CheckCircle2 className="w-4 h-4 text-primary" />
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="left">In your pantry</TooltipContent>
                                </Tooltip>
                              )}
                              {item.isManual && (
                                <Badge variant="outline" className="text-[10px]">manual</Badge>
                              )}
                            </div>
                          </>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => addToPantryMutation.mutate([item.id])}
                              disabled={addToPantryMutation.isPending}
                              className="flex-shrink-0 text-muted-foreground"
                              data-testid={`button-pantry-item-${item.id}`}
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="left">Add to pantry</TooltipContent>
                        </Tooltip>
                        <Button variant="ghost" size="icon"
                          onClick={() => deleteItemMutation.mutate(item.id)}
                          className="flex-shrink-0"
                          data-testid={`button-delete-item-${item.id}`}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="flex gap-2 pt-2">
              <Input
                placeholder="Add item (e.g. '2 cans tomatoes')…"
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && newItemText.trim()) addItemMutation.mutate(newItemText.trim()); }}
                data-testid="input-new-item"
                disabled={!listId}
              />
              <Button
                onClick={() => { if (newItemText.trim()) addItemMutation.mutate(newItemText.trim()); }}
                disabled={!newItemText.trim() || addItemMutation.isPending || !listId}
                data-testid="button-add-item"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </main>

      <GenerateDialog
        open={showGenerate}
        onClose={() => setShowGenerate(false)}
      />
    </div>
  );
}
