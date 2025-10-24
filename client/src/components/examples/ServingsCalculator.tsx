import { useState } from "react";
import { ServingsCalculator } from "../ServingsCalculator";

export default function ServingsCalculatorExample() {
  const [servings, setServings] = useState(4);

  return (
    <div className="p-6">
      <ServingsCalculator servings={servings} onServingsChange={setServings} />
    </div>
  );
}
