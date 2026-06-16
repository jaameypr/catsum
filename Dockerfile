# syntax=docker/dockerfile:1

# ── Build: compile the catsum lib, then prerender the static Nuxt site ────────
# The website depends on the freshly built dist via `catsum: file:..`, so the
# library is built first, then the site.
FROM node:22-bookworm-slim AS build
ENV NUXT_TELEMETRY_DISABLED=1
WORKDIR /app

# Library deps + build (own layer so it caches until lib sources change).
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json rollup.config.js ./
COPY src ./src
RUN npm run build

# Website deps (cached until website manifests change), then the static build.
# .npmrc carries legacy-peer-deps=true — needed for the nuxt-nightly peer set.
COPY website/package.json website/package-lock.json website/.npmrc ./website/
RUN cd website && npm ci
COPY website ./website
RUN cd website && npm run build

# ── Serve: nginx with the prerendered output, nothing else ────────────────────
FROM nginx:alpine AS serve
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/website/.output/public /usr/share/nginx/html
EXPOSE 80
