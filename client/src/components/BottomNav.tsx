import { Book, Plus, Download, User } from "lucide-react";
import { useLocation } from "wouter";

interface NavItem {
  icon: typeof Book;
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { icon: Book, label: "Recipes", path: "/" },
  { icon: Plus, label: "Add", path: "/add" },
  { icon: Download, label: "Import", path: "/import" },
  { icon: User, label: "Profile", path: "/profile" },
];

export function BottomNav() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-card-border z-50 safe-area-inset-bottom">
      <div className="h-full flex items-center justify-around max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;
          
          return (
            <a
              key={item.path}
              href={item.path}
              className="flex flex-col items-center justify-center gap-1 px-4 py-2 hover-elevate active-elevate-2 rounded-md min-w-[60px]"
              data-testid={`link-nav-${item.label.toLowerCase()}`}
            >
              <Icon
                className={`w-6 h-6 ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              />
              <span
                className={`text-[11px] ${
                  isActive
                    ? "text-primary font-medium"
                    : "text-muted-foreground"
                }`}
              >
                {item.label}
              </span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
