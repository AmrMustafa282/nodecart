FROM nginx:alpine

# Remove default nginx config
RUN rm /etc/nginx/nginx.conf

# Copy custom nginx config
COPY api-gateway/nginx.conf /etc/nginx/nginx.conf

# Copy infrastructure dashboard as main page
COPY infrastructure-dashboard.html /usr/share/nginx/html/index.html

# Create log directory
RUN mkdir -p /var/log/nginx

# Expose port
EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
