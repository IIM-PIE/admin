# ============================================================================
# Admin (Vite + React SPA) → build statique servi par nginx.
#
# Déployé sur Coolify (PIE Team) via GHCR : GitHub Actions build cette image,
# la push sur GHCR, Coolify la pull + run. Remplace le déploiement Vercel.
# ============================================================================

# --- Stage 1 : build du bundle statique ---
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# VITE_API_URL est BUILD-TIME : Vite la compile dans le bundle JS (elle est donc
# publique, visible côté navigateur). Fournie en build-arg par la CI (secret GitHub).
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# --- Stage 2 : serveur statique nginx ---
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
