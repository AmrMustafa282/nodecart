FROM node:18-alpine

WORKDIR /app

# Copy shared library
COPY shared /app/shared
WORKDIR /app/shared
RUN npm install

# Copy service
WORKDIR /app/service
COPY services/auth-service/package*.json ./

# Link shared library and install dependencies
RUN npm install /app/shared && npm install

COPY services/auth-service .

EXPOSE 3001

CMD ["npm", "start"]
