FROM node:20-alpine

WORKDIR /app

COPY workers/fraud/package*.json ./workers/fraud/
# @napi-rs/canvas ships prebuilt binaries \u2014 no native toolchain required.
RUN cd workers/fraud && npm install --omit=dev

COPY lib ./lib
COPY workers/fraud ./workers/fraud
COPY models ./models

WORKDIR /app/workers/fraud
ENV NODE_ENV=production
ENV USE_TFJS_NODE=false
CMD ["node", "index.js"]
