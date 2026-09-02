// Reliable Users & Team routing guard.
// Capture the card click before older management routing handlers can interfere.
document.addEventListener("click", event => {
  const card = event.target?.closest?.('[data-management-section="users"]');
  if (!card) return;

  event.preventDefault();
  event.stopImmediatePropagation();

  if (typeof window.renderManagementUsers === "function") {
    window.renderManagementUsers();
  } else {
    console.error("JobPilot: Users & Team renderer is not available.");
    const content = document.getElementById("pageContent");
    if (content) {
      content.innerHTML = '<div class="panel"><h2>Users &amp; Team</h2><p class="muted">Users &amp; Team could not be loaded. Please refresh JobPilot and try again.</p></div>';
    }
  }
}, true);
