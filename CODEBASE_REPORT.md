# Symbio-Link-ID: Comprehensive Codebase architecture and File Report

This document outlines the architecture, file structure, and specific purposes of all components within the `symbio-Link-ID` workspace. The application is a full-stack system featuring a Next.js frontend, a Python (FastAPI) backend with AI/ML capabilities, a blockchain integration layer, and model training scripts.

## Root Directory

The root directory holds project-wide orchestration, documentation, and database seeding utilities.

- `docker-compose.yml`: Main Docker Compose configuration to orchestrate all services (frontend, backend, database, and possibly blockchain components).
- `generate_seed.py` / `seed_mock_backup.py`: Scripts used to generate or load mock data into the system database for testing and development.
- `README.md`: High-level entry point documenting how to set up, run, and develop the project.
- `requireementr.txt` (typo in original): Shared or root-level Python dependency list.
- `schema.json`: A standard JSON schema file, likely used for validating general configurations or cross-system data formats.

---

## 1. Blockchain (`/blockchain/`)

This module handles the distributed ledger layer, likely based on Hyperledger Fabric (via Microfab). It ensures tracking, traceability, and immutable records.

- `docker-compose.microfab.yml`: Orchestrates Microfab (a lightweight Fabric environment used for local development).
- `fabricGateway.js` & `gateway.js`: Node.js utilities for connecting to and interacting with the Fabric blockchain network.
- `microfab_scanner.js`: Script to scan or manage the state of the local Microfab instance.
- `setup_microfab.js`: Script to initialize identities, channels, and deploy chaincode locally.
- `connection.json`: Network configuration/connection profile for connecting clients to the blockchain nodes.
- `Dockerfile` / `package.json`: Build instructions and Node.js dependencies for the blockchain microservice or client.
- `AGENT.md` / `TEST_PLAN.md`: Documentation for expected blockchain agent behaviors and testing strategies.
- `/chaincode/`: Contains the smart contracts deployed to the ledger.
  - `symbiosis_contract.js`: The core smart contract logic managing assets, agreements, or tokens.
- `/wallet/`: Stores localized cryptographic identities for connecting to the network (e.g., `org1admin.id`).

---

## 2. Engine (`/engine/`)

The main backend system. It's built in Python (likely FastAPI) and acts as the bridge connecting the database, the AI/ML models, and the frontend via REST integrations.

- `main.py`: The main entry point that initializes the backend web application (routes, middleware, DB connections).
- `database.py`: Configuration and engine initialization for the SQL database connection.
- `config.py`: Loads environment variables and application configurations.
- `requirements.txt`: Python dependencies needed to run the engine (e.g., fastapi, sqlalchemy, tensorflow).
- `Dockerfile`: Container build instructions for the backend service.
- `test_node.py` / `testkoneksi.py`: Quick test scripts to verify external system or database connectivity.
- `reset_db_tool.py` / `seed_mock.py`: Utilities for resetting the schema and re-seeding the DB.
- **AI & Vision Modules**:
  - `optimizer.py`: Contains algorithms to optimize processes, matches, or logistics.
  - `predictor.py` / `vision_predictor.py`: Inference scripts that wrap ML models to make predictions based on data or images.
  - `best_vision_model.h5`: Saved Weights/Architecture for the trained neural network model (likely written using TensorFlow/Keras).
- `/middleware/` (`auth.py`): Request interceptors for tasks like JWT token verification or CORS handling.
- `/models/`: SQLAlchemy (or similar ORM) domain models modeling the database tables (e.g., `user.py`, `agreement.py`, `shipment.py`, `material_listing.py`, `esg.py`).
- `/routers/`: API endpoints segregated by domain (e.g., `auth.py`, `agreements.py`, `matching.py`, `dashboard.py`).
- `/schemas/`: Pydantic models for data validation and API serialization (converting JSON to Python objects and vice versa).
- `/services/`: Core business logic decoupled from routing (e.g., `blockchain_service.py` to wrap ledger calls, `matching_engine.py` for connecting buyers/sellers, `bot_service.py`).

---

## 3. Frontend (`/frontend/`)

A Next.js 14+ application using the App Router. It serves as the user interface for users to interact with the platform.

- `package.json`, `tsconfig.json`: Node dependencies and TypeScript compiler settings.
- `next.config.js` / `next.config.mjs`: Core configurations for the Next.js build system.
- `tailwind.config.ts`, `postcss.config.mjs`: Styling infrastructure defining utility classes.
- `Dockerfile`: Container instructions for the web dashboard.
- `/src/app/`: The Next.js App Router providing file-system-based routing.
  - `layout.tsx`, `page.tsx`: Global layout template (navbar/footer wrappers) and the main landing page.
  - `/dashboard/`: Secure area of the app handling domain contexts (`agreements`, `esg`, `facilities`, `map`, `materials`, `negotiations`, `tracking`).
  - `/login/`, `/register/`: User authentication workflows.
  - `/fonts/` / `globals.css`: Typography and baseline global CSS styling.
- `/src/components/`: Reusable React components.
  - `AuditTrail.tsx`: Displays immutable actions (likely fetching from blockchain).
  - `EmissionChart.tsx`, `WasteForm.tsx`: Complex, domain-specific UI elements.
  - `/layout/`: Structural chunks (`Header`, `Sidebar`, `MockAccountSwitcher`).
  - `/materials/` / `/tracking/`: Feature-specific modules (`MaterialForm`, `ShipmentTimeline`).
  - `/ui/`: Highly reusable, atomic baseline UI pieces (like shadcn/ui generic `toaster.tsx`).
- `/src/lib/`: Sub-modules and utility functions.
  - `api.ts`: Centralized fetch wrappers/Axios instances pointing to the Python `/engine`.
  - `auth.ts`: Logic managing user sessions and tokens.
  - `types.ts`: Shared TypeScript interfaces mirroring the backend Python schemas.

---

## 4. Training Model (`/training_model/`)

A completely isolated directory specifically meant for Data Scientists / ML Engineers to train, evaluate, and tune machine learning modules offline out of the main production server loop.

- `/regresi/`: Area for developing regression algorithms.
  - `mock_data.csv`: A sample dataset used to train or test model accuracy locally.
  - `training.py`: The master script to ingest the dataset, compile an ML model, fit parameters over iterations (epochs), and output the final model (like the `best_vision_model.h5` in `/engine/`).
