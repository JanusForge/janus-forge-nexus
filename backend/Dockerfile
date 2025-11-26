# Use a slim Python image for small size
FROM python:3.12-slim

# Set the working directory
WORKDIR /app

# Copy dependency files
COPY requirements.txt .

# Install dependencies
# We use --no-cache-dir and the specific requirements to keep the image small
RUN pip install --no-cache-dir -r requirements.txt

# Copy all local code
COPY . .

# Command to run the service: dynamically uses the PORT environment variable 
# injected by Cloud Run (which is usually 8080).
# Cloud Run sets the PORT env variable; Uvicorn uses it.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "${PORT}"]