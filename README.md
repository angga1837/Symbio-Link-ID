# Symbio-Link-ID

## 🚀 How to Run (MVP)

1. Ensure Docker Desktop is running.
2. Execute: `docker-compose up --build -d`
3. Access Frontend: `http://localhost:3000`
4. Access Engine API: `http://localhost:8000/docs`
5. Access Blockchain Microfab: `http://localhost:8080`

## 📁 Project Structure Reference (Subject to Change)

```text
/symbio-link-id (Root Workspace)
├── docker-compose.yml          # Main orchestrator (Engine, Frontend, Microfab)
├── schema.json                 # THE SOURCE OF TRUTH: Global data structure contract
├── PROJECT_LOG.md              # Project history and development log
├── README.md                   # Installation documentation for the MVP
├── .gitignore                  # Filter global (node_modules, __pycache__, .env, dll)
│
├── /engine                    
│   ├── Dockerfile              # Setup environment python:3.10-slim
│   ├── requirements.txt        # fastapi, uvicorn, pulp, scikit-learn, requests
│   ├── main.py                 # FastAPI server & route definitions (Gatekeeper)
│   ├── optimizer.py            # MILP logic using PuLP library
│   ├── predictor.py            # Scikit-Learn ML model (98.6% efficiency prediction)
│   └── mock_data.csv           # Synthetic dataset for training
│
├── /blockchain                 # Module: Hyperledger Fabric (Node.js)
│   ├── package.json            # fabric-network, express
│   ├── gateway.js              # Node.js API Bridge (Connects Python to Microfab)
│   └── /chaincode              # Encrypted Smart Contracts
│       ├── package.json
│       └── symbiosis_contract.js # Transaction logic (Immutable)
│
└── /frontend                   # Module: Frontend (Next.js 14, UI/UX)
    ├── Dockerfile              # Setup Node.js frontend environment
    ├── package.json            # next, react, tailwindcss, lucide-react, recharts
    ├── tailwind.config.ts      # UI styling configuration
    ├── components.json         # Shadcn/UI configuration
    ├── /app
    │   ├── layout.tsx          # Root layout
    │   ├── page.tsx            # Main dashboard
    │   └── globals.css         # Global styling
    ├── /components
    │   ├── WasteForm.tsx       # UI for material input (linked to schema.json)
    │   └── AuditTrail.tsx      # Blockchain verification table
    └── /lib
        └── api.ts              # API client configuration
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
