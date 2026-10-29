// Pure builder for bklit HeatmapChart columns from report rows.
// No imports: unit-testable with plain node.

export const HEATMAP_WEEKS = 26;

function dayKey(d) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

// Last `weekCount` week columns (Sunday-first), each with 7 day bins.
// `count` holds the raw report count; bklit derives levels internally.
// Days after `now` are included with count 0 (rendered as ghost cells).
export function buildHeatmapColumns(reports, weekCount = HEATMAP_WEEKS, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisSunday = new Date(today);
  thisSunday.setDate(today.getDate() - today.getDay());

  const counts = new Map();
  for (const r of reports ?? []) {
    if (!r?.createdAt) continue;
    const d = new Date(r.createdAt);
    if (Number.isNaN(d.getTime())) continue;
    const key = dayKey(d);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from({ length: weekCount }, (_, w) => {
    const colStart = new Date(thisSunday);
    colStart.setDate(thisSunday.getDate() - (weekCount - 1 - w) * 7);
    return {
      bin: w,
      bins: Array.from({ length: 7 }, (_, b) => {
        const date = new Date(colStart);
        date.setDate(colStart.getDate() + b);
        return { bin: b, count: counts.get(dayKey(date)) ?? 0, date };
      }),
    };
  });
}
