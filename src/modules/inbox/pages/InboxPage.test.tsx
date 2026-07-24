import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { InboxPage } from "./InboxPage";

describe("InboxPage", () => {
  it("keeps automatic intervention signals as suggestions", () => {
    render(<InboxPage />);

    expect(screen.getByText(/自动建议：轻度/)).toBeVisible();
    expect(
      screen.getByText("写入 postHocConfirmedDifficulty，不覆盖 preRunDifficulty")
    ).toBeVisible();
  });

  it("submits a complete Run review and allows editing it", async () => {
    const user = userEvent.setup();
    render(<InboxPage />);
    const card = screen.getByText("fixture 脱敏审查").closest("article");

    expect(card).not.toBeNull();
    await user.click(within(card!).getByRole("button", { name: "完全完成" }));
    await user.click(within(card!).getByRole("button", { name: "轻度" }));
    await user.click(within(card!).getByRole("button", { name: "提交评价" }));

    expect(within(card!).getByText("评价已保存到本地")).toBeVisible();
    await user.click(within(card!).getByRole("button", { name: "修改" }));
    expect(within(card!).getByRole("button", { name: "提交评价" })).toBeEnabled();
  });

  it("labels Task evaluation scope separately", () => {
    render(<InboxPage />);

    expect(
      screen.getByText(
        "此处提交的是 Task 整体结果；不会自动归因给任何 AgentConfiguration。"
      )
    ).toBeVisible();
  });

  it("can skip a review and restore it without writing an evaluation", async () => {
    const user = userEvent.setup();
    render(<InboxPage />);
    const card = screen.getByText("客户端事件草拟").closest("article");

    expect(screen.getByText(/3 条待评价/)).toBeVisible();
    await user.click(within(card!).getByRole("button", { name: "跳过" }));

    expect(within(card!).getByText("已跳过，尚未写入评价")).toBeVisible();
    expect(screen.getByText(/2 条待评价/)).toBeVisible();
    await user.click(within(card!).getByRole("button", { name: "恢复评价" }));
    expect(within(card!).getByRole("button", { name: "提交评价" })).toBeDisabled();
  });

  it("persists classification and post-hoc difficulty only in the review draft", async () => {
    const user = userEvent.setup();
    render(<InboxPage />);
    const card = screen.getByText("客户端事件草拟").closest("article");

    await user.selectOptions(within(card!).getByLabelText("类别确认"), "文档");
    await user.selectOptions(within(card!).getByLabelText("难度回顾"), "high");
    await user.click(within(card!).getByRole("button", { name: "完全完成" }));
    await user.click(within(card!).getByRole("button", { name: "无" }));
    await user.click(within(card!).getByRole("button", { name: "提交评价" }));

    expect(within(card!).getByText(/类别 文档 · postHoc 难度 高/)).toBeVisible();
    await user.click(within(card!).getByRole("button", { name: "修改" }));
    expect(within(card!).getByLabelText("类别确认")).toHaveValue("文档");
    expect(within(card!).getByLabelText("难度回顾")).toHaveValue("high");
  });
});
