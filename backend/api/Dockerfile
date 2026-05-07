FROM node:20-alpine

WORKDIR /app

# Install api deps
COPY api/package*.json ./api/
RUN cd api && npm install --omit=dev

# Copy shared lib + db + api source
COPY lib ./lib
COPY db ./db
COPY api ./api

WORKDIR /app/api

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "src/app.js"]
