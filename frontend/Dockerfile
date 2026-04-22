FROM --platform=linux/arm64 node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

FROM --platform=linux/arm64 node:20-alpine AS runner
WORKDIR /app

RUN npm install -g serve

COPY --from=builder /app/dist ./dist

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 reactuser
USER reactuser

EXPOSE 3000
ENV PORT=3000

CMD ["serve", "-s", "dist", "-l", "3000"]