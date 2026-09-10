import { density, hasAnyOn } from "../../grid.js";
import type { Grid } from "../../types.js";
import { countComponents, isConnected } from "./components.js";

export type ValidationOptions = {
  minDensity: number;
  maxDensity: number;
  maxComponents?: number;
  requireConnected?: boolean;
};

export function isValidPattern(grid: Grid, options: ValidationOptions): boolean {
  const d = density(grid);
  if (!hasAnyOn(grid) || d < options.minDensity || d > options.maxDensity) {
    return false;
  }
  if (options.requireConnected) {
    return isConnected(grid);
  }
  if (options.maxComponents !== undefined) {
    return countComponents(grid) <= options.maxComponents;
  }
  return true;
}

export function shouldAcceptPattern(
  grid: Grid,
  options: ValidationOptions,
  attempt: number,
  maxAttempts: number,
  preferredMaxComponents?: number,
): boolean {
  if (!isValidPattern(grid, options)) return false;
  if (options.requireConnected) return true;
  if (preferredMaxComponents === undefined || options.maxComponents === undefined) {
    return true;
  }
  const components = countComponents(grid);
  if (components <= preferredMaxComponents) return true;
  return components <= options.maxComponents && attempt >= maxAttempts - 2;
}
