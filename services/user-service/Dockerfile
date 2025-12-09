FROM node:18-alpine

WORKDIR /app

# Copy shared library
COPY shared /app/shared
WORKDIR /app/shared
RUN npm install

# Copy service
WORKDIR /app/service
COPY services/user-service/package*.json ./

# Link shared library and install dependencies
RUN npm install /app/shared && npm install

COPY services/user-service .

EXPOSE 3002

CMD ["npm", "start"]
