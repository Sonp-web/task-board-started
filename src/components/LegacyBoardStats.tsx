import styles from './LegacyBoardStats.module.css'
import type { Task } from '../features/tasks/model/task'

interface LegacyBoardStatsProps {
  tasks: readonly Task[]
}

// dueDate хранится как YYYY-MM-DD из <input type="date">, поэтому «сегодня»
// берём в локальном часовом поясе и сравниваем строки напрямую.
function getLocalToday(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

function isOverdue(task: Task, today: string): boolean {
  return task.dueDate !== undefined && task.dueDate < today && task.status !== 'done'
}

export function LegacyBoardStats({ tasks }: LegacyBoardStatsProps) {
  const today = getLocalToday()
  const total = tasks.length
  const inProgress = tasks.filter((task) => task.status === 'in-progress').length
  const done = tasks.filter((task) => task.status === 'done').length
  const overdue = tasks.filter((task) => isOverdue(task, today)).length

  return (
    <section className={styles.stats} aria-label="Статистика доски">
      <div className={styles.stat}>Всего задач: {total}</div>
      <div className={styles.stat}>В работе: {inProgress}</div>
      <div className={styles.stat}>Готово: {done}</div>
      <div className={styles.stat}>Просрочено: {overdue}</div>
    </section>
  )
}
