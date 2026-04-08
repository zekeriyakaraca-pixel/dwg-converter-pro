# Aşama 1: Frontend Build (Vite)
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# Aşama 2: Backend Build & Image Preparation
FROM node:20-bookworm-slim
# Inkscape kur
RUN apt-get update && apt-get install -y \
    inkscape \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Backend dosyalarını kopyala
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm install

COPY backend/ .

# Build edilmiş frontend dosyalarını backend içine taşı
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# EXPOSE: DigitalOcean PORT env var kullanacak ama 3000 varsayılan
EXPOSE 3000

# Start
CMD ["npm", "start"]
