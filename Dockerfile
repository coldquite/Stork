# Node.js v24.13.0
FROM mcr.microsoft.com/playwright:v1.58.2-noble

WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

COPY . .

RUN pnpm install --frozen-lockfile
RUN NODE_OPTIONS=--max-old-space-size=4096 pnpm build

EXPOSE 3000
CMD ["node", "--import", "./.output/server/sentry.server.config.mjs", ".output/server/index.mjs"]
