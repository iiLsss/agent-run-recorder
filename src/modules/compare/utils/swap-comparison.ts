import type { ComparisonConfiguration, ComparisonMetric } from "../types/comparison";

export function getOrderedConfigurations(
  configurations: [ComparisonConfiguration, ComparisonConfiguration],
  swapped: boolean
): [ComparisonConfiguration, ComparisonConfiguration] {
  return swapped ? [configurations[1], configurations[0]] : configurations;
}

export function getOrderedMetrics(
  metrics: ComparisonMetric[],
  swapped: boolean
): ComparisonMetric[] {
  if (!swapped) {
    return metrics;
  }

  return metrics.map((metric) => ({
    ...metric,
    configurationA: metric.configurationB,
    configurationB: metric.configurationA,
    unknown: swapUnknown(metric.unknown)
  }));
}

function swapUnknown(value: string): string {
  const parts = value.split(" / ");
  return parts.length === 2 ? `${parts[1]} / ${parts[0]}` : value;
}
