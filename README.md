# Zametnik — Блокнот связей

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Electron](https://img.shields.io/badge/Electron-desktop-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![Vite](https://img.shields.io/badge/Vite-bundler-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](#лицензия)

Гибрид Markdown-блокнота и сетевой базы знаний. Связывайте дни, задачи, проекты и идеи через `[[wiki-ссылки]]`, визуализируйте связи в графе и планируйте неделю на Canvas.

> Pet-проект · **Продуктовое ТЗ:** [docs/PRODUCT_SPEC.md](docs/PRODUCT_SPEC.md)

## Возможности

- **📅 Daily Notes** — автогенерация заметок `ГГГГ-ММ-ДД`
- **🛠 Задачи** — чекбоксы `[ ]` / `[x]`, переключение через `Ctrl+Enter`
- **📂 Проекты** — контекстные хабы в папке `Проекты/`
- **🧠 Atomic Notes** — свободные заметки и идеи
- **[[Wiki-links]]** — автокомплит при вводе `[[`, переход через `Ctrl+Click`
- **Backlinks** — обратные ссылки в правой панели
- **Graph View** — полноэкранный граф с фильтрами (задачи, проекты, неделя)
- **Canvas** — доска с карточками и цветными стрелками
- **Локальное хранение** — обычные `.md` файлы (как Obsidian)

## Быстрый старт

```bash
# Установка зависимостей
npm install

# Запуск в браузере (демо с localStorage)
npm run dev

# Запуск desktop-приложения (Electron) — рекомендуется
npm run start

# Или двойной клик:
# Zametnik.exe.bat  — готовый .exe (без Node в фоне)
# Zametnik.bat      — режим разработки (нужен npm)

# Сборка .exe (если папка release на Desktop блокируется — собирается в %LOCALAPPDATA%\ZametnikBuild)
npm run build
npx electron-builder --win dir --config.directories.output="%LOCALAPPDATA%\ZametnikBuild"
# Запуск: %LOCALAPPDATA%\ZametnikBuild\win-unpacked\Zametnik.exe

# Сборка установщика NSIS (в папку release)
npm run electron:build
```

При первом запуске выберите **«Создать демо-vault»** — приложение создаст папку `Documents/ZametnikVault` с примерами заметок, связей и Canvas.

## Структура Vault

```
ZametnikVault/
├── 2026-08-31.md           # Daily note
├── Проекты/
│   ├── Проект Альфа.md
│   └── Здоровье.md
├── Задачи/
│   └── Задача: Купить подарок.md
├── Недели/
│   └── Неделя 36 - 2026.md
├── Canvas/
│   └── week-plan.canvas.json
└── .zametnik/
```

## Горячие клавиши

| Клавиша | Действие |
|---------|----------|
| `Ctrl+S` | Сохранить |
| `Ctrl+Enter` | Переключить чекбокс |
| `Ctrl+Click` | Перейти по [[ссылке]] |
| `Ctrl+G` | Graph View |
| `[[` | Автокомплит ссылок |

## Технологии

- **Frontend:** React 19, TypeScript, Tailwind CSS
- **Редактор:** CodeMirror 6
- **Граф:** react-force-graph-2d
- **Canvas:** React Flow (@xyflow/react)
- **Desktop:** Electron
- **State:** Zustand

## Планирование недели

1. Откройте хаб недели через боковую панель → «Неделя»
2. В заметке `Неделя N - YYYY` перечислены ссылки на 7 дней
3. Каждый день — daily note с расписанием и задачами
4. Canvas «План недели» — визуальная доска связей

## Будущее: синхронизация ПК ↔ мобильный

Архитектура готова к добавлению sync-слоя (Supabase / self-hosted API). Vault остаётся источником правды — `.md` файлы синхронизируются по hash + timestamp.

## Лицензия

MIT
