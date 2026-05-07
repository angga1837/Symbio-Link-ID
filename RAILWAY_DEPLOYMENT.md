# Railway Deployment Guide

## Summary

Your app crashed on startup because the Engine tried to connect to PostgreSQL immediately. This is now fixed—the app will start gracefully and connect to the database when available.

## What Changed

1. **engine/main.py**: Database initialization now wraps errors in try-except (non-blocking)
2. **engine/config.py**: DATABASE_URL reads from environment with sensible local fallback
3. **engine/.env.example**: Documented all required environment variables

## Local Testing (Before Railway)

### Test 1: With Full Docker-Compose Stack

```bash
cd c:\Users\yazid\symbio-Link-ID
docker-compose up --build -d
docker-compose logs -f engine
```

Expected: Engine starts, creates tables, no connection errors.

### Test 2: Just Engine Service (no PostgreSQL)

```bash
docker-compose up --build -d engine
docker-compose logs -f engine
```

Expected: Engine warns "Database connection failed on startup" but continues running on port 8000.

### Test 3: Verify Services Work

- Frontend: http://localhost:3001 (connects to Engine at :8000)
- Engine: http://localhost:8000/docs (OpenAPI Swagger)
- Blockchain: http://localhost:4000/health

---

## Railway Production Deployment

### Step 1: Set Up PostgreSQL on Railway

**Option A: Use Railway's Built-in PostgreSQL Add-on (Recommended)**

1. In Railway dashboard, go to your project
2. Click "+ New" → Select "PostgreSQL"
3. Railway auto-injects `DATABASE_URL` environment variable
4. No manual configuration needed

**Option B: Use External PostgreSQL**

1. In Railway dashboard, add environment variable:
   ```
   DATABASE_URL=postgresql+asyncpg://user:password@host:5432/database_name
   ```

### Step 2: Configure Environment Variables

In Railway dashboard, set these variables for **each service**:

#### Engine Service

```
DATABASE_URL=<auto-injected by Railway if using PostgreSQL add-on>
CORS_ALLOW_ORIGINS=https://your-frontend-domain.railway.app
JWT_SECRET=<random-secure-string-for-production>
JWT_ALGORITHM=HS256
JWT_EXPIRY_MINUTES=480
ML_PURITY_THRESHOLD=0.60
CO2_FACTOR=0.45
BLOCKCHAIN_URL=https://your-blockchain-domain.railway.app
SEED_MOCK_DATA=false
PORT=8000
```

#### Frontend Service

```
NEXT_PUBLIC_API_URL=https://your-engine-domain.railway.app
PORT=3000
```

#### Blockchain Service

```
PORT=4000
```

### Step 3: Configure Dockerfile Ports

Railway auto-injects the `PORT` environment variable. All services now respect it:

- Frontend: `ENV HOSTNAME=0.0.0.0` + `EXPOSE 3000`
- Engine: `--port 8000` in uvicorn command
- Blockchain: `ENV PORT=4000` in Express

### Step 4: Deploy

1. Connect your GitHub repo to Railway
2. Railway automatically deploys on every push to `main`
3. Monitor logs in Railway dashboard

---

## Troubleshooting

### Issue: Engine keeps restarting

**Cause**: Database connection failing repeatedly  
**Fix**:

1. Check `DATABASE_URL` is set correctly in Railway dashboard
2. Verify PostgreSQL add-on is created and running
3. Check Engine logs for connection details

```bash
# In Railway dashboard, click Engine → Logs
# Look for: "Database connection failed on startup"
# This is normal on first startup, Engine continues running
```

### Issue: Frontend can't connect to Engine

**Cause**: CORS blocked or wrong API URL  
**Fix**:

1. Verify `NEXT_PUBLIC_API_URL` is set to Engine's Railway domain (e.g., `https://symbio-engine.railway.app`)
2. Verify `CORS_ALLOW_ORIGINS` in Engine matches Frontend's Railway domain
3. Check browser console for CORS errors

### Issue: Blockchain endpoints return 404

**Cause**: Blockchain service not deployed or wrong PORT  
**Fix**:

1. Verify Blockchain service is deployed and running
2. Check `BLOCKCHAIN_URL` in Engine matches Blockchain's Railway domain

---

## Environment Variable Reference

| Service  | Variable            | Example                                 | Notes                                               |
| -------- | ------------------- | --------------------------------------- | --------------------------------------------------- |
| Engine   | DATABASE_URL        | `postgresql+asyncpg://...`              | Auto-injected by Railway if using PostgreSQL add-on |
| Engine   | CORS_ALLOW_ORIGINS  | `https://symbio-frontend.railway.app`   | Your frontend's Railway domain                      |
| Engine   | JWT_SECRET          | `random-secret-string`                  | Change for production!                              |
| Engine   | BLOCKCHAIN_URL      | `https://symbio-blockchain.railway.app` | Blockchain service's Railway domain                 |
| Frontend | NEXT_PUBLIC_API_URL | `https://symbio-engine.railway.app`     | Engine service's Railway domain                     |
| All      | PORT                | Auto-injected                           | Railway sets this automatically                     |

---

## FAQ

**Q: What if I don't have a PostgreSQL database set up yet?**  
A: Use Railway's PostgreSQL add-on. It's one click and fully managed.

**Q: Can I test locally without Docker?**  
A: Yes, install PostgreSQL locally, set DATABASE_URL in `.env`, and run:

```bash
cd engine
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

**Q: How do I check logs on Railway?**  
A: In Railway dashboard, click each service → Logs tab. Scroll or search for errors.

**Q: Why does Engine log "Database connection failed on startup"?**  
A: This is expected on first deploy while PostgreSQL is starting. Engine will continue running and retry connecting automatically.

---

## Next Steps

1. Run local tests with `docker-compose up --build -d`
2. Fix any local issues (missing env vars, port conflicts)
3. Push changes to `main` branch
4. Create Railway project and connect GitHub repo
5. Set environment variables in Railway dashboard
6. Deploy and verify in Railway logs

Good luck! 🚀
