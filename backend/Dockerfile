# backend/Dockerfile
# FIX: Runtime Prisma client missing enums (UserRole undefined).
# Решение: ставим prod deps, но копируем с build stage сгенерённый Prisma client из node_modules/.prisma.

FROM node:20-bookworm-slim AS build
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build


FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# prod deps (без dev)
COPY package*.json ./
RUN npm ci --omit=dev

# prisma schema (нужно для migrate/db push)
COPY prisma ./prisma

# Ключевой момент: копируем сгенерённый Prisma client (enums/models) из build stage
COPY --from=build /app/node_modules/.prisma /app/node_modules/.prisma

# compiled app
COPY --from=build /app/dist ./dist

EXPOSE 3000

CMD sh -c ' \
  (npx prisma migrate deploy || npx prisma db push) >/dev/null 2>&1 || true; \
  for f in dist/src/main.js dist/main.js dist/apps/backend/main.js dist/apps/api/main.js; do \
    if [ -f "$f" ]; then \
      echo "Starting $f"; \
      exec node "$f"; \
    fi; \
  done; \
  echo "ERROR: Nest entrypoint not found. Listing dist:"; \
  ls -R dist || true; \
  exit 1; \
'
