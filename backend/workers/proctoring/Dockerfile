FROM node:20-alpine

WORKDIR /app

COPY workers/proctoring/package*.json ./workers/proctoring/
RUN cd workers/proctoring && npm install --omit=dev

COPY lib ./lib
COPY workers/proctoring ./workers/proctoring

WORKDIR /app/workers/proctoring
ENV NODE_ENV=production
CMD ["node", "index.js"]
