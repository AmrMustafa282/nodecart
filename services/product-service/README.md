# Product Service

Product catalog and inventory management service using MongoDB and MinIO for image storage.

## Features

- Product CRUD operations
- Category management
- Product search and filtering
- Image upload to MinIO (S3-compatible storage)
- Inventory management
- Event-driven inventory updates (listens to payment.success)
- Low stock alerts
- SKU and barcode support
- Product variants and specifications
- SEO metadata

## API Endpoints

### Products
- `GET /api/products` - Get all products (with search, filters, pagination)
- `GET /api/products/:id` - Get single product
- `GET /api/products/slug/:slug` - Get product by slug
- `POST /api/products` - Create product (vendor/admin)
- `PUT /api/products/:id` - Update product (vendor/admin)
- `DELETE /api/products/:id` - Delete product (admin)
- `POST /api/products/:id/images` - Upload images (vendor/admin)
- `DELETE /api/products/:id/images/:imageId` - Delete image (vendor/admin)
- `PATCH /api/products/:id/inventory` - Update inventory (vendor/admin)

### Categories
- `GET /api/categories` - Get all categories
- `GET /api/categories/:id` - Get single category
- `GET /api/categories/slug/:slug` - Get category by slug
- `POST /api/categories` - Create category (admin)
- `PUT /api/categories/:id` - Update category (admin)
- `DELETE /api/categories/:id` - Delete category (admin)

## Event Publishers
- `product.created` - When a new product is created
- `product.updated` - When a product is updated
- `product.lowstock` - When inventory falls below threshold
- `product.outofstock` - When inventory reaches zero

## Event Subscribers
- `payment.success` - Reduces product inventory

## Environment Variables

See `.env.example` for required configuration.

## Running Locally

```bash
npm install
npm run dev
```

## API Documentation

Swagger UI available at: http://localhost:3003/api-docs
