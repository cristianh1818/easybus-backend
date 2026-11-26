# API de EASYBUS para producción (multi-etapa).
#   1. deps:  todas las dependencias (para compilar)
#   2. build: compila TypeScript a dist/
#   3. prod:  solo dependencias de producción
#   4. final: imagen liviana con dist/, panel/ y node_modules de producción,
#             ejecutada con el usuario sin privilegios "node".
# Debian slim (no Alpine): sharp (fotos WEBP) trae binarios listos para glibc.

ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM deps AS build
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build

FROM node:${NODE_VERSION}-bookworm-slim AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

FROM node:${NODE_VERSION}-bookworm-slim AS final
ENV NODE_ENV=production \
    PORT=3000 \
    UPLOADS_DIR=/app/uploads \
    SWAGGER_ENABLED=false
WORKDIR /app
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./
COPY --chown=node:node panel ./panel
# Carpeta de fotos: en producción se monta un volumen aquí
RUN mkdir -p /app/uploads && chown node:node /app/uploads
USER node
EXPOSE 3000
# Docker marca el contenedor "unhealthy" si /api/v1/health no responde
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/v1/health').then(r=>r.json()).then(j=>process.exit(j.status==='ok'?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]
