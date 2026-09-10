import { describe, expect, it } from "vitest";
import { createGrid } from "../../grid.js";
import { formatPatternBlock, gridToAscii } from "./gridToAscii.js";

describe("gridToAscii", () => {
  it("renders on/off cells", () => {
    const grid = createGrid(2);
    grid[0][0] = true;
    expect(gridToAscii(grid)).toBe("#.\n..");
  });

  it("formats pattern block with stats", () => {
    const grid = createGrid(2);
    grid[0][0] = true;
    const block = formatPatternBlock(grid, 1, 3);
    expect(block).toContain("pattern 1/3");
    expect(block).toContain("#.");
  });
});
