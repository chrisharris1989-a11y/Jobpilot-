function replaceAssignedJobNavigation() {
  const links = [...document.querySelectorAll('#pageContent a[href*="google.com/maps/dir"]')]
    .filter(link => String(link.textContent || '').toLowerCase().includes('navigate to job'));

  links.forEach(existing => {
    if (existing.dataset.navigationChoiceReplaced === 'true') return;

    let destination = null;
    try {
      destination = new URL(existing.href).searchParams.get('destination');
    } catch {
      return;
    }

    if (!destination) return;

    const apple = new URL('https://maps.apple.com/directions');
    apple.searchParams.set('destination', destination);
    apple.searchParams.set('mode', 'driving');

    const google = new URL('https://www.google.com/maps/dir/');
    google.searchParams.set('api', '1');
    google.searchParams.set('destination', destination);
    google.searchParams.set('travelmode', 'driving');

    const group = document.createElement('div');
    group.dataset.navigationChoice = 'true';
    group.style.cssText = 'display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;width:100%;max-width:420px;box-sizing:border-box;';

    [
      [' Apple Maps', apple.href],
      ['Google Maps', google.href]
    ].forEach(([label, url]) => {
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
  });
}

const observer = new MutationObserver(() => replaceAssignedJobNavigation());

function startAssignedJobNavigationChoice() {
  const app = document.getElementById('app');
  if (!app) return;
  observer.observe(app, { childList: true, subtree: true });
  replaceAssignedJobNavigation();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startAssignedJobNavigationChoice);
} else {
  startAssignedJobNavigationChoice();
}
