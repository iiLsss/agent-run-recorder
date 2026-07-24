import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { TaskDetailPage } from "./TaskDetailPage";

describe("TaskDetailPage", () => {
  it("preserves overall and configuration result scopes", () => {
    render(<TaskDetailPage />);

    expect(screen.getByText("未确认")).toBeVisible();
    expect(screen.getByText("成功 — 仅预览，不进入正式统计")).toBeVisible();
    expect(screen.getByText("重度修改")).toBeVisible();
    expect(screen.getByText("2 个 eligible Run")).toBeVisible();
  });

  it("confirms the Task result without changing observations", async () => {
    const user = userEvent.setup();
    render(<TaskDetailPage />);

    await user.click(screen.getByRole("button", { name: "确认整体结果" }));

    expect(screen.getByText("用户已确认 Task 整体结果")).toBeVisible();
    expect(screen.getByText("重度修改")).toBeVisible();
  });

  it("switches the event and evidence inspector by Run", async () => {
    const user = userEvent.setup();
    render(<TaskDetailPage />);

    await user.click(screen.getByRole("button", { name: /Run #2 · Claude Code/ }));

    expect(screen.getByText("verification · spool_recovery")).toBeVisible();
    expect(screen.getByText("failed")).toBeVisible();
  });
});
