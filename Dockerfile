# Node.js v24.13.0
FROM mcr.microsoft.com/playwright:v1.58.2-noble

WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm build

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
