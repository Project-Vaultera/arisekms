// First-visit auto-open flag for the guided tour (per user, localStorage).
// The tour itself tracks no progress — this only remembers whether it
// was shown once already. v2 key so the redesigned tour auto-shows once
// for everyone (all roles), including users who saw the old checklist.

export function quickstartSeenKey(userId) {
  return `arisekms:tour:seen:v2:${userId ?? 'anon'}`;
}
