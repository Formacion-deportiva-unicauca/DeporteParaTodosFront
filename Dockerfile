# Etapa 1: compilar Angular
FROM node:22 AS build
WORKDIR /app
ENV NODE_OPTIONS=--max-old-space-size=4096
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration production
RUN test -f dist/deporte-para-todos/index.html

# Etapa 2: servir con Nginx sin privilegios
FROM nginxinc/nginx-unprivileged:stable-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/deporte-para-todos /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1
