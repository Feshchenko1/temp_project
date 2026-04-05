# Base Image
FROM --platform=linux/arm64 node:20-alpine AS base
# ДОДАЄМО ЦЕЙ РЯДОК ДЛЯ PRISMA:
RUN apk add --no-cache openssl

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Builder stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate

# Production runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodeuser

COPY --from=builder --chown=nodeuser:nodejs /app ./

USER nodeuser

EXPOSE 3001
ENV PORT=3001

CMD ["npm", "start"]