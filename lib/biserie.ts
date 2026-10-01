/** Un color por cada biserie distinta (por orden de aparición en la lista), para distinguirlas a simple vista. */
const BISERIE_COLORS = ["#a78bfa", "#34d399", "#fbbf24", "#f87171", "#38bdf8", "#f472b6"];

export function biserieColor(list: { biserie?: string }[], id: string | undefined): string | undefined {
  if (!id) return undefined;
  const ids: string[] = [];
  for (const e of list) if (e.biserie && !ids.includes(e.biserie)) ids.push(e.biserie);
  const idx = ids.indexOf(id);
  return idx < 0 ? undefined : BISERIE_COLORS[idx % BISERIE_COLORS.length];
}
