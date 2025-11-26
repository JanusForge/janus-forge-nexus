cat <<EOF > Dockerfile
# Use a slim Python image for small size
FROM python:3.12-slim

# Set the working directory
WORKDIR /app

# Copy dependency files
COPY requirements.txt .

# Install dependencies needed for our project 
RUN pip install --no-cache-dir -r requirements.txt

# Copy all local code into the container
COPY . .

# Command to run the service: dynamically uses the PORT environment variable 
# provided by Cloud Run (which is usually 8080).
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "\${PORT}"]
EOF