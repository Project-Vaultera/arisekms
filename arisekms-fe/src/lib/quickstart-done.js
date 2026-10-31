// Per-user quickstart progress in localStorage (mirrors the gamsys
// quickstart-done helper). Manual check/uncheck only — the app never
// claims progress the user didn't confirm.

export function quickstartDoneKey(userId) {
  return `arisekms:quickstart:done:${userId ?? 'anon'}`;
}

export function quickstartSeenKey(userId) {
  return `arisekms:quickstart:seen:${userId ?? 'anon'}`;
}

export function loadQuickstartDone(userId) {
  try {
    const raw = JSON.parse(localStorage.getItem(quickstartDoneKey(userId)) ?? '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function toggleQuickstartDone(userId, id) {
  try {
    const prev = loadQuickstartDone(userId);
    const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
    localStorage.setItem(quickstartDoneKey(userId), JSON.stringify(next));
    return next;
  } catch {
    return loadQuickstartDone(userId);
  }
}

export function resetQuickstartDone(userId) {
  try {
    localStorage.removeItem(quickstartDoneKey(userId));
  } catch {
    /* storage unavailable — checklist stays as-is */
  }
  return [];
}
