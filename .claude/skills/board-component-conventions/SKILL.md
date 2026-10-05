---
name: board-component-conventions
description: Используй, когда создаёшь новый компонент доски, выносишь часть
  TaskBoard в отдельный компонент или переносишь Legacy-компонент в
  src/features/tasks/components и сохраняешь его пропсы.
---

# Компоненты доски задач

1. Новые компоненты создавай в `src/features/tasks/components/`, а не рядом
   с `LegacyBoardStats.tsx` в `src/components/`.
2. Перед созданием прочитай `reference/ConfirmDialog.tsx` — это актуальный
   эталон слоя.
3. Повтори подход эталона: именованный экспорт, `interface ИмяProps` рядом
   с компонентом, CSS-модуль с тем же именем, типы из
   `src/features/tasks/model/task.ts`.
4. Не добавляй зависимости: доска собрана на React без UI-библиотек.
5. Проверь результат командами из `reference/checks.md`.

Не используй этот скилл для ревью готового диффа и для правок
в `src/services/`.
