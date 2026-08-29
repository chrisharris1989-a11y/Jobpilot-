// =====================================================
// JOBPILOT SETTINGS UI
// =====================================================
// Keeps integrations off Settings and provides the shared
// visual treatment for the Settings sections.
// =====================================================

(function () {
  function isSettingsPage() {
    return document.getElementById("pageTitle")?.textContent.trim() === "Settings";
  }

  function removeStripeFromSettings() {
    if (!isSettingsPage()) return;

    const status = document.getElementById("stripeConnectionStatus");
    const button = document.getElementById("connectStripeButton");

    if (!status && !button) return;

    const card = status?.closest(".connection-card") || button?.closest(".connection-card");

    if (card) {
      card.remove();
      return;
    }

    let container = status || button;
    while (container && container.parentElement) {
      container = container.parentElement;
      if (container.contains(status) && container.contains(button)) {
        const headings = container.querySelectorAll("h2");
        if (headings.length <= 1) container.remove();
        break;
      }
    }
  }

  function addSettingsSectionStyles() {
    if (document.getElementById("jobpilot-settings-section-styles")) return;

    const style = document.createElement("style");
    style.id = "jobpilot-settings-section-styles";
    style.textContent = `
      .settings-panel.settings-sectionized {
        background: transparent;
        border: 0;
        box-shadow: none;
        padding: 0;
      }

      .settings-section {
        background: var(--surface, #ffffff);
        border: 1px solid var(--border, #e5e7eb);
        border-radius: var(--radius, 12px);
        box-shadow: var(--shadow, 0 2px 8px rgba(15, 23, 42, 0.04));
        padding: 24px;
        margin: 0 0 18px;
      }

      .settings-section > h2:first-child { margin-top: 0; }
      .settings-section > hr { display: none; }
      .settings-section > label:first-of-type { margin-top: 4px; }
      .settings-section > p:first-of-type { margin-top: 0; }
      .settings-section:last-of-type { margin-bottom: 0; }

      .settings-save-actions {
        display: flex;
        justify-content: flex-end;
        margin-top: 6px;
        padding-top: 2px;
      }

      /* Business Details: spacious, consistent form layout. */
      .settings-section.settings-business-details {
        padding-bottom: 26px;
      }

      .settings-section.settings-business-details > label {
        display: block;
        margin: 0 0 7px;
      }

      .settings-section.settings-business-details > input,
      .settings-section.settings-business-details > textarea,
      .settings-section.settings-business-details > select {
        display: block;
        width: 100%;
        margin: 0 0 18px;
      }

      @media (min-width: 700px) {
        .settings-section.settings-business-details {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          column-gap: 20px;
          row-gap: 7px;
        }

        .settings-section.settings-business-details > h2 {
          grid-column: 1 / -1;
          margin-bottom: 5px;
        }

        .settings-section.settings-business-details > label,
        .settings-section.settings-business-details > input,
        .settings-section.settings-business-details > textarea,
        .settings-section.settings-business-details > select {
          min-width: 0;
        }

        .settings-section.settings-business-details > input,
        .settings-section.settings-business-details > textarea,
        .settings-section.settings-business-details > select {
          margin-bottom: 12px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function markBusinessDetailsSection() {
    const heading = Array.from(document.querySelectorAll(".settings-section > h2"))
      .find((item) => item.textContent.trim() === "Business Details");
    heading?.closest(".settings-section")?.classList.add("settings-business-details");
  }

  function sectionizeSettings() {
    if (!isSettingsPage()) return;

    const panel = document.querySelector(".settings-panel");
    if (!panel || panel.dataset.sectionized === "true") return;

    const headings = Array.from(panel.querySelectorAll(":scope > h2"));
    if (!headings.length) return;

    addSettingsSectionStyles();
    removeStripeFromSettings();
    moveSaveActionOutsideCards(panel);

    const remainingHeadings = Array.from(panel.querySelectorAll(":scope > h2"));
    remainingHeadings.forEach((heading) => {
      const section = document.createElement("section");
      section.className = "settings-section";
      panel.insertBefore(section, heading);
      section.appendChild(heading);

      let node = section.nextSibling;
      while (node) {
        const next = node.nextSibling;
        if (node.nodeType === Node.ELEMENT_NODE && node.tagName === "H2") break;
        if (node.nodeType === Node.ELEMENT_NODE && node.tagName === "HR") {
          node.remove();
          break;
        }
        section.appendChild(node);
        node = next;
      }
    });

    panel.classList.add("settings-sectionized");
    panel.dataset.sectionized = "true";
    markBusinessDetailsSection();
  }

  function moveSaveActionOutsideCards(panel) {
    if (panel.dataset.saveActionMoved === "true") return;

    const saveButton = panel.querySelector('button[onclick="saveSettings()"]');
    const message = document.getElementById("settingsMessage");
    if (!saveButton) return;

    const saveContainer = saveButton.parentElement;
    const pageContent = panel.parentElement;
    if (!pageContent) return;

    const wrapper = document.createElement("div");
    wrapper.className = "settings-save-actions";

    if (message && message.parentElement === panel) wrapper.appendChild(message);
    if (saveContainer && saveContainer.parentElement === panel) wrapper.appendChild(saveContainer);
    else wrapper.appendChild(saveButton);

    pageContent.appendChild(wrapper);
    panel.dataset.saveActionMoved = "true";
  }

  const observer = new MutationObserver(() => {
    removeStripeFromSettings();
    sectionizeSettings();
  });

  observer.observe(document.body, { childList: true, subtree: true });
  removeStripeFromSettings();
  sectionizeSettings();
})();
