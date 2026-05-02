import { Book, Plus, CalendarDays, ShoppingCart, Archive } from "lucide-react";
import { useLocation, Link } from "wouter";

interface NavItem {
  icon: typeof Book;
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { icon: Book, label: "Recipes", path: "/" },
  { icon: CalendarDays, label: "Planner", path: "/meal-planner" },
  { icon: Plus, label: "Add", path: "/add" },
  { icon: ShoppingCart, label: "Shop", path: "/shopping-list" },
  { icon: Archive, label: "Pantry", path: "/pantry" },
];

export function BottomNav() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border z-50 safe-area-inset-bottom no-print">
      <div className="h-full flex items-center justify-around max-w-lg mx-auto px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.path === "/"
            ? location === "/"
            : location.startsWith(item.path);

          return (
            <Link
              key={item.path}
              href={item.path}
              className="flex flex-col items-center justify-center gap-1 px-3 py-2 hover-elevate active-elevate-2 rounded-md min-w-[56px]"
              data-testid={`link-nav-${item.label.toLowerCase()}`}
            >
              <Icon
                className={`w-5 h-5 ${isActive ? "text-primary" : "text-muted-foreground"}`}
              />
              <span
                className={`text-[10px] ${isActive ? "text-primary font-medium" : "text-muted-foreground"}`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
