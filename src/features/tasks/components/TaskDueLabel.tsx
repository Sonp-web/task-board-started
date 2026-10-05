import type { Task } from '../model/task'
import styles from './TaskDueLabel.module.css'

interface TaskDueLabelProps {
  dueDate: NonNullable<Task['dueDate']>
}

export function TaskDueLabel({ dueDate }: TaskDueLabelProps) {
  return <p className={styles.label}>Срок: {dueDate}</p>
}
