import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ComparePage } from "./ComparePage";

describe("ComparePage", () => {
  it("renders M1 descriptive statistics and blockers", () => {
    const { container } = render(<ComparePage />);

    expect(screen.getByText("配置最终成功率")).toBeVisible();
    expect(screen.getByText("观察性配对")).toBeVisible();
    expect(screen.getByText(/以下仅为近 30 天历史记录中的描述量/)).toBeVisible();
    expect(container.textContent).not.toContain("证明更强");
    expect(container.textContent).not.toContain("纯 Agent 差异");
  });

  it("swaps the two configuration columns", async () => {
    const user = userEvent.setup();
    render(<ComparePage />);
    const cards = screen.getAllByRole("article");

    expect(within(cards[0]).getByText("Claude Code · Sonnet 4.5")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "交换配置" }));
    expect(within(cards[0]).getByText("Codex · GPT-5.2")).toBeVisible();
  });
});
