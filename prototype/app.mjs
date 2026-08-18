import { STORAGE_KEY, createInitialState, executeCommand, getFixture, restoreState } from "./core.mjs";

const fixture = getFixture();
const roleSelect = document.querySelector("#role-select");
const resetButton = document.querySelector("#reset-button");
const announcement = document.querySelector("#announcement");

function loadState() {
  try { return restoreState(JSON.parse(localStorage.getItem(STORAGE_KEY))); } catch { return createInitialState(); }
}
let state = loadState();

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function actor() { return fixture.actors[state.currentActorId]; }
function html(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}
function command(type) {
  const run = executeCommand(state, { type, actorId: state.currentActorId, idempotencyKey: `${type}-${Date.now()}` });
  state = run.state;
  saveState();
  announcement.textContent = run.message;
  render();
}

function renderProduct() {
  const product = fixture.product;
  const reservedByCurrentBuyer = state.reservation?.buyerId === state.currentActorId;
  const availability = state.productAvailability === "AVAILABLE" ? "Available" : "Reserved";
  const badge = document.querySelector("#availability-badge");
  badge.textContent = availability;
  badge.className = `badge ${state.productAvailability.toLowerCase()}`;
  const button = actor().role === "BUYER"
    ? (state.productAvailability === "AVAILABLE"
      ? '<button class="button primary" data-command="RESERVE_PRODUCT" type="button">Reserve for checkout</button>'
      : reservedByCurrentBuyer
        ? '<button class="button secondary" data-command="RELEASE_RESERVATION" type="button">Release reservation</button>'
        : '<button class="button secondary" type="button" disabled>Reserved by another buyer</button>')
    : '<p class="muted">Reservation is available only in Buyer walkthroughs.</p>';
  document.querySelector("#product-card").innerHTML = `
    <div class="product-art" aria-label="Abstract local illustration of the fixture chair" role="img"></div>
    <div>
      <h3 class="product-name">${html(product.title)}</h3>
      <p class="metadata">$${product.price.toLocaleString("en-US")} ${product.currency} · ${html(product.location)}<br>${html(product.period)} · ${html(product.materials)}<br>${html(product.dimensions)}</p>
      <p class="trust-line">${html(product.seller)} · ${html(product.sellerStatus)} · Condition report available</p>
      <p class="muted">${html(product.condition)}<br>${html(product.provenance)}</p>
    </div>
    <div>${button}</div>`;
  document.querySelectorAll("[data-command]").forEach((button) => button.addEventListener("click", () => command(button.dataset.command)));
}

function renderPermission() {
  const role = actor().role;
  const action = role === "BUYER" ? "Reserve or release this unique item" : "No transaction command in this slice";
  document.querySelector("#permission-panel").innerHTML = `<ul class="permission-list"><li><strong>${html(actor().name)}</strong> is in the <strong>${html(role)}</strong> walkthrough.</li><li>${html(action)}.</li><li class="denied">Checkout, seller readiness, dispatch and driver proof are intentionally unavailable until their roadmap slice.</li></ul>`;
}

function renderIntegrity() {
  const reservation = state.reservation ? `Reserved by ${fixture.actors[state.reservation.buyerId].name}` : "No active reservation";
  document.querySelector("#integrity-panel").innerHTML = `<ul class="integrity-list"><li><strong>Storage:</strong> browser localStorage only</li><li><strong>Recovery:</strong> invalid stored data resets to safe fixtures</li><li><strong>Reservation:</strong> ${html(reservation)}</li><li><strong>Order:</strong> ${html(state.order?.state ?? "No draft order")}</li></ul>`;
}

function renderAudit() {
  const list = document.querySelector("#audit-list");
  document.querySelector("#event-count").textContent = `${state.audit.length} event${state.audit.length === 1 ? "" : "s"}`;
  if (!state.audit.length) {
    list.innerHTML = '<li class="empty-state">No critical command has been accepted yet.</li>';
    return;
  }
  list.innerHTML = state.audit.slice().reverse().map((event) => `<li><strong>${html(event.action)}</strong><span>${html(event.detail)}</span><time>${new Date(event.at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })} · ${html(fixture.actors[event.actorId].name)}</time></li>`).join("");
}

function render() {
  roleSelect.value = state.currentActorId;
  renderProduct();
  renderPermission();
  renderIntegrity();
  renderAudit();
}

roleSelect.addEventListener("change", () => command("SET_ACTOR"));
resetButton.addEventListener("click", () => {
  state = createInitialState();
  saveState();
  announcement.textContent = "Walkthrough reset to the safe fixture state.";
  render();
});
render();
