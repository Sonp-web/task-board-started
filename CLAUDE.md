# CLAUDE.md

# Работа с задачами

- Для отображения задач и вычисляемых показателей используй список,
  уже загруженный в `TaskBoard`; передавай его компонентам через props.
  Не читай `localStorage` напрямую в UI-компонентах. Для загрузки
  и изменения задач используй `TaskRepository`.

# Готовность

- Перед сдачей запусти `npm run check` и `npm run build`.

## Проект

Стартовый проект модуля Redev «AI agents»: клиентская доска задач, данные хранятся в `localStorage` браузера. Поиск намеренно отсутствует — он добавляется в ходе курса.

Все пользовательские строки (тексты интерфейса, `aria-label`, сообщения об ошибках) написаны на русском, и тесты ищут элементы по этим строкам. Новые тексты интерфейса тоже пишите на русском.

## Команды

Перед отправкой изменений выполните `npm run check` и `npm run build` — CI (`.github/workflows/ci.yml`) запускает именно их при пуше в `main` и в pull request.

## Архитектура

### Слой репозитория (`src/services/`)

Изменение формы `Task` (`src/features/tasks/model/task.ts`) требует обновить валидатор `isTask` и сид-данные — иначе уже сохранённые данные будут считаться повреждёнными и заменятся сидом.

### Legacy-компоненты (`src/components/Legacy*`)

Это намеренно шероховатые части стартового проекта, и они реально используются:

- `LegacyBoardStats` получает задачи из состояния `TaskBoard` через проп `tasks` и считает показатели («Всего задач», «В работе», «Готово», «Просрочено») во время рендера. Просроченной считается задача с `dueDate` раньше сегодняшнего дня (локальная дата, сравнение строк `YYYY-MM-DD`) и статусом не `done`.
- `LegacyTaskCard` — карточка, которую рендерит `TaskColumn`. Она уже перенесена в `src/features/tasks/components/` и лежит рядом с колонкой; в `src/components/` из Legacy-компонентов остался только `LegacyBoardStats`.

### Диалоги

`TaskForm` и `ConfirmDialog` используют нативный `<dialog>` с `showModal()`, а если `showModal` недоступен (случай jsdom) — выставляют `dialog.open = true`. `TaskBoard` монтирует и размонтирует их, а не переключает открытие. `TaskForm` при редактировании отправляет `dueDate: undefined`, чтобы очистить срок, а при создании опускает этот ключ.

### Стили

CSS Modules рядом с компонентами (`*.module.css`) плюс `src/app/global.css`. Обратите внимание: `TaskBoard` использует `src/app/App.module.css`.

### Тесты

`localStorageTaskRepository.test.ts` опирается на id из сида, например `task-release` и `task-copy`.

### Ограничения TypeScript

В `tsconfig.app.json` включены `verbatimModuleSyntax` (для типов используйте `import type`), `erasableSyntaxOnly` (без enum, namespace и parameter properties в конструкторах) и `noUnusedLocals` / `noUnusedParameters`.
