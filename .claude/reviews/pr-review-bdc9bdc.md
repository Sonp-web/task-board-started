# Ревью коммита bdc9bdc

«Add due date label, move task card into feature folder». Проверено по критериям
`.claude/agents/pr.reviewer.md`, дата проверки — 2026-10-11.

## Итог

Критичных проблем нет. По шести критериям нарушений не найдено. Есть одно
некритичное замечание к документации.

## Проверка по критериям

1. **localStorage в обход TaskRepository — нарушений нет.**
   В изменённых и новых UI-файлах (`TaskDueLabel.tsx`, `LegacyTaskCard.tsx`,
   `TaskColumn.tsx`) обращений к `localStorage` нет. `TaskDueLabel` получает
   срок через проп `dueDate`. Единственное обращение вне `src/services` —
   `src/app/App.tsx:10`, где хранилище передаётся в репозиторий; коммит эту
   строку не менял.
   `eval localStorage…` в `.claude/skills/run-task-board/` — инструмент запуска
   в браузере, не UI-компонент.

2. **Новый компонент в src/components рядом с legacy — нарушений нет.**
   `TaskDueLabel.tsx` и его CSS-модуль созданы в
   `src/features/tasks/components/`. В `src/components/` новых файлов нет,
   оттуда убран `LegacyTaskCard`.

3. **aria-label кнопок карточки и заголовок диалога — нарушений нет.**
   Все три `aria-label` сохранены:
   `src/features/tasks/components/LegacyTaskCard.tsx:22–24`
   («Редактировать: …», «Переместить: …», «Удалить: …»).
   Диалоги (`TaskForm`, `ConfirmDialog`) коммит не менял, `useId` для
   заголовков на месте.

4. **Логика репозитория без теста — не применимо.**
   Файлы в `src/services/` коммит не затрагивает.

5. **Новая зависимость в package.json — нарушений нет.**
   `package.json` и `package-lock.json` не изменены.

6. **npm run check — запущен, проходит.**
   На состоянии коммита (рабочее дерево `src` совпадает с HEAD):
   ESLint и проверка типов без ошибок, Vitest — 2 файла, 23 теста.
   `npm run build` тоже проходит. Статус CI на GitHub не проверен: `gh` на
   машине не установлен.

## Некритичное замечание

- **`CLAUDE.md:30` — устаревший заголовок раздела.**
  Раздел называется «Legacy-компоненты (`src/components/Legacy*`)», но
  `LegacyTaskCard` после этого коммита лежит в
  `src/features/tasks/components/`.
  Последствие: агент или человек, читающий заголовок, будет искать карточку в
  старой папке; текст пункта ниже при этом уже верный.
  Минимальное исправление: убрать путь из заголовка —
  «### Legacy-компоненты».
