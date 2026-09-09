import { describe, expect, it } from "vitest";
import { createRng } from "./rng.js";

describe("rng", () => {
  it("is deterministic for same seed", () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 5 }, () => a.next());
    const seqB = Array.from({ length: 5 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it("nextInt stays in range", () => {
    const rng = createRng(1);
    for (let i = 0; i < 100; i++) {
      const v = rng.nextInt(5, 10);
      expect(v).toBeGreaterThanOrEqual(5);
      expect(v).toBeLessThanOrEqual(10);
    }
  });

  it("nextInt throws on invalid range", () => {
    const rng = createRng(1);
    expect(() => rng.nextInt(5, 3)).toThrow(RangeError);
  });

  it("pick selects from array", () => {
    const rng = createRng(7);
    const item = rng.pick(["a", "b", "c"]);
    expect(["a", "b", "c"]).toContain(item);
  });

  it("pick throws on empty", () => {
    expect(() => createRng(1).pick([])).toThrow(RangeError);
  });

  it("shuffle permutes", () => {
    const rng = createRng(99);
    const original = [1, 2, 3, 4, 5];
    const shuffled = rng.shuffle(original);
    expect(shuffled).toHaveLength(5);
    expect(shuffled.sort()).toEqual([1, 2, 3, 4, 5]);
    expect(original).toEqual([1, 2, 3, 4, 5]);
  });
});
