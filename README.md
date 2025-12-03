# 后端
cd backend
pip3 install -r requirements.txt
python3 init_db.py
python3 ingest.py
python3 -m uvicorn app:app --reload --port 8000

# 前端
cd ../frontend
pnpm install
pnpm run dev