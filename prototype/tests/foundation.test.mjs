import assert from "node:assert/strict";
import { createInitialState, executeCommand, getFixture, restoreState } from "../core.mjs";

let state = createInitialState();
const fixture = getFixture();

let attempt = executeCommand(state, { type: "RESERVE_PRODUCT", actorId: "seller-established-lines", idempotencyKey: "seller-reserve" });
assert.equal(attempt.ok, false, "seller must not reserve an item");

attempt = executeCommand(state, { type: "RESERVE_PRODUCT", actorId: "buyer-alex", idempotencyKey: "alex-reserve" });
assert.equal(attempt.ok, true);
state = attempt.state;
assert.equal(state.productAvailability, "RESERVED");
assert.equal(state.reservation.buyerId, "buyer-alex");
assert.equal(state.order.state, "DRAFT");
assert.equal(state.audit.length, 1);

const retry = executeCommand(state, { type: "RESERVE_PRODUCT", actorId: "buyer-alex", idempotencyKey: "alex-reserve" });
assert.equal(retry.ok, true);
assert.equal(retry.reused, true);
assert.equal(retry.state.audit.length, 1, "retry must not append an audit event");

attempt = executeCommand(state, { type: "RESERVE_PRODUCT", actorId: "buyer-jordan", idempotencyKey: "jordan-reserve" });
assert.equal(attempt.ok, false, "second buyer must not obtain unique inventory");

attempt = executeCommand(state, { type: "RELEASE_RESERVATION", actorId: "buyer-alex", idempotencyKey: "alex-release" });
assert.equal(attempt.ok, true);
state = attempt.state;
assert.equal(state.productAvailability, "AVAILABLE");
assert.equal(state.reservation, null);
assert.equal(state.audit.length, 2);

assert.deepEqual(restoreState({ version: 99 }), createInitialState(), "corrupt state must fall back to fixtures");
assert.equal(fixture.product.id, "EL-CH-001");
console.log("PASS: prototype foundation state, role gate, idempotency, and recovery.");
