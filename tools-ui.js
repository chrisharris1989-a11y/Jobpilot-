function getToolsButton() {
  return document.getElementById("jobpilot-tools-button");
}

function setToolsActive() {
  document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
  getToolsButton()?.classList.add("active");
}

function renderToolsPage() {
  const content = document.getElementById("pageContent");
  if (!content) return;

  const title = document.getElementById("pageTitle");
  const subtitle = document.getElementById("pageSubtitle");
  if (title) title.textContent = "Tools";
  if (subtitle) subtitle.textContent = "Tools and utilities for your business.";
  setToolsActive();

  content.innerHTML = "";
}

function addToolsButton() {
  const managementButton = document.getElementById("jobpilot-management-button");
  if (!managementButton || getToolsButton()) return;

  const button = document.createElement("button");
  button.id = "jobpilot-tools-button";
  button.className = "nav-item";
  button.type = "button";
  button.textContent = "🛠️ Tools";
  button.addEventListener("click", renderToolsPage);
  managementButton.insertAdjacentElement("afterend", button);
}

addToolsButton();

const toolsNavObserver = new MutationObserver(() => {
  addToolsButton();
});

toolsNavObserver.observe(document.body, { childList: true, subtree: true });
