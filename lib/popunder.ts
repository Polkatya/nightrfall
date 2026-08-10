// Adsterra popunder ad. The ad network's script hooks into every click on
// the page to open a popunder tab — that's how this ad format works and we
// can't change that once the script is loaded. What we control is whether
// we load the script at all: cap it to a small number of shows, persisted
// in localStorage so it survives across page loads/tabs (not just one
// session), and after that cap is hit, never load the script again.
const MAX_SHOWS_PER_DAY = 2;
const STORAGE_KEY = 'popunder_shows';

let loaded = false; // guards against injecting the script twice in one page

function readShowState(): { count: number; day: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { count: 0, day: new Date().toDateString() };
    const parsed = JSON.parse(raw);
    if (parsed.day !== new Date().toDateString()) {
      return { count: 0, day: new Date().toDateString() }; // new day, reset
    }
    return parsed;
  } catch {
    return { count: 0, day: new Date().toDateString() };
  }
}

export function triggerPopunder() {
  if (loaded) return;

  const state = readShowState();
  if (state.count >= MAX_SHOWS_PER_DAY) return; // cap reached — don't load

  loaded = true;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ count: state.count + 1, day: state.day }));
  } catch {
    // localStorage unavailable (private mode etc) — still show this once,
    // just can't persist the count across page loads.
  }

  const script = document.createElement('script');
  script.src = 'https://pl30435907.effectivecpmnetwork.com/60/92/d9/6092d99937a7b46f899dce14317d6b3a.js';
  script.async = true;
  document.body.appendChild(script);
}
