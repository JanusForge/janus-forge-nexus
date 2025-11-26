# Use a slim Python image for small size
FROM python:3.12-slim

# Set the working directory
WORKDIR /app

# Copy dependency files
COPY requirements.txt .

# Install dependencies needed for our project (including all AI libraries)
RUN pip install --no-cache-dir -r requirements.txt

# Copy all local code into the container
COPY . .

# Set environment variable for FastAPI/Uvicorn to listen on 0.0.0.0
ENV PORT 8000
ENV HOST 0.0.0.0

# Command to run the service
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
