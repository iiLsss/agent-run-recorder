import { useState } from "react";
import { Button } from "../../../shared/components/Button/Button";
import { PageHeader } from "../../../shared/components/PageHeader/PageHeader";
import { ReviewCard } from "../components/ReviewCard";
import { reviewFixtures } from "../data/review-fixtures";
import type { ReviewState } from "../types/review";
import {
  countPendingReviews,
  createReviewState,
  updateReviewState
} from "../utils/review-state";
import styles from "./InboxPage.module.css";

export function InboxPage() {
  const [reviews, setReviews] = useState(() => createReviewState(reviewFixtures));
  const [notice, setNotice] = useState("");
  const pendingCount = countPendingReviews(reviewFixtures, reviews);

  const patchReview = (id: string, patch: Partial<ReviewState>) => {
    setReviews((current) => updateReviewState(current, id, patch));
  };

  return (
    <section className={styles.page} aria-labelledby="inbox-title">
      <PageHeader
        title="结果收件箱"
        titleId="inbox-title"
        description={`${pendingCount} 条待评价 · 单条目标 ≤ 10 秒 · 免打扰 22:00–09:00 · 每周主动提醒 ≤ 3 次`}
        actions={
          <>
            <Button onClick={() => setNotice("已将待评价项目延后至明天")}>
              全部稍后
            </Button>
            <Button
              variant="primary"
              onClick={() => setNotice("已定位到第一条待评价记录")}
            >
              开始评价
            </Button>
          </>
        }
      />

      {notice && <div className={styles.notice}>{notice}</div>}
      <div className={styles.privacyCallout}>
        评价仅写入你本机记录。未评价（unknown）会在对比中单独显示，不会被估算或分摊到任何配置。
      </div>

      <div className={styles.reviewList}>
        {reviewFixtures.map((record) => (
          <ReviewCard
            key={record.id}
            record={record}
            state={reviews[record.id]}
            onChange={(patch) => patchReview(record.id, patch)}
            onSubmit={() => patchReview(record.id, { submitted: true })}
            onEdit={() => patchReview(record.id, { submitted: false })}
            onSkip={() => patchReview(record.id, { skipped: true })}
            onRestore={() => patchReview(record.id, { skipped: false })}
          />
        ))}
      </div>
    </section>
  );
}
