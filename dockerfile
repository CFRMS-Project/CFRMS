# ============================================================
# Stage 1: Builder — cài đặt dependencies và generate Prisma
# ============================================================
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Expose port cho test mode (PORT=3001 qua .env.test)
EXPOSE 3001

# ============================================================
# Stage 2: Production — chạy app bằng tsx (tránh ESM import issues)
# ============================================================
FROM node:20-alpine AS production

# Dùng user node (non-root) để tăng bảo mật
USER node

WORKDIR /app

# Copy node_modules (đã có tsx + prisma client từ builder)
COPY --chown=node:node package*.json ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules

# Copy source code và các assets cần thiết
COPY --chown=node:node index.ts ./
COPY --chown=node:node tsconfig.json ./
COPY --chown=node:node prisma.config.ts ./
COPY --chown=node:node prisma ./prisma
COPY --chown=node:node routes ./routes
COPY --chown=node:node controllers ./controllers
COPY --chown=node:node middlewares ./middlewares
COPY --chown=node:node helpers ./helpers
COPY --chown=node:node utils ./utils
COPY --chown=node:node validators ./validators
COPY --chown=node:node config ./config
COPY --chown=node:node public ./public
COPY --chown=node:node views ./views

EXPOSE 3000

# Dùng tsx thay vì node dist/ để tránh lỗi ESM module resolution
CMD ["npx", "tsx", "index.ts"]