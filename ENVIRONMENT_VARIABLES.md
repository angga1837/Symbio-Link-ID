# Environment Variables Reference

## Quick Copy-Paste for Railway

### Frontend Service Variables

```
NEXT_PUBLIC_API_URL=https://your-engine-service.railway.app
NODE_ENV=production
```

### Engine Service Variables

```
DATABASE_URL=<auto-injected by Railway PostgreSQL add-on>
CORS_ALLOW_ORIGINS=https://your-frontend-service.railway.app
JWT_SECRET=your_secure_random_secret_here_change_this
JWT_ALGORITHM=HS256
JWT_EXPIRY_MINUTES=480
ML_PURITY_THRESHOLD=0.60
CO2_FACTOR=0.45
BLOCKCHAIN_URL=https://your-blockchain-service.railway.app
BLOCKCHAIN_MODE=auto
SEED_MOCK_DATA=false
SEED_MOCK_FORCE=false
```

### Blockchain Service Variables

```
BLOCKCHAIN_MODE=auto
PORT=4000
```

---

## Detailed Explanation

### Frontend Variables

| Variable              | Value                             | Purpose                                            |
| --------------------- | --------------------------------- | -------------------------------------------------- |
| `NEXT_PUBLIC_API_URL` | `https://your-engine.railway.app` | Where frontend sends API requests (must be public) |
| `NODE_ENV`            | `production`                      | Next.js optimization mode                          |

**How to find your Engine URL:**

- After Engine deploys on Railway, click Engine service → you'll see a URL like `https://symbio-engine-prod-123.railway.app`
- Copy that exact URL and paste it as `NEXT_PUBLIC_API_URL`

---

### Engine Variables

| Variable              | Value                                 | Purpose                            | Notes                                                     |
| --------------------- | ------------------------------------- | ---------------------------------- | --------------------------------------------------------- |
| `DATABASE_URL`        | Auto-injected                         | PostgreSQL connection              | Railway's PostgreSQL add-on handles this                  |
| `CORS_ALLOW_ORIGINS`  | `https://your-frontend.railway.app`   | Allow frontend to make requests    | Security: only allow your frontend domain                 |
| `JWT_SECRET`          | Any random string                     | Signing tokens                     | **MUST change from default!** Use: `openssl rand -hex 32` |
| `JWT_ALGORITHM`       | `HS256`                               | Token signing method               | Don't change                                              |
| `JWT_EXPIRY_MINUTES`  | `480`                                 | Token expires in 8 hours           | Can adjust based on needs                                 |
| `ML_PURITY_THRESHOLD` | `0.60`                                | ML model threshold                 | Don't change without reason                               |
| `CO2_FACTOR`          | `0.45`                                | CO2 saved per kg diverted          | ESG calculation factor                                    |
| `BLOCKCHAIN_URL`      | `https://your-blockchain.railway.app` | Where blockchain service is        | Copy from Blockchain Railway URL                          |
| `BLOCKCHAIN_MODE`     | `auto`                                | Auto-detect blockchain             | Don't change                                              |
| `SEED_MOCK_DATA`      | `false`                               | Don't seed test data in production | Keep `false` for production                               |
| `SEED_MOCK_FORCE`     | `false`                               | Don't force seed                   | Keep `false` for production                               |

**How to generate JWT_SECRET:**

```bash
# On Mac/Linux:
openssl rand -hex 32

# On Windows PowerShell:
[System.Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

---

### Blockchain Variables

| Variable          | Value  | Purpose                                                 |
| ----------------- | ------ | ------------------------------------------------------- |
| `BLOCKCHAIN_MODE` | `auto` | Auto-detect Hyperledger Fabric or mock mode             |
| `PORT`            | `4000` | Express server port (Railway will override to its PORT) |

---

## Step-by-Step: Add to Railway Dashboard

### 1. Frontend Service

1. Click "Frontend" service card
2. Go to **Variables** tab
3. Add:
   ```
   NEXT_PUBLIC_API_URL = https://your-engine-service.railway.app
   NODE_ENV = production
   ```

### 2. Engine Service

1. Click "Engine" service card
2. Go to **Variables** tab
3. Add all Engine variables (except DATABASE_URL—Railway auto-injects it)

### 3. Blockchain Service

1. Click "Blockchain" service card
2. Go to **Variables** tab
3. Add:
   ```
   BLOCKCHAIN_MODE = auto
   ```

---

## Finding Your Railway URLs

After each service deploys:

1. **Frontend URL**: Click Frontend → you'll see something like `https://symbio-frontend-prod.railway.app`
2. **Engine URL**: Click Engine → you'll see something like `https://symbio-engine-prod.railway.app`
3. **Blockchain URL**: Click Blockchain → you'll see something like `https://symbio-blockchain-prod.railway.app`

Use these URLs to fill in the environment variables.

---

## Local Development (docker-compose)

All variables are already in `docker-compose.yml`:

```bash
docker-compose up --build -d
```

The Database URL is:

```
postgresql+asyncpg://symbio:symbio_enterprise_2026@postgres:5432/symbio_enterprise
```

The `postgres` hostname works because services are on the same `symbio-net` network.

---

## Common Issues

**Q: Frontend shows "Cannot reach API"**  
A: Check `NEXT_PUBLIC_API_URL` matches your Engine Railway URL exactly

**Q: Engine returns "CORS blocked"**  
A: Check `CORS_ALLOW_ORIGINS` matches your Frontend Railway URL exactly

**Q: Database connection fails**  
A: Railway's PostgreSQL add-on auto-injects DATABASE_URL—just wait for it to initialize

**Q: Authentication fails**  
A: Verify `JWT_SECRET` is set (can't be empty or default)
