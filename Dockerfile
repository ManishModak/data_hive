FROM ghcr.io/puppeteer/puppeteer:latest

USER root
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --production

COPY datahive.js .

# Run as non-privileged user
USER pptruser

CMD ["node", "datahive.js"]
