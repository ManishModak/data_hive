FROM ghcr.io/puppeteer/puppeteer:latest

USER root
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install --production

# Copy source code
COPY datahive.js .
COPY src/ ./src/

# Create logs directory
RUN mkdir -p logs && chown -R pptruser:pptruser /app

# Run as non-privileged user
USER pptruser

CMD ["node", "datahive.js"]
