function uniqueStops(stops) {
  const seen = new Set();
  return stops.filter(stop => {
    const key = String(stop || '').trim().toUpperCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildNavigationUrls() {
  const rows = [...document.querySelectorAll('.panel .job-row')];
  const stops = uniqueStops(
    rows
      .map(row => row.querySelector('a[href*="google.com/maps/dir"]'))
      .map(link => {
        try {
          return new URL(link.href).searchParams.get('destination');
        } catch {
          return null;
        }
      })
      .filter(Boolean)
  );

  if (!stops.length) return null;

  const settings = JSON.parse(localStorage.getItem('jobpilot_settings') || '{}');
  const base = String(settings.postcode || '').trim();

  const apple = new URL('https://maps.apple.com/directions');
  apple.searchParams.set('destination', stops[stops.length - 1]);
  apple.searchParams.set('mode', 'driving');
  stops.slice(0, -1).forEach(stop => apple.searchParams.append('waypoint', stop));
  if (base) apple.searchParams.set('source', base);

  const google = new URL('https://www.google.com/maps/dir/');
  google.searchParams.set('api', '1');
  google.searchParams.set('destination', stops[stops.length - 1]);
  google.searchParams.set('travelmode', 'driving');
  if (base) google.searchParams.set('origin', base);
  if (stops.length > 1) google.searchParams.set('waypoints', stops.slice(0, -1).join('|'));

  return { apple: apple.href, google: google.href };
}

function replaceMapsButton() {
  const routeHeading = [...document.querySelectorAll('h2')]
    .find(element => String(element.textContent || '').includes("Today's Route"));
  if (!routeHeading) return;

  const urls = buildNavigationUrls();
  if (!urls) return;

  const existing = [...document.querySelectorAll('a, button')]
    .find(element => String(element.textContent || '').trim().includes('Open in Maps'));
  if (!existing || existing.dataset.navigationButtonsReplaced === 'true') return;

  const group = document.createElement('div');
  group.dataset.navigationButtons = 'true';
  group.style.cssText = 'display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;width:100%;max-width:420px;box-sizing:border-box;';

  const buttons = [
    [' Apple Maps', urls.apple],
    ['Google Maps', urls.google]
  ];

  buttons.forEach(([label, url]) => {
    const link = document.createElement('a');
    link.className = 'button primary';
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = label;
    link.style.cssText = 'text-decoration:none;display:flex;align-items:center;justify-content:center;width:100%;min-width:0;box-sizing:border-box;white-space:nowrap;margin:0;';
    group.appendChild(link);
  });

  existing.replaceWith(group);
  existing.dataset.navigationButtonsReplaced = 'true';

  const mapsPanel = [...document.querySelectorAll('.panel')]
    .find(panel => String(panel.querySelector('h3')?.textContent || '').includes('Maps route'));
  if (mapsPanel) mapsPanel.style.display = 'none';
}

const observer = new MutationObserver(() => replaceMapsButton());

function startNavigationButtons() {
  const app = document.getElementById('app');
  if (!app) return;
  observer.observe(app, { childList: true, subtree: true });
  replaceMapsButton();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startNavigationButtons);
} else {
  startNavigationButtons();
}
