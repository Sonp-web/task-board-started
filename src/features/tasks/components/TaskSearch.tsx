import { useId } from 'react'
import styles from './TaskSearch.module.css'

interface TaskSearchProps {
  value: string
  onChange(value: string): void
}

export function TaskSearch({ value, onChange }: TaskSearchProps) {
  const inputId = useId()

  return (
    <div className={styles.search} role="search">
      <label htmlFor={inputId}>Поиск задач</label>
      <div className={styles.field}>
        <input id={inputId} type="search" value={value} placeholder="Название или описание" onChange={(event) => onChange(event.target.value)} />
        {value && <button type="button" onClick={() => onChange('')}>Очистить</button>}
      </div>
    </div>
  )
}
