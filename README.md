# Restaurant Simulation Dashboard (BP MVP)

## Local dev

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # or Windows Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000