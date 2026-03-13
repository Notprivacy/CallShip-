# Evita que Railpack exija variables (SMTP_SECURE, etc.) durante el build.
# Las variables se inyectan solo en tiempo de ejecución.
FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY . .
EXPOSE 4000

CMD ["npm", "start"]
