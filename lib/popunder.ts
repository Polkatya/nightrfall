// Adsterra popunder ad. Loaded lazily and only once per session — we inject
// the network's script the first time someone opens a profile, rather than
// loading it globally on every page view or re-firing it on every click.
let loaded = false;

export function triggerPopunder() {
  if (loaded) return;
  loaded = true;

  const script = document.createElement('script');
  script.src = 'https://pl30435907.effectivecpmnetwork.com/60/92/d9/6092d99937a7b46f899dce14317d6b3a.js';
  script.async = true;
  document.body.appendChild(script);
}
