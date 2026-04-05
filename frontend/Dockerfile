# Step 1: Base Image builder
FROM --platform=linux/arm64 node:20-alpine AS builder
WORKDIR /app

# Step 2: Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Step 3: Build the Vite application
COPY . .
RUN npm run build

# Step 4: Production runner (Lightweight static server)
FROM --platform=linux/arm64 node:20-alpine AS runner
WORKDIR /app

# Install 'serve' to run the static files
RUN npm install -g serve

# Copy the build output from the builder stage (Vite uses 'dist')
COPY --from=builder /app/dist ./dist

# Run as non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 reactuser
USER reactuser

EXPOSE 3000
ENV PORT=3000

# Start the static server
CMD ["serve", "-s", "dist", "-l", "3000"]