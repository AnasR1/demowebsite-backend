FROM node:22-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN npm install -g pnpm && pnpm install

COPY . .
RUN pnpm build

RUN mkdir -p uploads

EXPOSE 3000

CMD ["node", "dist/index.js"]