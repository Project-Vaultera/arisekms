// First-visit auto-open flag for the guided tour (per user, localStorage).
// The tour itself tracks no progress — this only remembers whether it
// was shown once already.

export function quickstartSeenKey(userId) {
  return `arisekms:quickstart:seen:${userId ?? 'anon'}`;
}
