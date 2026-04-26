import test from "node:test";
import assert from "node:assert/strict";
import { CandleBuffer } from "./candleBuffer.js";

test("CandleBuffer keeps max size", () => {
  const b = new CandleBuffer(3);
  b.push({ time: 1, open: 1, high: 1, low: 1, close: 1 });
  b.push({ time: 2, open: 2, high: 2, low: 2, close: 2 });
  b.push({ time: 3, open: 3, high: 3, low: 3, close: 3 });
  b.push({ time: 4, open: 4, high: 4, low: 4, close: 4 });
  assert.equal(b.size(), 3);
  assert.equal(b.toArray()[0]?.time, 2);
  assert.equal(b.last()?.time, 4);
});

