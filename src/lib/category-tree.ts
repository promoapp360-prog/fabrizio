type CategoryNode = { id: string; parentId: string | null; active: boolean };

/** An ancestor hidden by the owner hides the entire branch, including ordering. */
export function visibleCategoryIds(categories: CategoryNode[]): string[] {
  const byId = new Map(categories.map(c => [c.id, c]));
  return categories.filter(c => {
    const seen = new Set<string>();
    let current: CategoryNode | undefined = c;
    while (current) {
      if (!current.active || seen.has(current.id)) return false;
      seen.add(current.id);
      if (!current.parentId) return true;
      current = byId.get(current.parentId);
    }
    return false;
  }).map(c => c.id);
}

export function wouldCycle(categories: CategoryNode[], id: string, parentId: string | null): boolean {
  const seen = new Set([id]);
  let next = parentId;
  while (next) {
    if (seen.has(next)) return true;
    seen.add(next);
    next = categories.find(c => c.id === next)?.parentId ?? null;
  }
  return false;
}
