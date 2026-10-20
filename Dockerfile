# Use official Node.js LTS image
FROM node:24-alpine

# Set working directory
WORKDIR /usr/src/app

RUN apk add --no-cache \
    python3 \
    make \
    g++

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies. Scripts are skipped because better-sqlite3 ships
# prebuilt binaries; without this npm tries to compile it with node-gyp
# (no Python/compiler in the alpine image).
RUN npm ci --ignore-scripts

# Copy the rest of the app
COPY . .

# Expose any ports if needed (none by default)
EXPOSE 3000

# Default command
CMD ["node", "app.js"]
