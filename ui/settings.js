// JobPilot Settings
// Clean settings entry point. Built from scratch intentionally.

export function renderSettings(content = document.getElementById("pageContent")) {
  if (!content) return;

  content.innerHTML = `
    <section class="settings-page">
      <header class="page-header">
        <h2>Settings</h2>
        <p>Manage your JobPilot settings.</p>
      </header>
    </section>
  `;
}

function addSettingsTab() {
  const nav = document.querySelector(".sidebar nav");
  if (!nav || nav.querySelector('[data-page="settings"]')) return;

  const button = document.createElement("button");
  button.className = "nav-item";
  button.dataset.page = "settings";
  button.textContent = "⚙️ Settings";

  button.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach(item => {
      item.classList.remove("active");
    });
    button.classList.add("active");

    const title = document.getElementById("pageTitle");
    const subtitle = document.getElementById("pageSubtitle");

    if (title) title.textContent = "Settings";
    if (subtitle) subtitle.textContent = "Manage your JobPilot settings.";

    renderSettings();
  });

  nav.appendChild(button);
}

const observer = new MutationObserver(() => addSettingsTab());

observer.observe(document.body, {
  childList: true,
  subtree: true
});

addSettingsTab();
