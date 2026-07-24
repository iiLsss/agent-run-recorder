import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ConnectorsPage } from "./ConnectorsPage";

describe("ConnectorsPage", () => {
  it("shows capability tiers and local receiver security", () => {
    render(<ConnectorsPage />);

    expect(screen.getAllByText("完整采集档")).toHaveLength(4);
    expect(screen.getByText(/127.0.0.1:4318/)).toBeVisible();
    expect(screen.getByText(/兼容模式（安全降级）/)).toBeVisible();
  });

  it("pauses and resumes an individual connector", async () => {
    const user = userEvent.setup();
    render(<ConnectorsPage />);

    await user.click(screen.getByRole("button", { name: "停用 Cursor" }));
    expect(screen.getByRole("button", { name: "启用 Cursor" })).toBeVisible();
  });

  it("opens the add connector flow and selects a source", async () => {
    const user = userEvent.setup();
    render(<ConnectorsPage />);

    await user.click(screen.getByRole("button", { name: "添加连接器" }));
    const dialog = screen.getByRole("dialog", { name: "添加采集来源" });
    expect(dialog).toBeVisible();
    await user.click(within(dialog).getByRole("button", { name: /Codex/ }));
    expect(screen.getByText("Codex 连接器配置已准备")).toBeVisible();
  });

  it("updates the capability check timestamp", async () => {
    const user = userEvent.setup();
    render(<ConnectorsPage />);

    await user.click(screen.getByRole("button", { name: "检测能力矩阵" }));
    expect(screen.getByText("本次能力检测：刚刚")).toBeVisible();
  });
});
