// Supabase Auth requires an email under the hood, but this app only collects
// a username + password from the user. We derive a deterministic, hidden
// "auth email" from the username so sign up / log in never show an email
// field. This email is never displayed and never needs to receive mail —
// make sure "Confirm email" is turned OFF in Supabase
// (Authentication → Providers → Email), otherwise signups will get stuck
// waiting on a confirmation email that can never arrive.
export function usernameToAuthEmail(username: string): string {
  return `${username.trim().toLowerCase()}@users.nightfall.internal`;
}
