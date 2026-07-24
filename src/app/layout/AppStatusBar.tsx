import styles from "./AppShell.module.css";
import { useRecorderRuntime } from "../runtime/recorder-runtime-context";

export function AppStatusBar() {
  const { desktop, status } = useRecorderRuntime();

  return (
    <footer className={styles.statusBar}>
      <span>{desktop ? "桌面本地服务" : "浏览器预览"}</span>
      <span>{status?.databaseEncryption ?? "SQLCipher · AES-256"}</span>
      <span>无遥测</span>
      <span>原始内容：不持久化</span>
      <span className={styles.statusPush}>
        {status?.receiverAddress ?? "未连接本地接收器"}
      </span>
      <code>v0.1.0 内测</code>
    </footer>
  );
}
