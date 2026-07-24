import type { ReactNode } from "react";
import styles from "./PageHeader.module.css";

interface PageHeaderProps {
  title: string;
  description: string;
  actions?: ReactNode;
  titleId?: string;
}

export function PageHeader({ title, description, actions, titleId }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <div>
        <h1 id={titleId}>{title}</h1>
        <p>{description}</p>
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  );
}
