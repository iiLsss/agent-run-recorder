import { CircleDot, Pause, Play, Search, ShieldCheck } from "lucide-react";
import { appNavigation, type AppPage } from "../app-navigation";
import { useRecorderRuntime } from "../runtime/recorder-runtime-context";
import styles from "./AppShell.module.css";

interface AppSidebarProps {
  currentPage: AppPage;
  onNavigate: (page: AppPage) => void;
}

export function AppSidebar({ currentPage, onNavigate }: AppSidebarProps) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <span className={styles.brandMark}>
          <CircleDot aria-hidden="true" size={15} />
        </span>
        <strong>Run Recorder</strong>
        <span className={styles.previewBadge}>内测</span>
      </div>

      <label className={styles.search}>
        <Search aria-hidden="true" size={14} />
        <input aria-label="全局搜索" placeholder="搜索 Run / Task" />
        <kbd>⌘K</kbd>
      </label>

      <span className={styles.sectionLabel}>工作区</span>
      <nav aria-label="主导航" className={styles.navigation}>
        {appNavigation.map((item) => (
          <NavigationItem
            key={item.id}
            item={item}
            active={currentPage === item.id}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      <CaptureStatus />
      <div className={styles.privacy}>
        <ShieldCheck aria-hidden="true" size={12} />
        <span>本地加密存储</span>
        <code>SQLCipher · AES-256</code>
      </div>
    </aside>
  );
}

interface NavigationItemProps {
  item: (typeof appNavigation)[number];
  active: boolean;
  onNavigate: (page: AppPage) => void;
}

function NavigationItem({ item, active, onNavigate }: NavigationItemProps) {
  const Icon = item.icon;
  const className = active ? styles.navItemActive : styles.navItem;

  return (
    <button
      className={className}
      disabled={!item.enabled}
      aria-current={active ? "page" : undefined}
      title={item.enabled ? undefined : "后续阶段实现"}
      onClick={() => onNavigate(item.id)}
    >
      <Icon aria-hidden="true" size={15} />
      <span>{item.label}</span>
      {!item.enabled && <small>规划中</small>}
    </button>
  );
}

function CaptureStatus() {
  const { desktop, status, error, toggleCapture } = useRecorderRuntime();
  const paused = status?.capturePaused ?? false;
  const spoolPercent = status
    ? Math.round((status.spoolBytes / status.spoolCapacityBytes) * 100)
    : 0;
  const statusLabel = getCaptureStatusLabel(desktop, status?.receiverStatus, paused);

  return (
    <section className={styles.capture} aria-label="采集状态">
      <div className={styles.captureHeader}>
        <strong>
          <span className={paused ? styles.statusDotPaused : styles.statusDot} />
          {statusLabel}
        </strong>
        <button type="button" disabled={!status} onClick={() => void toggleCapture()}>
          {paused ? (
            <Play aria-hidden="true" size={12} />
          ) : (
            <Pause aria-hidden="true" size={12} />
          )}
          {paused ? "恢复" : "暂停"}
        </button>
      </div>
      <div className={styles.spoolMeta}>
        <span>spool 水位</span>
        <code>
          {formatMegabytes(status?.spoolBytes)} /{" "}
          {formatMegabytes(status?.spoolCapacityBytes)}
        </code>
      </div>
      <div className={styles.progress} aria-label={`spool 水位 ${spoolPercent}%`}>
        <span style={{ width: `${spoolPercent}%` }} />
      </div>
      <p>
        {desktop
          ? (error ?? `已存储 ${status?.storedEvents ?? 0} 个事件 · 仅本机`)
          : "浏览器仅供界面预览，不执行采集"}
      </p>
    </section>
  );
}

function getCaptureStatusLabel(
  desktop: boolean,
  receiverStatus: "listening" | "failed" | undefined,
  paused: boolean
): string {
  if (!desktop) {
    return "预览模式";
  }
  if (receiverStatus === "failed") {
    return "接收器异常";
  }
  return paused ? "已暂停" : "采集中";
}

function formatMegabytes(bytes: number | undefined): string {
  if (bytes === undefined) {
    return "—";
  }
  return `${(bytes / 1024 / 1024).toFixed(bytes < 1024 * 1024 ? 2 : 0)} MB`;
}
