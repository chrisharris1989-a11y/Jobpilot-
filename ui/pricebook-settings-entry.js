import { renderPricebook } from "./pricebook.js";

function addPricebookCard() {
  const grid = document.querySelector("#pageContent .jp-settings-grid");
  if (!grid) return;
  if (grid.querySelector('[data-settings-section="pricebook"]')) return;
  const danger = grid.querySelector('[data-settings-section="danger-zone"]');
  const card = document.createElement("button");
  card.className = "jp-settings-card";
  card.type = "button";
  card.dataset.settingsSection = "pricebook";
  card.innerHTML = '<span class="jp-settings-card-icon">💷</span><span class="jp-settings-card-body"><strong>Pricebook</strong><small>Manage reusable services, materials and labour prices.</small></span><span class="jp-settings-card-arrow">→</span>';
  card.addEventListener("click", () => renderPricebook());
  if (danger) grid.insertBefore(card, danger); else grid.appendChild(card);
}

const observer = new MutationObserver(addPricebookCard);
observer.observe(document.body, { childList: true, subtree: true });
addPricebookCard();
