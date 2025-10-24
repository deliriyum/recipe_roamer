import { InstructionsList } from "../InstructionsList";

export default function InstructionsListExample() {
  const instructions = [
    "Preheat oven to 375°F (190°C).",
    "In a large bowl, cream together butter and sugar until light and fluffy.",
    "Beat in eggs one at a time, then stir in vanilla.",
    "Gradually blend in the dry ingredients.",
    "Drop rounded tablespoons of dough onto ungreased cookie sheets.",
    "Bake for 9 to 11 minutes or until golden brown.",
  ];

  return (
    <div className="p-6 max-w-2xl">
      <h3 className="text-lg font-semibold mb-4">Instructions</h3>
      <InstructionsList instructions={instructions} />
    </div>
  );
}
