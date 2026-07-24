import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "../App";

describe("AppShell", () => {
  it("enables the five designed product pages", () => {
    render(<App />);

    expect(screen.getByRole("button", { name: "Run 时间线" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "任务" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "结果收件箱" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "对比" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "连接器" })).toBeEnabled();
    expect(screen.getByRole("button", { name: /设置/ })).toBeDisabled();
  });

  it("shows the local privacy status", () => {
    render(<App />);

    expect(screen.getByText("原始内容：不持久化")).toBeVisible();
    expect(screen.getByText("本地加密存储")).toBeVisible();
  });

  it("navigates between designed pages", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "对比" }));
    expect(screen.getByRole("heading", { name: "对比" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "连接器" }));
    expect(screen.getByRole("heading", { name: "连接器与健康" })).toBeVisible();
  });
});
