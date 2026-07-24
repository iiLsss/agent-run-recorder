import { ArrowLeftRight } from "lucide-react";
import { Badge } from "../../../shared/components/Badge/Badge";
import type { ComparisonConfiguration } from "../types/comparison";
import styles from "../pages/ComparePage.module.css";

interface ConfigurationPairProps {
  configurations: [ComparisonConfiguration, ComparisonConfiguration];
  onSwap: () => void;
}

export function ConfigurationPair({ configurations, onSwap }: ConfigurationPairProps) {
  return (
    <div className={styles.configurationGrid}>
      <ConfigurationCard label="配置 A" configuration={configurations[0]} />
      <button
        type="button"
        className={styles.swapButton}
        aria-label="交换配置"
        onClick={onSwap}
      >
        <ArrowLeftRight aria-hidden="true" size={16} />
      </button>
      <ConfigurationCard label="配置 B" configuration={configurations[1]} />
      <Badge tone="accent">不同模型 AgentConfiguration 对比</Badge>
    </div>
  );
}

function ConfigurationCard({
  label,
  configuration
}: {
  label: string;
  configuration: ComparisonConfiguration;
}) {
  return (
    <article className={styles.configurationCard}>
      <span>{label}</span>
      <strong>{configuration.label}</strong>
      <small>
        {configuration.version} · {configuration.tier}
      </small>
    </article>
  );
}
