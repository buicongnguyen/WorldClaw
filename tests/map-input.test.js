import test from "node:test";
import assert from "node:assert/strict";
import { createMapInput } from "../src/map-input.js";

const event = (time, extra = {}) => ({
  pointerId: 1,
  pointerType: "mouse",
  isPrimary: true,
  button: 0,
  clientX: 40,
  clientY: 40,
  timeStamp: time,
  ...extra,
});
function tap(input, time, tile = 10, extra = {}) {
  input.down(event(time, extra));
  return input.up(event(time + 20, extra), tile);
}
test("single clicks inspect; only two nearby taps on the same tile activate once", () => {
  const input = createMapInput();
  assert.deepEqual(tap(input, 0), { tile: 10, activate: false });
  assert.deepEqual(tap(input, 150), { tile: 10, activate: true });
  assert.equal(tap(input, 220).activate, false);
  assert.equal(tap(input, 800).activate, false);
  assert.equal(tap(input, 900, 11).activate, false);
  assert.equal(tap(input, 1000, 11, { clientX: 70 }).activate, false);
});
test("drags that return to the starting point and long presses do not select", () => {
  const input = createMapInput();
  tap(input, 0);
  input.down(event(100));
  input.move(event(120, { clientX: 100 }));
  assert.equal(input.up(event(150), 10), null);
  assert.equal(tap(input, 200).activate, false);
  input.down(event(500));
  assert.equal(input.up(event(1200), 10), null);
});
test("pinch, pointer cancel, wheel/reset and non-primary buttons invalidate double taps", () => {
  const input = createMapInput();
  tap(input, 0);
  input.down(event(100));
  input.down(event(110, { pointerId: 2, isPrimary: false }));
  assert.equal(
    input.up(event(130, { pointerId: 2, isPrimary: false }), 10),
    null,
  );
  assert.equal(input.up(event(140), 10), null);
  assert.equal(tap(input, 160).activate, false);
  input.down(event(170));
  input.cancel(event(180));
  assert.equal(input.up(event(190), 10), null);
  assert.equal(tap(input, 200).activate, false);
  input.reset();
  assert.equal(tap(input, 250).activate, false);
  assert.equal(tap(input, 300, 10, { button: 2 }), null);
  assert.equal(tap(input, 350).activate, false);
});
test("touch double taps work, while mixed devices and missed tiles do not activate", () => {
  const input = createMapInput();
  assert.equal(tap(input, 0, 10, { pointerType: "touch" }).activate, false);
  assert.equal(tap(input, 150, 10, { pointerType: "touch" }).activate, true);
  assert.equal(tap(input, 200).activate, false);
  assert.equal(tap(input, 250, 10, { pointerType: "touch" }).activate, false);
  assert.equal(tap(input, 300, null, { pointerType: "touch" }), null);
  assert.equal(tap(input, 350, 10, { pointerType: "touch" }).activate, false);
});
