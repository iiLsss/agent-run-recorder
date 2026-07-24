import type { ReviewRecord, ReviewState } from "../types/review";

export function createReviewState(
  records: ReviewRecord[]
): Record<string, ReviewState> {
  return Object.fromEntries(
    records.map((record) => [
      record.id,
      {
        submitted: false,
        skipped: false,
        category: record.classificationReview?.category,
        postHocConfirmedDifficulty: record.classificationReview ? "unknown" : undefined
      }
    ])
  );
}

export function updateReviewState(
  current: Record<string, ReviewState>,
  id: string,
  patch: Partial<ReviewState>
): Record<string, ReviewState> {
  const existing = current[id];
  if (!existing) {
    return current;
  }
  return {
    ...current,
    [id]: {
      ...existing,
      ...patch
    }
  };
}

export function countPendingReviews(
  records: ReviewRecord[],
  state: Record<string, ReviewState>
): number {
  return records.filter((record) => {
    const review = state[record.id];
    return review && !review.submitted && !review.skipped;
  }).length;
}
