FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (use install for broader compatibility in CI/build servers)
RUN npm install --no-audit --no-fund --legacy-peer-deps

# Copy application code
COPY . .

# Set API URL for build
ARG REACT_APP_API_URL=http://localhost:5001/api
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# Set Node memory limit for build (prevents OOM on small AWS instances)
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Build application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets from build stage
COPY --from=build /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
