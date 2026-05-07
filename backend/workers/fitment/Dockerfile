FROM node:20-alpine

WORKDIR /app

COPY workers/fitment/package*.json ./workers/fitment/
RUN cd workers/fitment && npm install --omit=dev

COPY lib ./lib
COPY workers/fitment ./workers/fitment

WORKDIR /app/workers/fitment
ENV NODE_ENV=production
CMD ["node", "index.js"]
