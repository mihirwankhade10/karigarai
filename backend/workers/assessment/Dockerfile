FROM node:20-alpine

WORKDIR /app

COPY workers/assessment/package*.json ./workers/assessment/
RUN cd workers/assessment && npm install --omit=dev

COPY lib ./lib
COPY workers/assessment ./workers/assessment

WORKDIR /app/workers/assessment
ENV NODE_ENV=production
CMD ["node", "index.js"]
