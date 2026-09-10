// JobPilot Settings
// Clean settings entry point. Built from scratch intentionally.

export function renderSettings() {
  const app = document.getElementById("app");
  if (!app) return;

  app.innerHTML = `
    <section class="settings-page">
      <header class="page-header">
        <h1>Settings</h1>
        <p>Manage your JobPilot settings.</p>
      </header>
    </section>
  `;
}
