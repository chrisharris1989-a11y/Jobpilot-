// JobPilot Settings
// Clean Settings entry point.

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
  const bottom = document.querySelector(".sidebar .sidebar-bottom");
  if (!bottom || bottom.querySelector('[data-page="settings"]')) return;

  const button = document.createElement("button");
  button.className = "nav-item";
  button.type = "button";
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

  bottom.insertBefore(button, bottom.firstChild);
}

const observer = new MutationObserver(addSettingsTab);
observer.observe(document.body, { childList: true, subtree: true });

addSettingsTab();
