import { useState } from "react";
import { ShoppingCart, Plus, X, Trash2, RefreshCw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import type { ShoppingListWithItems, ShoppingListItem, MealPlan } from "@shared/schema";

const CATEGORY_ORDER = ["produce", "dairy", "meat", "seafood", "bakery", "pantry", "frozen", "beverages", "spices", "other"];

function groupByCategory(items: ShoppingListItem[]): Record<string, ShoppingListItem[]> {
  const groups: Record<string, ShoppingListItem[]> = {};
  items.forEach((item) => {
    const cat = item.category ?? "other";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(item);
  });
  return groups;
}

interface GenerateDialogProps {
  open: boolean;
  onClose: () => void;
  onGenerated: (listId: string) => void;
}
function GenerateDialog({ open, onClose, onGenerated }: GenerateDialogProps) {
  const { toast } = useToast();
  const [selectedPlanId, setSelectedPlanId] = useState("");

  const { data: plans = [] } = useQuery<MealPlan[]>({ queryKey: ["/api/meal-plans"] });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/shopping-lists/generate", {
        mealPlanId: selectedPlanId,
      });
      return res.json();
    },
    onSuccess: (data: ShoppingListWithItems) => {
      queryClient.invalidateQueries({ queryKey: ["/api/shopping-lists"] });
      toast({ title: "Shopping list generated!", description: `${data.items.length} items added.` });
      onGenerated(data.id);
      onClose();
    },
    onError: () => toast({ title: "Failed to generate list", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif">Generate Shopping List</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Select a meal plan week. Ingredients will be consolidated using AI and cross-referenced with your pantry.
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

interface AddToPantryBannerProps {
  listId: string;
  checkedItems: ShoppingListItem[];
  onDismiss: () => void;
}
function AddToPantryBanner({ listId, checkedItems, onDismiss }: AddToPantryBannerProps) {
  const { toast } = useToast();
  const addMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/pantry/from-shopping-list", {
        itemIds: checkedItems.map((i) => i.id),
        listId,
      });
    },
    onSuccess: () => {
      toast({ title: "Added to pantry!", description: `${checkedItems.length} items moved to your pantry.` });
      onDismiss();
    },
    onError: () => toast({ title: "Failed to add to pantry", variant: "destructive" }),
  });

  return (
    <div className="sticky bottom-20 mx-4 mb-2 no-print z-30">
      <Card className="p-4 flex items-center justify-between gap-4 flex-wrap border-primary/30 bg-primary/5">
        <p className="text-sm font-medium">
          Add {checkedItems.length} purchased item{checkedItems.length !== 1 ? "s" : ""} to your pantry?
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onDismiss}>Dismiss</Button>
          <Button size="sm" onClick={() => addMutation.mutate()} disabled={addMutation.isPending}
            data-testid="button-add-to-pantry">
            {addMutation.isPending ? "Adding…" : "Yes, add all checked"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default function ShoppingList() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [showGenerate, setShowGenerate] = useState(false);
  const [showPantryBanner, setShowPantryBanner] = useState(false);
  const [newItemText, setNewItemText] = useState("");
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editQty, setEditQty] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editName, setEditName] = useState("");

  const { data: lists = [], isLoading: listsLoading } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["/api/shopping-lists"],
  });

  const { data: activeList, isLoading: listLoading } = useQuery<ShoppingListWithItems>({
    queryKey: ["/api/shopping-lists", activeListId],
    queryFn: async () => {
      const res = await fetch(`/api/shopping-lists/${activeListId}`);
      if (!res.ok) throw new Error("Failed to fetch list");
      return res.json();
    },
    enabled: !!activeListId,
  });

  const checkMutation = useMutation({
    mutationFn: async ({ itemId, isChecked }: { itemId: string; isChecked: boolean }) => {
      const res = await apiRequest("PUT", `/api/shopping-lists/${activeListId}/items/${itemId}`, { isChecked });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shopping-lists", activeListId] });
      const checkedCount = activeList?.items.filter((i) => i.isChecked).length ?? 0;
      if (checkedCount > 0) setShowPantryBanner(true);
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async (rawText: string) => {
      const res = await apiRequest("POST", `/api/shopping-lists/${activeListId}/items`, { rawText });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shopping-lists", activeListId] });
      setNewItemText("");
    },
    onError: () => toast({ title: "Failed to add item", variant: "destructive" }),
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await apiRequest("DELETE", `/api/shopping-lists/${activeListId}/items/${itemId}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/shopping-lists", activeListId] }),
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ itemId, data }: { itemId: string; data: object }) => {
      const res = await apiRequest("PUT", `/api/shopping-lists/${activeListId}/items/${itemId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shopping-lists", activeListId] });
      setEditingItem(null);
    },
  });

  const clearCheckedMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/shopping-lists/${activeListId}/checked`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shopping-lists", activeListId] });
      setShowPantryBanner(false);
    },
  });

  const checkedItems = activeList?.items.filter((i) => i.isChecked) ?? [];
  const grouped = groupByCategory(activeList?.items ?? []);

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
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-primary" />
              <h1 className="font-serif text-2xl font-bold text-primary">Shopping List</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowGenerate(true)}
                data-testid="button-generate-from-plan">
                <RefreshCw className="w-4 h-4 mr-1" />Generate from Plan
              </Button>
              {activeListId && (
                <Button variant="outline" size="sm" onClick={() => clearCheckedMutation.mutate()}
                  disabled={checkedItems.length === 0 || clearCheckedMutation.isPending}
                  data-testid="button-clear-checked">
                  <Trash2 className="w-4 h-4 mr-1" />Clear Checked
                </Button>
              )}
            </div>
          </div>

          {lists.length > 1 && (
            <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
              {lists.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setActiveListId(l.id)}
                  className={`text-sm px-3 py-1 rounded-full border flex-shrink-0 transition-colors ${activeListId === l.id ? "bg-primary text-primary-foreground border-primary" : "border-border hover-elevate"}`}
                  data-testid={`list-tab-${l.id}`}
                >
                  {l.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="vintage-divider max-w-3xl mx-auto" />
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {listsLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : lists.length === 0 && !activeListId ? (
          <div className="text-center py-16 space-y-4">
            <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground/40" />
            <p className="text-muted-foreground">No shopping lists yet.</p>
            <Button onClick={() => setShowGenerate(true)} data-testid="button-first-generate">
              Generate from Meal Plan
            </Button>
          </div>
        ) : (
          <>
            {!activeListId && lists.length > 0 && setActiveListId(lists[0].id)}

            {listLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : activeList ? (
              <div className="space-y-6">
                {CATEGORY_ORDER.filter((cat) => grouped[cat]?.length > 0).map((cat) => (
                  <div key={cat}>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-2">
                      <span className="flex-1 border-t border-border" />
                      {cat}
                      <span className="flex-1 border-t border-border" />
                    </h3>
                    <div className="space-y-2">
                      {grouped[cat].map((item) => (
                        <div key={item.id}
                          className={`flex items-center gap-3 p-3 rounded-md border transition-colors ${item.isChecked ? "opacity-60 bg-muted/50" : "bg-card"}`}
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
                              {item.isManual && (
                                <Badge variant="outline" className="text-[10px]">manual</Badge>
                              )}
                            </>
                          )}
                          <Button variant="ghost" size="icon"
                            onClick={() => deleteItemMutation.mutate(item.id)}
                            className="flex-shrink-0 opacity-0 group-hover:opacity-100 invisible group-hover:visible"
                            data-testid={`button-delete-item-${item.id}`}>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {(grouped["other"]?.length === 0 || !grouped["other"]) && Object.keys(grouped).filter(k => !CATEGORY_ORDER.includes(k)).map((cat) => (
                  <div key={cat}>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{cat}</h3>
                    <div className="space-y-2">
                      {grouped[cat].map((item) => (
                        <div key={item.id} className="flex items-center gap-3 p-3 rounded-md border bg-card"
                          data-testid={`shopping-item-${item.id}`}>
                          <Checkbox
                            checked={item.isChecked ?? false}
                            onCheckedChange={(checked) => checkMutation.mutate({ itemId: item.id, isChecked: !!checked })}
                          />
                          <p className="flex-1 text-sm">{item.ingredientName}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="flex gap-2 pt-2">
                  <Input
                    placeholder="Add item (e.g., '2 cans tomatoes')…"
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && newItemText.trim()) addItemMutation.mutate(newItemText.trim()); }}
                    data-testid="input-new-item"
                  />
                  <Button
                    onClick={() => { if (newItemText.trim()) addItemMutation.mutate(newItemText.trim()); }}
                    disabled={!newItemText.trim() || addItemMutation.isPending}
                    data-testid="button-add-item"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </main>

      {showPantryBanner && checkedItems.length > 0 && activeListId && (
        <AddToPantryBanner
          listId={activeListId}
          checkedItems={checkedItems}
          onDismiss={() => setShowPantryBanner(false)}
        />
      )}

      <GenerateDialog
        open={showGenerate}
        onClose={() => setShowGenerate(false)}
        onGenerated={(id) => { setActiveListId(id); queryClient.invalidateQueries({ queryKey: ["/api/shopping-lists"] }); }}
      />
    </div>
  );
}
