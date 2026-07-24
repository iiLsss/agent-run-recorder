import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { PageHeader } from "../../../shared/components/PageHeader/PageHeader";
import { RunFilters } from "../components/RunFilters";
import { RunTable } from "../components/RunTable";
import {
  listRunTimelineRecords,
  loadRecordedRunTimeline
} from "../data/run-repository";
import type { RunFilterCriteria } from "../types/run";
import { filterRuns } from "../utils/filter-runs";
import styles from "./RunTimelinePage.module.css";

const initialCriteria: RunFilterCriteria = {
  query: "",
  agent: "all",
  model: "all",
  category: "all",
  difficulty: "all",
  result: "all",
  intervention: "all"
};

interface RunTimelinePageProps {
  onOpenTask: () => void;
  onOpenInbox: () => void;
}

export function RunTimelinePage({ onOpenTask, onOpenInbox }: RunTimelinePageProps) {
  const [criteria, setCriteria] = useState(initialCriteria);
  const [records, setRecords] = useState(listRunTimelineRecords);
  const [notice, setNotice] = useState("");
  const visibleRecords = useMemo(
    () => filterRuns(records, criteria),
    [criteria, records]
  );

  useEffect(() => {
    void loadRecordedRunTimeline()
      .then((loaded) => {
        if (loaded) {
          setRecords(loaded);
        }
      })
      .catch((error: unknown) => setNotice(`本地数据读取失败：${String(error)}`));
  }, []);

  return (
    <section className={styles.page} aria-labelledby="run-timeline-title">
      <PageHeader
        title="Run 时间线"
        description={`本地记录 · ${records.length} 条 Run`}
        actions={
          <HeaderActions
            onExport={() => setNotice("导出已准备：仅包含冻结 allowlist 字段")}
            onOpenInbox={onOpenInbox}
          />
        }
        titleId="run-timeline-title"
      />
      {notice && <div className={styles.notice}>{notice}</div>}
      <RunFilters criteria={criteria} onChange={setCriteria} />
      <RunTable records={visibleRecords} onOpenTask={onOpenTask} />
    </section>
  );
}

function HeaderActions({
  onExport,
  onOpenInbox
}: {
  onExport: () => void;
  onOpenInbox: () => void;
}) {
  return (
    <>
      <button type="button" onClick={onExport}>
        <Download aria-hidden="true" size={14} />
        导出 CSV / JSON
      </button>
      <button type="button" onClick={onOpenInbox}>
        去评价 · 6
      </button>
    </>
  );
}
