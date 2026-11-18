FROM node:24-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev

# Copy app source
COPY . .

RUN chown -R node:node /app
USER node

# Expose port (default 3001 as per env example)
EXPOSE 3001

# Start the application
CMD ["npm", "start"]
