import { EmptyState } from "../EmptyState";

export default function EmptyStateExample() {
  return (
    <div className="p-6">
      <EmptyState
        title="No Recipes Yet"
        description="Start building your collection by adding your first recipe or importing from a URL."
        actionLabel="Add Your First Recipe"
        onAction={() => console.log("Add recipe clicked")}
      />
    </div>
  );
}
