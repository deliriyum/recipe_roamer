import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { BottomNav } from "@/components/BottomNav";
import RecipesList from "@/pages/RecipesList";
import RecipeDetail from "@/pages/RecipeDetail";
import AddRecipe from "@/pages/AddRecipe";
import ImportRecipe from "@/pages/ImportRecipe";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={RecipesList} />
      <Route path="/recipe/:id" component={RecipeDetail} />
      <Route path="/add" component={AddRecipe} />
      <Route path="/import" component={ImportRecipe} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Router />
          <BottomNav />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
