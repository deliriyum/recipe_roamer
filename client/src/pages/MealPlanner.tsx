import { useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, Plus, X, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import type { MealPlanWithEntries, MealPlanEntry, RecipeWithIngredients } from "@shared/schema";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SLOTS = ["breakfast", "lunch", "dinner", "snack"] as const;
type Slot = typeof SLOTS[number];

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateString(d: Date): string {
  return d.toISOString().split("T")[0];
}

function formatWeekLabel(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return `${monday.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${sunday.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

interface AddMealDialogProps {
  open: boolean;
  onClose: () => void;
  mealPlanId: string;
  dayOfWeek: number;
  mealSlot: Slot;
  existingEntry?: MealPlanEntry & { recipe?: RecipeWithIngredients };
}

function AddMealDialog({ open, onClose, mealPlanId, dayOfWeek, mealSlot, existingEntry }: AddMealDialogProps) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeWithIngredients | null>(existingEntry?.recipe ?? null);
  const [customMeal, setCustomMeal] = useState(existingEntry?.customMeal ?? "");
  const [servingsOverride, setServingsOverride] = useState(existingEntry?.servingsOverride?.toString() ?? "");

  const { data: searchResults = [], isLoading: searching } = useQuery<RecipeWithIngredients[]>({
    queryKey: ["/api/recipes/search", search],
    queryFn: async () => {
      const res = await fetch(`/api/recipes/search?q=${encodeURIComponent(search)}`);
      return res.json();
    },
    enabled: search.length >= 1,
  });

  const { data: allRecipes = [] } = useQuery<RecipeWithIngredients[]>({
    queryKey: ["/api/recipes"],
  });

  const displayRecipes = search.length >= 1 ? searchResults : allRecipes;

  const addMutation = useMutation({
    mutationFn: async (data: unknown) => {
      const res = await apiRequest("POST", `/api/meal-plans/${mealPlanId}/entries`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meal-plans"] });
      toast({ title: "Meal added!" });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: unknown) => {
      const res = await apiRequest("PUT", `/api/meal-plans/${mealPlanId}/entries/${existingEntry!.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meal-plans"] });
      toast({ title: "Meal updated!" });
      onClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/meal-plans/${mealPlanId}/entries/${existingEntry!.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meal-plans"] });
      toast({ title: "Meal removed." });
      onClose();
    },
  });

  const handleSave = () => {
    if (!selectedRecipe && !customMeal.trim()) {
      toast({ title: "Please select a recipe or enter a custom meal.", variant: "destructive" });
      return;
    }
    const payload = {
      dayOfWeek,
      mealSlot,
      recipeId: selectedRecipe?.id ?? null,
      customMeal: customMeal.trim() || null,
      servingsOverride: servingsOverride ? parseInt(servingsOverride) : null,
    };
    if (existingEntry) updateMutation.mutate(payload);
    else addMutation.mutate(payload);
  };

  const isPending = addMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif">
            {existingEntry ? "Edit Meal" : `Add ${mealSlot.charAt(0).toUpperCase() + mealSlot.slice(1)}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">Search Recipes</Label>
            <Input
              placeholder="Type to search recipes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-recipe-search"
            />
          </div>

          {selectedRecipe && (
            <div className="flex items-center gap-3 p-3 rounded-md bg-muted">
              {selectedRecipe.imageUrl && (
                <img src={selectedRecipe.imageUrl} alt={selectedRecipe.title}
                  className="w-12 h-12 rounded object-cover flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{selectedRecipe.title}</p>
                {selectedRecipe.cookTime && (
                  <p className="text-xs text-muted-foreground">{selectedRecipe.cookTime} min cook time</p>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedRecipe(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {!selectedRecipe && (
            <div className="border rounded-md overflow-hidden max-h-48 overflow-y-auto">
              {searching ? (
                <div className="p-3 space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : displayRecipes.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">No recipes found.</p>
              ) : (
                displayRecipes.map((r) => (
                  <button
                    key={r.id}
                    className="w-full flex items-center gap-3 p-3 hover-elevate text-left border-b last:border-0"
                    onClick={() => { setSelectedRecipe(r); setSearch(""); }}
                    data-testid={`recipe-option-${r.id}`}
                  >
                    {r.imageUrl && (
                      <img src={r.imageUrl} alt={r.title}
                        className="w-10 h-10 rounded object-cover flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{r.title}</p>
                      {!!r.cookTime && <p className="text-xs text-muted-foreground">{r.cookTime} min</p>}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or enter custom meal</span>
            </div>
          </div>

          <div>
            <Input
              placeholder="e.g., Takeout pizza, Leftovers…"
              value={customMeal}
              onChange={(e) => { setCustomMeal(e.target.value); if (e.target.value) setSelectedRecipe(null); }}
              data-testid="input-custom-meal"
            />
          </div>

          {selectedRecipe && (
            <div>
              <Label htmlFor="servings-override" className="text-sm font-medium">
                Servings override (default: {selectedRecipe.servings})
              </Label>
              <Input
                id="servings-override"
                type="number"
                value={servingsOverride}
                onChange={(e) => setServingsOverride(e.target.value)}
                placeholder={String(selectedRecipe.servings)}
                className="mt-2 w-32"
                data-testid="input-servings-override"
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex-wrap gap-2">
          {existingEntry && (
            <Button variant="outline" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}
              className="mr-auto" data-testid="button-remove-meal">
              Remove
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={isPending} data-testid="button-save-meal">
            {isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface PrintOptionsDialogProps {
  open: boolean;
  onClose: () => void;
}
function PrintOptionsDialog({ open, onClose }: PrintOptionsDialogProps) {
  const [option, setOption] = useState("calendar");
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif">Print Options</DialogTitle>
        </DialogHeader>
        <RadioGroup value={option} onValueChange={setOption} className="space-y-3">
          {[
            { value: "calendar", label: "Calendar only" },
            { value: "calendar-recipes", label: "Calendar + Full Recipes" },
            { value: "calendar-shopping", label: "Calendar + Shopping List" },
          ].map(({ value, label }) => (
            <div key={value} className="flex items-center gap-3">
              <RadioGroupItem value={value} id={`print-${value}`} data-testid={`radio-print-${value}`} />
              <Label htmlFor={`print-${value}`}>{label}</Label>
            </div>
          ))}
        </RadioGroup>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { window.print(); onClose(); }} data-testid="button-confirm-print">
            <Printer className="w-4 h-4 mr-2" />Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function MealPlanner() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [currentMonday, setCurrentMonday] = useState(() => getMondayOf(new Date()));
  const [addDialog, setAddDialog] = useState<{ dayOfWeek: number; mealSlot: Slot; existing?: MealPlanEntry & { recipe?: RecipeWithIngredients } } | null>(null);
  const [showPrintDialog, setShowPrintDialog] = useState(false);

  const weekStart = toDateString(currentMonday);

  const { data: plan, isLoading } = useQuery<MealPlanWithEntries>({
    queryKey: ["/api/meal-plans/week", weekStart],
    queryFn: async () => {
      const res = await fetch(`/api/meal-plans/week/${weekStart}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch meal plan");
      return res.json();
    },
  });

  const createPlanMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/meal-plans", { weekStart });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meal-plans/week", weekStart] });
    },
    onError: () => toast({ title: "Failed to create meal plan", variant: "destructive" }),
  });

  const prevWeek = () => {
    const d = new Date(currentMonday);
    d.setDate(d.getDate() - 7);
    setCurrentMonday(d);
  };

  const nextWeek = () => {
    const d = new Date(currentMonday);
    d.setDate(d.getDate() + 7);
    setCurrentMonday(d);
  };

  const goToday = () => setCurrentMonday(getMondayOf(new Date()));

  const getEntry = (dayOfWeek: number, mealSlot: Slot) =>
    plan?.entries.find((e) => e.dayOfWeek === dayOfWeek && e.mealSlot === mealSlot);

  const handleCellClick = async (dayOfWeek: number, mealSlot: Slot) => {
    let activePlan = plan;
    if (!activePlan) {
      activePlan = await createPlanMutation.mutateAsync() as MealPlanWithEntries;
    }
    const existing = getEntry(dayOfWeek, mealSlot);
    setAddDialog({ dayOfWeek, mealSlot, existing: existing as any });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-6 h-6 text-primary" />
              <h1 className="font-serif text-2xl font-bold text-primary">Meal Planner</h1>
            </div>
            <div className="flex items-center gap-2 no-print">
              <Button variant="outline" size="sm" onClick={() => setLocation("/shopping-list")}
                data-testid="button-go-shopping">
                Shopping List
              </Button>
              <Button variant="outline" size="icon" onClick={() => setShowPrintDialog(true)}
                data-testid="button-print-planner">
                <Printer className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-3">
            <Button variant="outline" size="icon" onClick={prevWeek} data-testid="button-prev-week">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToday} data-testid="button-this-week">
              This Week
            </Button>
            <span className="text-sm font-medium text-muted-foreground flex-1 text-center">
              {formatWeekLabel(currentMonday)}
            </span>
            <Button variant="outline" size="icon" onClick={nextWeek} data-testid="button-next-week">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="vintage-divider max-w-6xl mx-auto" />
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 overflow-x-auto">
        {isLoading ? (
          <div className="space-y-3">
            {SLOTS.map((s) => <Skeleton key={s} className="h-24 w-full rounded-md" />)}
          </div>
        ) : (
          <div className="min-w-[640px]">
            <div className="grid grid-cols-8 gap-1 mb-1">
              <div className="col-span-1" />
              {DAYS.map((day, i) => {
                const d = new Date(currentMonday);
                d.setDate(currentMonday.getDate() + i);
                const isToday = toDateString(d) === toDateString(new Date());
                return (
                  <div key={day} className={`text-center py-2 rounded-md text-sm font-semibold ${isToday ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
                    data-testid={`day-header-${i}`}>
                    <div>{day}</div>
                    <div className="text-xs font-normal">{d.getDate()}</div>
                  </div>
                );
              })}
            </div>

            {SLOTS.map((slot) => (
              <div key={slot} className="grid grid-cols-8 gap-1 mb-1">
                <div className="flex items-center justify-end pr-3 py-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {slot}
                  </span>
                </div>
                {DAYS.map((_, dayIdx) => {
                  const entry = getEntry(dayIdx, slot);
                  return (
                    <button
                      key={dayIdx}
                      className="min-h-[72px] rounded-md border border-border bg-card hover-elevate active-elevate-2 p-2 text-left transition-colors"
                      onClick={() => handleCellClick(dayIdx, slot)}
                      data-testid={`cell-${dayIdx}-${slot}`}
                    >
                      {entry ? (
                        <div className="space-y-1">
                          {entry.recipe?.imageUrl && (
                            <img src={entry.recipe.imageUrl} alt={entry.recipe.title}
                              className="w-full h-8 object-cover rounded" />
                          )}
                          <p className="text-xs font-medium leading-tight line-clamp-2">
                            {entry.recipe?.title ?? entry.customMeal}
                          </p>
                          {entry.servingsOverride && (
                            <Badge className="text-[10px] px-1 py-0">×{entry.servingsOverride}</Badge>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full opacity-30 hover:opacity-60">
                          <Plus className="w-4 h-4" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {!isLoading && !plan && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Click any cell to start planning this week's meals.
          </div>
        )}
      </main>

      {addDialog && (plan || createPlanMutation.data) && (
        <AddMealDialog
          open={!!addDialog}
          onClose={() => setAddDialog(null)}
          mealPlanId={(plan?.id ?? (createPlanMutation.data as any)?.id) as string}
          dayOfWeek={addDialog.dayOfWeek}
          mealSlot={addDialog.mealSlot}
          existingEntry={addDialog.existing}
        />
      )}

      <PrintOptionsDialog open={showPrintDialog} onClose={() => setShowPrintDialog(false)} />
    </div>
  );
}
