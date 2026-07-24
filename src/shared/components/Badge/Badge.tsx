import type { ReactNode } from "react";
import styles from "./Badge.module.css";

export type BadgeTone =
  "neutral" | "accent" | "success" | "warning" | "danger" | "muted";

interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  mono?: boolean;
}

export function Badge({ children, tone = "neutral", mono = false }: BadgeProps) {
  const className = [styles.badge, styles[tone], mono ? styles.mono : ""].join(" ");

  return <span className={className}>{children}</span>;
}
