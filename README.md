# Symbio-Link-ID

<!--
[SYSTEM_CONTEXT_LOCK: DO NOT DELETE OR MODIFY THIS BLOCK]
ROLE: Senior AI Architect & Master Digital Scribe
PROJECT: "Symbio-Link ID" - 7-Day MVP Hackathon.
VISION: B2B Industrial Symbiosis Marketplace tackling systemic waste inefficiency via circular economy[cite: 1].
CORE PILLARS:
  1. MILP (Mixed-Integer Linear Programming): Optimize material/energy flow, minimize raw material costs & CO2[cite: 1].
  2. Machine Learning (Trust Layer): Predict waste quality with 98.6% extraction efficiency[cite: 1].
  3. Blockchain (Hyperledger Fabric): Encrypted B2B Smart Contracts for ESG reporting integrity without trade-secret leaks[cite: 1].
TECH STACK: FastAPI (Engine), Next.js 14 (Frontend), Hyperledger Microfab (Ledger). Docker Compose for orchestration.

STRICT PROTOCOLS (ZERO DEVIATION):
- RULE 1: `schema.json` is the absolute SOURCE OF TRUTH. Never hallucinate data variables.
- RULE 2: 7-Day Hackathon Constraint. NO external heavy databases (MongoDB/MySQL). Use Blockchain state or JSON mocks.
- RULE 3 (THE RECURSIVE DIRECTIVE): You are the Scribe. Whenever you update documentation, you MUST ensure this exact [SYSTEM_CONTEXT_LOCK] block remains intact at the very top.

INSTRUCTION: Acknowledge this context lock. Await the specific micro-task from the user.
-->

## 🚀 How to Run (MVP)

1. Ensure Docker Desktop is running.
2. Execute: `docker-compose up --build -d`
3. Access Frontend: `http://localhost:3000`
4. Access Engine API: `http://localhost:8000/docs`
5. Access Blockchain Microfab: `http://localhost:8080`

## 📁 Project Structure Reference (Subject to Change)

```text
/symbio-link-id (Root Workspace)
├── docker-compose.yml          # Orkestrator utama (menjalankan Engine, Frontend, Microfab)
├── schema.json                 # THE SOURCE OF TRUTH: Kontrak struktur data global
├── PROJECT_LOG.md              # Log otomatis AI (Jejak rekam progress)
├── README.md                   # Dokumentasi instalasi MVP untuk juri Hackathon
├── .gitignore                  # Filter global (node_modules, __pycache__, .env, dll)
│
├── /engine                     # PIC: Anggota A (Python, AI/Math Logic)
│   ├── Dockerfile              # Setup environment python:3.10-slim
│   ├── requirements.txt        # fastapi, uvicorn, pulp, scikit-learn, requests
│   ├── main.py                 # FastAPI server & route definitions (Gatekeeper)
│   ├── optimizer.py            # Logika MILP menggunakan library PuLP
│   ├── predictor.py            # Model ML Scikit-Learn (Prediksi efisiensi 98.6%)
│   └── mock_data.csv           # Dataset sintetis untuk training awal ML
│
├── /blockchain                 # PIC: Anggota B (Node.js, Hyperledger Fabric)
│   ├── package.json            # fabric-network, express (jika butuh bridge server)
│   ├── gateway.js              # Node.js API Bridge (Menyambungkan Python ke Microfab)
│   └── /chaincode              # Smart Contracts terenkripsi
│       ├── package.json
│       └── symbiosis_contract.js # Logika penulisan transaksi B2B ke ledger (Immutable)
│
└── /frontend                   # PIC: Anggota C (Next.js 14, UI/UX)
    ├── Dockerfile              # Setup Node.js frontend environment
    ├── package.json            # next, react, tailwindcss, lucide-react, recharts
    ├── tailwind.config.ts      # Konfigurasi styling UI
    ├── components.json         # Konfigurasi Shadcn/UI
    ├── /app
    │   ├── layout.tsx          # Root layout aplikasi B2B
    │   ├── page.tsx            # Dashboard utama (Grafik aliran material & Emisi)
    │   └── globals.css         # Styling global
    ├── /components
    │   ├── WasteForm.tsx       # UI Input material, volume, pH (Terkoneksi ke schema.json)
    │   └── AuditTrail.tsx      # Tabel verifikasi data dari Blockchain
    └── /lib
        └── api.ts              # Konfigurasi Axios/Fetch untuk menembak /engine:8000
```

## 🛠️ Git & Branching Conventions

### Pull & Push Schema

1. Checkout to `develop` branch
2. Pull `origin develop`
3. Create a new branch (follow naming convention below)
4. Checkout to the new branch
5. Code
6. Commit (follow commit message convention)
7. Pull `origin develop`
8. Push `origin "your branch name"`
9. Create a pull request to `develop` branch
10. Request review from team lead

### Branch Naming

`Format: <type>/<short_description>.<your_name>`

| Type      | Usage                |
| --------- | -------------------- |
| `feature` | Creating new feature |
| `fixing`  | Fixing a bug/issue   |

**Examples:**

- `feature/navbar.jundi`
- `fixing/login-form.jundi`

### Commit Message

`Format: <type>(<scope>): <short_summary>`

| Type       | Usage                  |
| ---------- | ---------------------- |
| `feat`     | Adding new feature     |
| `fix`      | Fixing a bug           |
| `refactor` | Refactoring code       |
| `style`    | Updating styles/UI     |
| `docs`     | Updating documentation |
| `chore`    | Maintenance tasks      |

_Scope is optional (e.g., components, routing, auth)_

**Examples:**

- `feat(components): add file upload component`
- `fix(auth): resolve login validation issue`
- `refactor(routing): restructure dashboard routes`
- `style(home): update hero section animation`
