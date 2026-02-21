FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/client/package.json packages/client/

# Install dependencies
RUN npm install

# Copy source
COPY . .

# Build all packages
RUN npm run build -w @meltdown/shared
RUN npm run build -w @meltdown/client
RUN npm run build -w @meltdown/server

# Production stage
FROM node:20-slim

WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/packages/shared/package.json packages/shared/
COPY --from=builder /app/packages/shared/dist packages/shared/dist/
COPY --from=builder /app/packages/server/package.json packages/server/
COPY --from=builder /app/packages/server/dist packages/server/dist/
COPY --from=builder /app/packages/client/dist packages/client/dist/

RUN npm install --omit=dev --workspace=@meltdown/server

ENV PORT=3001
EXPOSE 3001

CMD ["node", "packages/server/dist/index.js"]
