const COOKING_FRACTIONS: [number, string][] = [
  [0,     ""],
  [1/8,   "1/8"],
  [1/4,   "1/4"],
  [1/3,   "1/3"],
  [3/8,   "3/8"],
  [1/2,   "1/2"],
  [5/8,   "5/8"],
  [2/3,   "2/3"],
  [3/4,   "3/4"],
  [7/8,   "7/8"],
];

export function toFraction(n: number): string {
  if (n <= 0) return "0";
  const whole = Math.floor(n);
  const dec = n - whole;

  let bestFrac = COOKING_FRACTIONS[0];
  let bestDiff = Math.abs(dec);
  for (const f of COOKING_FRACTIONS) {
    const diff = Math.abs(dec - f[0]);
    if (diff < bestDiff) { bestDiff = diff; bestFrac = f; }
  }

  const roundsUp = bestDiff > 0 && bestFrac[0] === 0 && dec > 0.0625;
  if (roundsUp) {
    const next = COOKING_FRACTIONS.find(f => f[0] > dec);
    if (next) bestFrac = next;
  }

  if (bestFrac[0] >= 1 - 0.01) return String(whole + 1);
  const fracStr = bestFrac[1];
  if (whole === 0) return fracStr || "0";
  if (!fracStr) return String(whole);
  return `${whole} ${fracStr}`;
}
