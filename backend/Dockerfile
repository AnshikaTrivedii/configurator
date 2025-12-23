FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy app source
COPY . .

# Expose port (default 3001 as per env example)
EXPOSE 3001

# Start the application
CMD ["npm", "start"]
