// Pure builder for weekly stacked-bar rows from report rows.
// No imports: unit-testable with plain node.

export const SUBMISSION_WEEKS = 26;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function dayKey(d) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

const CATEGORY_KEYS = {
  quarterly: 'quarterly',
  annual: 'annual',
  'good-practices': 'goodPractices',
  'success-stories': 'successStories',
};

// Last `weekCount` Sunday-first week buckets; counts split per report category.
export function buildWeeklySubmissions(reports, weekCount = SUBMISSION_WEEKS, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisSunday = new Date(today);
  thisSunday.setDate(today.getDate() - today.getDay());

  const counts = new Map();
  for (const r of reports ?? []) {
    if (!r?.createdAt) continue;
    const d = new Date(r.createdAt);
    if (Number.isNaN(d.getTime())) continue;
    const cat = CATEGORY_KEYS[r.category];
    if (!cat) continue;
    const key = `${dayKey(d)}|${cat}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from({ length: weekCount }, (_, w) => {
    const colStart = new Date(thisSunday);
    colStart.setDate(thisSunday.getDate() - (weekCount - 1 - w) * 7);
    const row = {
      label: `${MONTHS[colStart.getMonth()]} ${colStart.getDate()}`,
      quarterly: 0,
      annual: 0,
      goodPractices: 0,
      successStories: 0,
    };
    for (let b = 0; b < 7; b++) {
      const date = new Date(colStart);
      date.setDate(colStart.getDate() + b);
      if (date > today) break;
      const dk = dayKey(date);
      for (const cat of Object.values(CATEGORY_KEYS)) {
        row[cat] += counts.get(`${dk}|${cat}`) ?? 0;
      }
    }
    return row;
  });
}
