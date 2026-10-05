import { TaskDueLabel } from './TaskDueLabel'
import type { Task, TaskPriority } from '../model/task'
import styles from './LegacyTaskCard.module.css'

interface LegacyTaskCardProps {
  task: Task
  onEdit(task: Task): void
  onMove(task: Task): void
  onDelete(task: Task): void
}

const priorityLabels: Record<TaskPriority, string> = { low: 'Низкий', medium: 'Средний', high: 'Высокий' }

export function LegacyTaskCard({ task, onEdit, onMove, onDelete }: LegacyTaskCardProps) {
  return (
    <article className={styles.card}>
      <h3 className={styles.title}>{task.title}</h3>
      {task.description && <p className={styles.description}>{task.description}</p>}
      <span className={`${styles.priority} ${styles[task.priority]}`}>{priorityLabels[task.priority]}</span>
      {task.dueDate && <TaskDueLabel dueDate={task.dueDate} />}
      <div className={styles.actions}>
        <button type="button" onClick={() => onEdit(task)} aria-label={`Редактировать: ${task.title}`}>Редактировать</button>
        <button type="button" onClick={() => onMove(task)} aria-label={`Переместить: ${task.title}`}>Переместить</button>
        <button type="button" onClick={() => onDelete(task)} aria-label={`Удалить: ${task.title}`}>Удалить</button>
      </div>
    </article>
  )
}
