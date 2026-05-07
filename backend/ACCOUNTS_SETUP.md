# KarigarAI — Accounts & Services Setup

Provision the following services, then copy values into `backend/.env`.

> **Note on architecture:** We use **BullMQ on Redis** as the event broker
> (originally Upstash Kafka, which Upstash deprecated mid-2024). Same
> event-driven pipeline with 5 workers, just one fewer external service.

---

## 1. Neon (Postgres + pgvector)

1. Sign up at https://neon.tech with GitHub.
2. Create a new project (e.g. `karigar-ai`). Postgres 16, region **AWS us-east-1**.
3. In the Neon SQL Editor, run:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
4. Copy the connection string into `DATABASE_URL` in `backend/.env`.

---

## 2. Upstash Redis (broker + cache)

1. Sign up at https://upstash.com with GitHub.
2. Create a Redis database:
   - Name: `karigar-redis`
   - Type: **Regional**
   - Region: **AWS us-east-1** (matches Neon)
   - Eviction: leave default
   - TLS: enabled (default)
3. Open the database \u2192 **Details** tab \u2192 click **Connect to your database**.
4. Pick the **Node** (or generic **redis-cli**) tab. Copy the `rediss://...`
   URL into `UPSTASH_REDIS_URL` in `backend/.env`. It looks like:
   ```
   rediss://default:abcDEF123...@us1-xxx.upstash.io:6379
   ```

That's it \u2014 a single env var. The same Redis instance hosts both the BullMQ
queues (workers consume from these) and our status keys (frontend polls these).

---

## 3. Cloudinary (video + image storage)

1. Sign up at https://cloudinary.com.
2. **Dashboard** \u2192 copy `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
   into `backend/.env`.

That's it. No upload presets needed \u2014 our backend uploads server-side using
the API key + secret (automatically signed). Files are organised under
`karigarai/photos` and `karigarai/videos` folders by the upload code.

---

## 4. OpenAI (LangChain backend)

1. Sign up at https://platform.openai.com.
2. **API Keys \u2192 Create new secret key** \u2192 copy into `OPENAI_API_KEY`.
3. Add at least \$5 of credit. Backend uses `gpt-4o-mini` for question
   generation, scoring, AI responses, and summaries.

---

## 5. Sarvam AI (Kannada / Hindi / English STT)

1. Sign up at https://sarvam.ai (mention **AI for Bharat Hackathon** for free credits).
2. Create an API key in the dashboard \u2192 copy into `SARVAM_API_KEY`.
3. We use model `saarika:v2`.

---

## 6. Railway (production deployment, optional)

Sign up at https://railway.app with GitHub. Connect the repo. Add 6 services:
- `backend/api`
- `backend/workers/stt`
- `backend/workers/assessment`
- `backend/workers/fraud`
- `backend/workers/fitment`
- `backend/workers/proctoring`

Paste the same env vars on each service. Pick a US region.

---

## Generate JWT secret

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Copy output into `JWT_SECRET` in `.env`.

---

## Default admin credentials

After running `node db/migrate.js`, a default admin is seeded:

| Field    | Value                       |
| -------- | --------------------------- |
| Email    | `admin@edcs.kar.gov.in`     |
| Password | `Admin@123`                 |
| Role     | `admin`                     |
| District | `All Districts`             |

Change the password after first login.

---

## Windows: face embedding native build

`@tensorflow/tfjs-node` requires Visual Studio 2022 Build Tools with the
**Desktop development with C++** workload. By default we use pure-JS
`@tensorflow/tfjs` (slower but always installs). To opt into native:

1. Install Visual Studio 2022 Build Tools.
2. In `.env` set `USE_TFJS_NODE=true`.
3. `cd backend/workers/fraud && npm install @tensorflow/tfjs-node`.

---

## Run the stack locally

```bash
cd backend
npm install                                 # root deps
(cd api && npm install)
(cd workers/stt && npm install)
(cd workers/assessment && npm install)
(cd workers/fraud && npm install)
(cd workers/fitment && npm install)
(cd workers/proctoring && npm install)

bash download-models.sh                     # face detection models
node db/migrate.js                          # creates all tables, seeds admin
node test-connections.js                    # probes DB, Redis, Cloudinary

# Start everything (six terminals or use docker-compose):
(cd api && npm run dev)
(cd workers/stt && node index.js)
(cd workers/assessment && node index.js)
(cd workers/fraud && node index.js)
(cd workers/fitment && node index.js)
(cd workers/proctoring && node index.js)
```

Or with Docker:

```bash
docker-compose up --build
```

API: http://localhost:3000 \u2014 Swagger UI: http://localhost:3000/docs

---

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Default port 5173. Make sure `frontend/.env` has `VITE_API_URL=http://localhost:3000`.
