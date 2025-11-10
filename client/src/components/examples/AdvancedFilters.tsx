import { AdvancedFilters } from "../AdvancedFilters";

export default function AdvancedFiltersExample() {
  return (
    <div className="p-6">
      <AdvancedFilters
        onFilterChange={(filters) => console.log("Filters applied:", filters)}
      />
    </div>
  );
}
