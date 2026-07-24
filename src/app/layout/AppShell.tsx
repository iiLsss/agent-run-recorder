import type { ReactNode } from "react";
import type { AppPage } from "../app-navigation";
import { AppSidebar } from "./AppSidebar";
import { AppStatusBar } from "./AppStatusBar";
import styles from "./AppShell.module.css";

interface AppShellProps {
  children: ReactNode;
  currentPage: AppPage;
  onNavigate: (page: AppPage) => void;
}

export function AppShell({ children, currentPage, onNavigate }: AppShellProps) {
  return (
    <div className={styles.shell}>
      <AppSidebar currentPage={currentPage} onNavigate={onNavigate} />
      <main className={styles.main}>{children}</main>
      <AppStatusBar />
    </div>
  );
}
