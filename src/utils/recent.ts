/** Recent-search list: newest first, no duplicates (ignoring case/space), capped. Pure, so it is unit-tested. */
export function addRecent(list: string[], q: string, max = 8): string[] {
  const t = q.trim();
  if (!t) return list;
  return [t, ...list.filter((x) => x.trim().toLowerCase() !== t.toLowerCase())].slice(0, max);
}
