import { renderBookingsSettings } from "./booking-settings.js";
import { renderSettings } from "./settings.js";

function addBookingsCard() {
  const grid = document.querySelector(".jp-settings-grid");
  const existing = document.querySelector('[data-settings-section="bookings"]');
  const settingsPage = document.querySelector(".jp-settings-page");
  if (!grid || !settingsPage || existing) return;
  const card = document.createElement("button");
  card.className = "jp-settings-card";
  card.type = "button";
  card.dataset.settingsSection = "bookings";
  card.innerHTML = `<span class="jp-settings-card-icon">📅</span><span class="jp-settings-card-body"><strong>Bookings</strong><small>Manage online bookings, services, availability and booking rules.</small></span><span class="jp-settings-card-arrow">→</span>`;
  grid.insertBefore(card, grid.firstElementChild?.nextElementSibling || null);
}

function requireBookingServicePrice() {
  const modal = document.querySelector(".jp-booking-modal");
  if (!modal) return;
  const price = modal.querySelector('[name="price"]');
  const active = modal.querySelector('[name="active"]');
  if (!price) return;
  price.required = !!active?.checked;
  price.placeholder = active?.checked ? "0.00" : "Optional for hidden services";
  const label = price.closest("label");
  if (label) label.firstChild.textContent = active?.checked ? "Price *" : "Price";
  if (active && !active.dataset.priceRequirementBound) {
    active.dataset.priceRequirementBound = "true";
    active.addEventListener("change", requireBookingServicePrice);
  }
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

const observer = new MutationObserver(() => {
  addBookingsCard();
  requireBookingServicePrice();
});
observer.observe(document.body, { childList: true, subtree: true });
addBookingsCard();
requireBookingServicePrice();