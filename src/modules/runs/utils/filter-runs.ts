import type { RunFilterCriteria, RunTimelineRecord } from "../types/run";

export function filterRuns(
  runs: RunTimelineRecord[],
  criteria: RunFilterCriteria
): RunTimelineRecord[] {
  const normalizedQuery = criteria.query.trim().toLocaleLowerCase();

  return runs.filter((run) => {
    return (
      matchesQuery(run, normalizedQuery) &&
      matchesValue(run.agent, criteria.agent) &&
      matchesValue(run.model, criteria.model) &&
      matchesValue(run.category, criteria.category) &&
      matchesValue(run.difficulty, criteria.difficulty) &&
      matchesValue(run.result, criteria.result) &&
      matchesValue(run.intervention, criteria.intervention)
    );
  });
}

function matchesQuery(run: RunTimelineRecord, query: string): boolean {
  if (!query) {
    return true;
  }

  const searchableText = [run.taskTitle, run.agent, run.model]
    .join(" ")
    .toLocaleLowerCase();

  return searchableText.includes(query);
}

function matchesValue(value: string, criterion: string): boolean {
  return criterion === "all" || value === criterion;
}
