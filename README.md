# NewHorizonBuild
CRM для строительной компании + интеграция 3D-моделей объектов.
## Модули
- `backend` — серверная часть (NestJS + PostgreSQL + Prisma).
- `admin` — админ-панель (React + Vite).
- `docs` — документация, ТЗ и схемы.

## Запуск локально

### 1. Подготовка базы данных
- Создай PostgreSQL-базу (локально или в Docker).
- В файле `backend/.env` должен быть параметр `DATABASE_URL`, например:
  ```env
  DATABASE_URL="postgresql://user:password@localhost:5432/newhorizonbuild?schema=public"
  ```

### 2. Backend
- Установи зависимости:
  ```bash
  cd backend
  npm install
  ```
- Применить миграции Prisma:
  ```bash
  npx prisma migrate dev
  ```
- (Опционально) наполнить базу демо-данными:
  ```bash
  npm run prisma:seed
  ```
- Запусти dev-сервер:
  ```bash
  npm run start:dev
  ```

### 3. Admin
- Установи зависимости:
  ```bash
  cd admin
  npm install
  ```
- Запусти dev-сервер Vite:
  ```bash
  npm run dev
  ```
