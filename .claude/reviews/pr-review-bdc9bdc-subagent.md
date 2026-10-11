# Ревью коммита bdc9bdc — второй список (субагент pr-reviewer)

«Add due date label, move task card into feature folder». Независимая проверка
субагентом `pr-reviewer`, дата — 2026-10-11. Первый список
(`pr-review-bdc9bdc.md`) субагент не читал.

Диапазон: `git diff 7a5ebfe bdc9bdc` (14 файлов, +562 / -7).

## Итог

Нарушений по шести критериям нет. `npm run check` и `npm run build` проходят на
HEAD = bdc9bdc. Есть три некритичных замечания вне критериев (в конце).

## Вердикты по критериям

### 1. Обращение к localStorage в обход TaskRepository — нарушений нет

- В `src` вне тестов `localStorage` встречается только в `src/app/App.tsx:10`
  (создание репозитория по умолчанию) и `src/test/setup.ts:7`. Обе строки
  коммитом не тронуты.
- Новый `src/features/tasks/components/TaskDueLabel.tsx` (строки 1-10) получает
  `dueDate` через проп.
- `LegacyTaskCard.tsx` по-прежнему получает `task` через проп.
- Вне `src`: `.claude/skills/run-task-board/driver.mjs:224` читает
  `localStorage.getItem(...)` в браузере. Это отладочный инструмент скилла, а не
  UI-компонент, поэтому нарушением не считается (см. прочее замечание 2).

### 2. Новый компонент в src/components рядом с legacy — нарушений нет

- `TaskDueLabel.tsx` и `TaskDueLabel.module.css` созданы в
  `src/features/tasks/components/`.
- `LegacyTaskCard.tsx` и его CSS перенесены из `src/components/` в
  `src/features/tasks/components/` (переименование R087 / R097).
- В `src/components/` сейчас лежат только `LegacyBoardStats.module.css`,
  `LegacyBoardStats.tsx`, `TaskBoard.tsx`.
- Импорт обновлён в `src/features/tasks/components/TaskColumn.tsx:1`. Ссылок на
  старый путь `components/LegacyTaskCard` в репозитории (без `node_modules`,
  `.git`, `dist`, `.claude/reviews`) не осталось.

### 3. Потерянные aria-label у кнопок карточки и заголовок диалога без useId — нарушений нет

- Все три `aria-label` на месте в
  `src/features/tasks/components/LegacyTaskCard.tsx:22-24`: «Редактировать: …»,
  «Переместить: …», «Удалить: …». В диффе эти строки не менялись.
- Диалоги в `src` коммитом не тронуты: `ConfirmDialog.tsx:14,33` и
  `TaskForm.tsx:19,59` используют `useId` и `aria-labelledby={titleId}`.
- Добавленная копия-эталон
  `.claude/skills/board-component-conventions/reference/ConfirmDialog.tsx` тоже
  использует `useId` (строка 22) и `aria-labelledby` (строка 49).

### 4. Изменённая логика репозитория без теста в src/services — не применимо

- `git diff 7a5ebfe bdc9bdc --stat -- src/services` пуст: ни репозиторий, ни его
  тест не менялись.
- Форма `Task` (`src/features/tasks/model/task.ts`) тоже не менялась, обновлять
  `isTask` и сид не требовалось.

### 5. Новая зависимость в package.json — нарушений нет

- `package.json` и `package-lock.json` в диффе отсутствуют.
- `driver.mjs` импортирует только встроенные модули `node:*` (строки 15-19).
  В `node_modules` нет ни playwright, ни puppeteer.

### 6. Незапущенный npm run check — нарушений нет (в части результата)

- `npm run check` запущен на HEAD: lint без ошибок, typecheck без ошибок,
  2 тестовых файла, 23 теста пройдены.
- `npm run build` запущен: успешно, 33 модуля, `dist/` собран. `git status`
  после сборки не изменился (`dist/` в `.gitignore`).
- Запускал ли автор `check` перед коммитом, установить нельзя: в коммите об этом
  нет следов. Подтверждено только, что на этом коммите проверка проходит.

## Прочие замечания (не критичные, вне шести критериев)

1. **Изменился внешний вид срока на карточке.**
   `src/features/tasks/components/TaskDueLabel.module.css:1-10`.
   Раньше срок был приглушённым текстом (`.description, .dueDate`:
   `var(--muted)`, 0.9rem), теперь это плашка-пилюля (`--info-text` /
   `--info-soft`, 0.75rem, жирный).
   Последствие: вынос компонента — не чистый рефакторинг, а визуальное
   изменение; сообщение коммита этого явно не называет.
   Токены `--info-text` и `--info-soft` определены в `src/app/global.css:16-17`
   и `51-52` (светлая и тёмная тема), так что стиль не сломан.
   Минимальное исправление: если так задумано — ничего; если нет — вернуть в
   `.label` прежние `color: var(--muted); font-size: 0.9rem` и убрать фон,
   отступы и скругление.
   В браузере не проверено — вывод сделан по CSS.

2. **Ключ хранилища продублирован в драйвере.**
   `.claude/skills/run-task-board/driver.mjs:23`
   (`STORAGE_KEY = 'redev-task-board:v1'`) и
   `.claude/skills/run-task-board/SKILL.md:101`.
   Источник истины — `src/services/localStorageTaskRepository.ts:15`
   (`TASK_STORAGE_KEY`). Сейчас значения совпадают.
   Последствие: при смене версии ключа команда драйвера `storage` молча начнёт
   печатать `null`.
   Минимальное исправление: комментарий у строки 23 со ссылкой на
   `TASK_STORAGE_KEY`.

3. **Эталон в скилле — копия, которая может разойтись с оригиналом.**
   `.claude/skills/board-component-conventions/reference/ConfirmDialog.tsx`.
   Логически он совпадает с `src/features/tasks/components/ConfirmDialog.tsx`,
   но отформатирован иначе: двойные кавычки и точки с запятой против одинарных
   кавычек без точек с запятой во всём `src`.
   Последствие: `SKILL.md` называет файл «актуальным эталоном слоя», и агент
   может перенять чужой стиль форматирования; правки настоящего `ConfirmDialog`
   в копию не попадут.
   Кроме того, `reference/tsconfig.json` не входит в `references` корневого
   `tsconfig.json`, а `tsconfig.app.json:25` включает только `src`. Поэтому
   `npm run typecheck` эту копию не проверяет; её импорт
   `./ConfirmDialog.module.css` указывает на несуществующий в этой папке файл.
   ESLint копию проверяет (`files: ['**/*.{ts,tsx}']`, игнорируется только
   `dist`) и ошибок не нашёл.
   Минимальное исправление: привести форматирование копии к стилю `src` либо
   заменить копию ссылкой на реальный файл в `SKILL.md`.

Мелочь без действий: новый `TaskDueLabel` покрыт только одной проверкой в
`src/app/App.test.tsx:204` (`'Срок: 2026-09-12'`). Для компонента из одной
строки разметки этого достаточно.

## Что проверено и как

Проверено субагентом:

- прочитана исходная часть диффа целиком (`src`, `CLAUDE.md`, скиллы `remember`
  и `board-component-conventions`) и список изменённых файлов с переименованиями;
- прочитаны с диска `LegacyTaskCard.tsx`, `LegacyTaskCard.module.css`,
  `TaskDueLabel.tsx`, `TaskDueLabel.module.css`, `package.json`,
  `tsconfig.json`, `.gitignore`;
- поиском проверены `localStorage` в `src`, ссылки на `LegacyTaskCard` и старый
  путь, токены `--info-*`, `useId` / `aria-label` / `aria-labelledby`, ключ
  хранилища;
- копия-эталон `ConfirmDialog.tsx` сравнена `diff`-ом с оригиналом;
- запущены `npm run check` и `npm run build`.

Не проверено или проверено частично:

- `.claude/skills/run-task-board/driver.mjs` (274 строки) и `SKILL.md`
  (162 строки) целиком не прочитаны — только поиск по импортам, `localStorage`
  и упоминаниям установки пакетов. Работоспособность драйвера не проверялась,
  dev-сервер и Chrome не запускались.
- Внешний вид плашки срока в браузере не смотрели.

Предположения:

- смена оформления срока сделана намеренно;
- автор запускал `check` перед коммитом — подтвердить нечем.

Код не менялся.
