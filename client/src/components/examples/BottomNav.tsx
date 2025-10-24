import { BottomNav } from "../BottomNav";
import { Router } from "wouter";

export default function BottomNavExample() {
  return (
    <Router>
      <div className="h-screen flex items-end">
        <BottomNav />
      </div>
    </Router>
  );
}
