FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Shell form CMD for env var expansion (Cloud Run sets $PORT=8080)
CMD uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000}
