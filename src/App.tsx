import { useMemo, useState } from "react";
import {
  Activity,
  Archive,
  ArrowLeftRight,
  Bell,
  Check,
  ChevronDown,
  CircleDot,
  Clock3,
  Database,
  Download,
  FileCheck2,
  Filter,
  Gauge,
  GitBranch,
  HardDrive,
  Inbox,
  Info,
  Layers3,
  Link2,
  ListFilter,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  RefreshCcw,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Terminal,
  Unplug,
  Wifi,
  X
} from "lucide-react";
import { connectors, runs, type RunRecord, type RunResult } from "./data";

type Page =
  | "timeline"
  | "tasks"
  | "inbox"
  | "compare"
  | "connectors"
  | "settings"
  | "data";

const navItems: Array<{
  id: Page;
  label: string;
  icon: typeof Activity;
  badge?: string;
  alert?: boolean;
}> = [
  { id: "timeline", label: "Run 时间线", icon: Activity },
  { id: "tasks", label: "任务", icon: Layers3 },
  { id: "inbox", label: "结果收件箱", icon: Inbox, badge: "6" },
  { id: "compare", label: "对比", icon: ArrowLeftRight },
  { id: "connectors", label: "连接器", icon: Link2, alert: true }
];

const resultTone: Record<RunResult, string> = {
  成功: "success",
  部分完成: "warning",
  失败: "danger",
  已取消: "muted",
  未评价: "neutral"
};

function StatusDot({ tone = "success" }: { tone?: string }) {
  return <span className={`status-dot ${tone}`} aria-hidden="true" />;
}

function Badge({
  children,
  tone = "neutral",
  mono = false
}: {
  children: React.ReactNode;
  tone?: string;
  mono?: boolean;
}) {
  return (
    <span className={`badge ${tone}${mono ? " mono" : ""}`}>{children}</span>
  );
}

function IconButton({
  label,
  children,
  onClick
}: {
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button className="icon-button" aria-label={label} onClick={onClick}>
      {children}
    </button>
  );
}

function App() {
  const [page, setPage] = useState<Page>("timeline");
  const [paused, setPaused] = useState(false);
  const [toast, setToast] = useState("");

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  return (
    <div className="app-shell">
      <Sidebar
        page={page}
        paused={paused}
        onNavigate={setPage}
        onTogglePause={() => {
          setPaused((current) => !current);
          notify(paused ? "已恢复全部连接器采集" : "已暂停全部连接器采集");
        }}
      />
      <main className="main-panel">
        {page === "timeline" && (
          <TimelinePage
            onOpenTask={() => setPage("tasks")}
            onNotify={notify}
          />
        )}
        {page === "tasks" && <TaskDetailPage onNotify={notify} />}
        {page === "inbox" && <InboxPage onNotify={notify} />}
        {page === "compare" && <ComparePage onNotify={notify} />}
        {page === "connectors" && <ConnectorsPage onNotify={notify} />}
        {page === "settings" && (
          <PlaceholderPage
            icon={<Settings />}
            title="设置"
            copy="启动、通知、免打扰与更新设置将在桌面端壳层中生效。"
          />
        )}
        {page === "data" && (
          <PlaceholderPage
            icon={<Database />}
            title="数据管理"
            copy="本地加密数据的备份、导出与批量清理入口。"
          />
        )}
      </main>
      {toast && (
        <div className="toast" role="status">
          <Check size={15} />
          {toast}
        </div>
      )}
    </div>
  );
}

function Sidebar({
  page,
  paused,
  onNavigate,
  onTogglePause
}: {
  page: Page;
  paused: boolean;
  onNavigate: (page: Page) => void;
  onTogglePause: () => void;
}) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <CircleDot size={15} />
        </div>
        <span>Run Recorder</span>
        <Badge>内测</Badge>
      </div>

      <label className="sidebar-search">
        <Search size={14} />
        <input
          aria-label="全局搜索"
          placeholder="搜索 Run / Task"
          onFocus={() => undefined}
        />
        <kbd>⌘K</kbd>
      </label>

      <div className="nav-section">
        <span className="nav-label">工作区</span>
        <nav aria-label="主导航">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`nav-item ${page === item.id ? "active" : ""}`}
                aria-current={page === item.id ? "page" : undefined}
                onClick={() => onNavigate(item.id)}
              >
                <Icon size={15} />
                <span>{item.label}</span>
                {item.badge && <span className="nav-badge">{item.badge}</span>}
                {item.alert && <StatusDot tone="warning" />}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="nav-section secondary">
        <button
          className={`nav-item ${page === "settings" ? "active" : ""}`}
          onClick={() => onNavigate("settings")}
        >
          <Settings size={15} />
          <span>设置</span>
        </button>
        <button
          className={`nav-item ${page === "data" ? "active" : ""}`}
          onClick={() => onNavigate("data")}
        >
          <Database size={15} />
          <span>数据管理</span>
        </button>
      </div>

      <div className="capture-card">
        <div className="capture-card__header">
          <span>
            <StatusDot tone={paused ? "warning" : "success"} />
            {paused ? "已暂停" : "采集中"}
          </span>
          <button onClick={onTogglePause}>
            {paused ? <Play size={12} /> : <Pause size={12} />}
            {paused ? "恢复" : "暂停"}
          </button>
        </div>
        <div className="spool-line">
          <span>spool 水位</span>
          <strong>87 / 256 MB</strong>
        </div>
        <div className="mini-progress">
          <span />
        </div>
        <p>连接器 4/5 正常 · 1 异常</p>
      </div>

      <div className="privacy-bar">
        <ShieldCheck size={12} />
        本地加密存储
        <span>SQLCipher · AES-256</span>
      </div>
    </aside>
  );
}

function PageHeader({
  title,
  subtitle,
  actions
}: {
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="header-actions">{actions}</div>
    </header>
  );
}

function SelectFilter({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="select-filter">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
      <ChevronDown size={12} />
    </label>
  );
}

function TimelinePage({
  onOpenTask,
  onNotify
}: {
  onOpenTask: () => void;
  onNotify: (message: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [agent, setAgent] = useState("全部");
  const [category, setCategory] = useState("全部");
  const [difficulty, setDifficulty] = useState("全部");
  const [result, setResult] = useState("全部");
  const [intervention, setIntervention] = useState("全部");

  const filteredRuns = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return runs.filter((run) => {
      const matchesQuery =
        !normalized ||
        `${run.task} ${run.agent} ${run.model}`.toLowerCase().includes(normalized);
      return (
        matchesQuery &&
        (agent === "全部" || run.agent === agent) &&
        (category === "全部" || run.category === category) &&
        (difficulty === "全部" || run.difficulty.startsWith(difficulty)) &&
        (result === "全部" || run.result === result) &&
        (intervention === "全部" || run.intervention === intervention)
      );
    });
  }, [agent, category, difficulty, intervention, query, result]);

  return (
    <section className="page timeline-page">
      <PageHeader
        title="Run 时间线"
        subtitle="近 30 天 · 126 条 Run · 4 个 AgentConfiguration"
        actions={
          <>
            <button
              className="button secondary"
              onClick={() => onNotify("导出已准备：仅包含 allowlist 字段")}
            >
              <Download size={14} />
              导出 CSV / JSON
            </button>
            <button className="button primary" onClick={() => undefined}>
              去评价 · 6
            </button>
          </>
        }
      />

      <div className="filter-row">
        <SelectFilter
          label="时间"
          value="近 30 天"
          onChange={() => undefined}
          options={["近 30 天", "近 7 天", "今天"]}
        />
        <SelectFilter
          label="Agent"
          value={agent}
          onChange={setAgent}
          options={["全部", "Claude Code", "Codex", "Gemini CLI", "OpenCode", "Cursor"]}
        />
        <SelectFilter
          label="类别"
          value={category}
          onChange={setCategory}
          options={["全部", "编程", "研究", "文档", "数据分析", "浏览器操作", "沟通"]}
        />
        <SelectFilter
          label="难度"
          value={difficulty}
          onChange={setDifficulty}
          options={["全部", "低", "中", "高", "未知"]}
        />
        <SelectFilter
          label="结果"
          value={result}
          onChange={setResult}
          options={["全部", "成功", "部分完成", "失败", "已取消", "未评价"]}
        />
        <SelectFilter
          label="干预"
          value={intervention}
          onChange={setIntervention}
          options={["全部", "无", "轻度", "重度", "接管", "未知"]}
        />
        <label className="table-search">
          <Search size={13} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="筛选任务"
            aria-label="筛选任务"
          />
        </label>
      </div>

      <div className="table-card">
        <div className="run-table header">
          <span>时间</span>
          <span>Agent 配置</span>
          <span>Task</span>
          <span>类别</span>
          <span>难度</span>
          <span>结果</span>
          <span>人工干预</span>
          <span>耗时</span>
          <span>Token</span>
          <span />
        </div>
        <div className="run-list">
          {filteredRuns.map((run) => (
            <RunRow key={run.id} run={run} onOpen={onOpenTask} />
          ))}
          {filteredRuns.length === 0 && (
            <div className="empty-state">
              <ListFilter size={20} />
              没有符合当前筛选条件的 Run
            </div>
          )}
        </div>
      </div>
      <BottomStatus />
    </section>
  );
}

function RunRow({ run, onOpen }: { run: RunRecord; onOpen: () => void }) {
  return (
    <button className="run-table row" onClick={onOpen}>
      <span className="mono dim">{run.time}</span>
      <span className="agent-cell">
        <strong>{run.agent}</strong>
        <small>{run.model} · 稳定版</small>
      </span>
      <span className="task-title">{run.task}</span>
      <span>
        <Badge>{run.category}</Badge>
      </span>
      <span className="mono">{run.difficulty}</span>
      <span className={`result ${resultTone[run.result]}`}>
        <StatusDot tone={resultTone[run.result]} />
        {run.result}
      </span>
      <span className={run.intervention === "接管" ? "danger-text" : ""}>
        {run.intervention}
      </span>
      <span className="mono">{run.duration}</span>
      <span className="mono">{run.tokens}</span>
      <span>
        <MoreHorizontal size={15} />
      </span>
    </button>
  );
}

function BottomStatus() {
  return (
    <footer className="bottom-status">
      <span>本地处理进行中</span>
      <span>SQLCipher · AES-256</span>
      <span>无遥测</span>
      <span>原始内容：不持久化</span>
      <span className="push">上次同步 12 秒前</span>
      <span className="mono">v0.1.0 内测</span>
    </footer>
  );
}

function TaskDetailPage({ onNotify }: { onNotify: (message: string) => void }) {
  const [showAllEvents, setShowAllEvents] = useState(false);

  return (
    <section className="page task-detail-page">
      <PageHeader
        title="Task 详情"
        subtitle="Task-8f2c · 2 个配置 · 3 次 Run · 隐私规则已生效"
        actions={
          <>
            <button className="button secondary">
              <GitBranch size={14} />
              归并 / 拆分
            </button>
            <button
              className="button primary"
              onClick={() => onNotify("该 Task 已确认整体结果")}
            >
              确认整体结果
            </button>
          </>
        }
      />

      <div className="task-meta strip">
        <span>类别：编程 · 来源 rule v3</span>
        <span>难度：中（3）· 执行前 · 不可覆盖</span>
        <Badge>全部 Run / Observation 继承同一比较类别</Badge>
      </div>

      <div className="detail-grid">
        <div className="detail-main">
          <article className="panel task-overall">
            <div className="panel-title">
              <span>Task 整体结果 · TaskOverallResult</span>
              <Badge>独立于配置归因</Badge>
            </div>
            <div className="overall-content">
              <div>
                <strong className="unknown-title">未确认</strong>
                <p>用户尚未提交整体评价 · outcome = unknown</p>
              </div>
              <div className="derived-preview">
                <span>只读系统推断 DerivedTaskStatus</span>
                <strong>成功 — 仅预览，不进入正式统计</strong>
              </div>
            </div>
          </article>

          <ObservationCard
            agent="Claude Code · Sonnet 4.5"
            outcome="失败"
            intervention="重度修改"
            firstAttempt="失败"
            retries="1"
            duration="30m 11s"
            tokens="180.6k"
            tone="danger"
            source="settled · task_closed"
          />
          <ObservationCard
            agent="Codex · GPT-5.2"
            outcome="成功"
            intervention="无"
            firstAttempt="成功"
            retries="0"
            duration="12m 48s"
            tokens="84.2k"
            tone="success"
            source="settled · inactivity"
          />

          <div className="callout warning">
            同一 Task 的两个配置观察值形成观察性配对 · 已控制 Task 身份差异，仍可能受顺序、上下文继承与用户学习影响
          </div>

          <article className="panel run-history">
            <div className="panel-title">
              <span>Run（3）· 边界来源与评价状态</span>
            </div>
            {[
              ["Run #3 · Codex · 今天 14:32", "closed · explicit · succeeded", "评价：成功 / 无干预"],
              ["Run #2 · Claude Code · 今天 11:02", "closed · timeout · failed", "评价：失败 / 重度修改"],
              ["Run #1 · Claude Code · 今天 09:15", "closed · explicit · failed", "评价：失败 / 轻度修改"]
            ].map((item, index) => (
              <div className={`history-row ${index === 0 ? "selected" : ""}`} key={item[0]}>
                <strong>{item[0]}</strong>
                <span className="mono">{item[1]}</span>
                <span>{item[2]}</span>
              </div>
            ))}
          </article>
        </div>

        <aside className="detail-side">
          <article className="panel event-panel">
            <div className="panel-title">
              <span>事件流 · Run #3</span>
              <Badge mono>{showAllEvents ? "18 事件" : "6 / 18"}</Badge>
            </div>
            <div className="event-list">
              {[
                ["read", "src/spool/segment.rs", "428ms"],
                ["shell", "cargo test", "6.2s · success"],
                ["write", "src/spool/recovery.rs", "410ms"],
                ["read", "src/input.rs", "340ms"],
                ["shell", "cargo test", "7.1s · success"],
                ["artifact", "docs/recovery-notes.md", "document"]
              ]
                .slice(0, showAllEvents ? 6 : 4)
                .map((event) => (
                  <div className="event-line" key={event.join("-")}>
                    <span className="mono event-type">{event[0]}</span>
                    <span className="mono">{event[1]}</span>
                    <span className="mono">{event[2]}</span>
                  </div>
                ))}
            </div>
            <button
              className="text-button"
              onClick={() => setShowAllEvents((current) => !current)}
            >
              {showAllEvents ? "收起事件" : "查看全部 18 个事件"}
            </button>
          </article>

          <article className="panel evidence-panel">
            <div className="panel-title">
              <span>证据 · EvidenceReference</span>
              <Badge tone="success">已脱敏</Badge>
            </div>
            <div className="evidence-line">
              <Badge tone="danger">test</Badge>
              <span>verification · spool_recovery</span>
              <strong className="danger-text">failed</strong>
            </div>
            <div className="evidence-line">
              <Badge>artifact</Badge>
              <span>document · recovery-notes.md</span>
              <strong>已生成</strong>
            </div>
            <div className="evidence-line">
              <Badge>git</Badge>
              <span>commit · a91a2b3（object token）</span>
              <strong>已采纳</strong>
            </div>
            <p className="privacy-note">
              仅保存 tokenized 引用与 displayHint，不保存原始路径、URL 或开放字符串
            </p>
          </article>
        </aside>
      </div>
      <BottomStatus />
    </section>
  );
}

function ObservationCard({
  agent,
  outcome,
  intervention,
  firstAttempt,
  retries,
  duration,
  tokens,
  tone,
  source
}: {
  agent: string;
  outcome: string;
  intervention: string;
  firstAttempt: string;
  retries: string;
  duration: string;
  tokens: string;
  tone: string;
  source: string;
}) {
  return (
    <article className="panel observation-card">
      <div className="panel-title">
        <span>配置观察 · {agent}</span>
        <span className="mono dim">{source}</span>
      </div>
      <div className="observation-metrics">
        <div>
          <span>最终结果 finalOutcome</span>
          <strong className={`${tone}-text`}>{outcome}</strong>
        </div>
        <div>
          <span>首试结果 firstAttempt</span>
          <strong>{firstAttempt}</strong>
        </div>
        <div>
          <span>配置内重试 retryCount</span>
          <strong>{retries}</strong>
        </div>
        <div>
          <span>最大人工干预 maxIntervention</span>
          <strong className={tone === "danger" ? "warning-text" : "success-text"}>
            {intervention}
          </strong>
        </div>
        <div>
          <span>总耗时</span>
          <strong className="mono">{duration}</strong>
        </div>
        <div>
          <span>Token 合计</span>
          <strong className="mono">{tokens}</strong>
        </div>
      </div>
    </article>
  );
}

type ReviewState = {
  outcome: RunResult | "";
  intervention: string;
  submitted: boolean;
};

function InboxPage({ onNotify }: { onNotify: (message: string) => void }) {
  const [reviews, setReviews] = useState<Record<string, ReviewState>>({
    fixture: { outcome: "", intervention: "", submitted: false },
    export: { outcome: "", intervention: "", submitted: false },
    otlp: { outcome: "", intervention: "", submitted: false }
  });

  const updateReview = (
    id: string,
    key: keyof Pick<ReviewState, "outcome" | "intervention">,
    value: string
  ) => {
    setReviews((current) => ({
      ...current,
      [id]: { ...current[id], [key]: value }
    }));
  };

  const submit = (id: string) => {
    setReviews((current) => ({
      ...current,
      [id]: { ...current[id], submitted: true }
    }));
    onNotify("评价已保存到本地");
  };

  return (
    <section className="page inbox-page">
      <PageHeader
        title="结果收件箱"
        subtitle="6 条待评价 · 单条目标 ≤ 10 秒 · 免打扰 22:00–09:00 · 每周主动提醒 ≤ 3 次"
        actions={
          <>
            <button className="button secondary">全部稍后</button>
            <button
              className="button primary"
              onClick={() => onNotify("批量评价模式已开启")}
            >
              开始评价
            </button>
          </>
        }
      />
      <div className="callout neutral">
        评价仅写入你本机记录。未评价（unknown）会在对比中单独显示，不会被估算或分摊到任何配置。
      </div>

      <div className="review-list">
        <ReviewCard
          id="fixture"
          label="Claude Code · Sonnet 4.5"
          task="fixture 脱敏审查"
          meta="编程 · 高 · 4"
          time="今天 11:28 · 17m 31s"
          state={reviews.fixture}
          suggestion="自动建议：轻度 — Run 结束后 30 分钟内在相关路径集合检测到 git 变更。信号仅供确认，默认后为未知。"
          onChange={updateReview}
          onSubmit={submit}
        />
        <ReviewCard
          id="export"
          label="Codex · GPT-5.2"
          task="客户端事件草拟"
          meta="沟通 · 难度未知"
          time="今天 10:48 · 5m 02s"
          state={reviews.export}
          categoryReview
          onChange={updateReview}
          onSubmit={submit}
        />
        <ReviewCard
          id="otlp"
          label="Gemini CLI · 2.5 Pro"
          task="调研 OTLP 认证方案"
          meta="Task 整体评价"
          time="今天 13:48 · 21m 03s"
          state={reviews.otlp}
          taskReview
          onChange={updateReview}
          onSubmit={submit}
        />
      </div>
      <BottomStatus />
    </section>
  );
}

function ReviewCard({
  id,
  label,
  task,
  meta,
  time,
  state,
  suggestion,
  categoryReview = false,
  taskReview = false,
  onChange,
  onSubmit
}: {
  id: string;
  label: string;
  task: string;
  meta: string;
  time: string;
  state: ReviewState;
  suggestion?: string;
  categoryReview?: boolean;
  taskReview?: boolean;
  onChange: (
    id: string,
    key: keyof Pick<ReviewState, "outcome" | "intervention">,
    value: string
  ) => void;
  onSubmit: (id: string) => void;
}) {
  const outcomes: RunResult[] = ["成功", "部分完成", "失败", "已取消"];
  const interventions = ["无", "轻度", "重度", "接管"];

  return (
    <article className={`review-card ${state.submitted ? "submitted" : ""}`}>
      <div className="review-header">
        <div>
          <strong>{label}</strong>
          <span>{task}</span>
          <Badge>{meta}</Badge>
        </div>
        <span className="mono dim">{time}</span>
      </div>
      {state.submitted ? (
        <div className="submitted-state">
          <Check size={18} />
          已完成评价
          <button
            className="text-button"
            onClick={() =>
              onChange(id, "outcome", state.outcome || "未评价")
            }
          >
            修改
          </button>
        </div>
      ) : (
        <>
          <div className="review-field">
            <span>Run 结果</span>
            <div className="segmented">
              {outcomes.map((outcome) => (
                <button
                  key={outcome}
                  className={state.outcome === outcome ? "active" : ""}
                  onClick={() => onChange(id, "outcome", outcome)}
                >
                  {outcome}
                </button>
              ))}
            </div>
          </div>
          <div className="review-field">
            <span>人工干预</span>
            <div className="segmented">
              {interventions.map((intervention) => (
                <button
                  key={intervention}
                  className={state.intervention === intervention ? "active" : ""}
                  onClick={() => onChange(id, "intervention", intervention)}
                >
                  {intervention}
                </button>
              ))}
            </div>
          </div>
          {suggestion && (
            <div className="suggestion">
              <Sparkles size={14} />
              {suggestion}
            </div>
          )}
          {categoryReview && (
            <div className="review-extra">
              <SelectFilter
                label="类别确认"
                value="沟通"
                onChange={() => undefined}
                options={["沟通", "文档", "其他"]}
              />
              <SelectFilter
                label="难度回顾"
                value="未确认"
                onChange={() => undefined}
                options={["未确认", "低（1–2）", "中（3）", "高（4–5）"]}
              />
              <span>写入 postHocConfirmedDifficulty，不覆盖执行前难度</span>
            </div>
          )}
          {taskReview && (
            <div className="review-extra task-scope">
              <Info size={14} />
              此处提交的是 Task 整体结果；不会自动归因给任何 AgentConfiguration。
            </div>
          )}
          <div className="review-actions">
            <button className="button ghost">跳过</button>
            <button
              className="button primary"
              disabled={!state.outcome || !state.intervention}
              onClick={() => onSubmit(id)}
            >
              提交评价
            </button>
          </div>
        </>
      )}
    </article>
  );
}

const compareRows = [
  ["首试成功率", "58% · 7/12", "67% · 10/15", "2 / 1"],
  ["配置最终成功率 · 主方向指标", "75% · 9/12", "80% · 12/15", "1 / 1"],
  ["部分完成率", "8% · 1/12", "13% · 2/15", "1 / 1"],
  ["失败率", "17% · 2/12", "7% · 1/15", "1 / 1"],
  ["人工干预率", "25% · 3/12", "13% · 2/15", "2 / 1"],
  ["配置内重试 · 中位数", "1", "0", "—"],
  ["Token · 中位数", "88.4k", "76.1k", "能力范围相同"]
];

function ComparePage({ onNotify }: { onNotify: (message: string) => void }) {
  return (
    <section className="page compare-page">
      <PageHeader
        title="对比"
        subtitle="AgentConfiguration 观察性对比 · 不构成因果结论"
        actions={
          <>
            <button className="button secondary">
              <SlidersHorizontal size={14} />
              统计规范 stats-v1
            </button>
            <button
              className="button primary"
              onClick={() => onNotify("对比明细已导出")}
            >
              导出说明
            </button>
          </>
        }
      />

      <div className="configuration-grid">
        <article>
          <span>配置 A</span>
          <strong>Claude Code · Sonnet 4.5</strong>
          <small>agentVersionGroup v2026.4 · 完整采集档</small>
        </article>
        <ArrowLeftRight size={18} />
        <article>
          <span>配置 B</span>
          <strong>Codex · GPT-5.2</strong>
          <small>v5.2-stable · 完整采集档</small>
        </article>
        <Badge tone="accent">不同模型 AgentConfiguration 对比</Badge>
      </div>

      <div className="filter-row compare-filters">
        <SelectFilter label="类别" value="编程" onChange={() => undefined} options={["编程"]} />
        <SelectFilter label="难度" value="中（3）" onChange={() => undefined} options={["中（3）"]} />
        <SelectFilter label="时间窗口" value="近 30 天" onChange={() => undefined} options={["近 30 天"]} />
        <SelectFilter label="采集档位" value="同档 · 完整" onChange={() => undefined} options={["同档 · 完整"]} />
      </div>

      <div className="callout warning">
        M1 描述统计模式 — 不宣布赢家，不输出方向性结论。以下仅为 30 天内历史记录中的描述量，任务并非随机分配给配置。
      </div>

      <article className="panel compare-table">
        <div className="panel-title">
          <span>描述统计 · 指标 × 配置对 × 比较桶</span>
          <Badge>analysisAsOf 2026-07-24 00:00 CST</Badge>
        </div>
        <div className="compare-row header">
          <span>指标</span>
          <span>配置 A</span>
          <span>配置 B</span>
          <span>unknown（A / B）</span>
        </div>
        {compareRows.map((row) => (
          <div className="compare-row" key={row[0]}>
            <strong>{row[0]}</strong>
            <span className="mono">{row[1]}</span>
            <span className="mono">{row[2]}</span>
            <span className="mono dim">{row[3]}</span>
          </div>
        ))}
      </article>

      <div className="comparison-summary">
        <article className="panel quality-card">
          <div>
            <span>数据质量 · 该桶</span>
            <Badge tone="warning">中</Badge>
          </div>
          <p>n 12 / 15 · 反馈覆盖 83% / 92% · 元数据 96% / 98%</p>
          <p>Task 归并 91% / 95% · 未跨档位 · 指标能力一致</p>
          <strong>反馈覆盖率差 9pp · 合格</strong>
        </article>
        <article className="panel paired-card">
          <span>观察性配对</span>
          <strong>8 对</strong>
          <p>A 胜 3 · B 胜 4 · 持平 1</p>
          <small>控制 Task 身份差异，不代表随机实验或因果关系</small>
        </article>
        <article className="panel blocked-card">
          <div>
            <span>方向性结论 · 未启用</span>
            <Badge>阻断</Badge>
          </div>
          <p>
            M1 不输出方向文案；当前数据质量仅为「中」。M2 需质量高、区间与敏感性等全部门槛通过。
          </p>
        </article>
      </div>
      <BottomStatus />
    </section>
  );
}

function ConnectorsPage({ onNotify }: { onNotify: (message: string) => void }) {
  const [addOpen, setAddOpen] = useState(false);
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(connectors.map((connector) => [connector.name, connector.status !== "未启用"]))
  );

  return (
    <section className="page connectors-page">
      <PageHeader
        title="连接器与健康"
        subtitle="5 个连接器 · 4 正常 · 1 异常 · 能力范围已冻结并独立版本化"
        actions={
          <>
            <button
              className="button secondary"
              onClick={() => onNotify("已开始检测全部连接器")}
            >
              <RefreshCcw size={14} />
              检测能力矩阵
            </button>
            <button className="button primary" onClick={() => setAddOpen(true)}>
              <Plus size={14} />
              添加连接器
            </button>
          </>
        }
      />

      <div className="connector-grid">
        {connectors.map((connector) => (
          <article
            className={`connector-card ${connector.status === "异常" ? "has-warning" : ""}`}
            key={connector.name}
          >
            <div className="connector-card__top">
              <div>
                <strong>{connector.name}</strong>
                <span>{connector.method}</span>
              </div>
              <button
                className={`toggle ${enabled[connector.name] ? "on" : ""}`}
                aria-label={`${enabled[connector.name] ? "停用" : "启用"} ${connector.name}`}
                aria-pressed={enabled[connector.name]}
                onClick={() => {
                  setEnabled((current) => ({
                    ...current,
                    [connector.name]: !current[connector.name]
                  }));
                  onNotify(`${connector.name} 已${enabled[connector.name] ? "暂停" : "启用"}`);
                }}
              >
                <span />
              </button>
            </div>
            <div className="connector-tags">
              <Badge tone={connector.tier === "标准采集档" ? "warning" : connector.tier === "实验" ? "muted" : "accent"}>
                {connector.tier}
              </Badge>
              <Badge tone={connector.status === "正常" ? "success" : connector.status === "异常" ? "warning" : "muted"}>
                <StatusDot tone={connector.status === "正常" ? "success" : "warning"} />
                {connector.status}
              </Badge>
            </div>
            <p className="mono">
              {connector.version} · {connector.events} · {connector.lastSeen}
            </p>
            <p className={connector.status === "异常" ? "warning-text" : ""}>
              {connector.detail}
            </p>
            {connector.status === "异常" && (
              <button className="text-button">修复指引</button>
            )}
          </article>
        ))}
      </div>

      <div className="health-grid">
        <article className="panel health-card">
          <div className="health-title">
            <HardDrive size={16} />
            <span>spool 水位</span>
          </div>
          <strong>34% · 87 / 256 MB</strong>
          <div className="health-progress">
            <span style={{ width: "34%" }} />
            <i style={{ left: "80%" }} />
          </div>
          <p>72h 峰值容量 · 跨 producer 统计 · 80% 预警</p>
        </article>
        <article className="panel health-card">
          <div className="health-title">
            <Wifi size={16} />
            <span>OTLP 本地接收</span>
          </div>
          <strong className="mono">127.0.0.1:4318 · 认证令牌有效</strong>
          <p>守护认证 已启用 · 限流 100 rps</p>
          <p>网络绑定：仅回环 · 分级停机保障</p>
        </article>
        <article className="panel health-card">
          <div className="health-title">
            <Gauge size={16} />
            <span>资源与健康</span>
          </div>
          <strong>CPU 0.4%（5 分钟均值）· 内存 118 MB</strong>
          <p>崩溃-free 99.98% · 失败事件 0</p>
          <p>最近健康检查：12 秒前</p>
        </article>
      </div>
      <BottomStatus />

      {addOpen && (
        <div className="modal-backdrop" onMouseDown={() => setAddOpen(false)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-connector-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span>新连接器</span>
                <h2 id="add-connector-title">添加采集来源</h2>
              </div>
              <IconButton label="关闭" onClick={() => setAddOpen(false)}>
                <X size={17} />
              </IconButton>
            </div>
            <div className="modal-options">
              {["Codex", "Claude Code", "Gemini CLI", "OpenCode"].map((name) => (
                <button
                  key={name}
                  onClick={() => {
                    setAddOpen(false);
                    onNotify(`${name} 连接器配置已准备`);
                  }}
                >
                  <Terminal size={18} />
                  <span>
                    <strong>{name}</strong>
                    <small>读取冻结能力矩阵后安装</small>
                  </span>
                  <ChevronDown size={14} className="rotate-minus-90" />
                </button>
              ))}
            </div>
            <div className="modal-note">
              <ShieldCheck size={15} />
              安装前会显示配置变更范围、认证能力和卸载恢复方式。
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function PlaceholderPage({
  icon,
  title,
  copy
}: {
  icon: React.ReactNode;
  title: string;
  copy: string;
}) {
  return (
    <section className="page placeholder-page">
      <div className="placeholder-card">
        {icon}
        <h1>{title}</h1>
        <p>{copy}</p>
        <Badge>界面规范已预留</Badge>
      </div>
      <BottomStatus />
    </section>
  );
}

export default App;
