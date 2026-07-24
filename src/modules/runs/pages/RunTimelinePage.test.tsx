import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { RunTimelinePage } from "./RunTimelinePage";

describe("RunTimelinePage", () => {
  it("renders the representative timeline structure", () => {
    render(
      <RunTimelinePage onOpenTask={() => undefined} onOpenInbox={() => undefined} />
    );

    expect(screen.getByRole("heading", { name: "Run 时间线" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Agent 配置" })).toBeVisible();
    expect(screen.getByRole("combobox", { name: "模型" })).toBeVisible();
    expect(screen.getAllByRole("row")).toHaveLength(9);
  });

  it("filters records through the Agent control", async () => {
    const user = userEvent.setup();
    render(
      <RunTimelinePage onOpenTask={() => undefined} onOpenInbox={() => undefined} />
    );

    await user.selectOptions(screen.getByLabelText("Agent"), "Codex");

    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(3);
    expect(within(rows[1]).getByText("Codex")).toBeVisible();
    expect(within(rows[2]).getByText("Codex")).toBeVisible();
  });
});
