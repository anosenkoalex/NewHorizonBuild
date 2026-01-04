# Backend

## Installation

```bash
npm install
```

## Development

```bash
npm run start:dev
```

## Seed данных

Перед запуском сида выполните миграции:

```bash
npx prisma migrate dev
```

Для наполнения базы демонстрационными данными используйте:

```bash
npm run prisma:seed
```
