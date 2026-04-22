FROM --platform=linux/arm64 node:20-alpine AS base
RUN apk add --no-cache openssl

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate

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