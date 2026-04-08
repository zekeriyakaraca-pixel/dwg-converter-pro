# Base image as Node.js 20
FROM node:20-bookworm-slim

# Install Inkscape and other dependencies
RUN apt-get update && apt-get install -y \
    inkscape \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build || true

# Expose the API port
EXPOSE 3000

# Start the server
CMD ["npx", "ts-node-esm", "src/server.ts"]
