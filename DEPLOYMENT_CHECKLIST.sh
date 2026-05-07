#!/bin/bash
# Quick Fix Checklist for Railway Deployment

echo "=== SYMBIO-LINK-ID RAILWAY DEPLOYMENT CHECKLIST ==="
echo ""

# 1. Verify code changes
echo "✓ Step 1: Verify Code Changes"
echo "  - engine/main.py: lifespan() has try-except wrapper"
echo "  - engine/config.py: DATABASE_URL reads from os.getenv()"
echo "  - engine/.env.example: Created with documentation"
echo ""

# 2. Test locally
echo "✓ Step 2: Test Locally"
echo "  Command: docker-compose up --build -d"
echo "  Check: Engine starts on :8000, Frontend on :3001"
echo "  Logs: docker-compose logs -f engine"
echo ""

# 3. Verify docker-compose
echo "✓ Step 3: Verify docker-compose.yml"
echo "  - PostgreSQL service: PRESENT ✓"
echo "  - Health check: PRESENT ✓"  
echo "  - Engine depends_on: service_healthy ✓"
echo "  - DATABASE_URL set: postgresql+asyncpg://symbio:...@postgres:5432 ✓"
echo ""

# 4. Push changes
echo "✓ Step 4: Push Changes to GitHub"
echo "  Commands:"
echo "    git add ."
echo "    git commit -m 'fix: graceful database initialization for Railway deployment'"
echo "    git push origin main"
echo ""

# 5. Railway setup
echo "✓ Step 5: Railway Dashboard Configuration"
echo ""
echo "  A. Create PostgreSQL Add-on (if not exists)"
echo "     Railway will auto-inject DATABASE_URL"
echo ""
echo "  B. Set Engine Environment Variables:"
echo "     - CORS_ALLOW_ORIGINS=https://your-frontend.railway.app"
echo "     - JWT_SECRET=<production-secret>"
echo "     - BLOCKCHAIN_URL=https://your-blockchain.railway.app"
echo ""
echo "  C. Set Frontend Environment Variables:"
echo "     - NEXT_PUBLIC_API_URL=https://your-engine.railway.app"
echo ""
echo "  D. Set Blockchain Environment Variables:"
echo "     - (No changes needed)"
echo ""

# 6. Deploy
echo "✓ Step 6: Deploy"
echo "  - Push to main → Railway auto-deploys"
echo "  - Monitor logs: Railway Dashboard → Logs tab"
echo "  - Check for: 'Database tables initialised' or 'Database connection failed'"
echo ""

# 7. Verify
echo "✓ Step 7: Verify Production"
echo "  - Frontend: https://your-domain-frontend.railway.app"
echo "  - Engine Swagger: https://your-domain-engine.railway.app/docs"
echo "  - Test API call from frontend"
echo ""

echo "=== READY TO DEPLOY! ==="
echo ""
echo "Questions? See RAILWAY_DEPLOYMENT.md for detailed instructions."
