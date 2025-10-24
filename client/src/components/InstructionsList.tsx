interface InstructionsListProps {
  instructions: string[];
}

export function InstructionsList({ instructions }: InstructionsListProps) {
  return (
    <div className="space-y-4">
      {instructions.map((instruction, index) => (
        <div
          key={index}
          className="flex gap-4"
          data-testid={`instruction-step-${index + 1}`}
        >
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
            {index + 1}
          </div>
          <p className="flex-1 leading-relaxed text-foreground pt-1">
            {instruction}
          </p>
        </div>
      ))}
    </div>
  );
}
