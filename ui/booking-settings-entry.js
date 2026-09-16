import { renderBookingsSettings } from "./booking-settings.js";
import { renderSettings } from "./settings.js";

function addBookingsCard() {
  const grid = document.querySelector(".jp-settings-grid");
  const settingsPage = document.querySelector(".jp-settings-page");
  if (!grid || !settingsPage) return;
  if (grid.querySelector('[data-settings-section="bookings"]')) return;

  const card = document.createElement("button");
  card.className = "jp-settings-card";
  card.type = "button";
  card.dataset.settingsSection = "bookings";
  card.innerHTML = `<span class="jp-settings-card-icon">📅</span><span class="jp-settings-card-body"><strong>Bookings</strong><small>Manage online bookings, services, availability and booking rules.</small></span><span class="jp-settings-card-arrow">→</span>`;
  grid.insertBefore(card, grid.firstElementChild?.nextElementSibling || null);
}

function updateBookingServicePriceHelp() {
  const modal = document.querySelector(".jp-booking-modal");
  if (!modal) return;
  const price = modal.querySelector('[name="price"]');
  if (!price) return;
  price.required = false;
  price.placeholder = "Leave blank to request a quote";
  const label = price.closest("label");
  if (label) label.firstChild.textContent = "Price (optional)";
}

function initialiseBookingsSettingsEntry() {
  addBookingsCard();
  updateBookingServicePriceHelp();

  const observer = new MutationObserver(() => {
    addBookingsCard();
    updateBookingServicePriceHelp();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

document.addEventListener("click", event => {
  const back = event.target.closest?.('[data-booking-back]');
  if (back) {
    event.preventDefault();
    event.stopImmediatePropagation();
    renderSettings(document.getElementById("pageContent"));
    return;
  }

  const card = event.target.closest?.('[data-settings-section="bookings"]');
  if (!card) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  renderBookingsSettings(document.getElementById("pageContent"));
}, true);

if (document.body) {
  initialiseBookingsSettingsEntry();
} else {
  document.addEventListener("DOMContentLoaded", initialiseBookingsSettingsEntry, { once: true });
}
