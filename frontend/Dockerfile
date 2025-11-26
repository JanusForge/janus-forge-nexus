# Use Node.js image to build
FROM node:20-slim AS builder

WORKDIR /app

# Copy package.json and install dependencies
COPY package.json .
COPY package-lock.json .
RUN npm install

# Build the React app
COPY . .
RUN npm run build

# Use Nginx/Serve to serve the static files (Final container stage)
FROM node:20-slim

WORKDIR /app

# Install 'serve' globally to host static files
RUN npm install -g serve

# Copy built artifacts from the builder stage
COPY --from=builder /app/build ./build

# Cloud Run injects the PORT env variable. We use 'serve' to listen on it.
CMD ["sh", "-c", "exec serve -s build -l ${PORT}"]
