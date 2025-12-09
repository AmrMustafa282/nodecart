const Product = require('../models/Product');
const { uploadFile, deleteFile } = require('../config/minio');
const {
  AppError,
  asyncHandler,
  responseFormatter,
  logger,
  EventBus,
  eventTypes,
} = require('@nodecart/shared');

// Initialize event bus
const eventBus = new EventBus();
eventBus.connect().catch((err) => logger.error('EventBus connection failed', { error: err.message }));

/**
 * @desc    Get all products
 * @route   GET /api/products
 * @access  Public
 */
exports.getProducts = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    sort = '-createdAt',
    search,
    category,
    minPrice,
    maxPrice,
    status = 'active',
  } = req.query;

  const offset = (page - 1) * limit;

  // Build query
  const query = {};

  if (search) {
    query.$text = { $search: search };
  }

  if (category) {
    query.categories = category;
  }

  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = parseFloat(minPrice);
    if (maxPrice) query.price.$lte = parseFloat(maxPrice);
  }

  if (status) {
    query.status = status;
  }

  const [products, total] = await Promise.all([
    Product.find(query)
      .populate('categories', 'name slug')
      .sort(sort)
      .skip(offset)
      .limit(parseInt(limit))
      .lean(),
    Product.countDocuments(query),
  ]);

  responseFormatter.paginated(
    res,
    products,
    {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
    },
    'Products retrieved successfully'
  );
});

/**
 * @desc    Get single product
 * @route   GET /api/products/:id
 * @access  Public
 */
exports.getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate('categories', 'name slug');

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  responseFormatter.success(res, product);
});

/**
 * @desc    Get product by slug
 * @route   GET /api/products/slug/:slug
 * @access  Public
 */
exports.getProductBySlug = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug }).populate(
    'categories',
    'name slug'
  );

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  responseFormatter.success(res, product);
});

/**
 * @desc    Create new product
 * @route   POST /api/products
 * @access  Private/Vendor/Admin
 */
exports.createProduct = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    shortDescription,
    price,
    compareAtPrice,
    cost,
    sku,
    barcode,
    quantity,
    lowStockThreshold,
    categories,
    variants,
    specifications,
    tags,
    status,
    featured,
    seo,
  } = req.body;

  // Check if SKU already exists
  if (sku) {
    const existingProduct = await Product.findOne({ sku });
    if (existingProduct) {
      throw new AppError('SKU already exists', 400);
    }
  }

  const product = await Product.create({
    name,
    description,
    shortDescription,
    price,
    compareAtPrice,
    cost,
    sku,
    barcode,
    quantity: quantity || 0,
    lowStockThreshold: lowStockThreshold || 10,
    categories,
    variants,
    specifications,
    tags,
    status: status || 'active',
    featured: featured || false,
    seo,
    vendorId: req.user.id,
    vendor: req.user.email,
  });

  logger.info('Product created', { productId: product._id, name: product.name });

  // Publish product.created event
  try {
    await eventBus.publish(eventTypes.PRODUCT_CREATED, {
      productId: product._id.toString(),
      name: product.name,
      price: product.price,
      quantity: product.quantity,
    });
  } catch (error) {
    logger.error('Failed to publish product.created event', { error: error.message });
  }

  responseFormatter.success(res, product, 'Product created successfully', 201);
});

/**
 * @desc    Update product
 * @route   PUT /api/products/:id
 * @access  Private/Vendor/Admin
 */
exports.updateProduct = asyncHandler(async (req, res) => {
  let product = await Product.findById(req.params.id);

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  // Check ownership (vendor can only update their own products)
  if (req.user.role === 'vendor' && product.vendorId !== req.user.id) {
    throw new AppError('Not authorized to update this product', 403);
  }

  const oldQuantity = product.quantity;

  product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  logger.info('Product updated', { productId: product._id });

  // Check for low stock
  if (product.quantity <= product.lowStockThreshold && oldQuantity > product.lowStockThreshold) {
    try {
      await eventBus.publish(eventTypes.PRODUCT_LOW_STOCK, {
        productId: product._id.toString(),
        name: product.name,
        quantity: product.quantity,
        threshold: product.lowStockThreshold,
      });
    } catch (error) {
      logger.error('Failed to publish product.lowstock event', { error: error.message });
    }
  }

  // Check for out of stock
  if (product.quantity === 0 && oldQuantity > 0) {
    try {
      await eventBus.publish(eventTypes.PRODUCT_OUT_OF_STOCK, {
        productId: product._id.toString(),
        name: product.name,
      });
    } catch (error) {
      logger.error('Failed to publish product.outofstock event', { error: error.message });
    }
  }

  responseFormatter.success(res, product, 'Product updated successfully');
});

/**
 * @desc    Delete product
 * @route   DELETE /api/products/:id
 * @access  Private/Admin
 */
exports.deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  // Delete images from MinIO
  for (const image of product.images) {
    try {
      await deleteFile(image.objectName);
    } catch (error) {
      logger.error('Failed to delete image from MinIO', { error: error.message });
    }
  }

  await product.deleteOne();

  logger.info('Product deleted', { productId: req.params.id });

  responseFormatter.success(res, null, 'Product deleted successfully');
});

/**
 * @desc    Upload product images
 * @route   POST /api/products/:id/images
 * @access  Private/Vendor/Admin
 */
exports.uploadImages = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  // Check ownership
  if (req.user.role === 'vendor' && product.vendorId !== req.user.id) {
    throw new AppError('Not authorized to update this product', 403);
  }

  if (!req.files || req.files.length === 0) {
    throw new AppError('No images provided', 400);
  }

  const uploadedImages = [];

  for (const file of req.files) {
    try {
      const { objectName, url } = await uploadFile(file, file.originalname);
      uploadedImages.push({
        url,
        objectName,
        alt: product.name,
      });
    } catch (error) {
      logger.error('Failed to upload image', { error: error.message });
    }
  }

  product.images.push(...uploadedImages);
  await product.save();

  logger.info('Product images uploaded', { productId: product._id, count: uploadedImages.length });

  responseFormatter.success(res, product, 'Images uploaded successfully');
});

/**
 * @desc    Delete product image
 * @route   DELETE /api/products/:id/images/:imageId
 * @access  Private/Vendor/Admin
 */
exports.deleteImage = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  // Check ownership
  if (req.user.role === 'vendor' && product.vendorId !== req.user.id) {
    throw new AppError('Not authorized to update this product', 403);
  }

  const image = product.images.id(req.params.imageId);

  if (!image) {
    throw new AppError('Image not found', 404);
  }

  // Delete from MinIO
  try {
    await deleteFile(image.objectName);
  } catch (error) {
    logger.error('Failed to delete image from MinIO', { error: error.message });
  }

  product.images.pull(req.params.imageId);
  await product.save();

  logger.info('Product image deleted', { productId: product._id, imageId: req.params.imageId });

  responseFormatter.success(res, product, 'Image deleted successfully');
});

/**
 * @desc    Update inventory
 * @route   PATCH /api/products/:id/inventory
 * @access  Private/Vendor/Admin
 */
exports.updateInventory = asyncHandler(async (req, res) => {
  const { quantity, operation = 'set' } = req.body;

  const product = await Product.findById(req.params.id);

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  const oldQuantity = product.quantity;

  if (operation === 'set') {
    product.quantity = quantity;
  } else if (operation === 'increment') {
    product.quantity += quantity;
  } else if (operation === 'decrement') {
    product.quantity = Math.max(0, product.quantity - quantity);
  }

  await product.save();

  logger.info('Product inventory updated', {
    productId: product._id,
    oldQuantity,
    newQuantity: product.quantity,
  });

  responseFormatter.success(res, product, 'Inventory updated successfully');
});
