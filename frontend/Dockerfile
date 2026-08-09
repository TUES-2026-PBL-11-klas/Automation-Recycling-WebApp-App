FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build


FROM node:20-alpine AS production
WORKDIR /app

# The base image lags Alpine's package index, so its libssl3/libcrypto3 carry
# fixed-but-unpatched CVEs (e.g. CVE-2026-45447, a use-after-free in
# PKCS7_verify). The backend image picks up current versions as a side effect of
# installing openssl; this stage installs nothing, so it needs an explicit
# upgrade or it ships whatever the base was built with.
RUN apk upgrade --no-cache libssl3 libcrypto3

# npm ships inside the base image and is never invoked at runtime — the
# standalone server starts with `node server.js`. Removing it drops npm's own
# bundled dependency tree (sigstore and friends), which a vulnerability scan
# otherwise flags as part of the image even though nothing here can run it.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
