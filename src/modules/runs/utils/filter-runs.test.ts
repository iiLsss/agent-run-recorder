import { describe, expect, it } from "vitest";
import { runTimelineFixtures } from "../data/run-fixtures";
import type { RunFilterCriteria } from "../types/run";
import { filterRuns } from "./filter-runs";

const defaultCriteria: RunFilterCriteria = {
  query: "",
  agent: "all",
  model: "all",
  category: "all",
  difficulty: "all",
  result: "all",
  intervention: "all"
};

describe("filterRuns", () => {
  it("matches task, agent, or model text without case sensitivity", () => {
    const result = filterRuns(runTimelineFixtures, {
      ...defaultCriteria,
      query: "gpt-5.2"
    });

    expect(result).toHaveLength(2);
    expect(result.every((run) => run.agent === "Codex")).toBe(true);
  });

  it("combines structured filter criteria", () => {
    const result = filterRuns(runTimelineFixtures, {
      ...defaultCriteria,
      category: "编程",
      result: "success"
    });

    expect(result.map((run) => run.id)).toEqual(["run-8", "run-3"]);
  });

  it("keeps unknown values explicit", () => {
    const result = filterRuns(runTimelineFixtures, {
      ...defaultCriteria,
      result: "unknown"
    });

    expect(result).toHaveLength(1);
    expect(result[0].taskTitle).toBe("客户端事件草拟");
  });
});
