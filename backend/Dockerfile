# Use a slim Python image for small size
FROM python:3.12-slim

# Set the working directory
WORKDIR /app

# Copy dependency files
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy all local code
COPY . .

# Command to run the service: executes the Python file directly. 
# The Python file determines the port dynamically.
CMD ["python", "main.py"]