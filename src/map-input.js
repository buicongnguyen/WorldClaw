// A tap selects immediately; a second deliberate tap on the same tile activates.
// Camera drags, long presses, cancelled gestures and multi-touch never activate.
export function createMapInput() {
  const pointers = new Map();
  let previous = null;
  const reset = () => {
    previous = null;
    for (const pointer of pointers.values()) pointer.cancelled = true;
  };
  return {
    reset,
    down(e) {
      if (pointers.size || e.button !== 0 || e.isPrimary === false) reset();
      pointers.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY,
        time: e.timeStamp,
        cancelled: pointers.size > 0 || e.button !== 0 || e.isPrimary === false,
      });
    },
    move(e) {
      const p = pointers.get(e.pointerId);
      if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 6) {
        p.cancelled = true;
        previous = null;
      }
    },
    cancel(e) {
      reset();
      pointers.delete(e.pointerId);
    },
    up(e, tile) {
      const p = pointers.get(e.pointerId);
      pointers.delete(e.pointerId);
      if (
        !p ||
        p.cancelled ||
        pointers.size ||
        e.button !== 0 ||
        e.timeStamp - p.time > 600 ||
        Math.hypot(e.clientX - p.x, e.clientY - p.y) > 6 ||
        tile == null
      ) {
        previous = null;
        return null;
      }
      const activate = !!(
        previous &&
        previous.tile === tile &&
        previous.type === e.pointerType &&
        e.timeStamp - previous.time <= 450 &&
        Math.hypot(e.clientX - previous.x, e.clientY - previous.y) <= 12
      );
      previous = activate
        ? null
        : {
            tile,
            type: e.pointerType,
            time: e.timeStamp,
            x: e.clientX,
            y: e.clientY,
          };
      return { tile, activate };
    },
  };
}
