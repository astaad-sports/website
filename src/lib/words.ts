// Small helpers for words on the page.

const NUMBER_WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];

/** 6 → "Six", for headings that count models; beyond twelve, digits. */
export function countInWords(count: number): string {
  return NUMBER_WORDS[count] ?? String(count);
}

/** ["a", "b", "c"] → "a, b and c" (or "a, b or c"). */
export function listInWords(items: string[], conjunction: "and" | "or" = "and"): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} ${conjunction} ${items[items.length - 1]}`;
}

/** "Medium" → "medium", for the middle of a sentence; "XL" stays as it is. */
export function midSentence(word: string): string {
  return word === word.toUpperCase() ? word : word.charAt(0).toLowerCase() + word.slice(1);
}
