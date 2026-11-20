export function currentEntryText(entry: { normalizedContent?: string | null; originalContent: string }) {
  return entry.normalizedContent ?? entry.originalContent;
}
