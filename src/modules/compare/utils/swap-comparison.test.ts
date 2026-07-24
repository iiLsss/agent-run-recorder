import { describe, expect, it } from "vitest";
import { comparisonFixture } from "../data/comparison-fixture";
import { getOrderedConfigurations, getOrderedMetrics } from "./swap-comparison";

describe("comparison ordering", () => {
  it("swaps configurations and unknown counts together", () => {
    const configurations = getOrderedConfigurations(
      comparisonFixture.configurations,
      true
    );
    const metrics = getOrderedMetrics(comparisonFixture.metrics, true);

    expect(configurations[0].id).toBe("codex-gpt");
    expect(metrics[0].configurationA).toBe("67% · 10/15");
    expect(metrics[0].unknown).toBe("1 / 2");
  });
});
