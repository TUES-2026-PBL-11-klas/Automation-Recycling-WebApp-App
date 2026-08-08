FROM node:20-alpine AS builder
WORKDIR /app

# Prisma probes libssl to pick a query engine; without openssl installed it
# misdetects and falls back to the OpenSSL 1.1 build.
RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build


FROM node:20-alpine AS production
WORKDIR /app

RUN apk add --no-cache openssl

RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma

USER nestjs
EXPOSE 4000

CMD ["node", "dist/src/main"]
