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


# Production dependencies only, in their own stage, so the toolchain (jest,
# eslint, typescript, the nest CLI) never reaches the runtime image. Prisma is a
# runtime dependency now — the app loads its client and the migration init
# container runs its CLI — so generate runs here too, against the pruned tree.
FROM node:20-alpine AS deps
WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci --omit=dev

COPY prisma ./prisma
RUN npx prisma generate


FROM node:20-alpine AS production
WORKDIR /app

RUN apk add --no-cache openssl

# npm ships inside the base image and is never invoked at runtime — the app
# starts with `node dist/src/main`, and the migrate init container calls the
# prisma binary directly rather than through npx. Removing it drops 16 MB and
# npm's own bundled dependency tree (sigstore and friends), which Trivy flags
# as part of the image even though nothing here can execute it.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

COPY --from=deps --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
COPY --chown=nestjs:nodejs package.json ./

USER nestjs
EXPOSE 4000

CMD ["node", "dist/src/main"]
