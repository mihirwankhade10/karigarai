FROM node:20-alpine

WORKDIR /app

COPY workers/stt/package*.json ./workers/stt/
RUN cd workers/stt && npm install --omit=dev

COPY lib ./lib
COPY workers/stt ./workers/stt

WORKDIR /app/workers/stt
ENV NODE_ENV=production
CMD ["node", "index.js"]
