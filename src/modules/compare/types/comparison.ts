export interface ComparisonConfiguration {
  id: string;
  label: string;
  version: string;
  tier: string;
}

export interface ComparisonMetric {
  id: string;
  label: string;
  configurationA: string;
  configurationB: string;
  unknown: string;
  primary?: boolean;
}

export interface ComparisonSummary {
  quality: "中";
  feedbackCoverage: string;
  metadataCompleteness: string;
  mergeCoverage: string;
  pairedCount: number;
  pairedResult: string;
}

export interface ComparisonFixture {
  configurations: [ComparisonConfiguration, ComparisonConfiguration];
  metrics: ComparisonMetric[];
  summary: ComparisonSummary;
}
