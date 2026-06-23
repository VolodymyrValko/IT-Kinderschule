# ── IT Kinderschule — образ для деплою (Fly.io / VPS / будь-який Docker-хост) ──
FROM node:20-alpine

WORKDIR /app

# Спочатку лише маніфести залежностей — для кешу шарів
COPY package.json ./
COPY server/package.json ./server/package.json
RUN npm install --omit=dev --prefix server

# Решта коду
COPY . .

ENV NODE_ENV=production
ENV PORT=3000
# Дані та завантаження — на змонтований том (щоб не зникали при оновленні)
ENV DATA_DIR=/data
ENV UPLOAD_DIR=/data/uploads
VOLUME ["/data"]

EXPOSE 3000
CMD ["node", "server/server.js"]
