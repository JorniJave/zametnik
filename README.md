# Zametnik — Блокнот связей

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Electron](https://img.shields.io/badge/Electron-desktop-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![Vite](https://img.shields.io/badge/Vite-bundler-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind](https://img.shields.io/badge/Tailwind-CSS-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](#лицензия)

Гибрид Markdown-блокнота и сетевой базы знаний. Связывайте дни, задачи, проекты и идеи через `[[wiki-ссылки]]`, смотрите граф связей и планируйте неделю на Canvas.

> Pet-проект · продуктовое ТЗ: [docs/PRODUCT_SPEC.md](docs/PRODUCT_SPEC.md) · план: [docs/PLAN.md](docs/PLAN.md)

## Возможности

| Модуль | Описание |
|--------|----------|
| Daily Notes | Автозаметки `ГГГГ-ММ-ДД` |
| Задачи | Чекбоксы `[ ]` / `[x]`, `Ctrl+Enter` |
| Проекты | Хабы в `Проекты/` |
| Atomic Notes | Свободные идеи |
| Wiki-links | Автокомплит `[[`, переход `Ctrl+Click` |
| Backlinks | Обратные ссылки в правой панели |
| Graph View | Полноэкранный граф с фильтрами |
| Canvas / Visual Workspace | Карточки, стрелки, доски |
| Планировщик | Недели, расписания, напоминания |
| Excel / ICS | Импорт расписаний и календаря |
| Vault | Обычные `.md` файлы на диске (как Obsidian) |

## Быстрый старт

```bash
npm install

# Браузер (демо / localStorage)
npm run dev

# Desktop (Electron) — рекомендуется
npm run start
```

Или bat-файлы:

- `Zametnik.dev.bat` — разработка  
- `Zametnik.exe.bat` / `Zametnik.run.bat` — готовый запуск  

При первом старте выберите **«Создать демо-vault»** → `Documents/ZametnikVault`.

## Сборка

```bash
npm run build
npx electron-builder --win dir --config.directories.output="%LOCALAPPDATA%\ZametnikBuild"
# или установщик:
npm run electron:build
```

## Структура Vault

```
ZametnikVault/
├── 2026-08-31.md
├── Проекты/
├── Задачи/
├── Недели/
├── Canvas/
└── .zametnik/
```

## Горячие клавиши

| Клавиша | Действие |
|---------|----------|
| `Ctrl+S` | Сохранить |
| `Ctrl+Enter` | Переключить чекбокс |
| `Ctrl+Click` | Перейти по `[[ссылке]]` |
| `Ctrl+G` | Graph View |
| `[[` | Автокомплит ссылок |

## Стек

- React 19 + TypeScript + Tailwind  
- CodeMirror 6  
- react-force-graph-2d  
- React Flow (`@xyflow/react`)  
- Electron + Zustand  
- Vite  

## Архитектура sync (будущее)

Заложен слой sync (конфликты, operation log, device id) под Supabase / self-hosted API. Источник правды — локальные `.md`.

## Ветки

`main` · `develop`

## Лицензия

MIT
