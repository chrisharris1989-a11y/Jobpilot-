// =====================================================
// JOBPILOT SHARED UI
// =====================================================
// Shared UI helpers live here so future visual/interface
// changes do not need to be added to app.js.

export function setElementVisible(elementOrId, visible) {
  const element =
    typeof elementOrId === "string"
      ? document.getElementById(elementOrId)
      : elementOrId;

  if (!element) return;

  element.hidden = !visible;
}

export function setElementText(elementOrId, text) {
  const element =
    typeof elementOrId === "string"
      ? document.getElementById(elementOrId)
      : elementOrId;

  if (!element) return;

  element.textContent = text ?? "";
}

export function setButtonLoading(buttonOrId, loading, loadingText = "Loading...") {
  const button =
    typeof buttonOrId === "string"
      ? document.getElementById(buttonOrId)
      : buttonOrId;

  if (!button) return;

  if (loading) {
    if (!button.dataset.uiOriginalText) {
      button.dataset.uiOriginalText = button.textContent;
    }

    button.disabled = true;
    button.textContent = loadingText;
    return;
  }

  button.disabled = false;

  if (button.dataset.uiOriginalText !== undefined) {
    button.textContent = button.dataset.uiOriginalText;
    delete button.dataset.uiOriginalText;
  }
}

export function showUiMessage(elementOrId, message, type = "success") {
  const element =
    typeof elementOrId === "string"
      ? document.getElementById(elementOrId)
      : elementOrId;

  if (!element) return;

  element.textContent = message ?? "";
  element.dataset.uiMessageType = type;
}
