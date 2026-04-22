# admin/Dockerfile
# Меняем alpine -> debian slim, чтобы избежать SIGBUS на esbuild (часто умирает на musl/overlayfs).
# В итоге в nginx кладём готовый dist.

FROM node:20-bookworm-slim AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
# Чуть больше памяти для сборки (на всякий случай)
ENV NODE_OPTIONS=--max-old-space-size=4096
RUN npm run build


FROM nginx:1.27-alpine AS web
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
