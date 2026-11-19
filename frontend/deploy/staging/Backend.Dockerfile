FROM node:22-bookworm-slim@sha256:e9f565d32859f0cbfb52125eafe8be39390f24dac302dc3cdf566e8ba3ab21ee AS build
ENV PUPPETEER_SKIP_DOWNLOAD=true
WORKDIR /app
COPY deploy/staging/backend-source.tar.gz /tmp/backend.tar.gz
COPY deploy/staging/backend-source.json /tmp/backend.json
RUN node -e "const f=require('fs'),c=require('crypto');if(c.createHash('sha256').update(f.readFileSync('/tmp/backend.tar.gz')).digest('hex')!==JSON.parse(f.readFileSync('/tmp/backend.json')).sha256)process.exit(1)" && tar -xzf /tmp/backend.tar.gz -C /app
RUN npm ci && npm run build && npm prune --omit=dev
FROM node:22-bookworm-slim@sha256:e9f565d32859f0cbfb52125eafe8be39390f24dac302dc3cdf566e8ba3ab21ee
ENV NODE_ENV=production PUPPETEER_SKIP_DOWNLOAD=true
WORKDIR /app
COPY --from=build --chown=node:node /app/package*.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/assets ./assets
COPY --from=build --chown=node:node /app/migrations ./migrations
USER node
EXPOSE 3000
CMD ["node", "-r", "./dist/config/register.js", "dist/main.js"]
