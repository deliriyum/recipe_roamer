import { useState, useMemo } from "react";
import { Archive, Plus, X, AlertTriangle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { PantryItem } from "@shared/schema";

const CATEGORIES = ["produce", "dairy", "meat", "seafood", "bakery", "pantry", "frozen", "beverages", "spices", "other"];

function daysUntilExpiry(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

interface PantryItemFormProps {
  open: boolean;
  onClose: () => void;
  editItem?: PantryItem;
}

function PantryItemForm({ open, onClose, editItem }: PantryItemFormProps) {
  const { toast } = useToast();
  const [name, setName] = useState(editItem?.ingredientName ?? "");
  const [category, setCategory] = useState(editItem?.category ?? "other");
  const [expiryDate, setExpiryDate] = useState(editItem?.expiryDate ?? "");

  const addMutation = useMutation({
    mutationFn: async (data: unknown) => {
      const res = await apiRequest("POST", "/api/pantry", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pantry"] });
      toast({ title: "Added to pantry!" });
      onClose();
    },
    onError: () => toast({ title: "Failed to add item", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: unknown) => {
      const res = await apiRequest("PUT", `/api/pantry/${editItem!.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pantry"] });
      toast({ title: "Item updated!" });
      onClose();
    },
    onError: () => toast({ title: "Failed to update item", variant: "destructive" }),
  });

  const handleSave = () => {
    if (!name.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    const data = {
      ingredientName: name.trim(),
      quantity: null,
      unit: null,
      category: category || null,
      expiryDate: expiryDate || null,
    };
    if (editItem) updateMutation.mutate(data);
    else addMutation.mutate(data);
  };

  const isPending = addMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="font-serif">{editItem ? "Edit Item" : "Add to Pantry"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="pantry-name" className="text-sm font-medium">Ingredient Name</Label>
            <Input id="pantry-name" value={name} onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
              placeholder="e.g., flour" className="mt-2" data-testid="input-pantry-name" />
          </div>
          <div>
            <Label className="text-sm font-medium">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-2" data-testid="select-pantry-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="pantry-expiry" className="text-sm font-medium">Expiry Date (Optional)</Label>
            <Input id="pantry-expiry" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)}
              className="mt-2" data-testid="input-pantry-expiry" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={isPending} data-testid="button-save-pantry-item">
            {isPending ? "Saving…" : editItem ? "Update" : "Add to Pantry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Pantry() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<PantryItem | undefined>();

  const { data: items = [], isLoading } = useQuery<PantryItem[]>({
    queryKey: ["/api/pantry"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/pantry/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pantry"] });
      toast({ title: "Item removed." });
    },
    onError: () => toast({ title: "Failed to remove item", variant: "destructive" }),
  });

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = item.ingredientName.toLowerCase().includes(search.toLowerCase());
      const matchesCat = categoryFilter === "all" || item.category === categoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [items, search, categoryFilter]);

  const groupedByCategory = useMemo(() => {
    const groups: Record<string, PantryItem[]> = {};
    filtered.forEach((item) => {
      const cat = item.category ?? "other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [filtered]);

  const expiringCount = items.filter((i) => {
    const days = daysUntilExpiry(i.expiryDate);
    return days !== null && days <= 7 && days >= 0;
  }).length;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Archive className="w-6 h-6 text-primary" />
              <h1 className="font-serif text-2xl font-bold text-primary">Pantry</h1>
              {expiringCount > 0 && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {expiringCount} expiring
                </Badge>
              )}
            </div>
            <Button onClick={() => { setEditItem(undefined); setShowForm(true); }} data-testid="button-add-pantry">
              <Plus className="w-4 h-4 mr-1" />Add Item
            </Button>
          </div>

          <div className="flex gap-3 mt-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search pantry…"
                className="pl-9"
                data-testid="input-search-pantry"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-36" data-testid="select-category-filter">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="vintage-divider max-w-5xl mx-auto" />
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-20 w-full rounded-md" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <Archive className="w-12 h-12 mx-auto text-muted-foreground/40" />
            <p className="text-muted-foreground">Your pantry is empty.</p>
            <p className="text-sm text-muted-foreground">Add items manually or use the shopping list to populate it.</p>
            <Button onClick={() => setShowForm(true)} data-testid="button-add-first-item">Add First Item</Button>
          </div>
        ) : Object.keys(groupedByCategory).length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No items match your search.</p>
        ) : (
          <div className="space-y-8">
            {CATEGORIES.filter((c) => groupedByCategory[c]?.length > 0).map((cat) => (
              <div key={cat}>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
                  <span className="flex-1 border-t border-border" />
                  {cat}
                  <span className="flex-1 border-t border-border" />
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {groupedByCategory[cat].map((item) => {
                    const days = daysUntilExpiry(item.expiryDate);
                    const isExpiring = days !== null && days <= 7;
                    const isExpired = days !== null && days < 0;
                    return (
                      <Card
                        key={item.id}
                        className={`p-4 relative group hover-elevate ${isExpired ? "border-destructive/50" : isExpiring ? "border-yellow-500/50" : ""}`}
                        data-testid={`pantry-item-${item.id}`}
                      >
                        <button
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => deleteMutation.mutate(item.id)}
                          data-testid={`button-delete-pantry-${item.id}`}
                        >
                          <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                        </button>

                        <button
                          className="w-full text-left"
                          onClick={() => { setEditItem(item); setShowForm(true); }}
                          data-testid={`button-edit-pantry-${item.id}`}
                        >
                          <p className="font-medium text-sm leading-tight pr-4">{item.ingredientName}</p>
                          {item.expiryDate && (
                            <div className={`flex items-center gap-1 mt-2 text-xs ${isExpired ? "text-destructive" : isExpiring ? "text-yellow-600 dark:text-yellow-400" : "text-muted-foreground"}`}>
                              {isExpiring && <AlertTriangle className="w-3 h-3 flex-shrink-0" />}
                              <span>
                                {isExpired
                                  ? `Expired ${Math.abs(days!)} day${Math.abs(days!) !== 1 ? "s" : ""} ago`
                                  : days === 0
                                  ? "Expires today"
                                  : `Expires in ${days} day${days !== 1 ? "s" : ""}`}
                              </span>
                            </div>
                          )}
                        </button>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <PantryItemForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditItem(undefined); }}
        editItem={editItem}
      />
    </div>
  );
}
