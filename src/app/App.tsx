import { useState } from "react";
import { ComparePage } from "../modules/compare/pages/ComparePage";
import { ConnectorsPage } from "../modules/connectors/pages/ConnectorsPage";
import { InboxPage } from "../modules/inbox/pages/InboxPage";
import { AppShell } from "./layout/AppShell";
import { RunTimelinePage } from "../modules/runs/pages/RunTimelinePage";
import { TaskDetailPage } from "../modules/tasks/pages/TaskDetailPage";
import type { AppPage } from "./app-navigation";
import { RecorderRuntimeProvider } from "./runtime/RecorderRuntime";

function App() {
  return (
    <RecorderRuntimeProvider>
      <AppContent />
    </RecorderRuntimeProvider>
  );
}

function AppContent() {
  const [page, setPage] = useState<AppPage>("runs");

  return (
    <AppShell currentPage={page} onNavigate={setPage}>
      {page === "runs" && (
        <RunTimelinePage
          onOpenTask={() => setPage("tasks")}
          onOpenInbox={() => setPage("inbox")}
        />
      )}
      {page === "tasks" && <TaskDetailPage />}
      {page === "inbox" && <InboxPage />}
      {page === "compare" && <ComparePage />}
      {page === "connectors" && <ConnectorsPage />}
    </AppShell>
  );
}

export default App;
