# ============================================================
# Stage 1: Builder — cài đặt dependencies và biên dịch TS→JS
# ============================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files và cài đặt TẤT CẢ dependencies (bao gồm devDependencies)
COPY package*.json ./
RUN npm ci

# Copy toàn bộ source code
COPY . .

# Biên dịch TypeScript → JavaScript (output vào dist/)
RUN npm run build

# Generate Prisma Client dựa trên schema
RUN npx prisma generate

# ============================================================
# Stage 2: Production — chỉ giữ những gì cần thiết để chạy
# ============================================================
FROM node:20-alpine AS production

# Dùng user node (non-root) để tăng bảo mật
USER node

WORKDIR /app

# Copy package files và cài chỉ production dependencies
COPY --chown=node:node package*.json ./
RUN npm ci --omit=dev

# Copy các artifacts cần thiết từ Builder stage
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --chown=node:node prisma ./prisma
COPY --chown=node:node public ./public
COPY --chown=node:node views ./views

EXPOSE 3000

# Chạy migrate (sync schema) rồi khởi động app
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]