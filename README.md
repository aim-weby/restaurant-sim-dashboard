# 🍽️ Restaurant Simulation Dashboard

**A full-stack decision-support system for restaurant operations, powered by Discrete-Event Simulation and Monte Carlo methods.**

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.128-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> **📘 Academic Note**
> This project was developed as part of a Bachelor's thesis at the **Prague University of Economics and Business (VŠE)**.
> It demonstrates the practical application of stochastic simulation techniques — specifically Discrete-Event Simulation (DES) and Monte Carlo methods — to real-world restaurant operations management.

---

## 📖 Overview

The Restaurant Simulation Dashboard enables restaurant managers to model, simulate, and optimise their weekly operations through an interactive web interface. Users define their restaurant's configuration (dayparts, staffing, costs, seating capacity) and baseline demand data, then run **what-if scenario analyses** to evaluate the impact of operational changes before implementing them.

The application combines a **SimPy-based DES engine** (modelling individual customer journeys through a multi-resource queueing system) with a **Monte Carlo engine** (for rapid financial forecasting), all accessible through a modern React dashboard with real-time charts, KPI cards, and an AI-powered business advisor.

---

## ✨ Features

### Simulation & Analysis
- **Discrete-Event Simulation (DES)** — Full customer lifecycle modelling with SimPy: Poisson arrivals, triangular service times, table/kitchen/service resource contention, and customer balking
- **Monte Carlo Financial Forecasting** — Rapid N-run stochastic simulation with Gaussian demand/spend perturbations and capacity constraints
- **What-If Scenario Builder** — Create, save, and compare scenarios with staffing changes, price adjustments, capacity modifications, and demand multipliers
- **Experiment Runner** — Batch-execute multiple scenarios side-by-side with comparative metrics tables

### Data Management
- **Baseline Week Management** — Define multiple weekly demand patterns (e.g., "Peak Season", "Summer Week") with a 7×D demand matrix (weekday × daypart)
- **Daypart Configuration** — CRUD for time-of-day slots with automatic overlap validation (both frontend and backend)
- **Staffing Plan Editor** — Configure staff counts, hourly rates, and roles (kitchen/service) per weekday × daypart
- **Cost Settings** — Fixed weekly costs and food cost percentage (COGS ratio)
- **Opening Hours Management** — Per-weekday open/close times

### Dashboard & Visualisation
- **KPI Dashboard** — Revenue, profit, margins, covers, and average spend with sparkline charts
- **Timeseries Charts** — Revenue by weekday, by daypart, and demand heatmaps (Recharts)
- **Simulation Results** — Distributional summaries (mean, p10, p50, p90) with confidence bands
- **Data Health Monitor** — Real-time completeness and quality scoring for baseline data

### AI & Intelligence
- **GPT-Powered Business Advisor** — Conversational AI chat for operational guidance (OpenAI GPT-4o-mini)
- **AI Insights Engine** — Automated analysis of KPIs with structured recommendations
- **Rule-Based Insights** — Deterministic business rules for common operational patterns

### UX & Productivity
- **Undo/Redo** — Full undo/redo support in the baseline grid editor (Ctrl+Z / Ctrl+Shift+Z)
- **Keyboard Shortcuts** — Global shortcut system with help overlay (`?` key)
- **Toast Notifications** — Context-aware success/error/warning notifications
- **Accessible Dialogs** — WAI-ARIA compliant confirmation dialogs with focus trapping
- **Persistent Settings** — Simulation runs/seed values saved to localStorage across pages
- **Demo Data Seeding** — One-click database population with a Czech restaurant dataset

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript 5.9, Vite 7, Tailwind CSS 4 |
| **Charts** | Recharts 3 |
| **Routing** | React Router 7 |
| **Backend** | Python 3.11+, FastAPI 0.128, Uvicorn |
| **Database** | SQLite (via SQLAlchemy 2.0 ORM) |
| **Simulation** | SimPy 4.1 (DES), Custom Monte Carlo engine |
| **AI** | OpenAI GPT-4o-mini |
| **Validation** | Pydantic 2.12 (backend), TypeScript strict mode (frontend) |

---

## 📁 Project Structure

```
restaurant-sim-dashboard/
├── backend/
│   ├── app/
│   │   ├── api/                    # FastAPI route handlers (13 modules)
│   │   │   ├── ai.py               #   GPT-powered insights & advisor chat
│   │   │   ├── baseline.py         #   Baseline weeks, demand data, KPIs
│   │   │   ├── costs.py            #   Cost settings CRUD
│   │   │   ├── dayparts.py         #   Daypart CRUD with overlap validation
│   │   │   ├── experiments.py      #   Batch experiment runner
│   │   │   ├── health.py           #   Liveness probe
│   │   │   ├── opening_hours.py    #   Opening hours management
│   │   │   ├── scenarios.py        #   Scenario CRUD & execution
│   │   │   ├── seed.py             #   Demo data seeding
│   │   │   ├── sim_params.py       #   Simulation parameters per week
│   │   │   ├── simulation.py       #   DES/MC simulation endpoint
│   │   │   ├── staffing.py         #   Staffing plan management
│   │   │   └── venue.py            #   Restaurant settings
│   │   ├── db/                     # Database layer
│   │   │   ├── base.py             #   SQLAlchemy declarative base
│   │   │   ├── deps.py             #   Dependency injection (get_db)
│   │   │   ├── init_db.py          #   Table creation on startup
│   │   │   └── session.py          #   Engine & session factory
│   │   ├── models/                 # SQLAlchemy ORM models (9 models)
│   │   ├── schemas/                # Pydantic request/response schemas
│   │   ├── simulation/             # Core simulation engines
│   │   │   ├── des_engine.py       #   SimPy discrete-event simulation
│   │   │   └── monte_carlo.py      #   Monte Carlo financial model
│   │   ├── constants.py            # Shared constants (weekday labels)
│   │   └── main.py                 # FastAPI app entry point
│   ├── requirements.txt
│   └── .env                        # Environment variables (API keys)
│
├── frontend/
│   ├── src/
│   │   ├── api/                    # HTTP client & typed endpoint wrappers
│   │   │   ├── client.ts           #   Generic fetchJson<T> utility
│   │   │   ├── endpoints.ts        #   All API endpoint functions
│   │   │   └── types.ts            #   TypeScript type definitions (28 types)
│   │   ├── components/             # Reusable UI components
│   │   │   ├── Button.tsx          #   Multi-variant button
│   │   │   ├── Card.tsx            #   Content card wrapper
│   │   │   ├── ConfirmDialog.tsx   #   Accessible confirmation modal
│   │   │   ├── Toast.tsx           #   Toast notification system (Context API)
│   │   │   └── ...
│   │   ├── hooks/                  # Custom React hooks
│   │   │   ├── useKeyboardShortcuts.tsx  # Global keyboard shortcut system
│   │   │   ├── useSimDefaults.ts   #   localStorage-persisted sim settings
│   │   │   └── useUndoRedo.ts      #   Generic undo/redo state management
│   │   ├── layout/                 # App shell (sidebar, header, AI chat)
│   │   ├── pages/                  # Route page components (15 pages)
│   │   ├── utils/                  # Formatting & helper utilities
│   │   ├── App.tsx                 # React Router configuration
│   │   └── main.tsx                # Application entry point
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Python** 3.11 or higher
- **Node.js** 18 or higher (with npm)
- **OpenAI API Key** (optional — only required for AI features)

### 1. Clone the Repository

```bash
git clone https://github.com/aim-weby/restaurant-sim-dashboard.git
cd restaurant-sim-dashboard
```

### 2. Backend Setup

```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate        # macOS / Linux
# .venv\Scripts\activate         # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env and add your OpenAI API key (optional)
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install
```

### 4. Run the Application

**Start the backend** (from `backend/`):

```bash
uvicorn app.main:app --reload --port 8000
```

**Start the frontend** (from `frontend/`):

```bash
npm run dev
```

The application will be available at **http://localhost:5173**.

### 5. Seed Demo Data (Optional)

Once both servers are running, click the **"Seed Demo Data"** button on the Baseline Weeks page, or call the API directly:

```bash
curl -X POST http://localhost:8000/seed/demo
```

This populates the database with a realistic Czech restaurant dataset.

---

## ⚙️ Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Required for AI features (GPT-powered insights & advisor chat)
OPENAI_API_KEY=sk-your-openai-api-key-here
```

> **Note:** The application is fully functional without an OpenAI API key.
> AI features will return an appropriate error message if the key is not configured.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│               React Frontend                │
│  (Vite + TypeScript + Tailwind + Recharts)  │
│                                             │
│  ┌─────────┐ ┌──────────┐ ┌─────────────┐  │
│  │Dashboard│ │Scenarios │ │ Experiments  │  │
│  │  Page   │ │  Page    │ │    Page      │  │
│  └────┬────┘ └─────┬────┘ └──────┬──────┘  │
│       └────────────┼─────────────┘          │
│                    ▼                        │
│         ┌──────────────────┐                │
│         │  api/endpoints   │  ◄─ Typed API  │
│         │  api/client      │     wrappers   │
│         └────────┬─────────┘                │
└──────────────────┼──────────────────────────┘
                   │ HTTP (JSON)
┌──────────────────┼──────────────────────────┐
│                  ▼                          │
│         ┌──────────────────┐                │
│         │   FastAPI App    │                │
│         │   (13 routers)   │                │
│         └───────┬──────────┘                │
│       ┌─────────┼──────────┐                │
│       ▼         ▼          ▼                │
│  ┌─────────┐ ┌──────┐ ┌────────┐           │
│  │   DES   │ │Monte │ │ OpenAI │           │
│  │ Engine  │ │Carlo │ │  GPT   │           │
│  │ (SimPy) │ │Engine│ │ 4o-mini│           │
│  └─────────┘ └──────┘ └────────┘           │
│       │                                     │
│       ▼                                     │
│  ┌──────────────────┐                       │
│  │  SQLite + ORM    │                       │
│  │  (SQLAlchemy)    │                       │
│  └──────────────────┘                       │
│              Backend (Python)               │
└─────────────────────────────────────────────┘
```

---

## 📄 License

This project is part of a Bachelor's thesis submitted to the Prague University of Economics and Business (VŠE).

---

<p align="center">
  Built with ❤️ as a Bachelor's thesis project at VŠE Prague
</p>