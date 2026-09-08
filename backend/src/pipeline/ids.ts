/** Sequential id generator matching the brief's examples (r1, q1, f1, ...). */
export function makeIdCounter(prefix: string, startAt = 1): () => string {
  let n = startAt;
  return () => `${prefix}${n++}`;
}

/** Highest numeric suffix already used for a given prefix, so a fresh counter can continue past it. */
export function nextCounterFrom(prefix: string, existingIds: string[]): () => string {
  const nums = existingIds
    .filter((id) => id.startsWith(prefix))
    .map((id) => Number(id.slice(prefix.length)))
    .filter((n) => Number.isFinite(n));
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return makeIdCounter(prefix, max + 1);
}
