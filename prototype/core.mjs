export const STORAGE_KEY = "atlas-prototype-foundation-v1";
export const VERSION = 1;

const FIXTURE = Object.freeze({
  product: {
    id: "EL-CH-001",
    title: "1960s Walnut Lounge Chair",
    price: 4800,
    currency: "USD",
    seller: "Established Lines",
    sellerStatus: "VERIFIED",
    condition: "Original walnut frame; light age-consistent patina documented",
    provenance: "Private New England collection; dealer record EL-1960-101",
    dimensions: "H 30 in × W 28 in × D 31 in; seat H 16 in",
    materials: "Walnut, woven wool",
    period: "1960–1969",
    location: "New York, NY",
  },
  actors: {
    "buyer-alex": { name: "Alex Morgan", role: "BUYER" },
    "buyer-jordan": { name: "Jordan Lee", role: "BUYER" },
    "seller-established-lines": { name: "Established Lines", role: "SELLER" },
    "dispatcher-sam": { name: "Sam Rivera", role: "DISPATCHER" },
    "driver-lee": { name: "Lee Chen", role: "DRIVER" },
    "admin-riley": { name: "Riley Davis", role: "ADMIN" },
  },
});

export function createInitialState() {
  return {
    version: VERSION,
    currentActorId: "buyer-alex",
    productAvailability: "AVAILABLE",
    reservation: null,
    order: null,
    audit: [],
    idempotency: {},
  };
}

export function getFixture() {
  return structuredClone(FIXTURE);
}

export function restoreState(raw) {
  if (!raw || typeof raw !== "object" || raw.version !== VERSION || !FIXTURE.actors[raw.currentActorId]) {
    return createInitialState();
  }
  if (!['AVAILABLE', 'RESERVED'].includes(raw.productAvailability) || !Array.isArray(raw.audit)) {
    return createInitialState();
  }
  if (raw.productAvailability === "RESERVED" && (!raw.reservation || !FIXTURE.actors[raw.reservation.buyerId])) {
    return createInitialState();
  }
  return {
    version: VERSION,
    currentActorId: raw.currentActorId,
    productAvailability: raw.productAvailability,
    reservation: raw.reservation ? structuredClone(raw.reservation) : null,
    order: raw.order ? structuredClone(raw.order) : null,
    audit: raw.audit.slice(-100).map((event) => ({ ...event })),
    idempotency: raw.idempotency && typeof raw.idempotency === "object" ? { ...raw.idempotency } : {},
  };
}

function result(state, ok, message, reused = false) {
  return { state, ok, message, reused };
}

function addAudit(state, action, actorId, detail) {
  const event = {
    id: `audit-${state.audit.length + 1}`,
    action,
    actorId,
    detail,
    at: new Date().toISOString(),
  };
  state.audit.push(event);
}

function record(state, key, execution) {
  if (key) state.idempotency[key] = { ok: execution.ok, message: execution.message };
  return execution;
}

export function executeCommand(current, command) {
  const state = restoreState(current);
  const actorId = command?.actorId ?? state.currentActorId;
  const actor = FIXTURE.actors[actorId];
  const key = command?.idempotencyKey;
  if (!actor || !command?.type) return result(state, false, "Unknown walkthrough command.");
  if (key && state.idempotency[key]) {
    const prior = state.idempotency[key];
    return result(state, prior.ok, prior.message, true);
  }

  if (command.type === "SET_ACTOR") {
    state.currentActorId = actorId;
    return record(state, key, result(state, true, `Walkthrough role changed to ${actor.name}.`));
  }
  if (command.type === "RESERVE_PRODUCT") {
    if (actor.role !== "BUYER") return record(state, key, result(state, false, "Only a buyer can reserve this product."));
    if (state.productAvailability !== "AVAILABLE") return record(state, key, result(state, false, "This unique product is already reserved."));
    state.productAvailability = "RESERVED";
    state.reservation = { buyerId: actorId, productId: FIXTURE.product.id, reservedAt: new Date().toISOString() };
    state.order = { id: "order-prototype-001", state: "DRAFT" };
    addAudit(state, "PRODUCT_RESERVED", actorId, `${FIXTURE.product.id} reserved for checkout.`);
    return record(state, key, result(state, true, "Product reserved for this buyer. The order is now a draft."));
  }
  if (command.type === "RELEASE_RESERVATION") {
    if (actor.role !== "BUYER" || state.reservation?.buyerId !== actorId) {
      return record(state, key, result(state, false, "Only the reserving buyer can release this product."));
    }
    state.productAvailability = "AVAILABLE";
    state.reservation = null;
    state.order = null;
    addAudit(state, "RESERVATION_RELEASED", actorId, `${FIXTURE.product.id} returned to available inventory.`);
    return record(state, key, result(state, true, "Reservation released. The product is available again."));
  }
  return result(state, false, "This command belongs to a later prototype slice.");
}
