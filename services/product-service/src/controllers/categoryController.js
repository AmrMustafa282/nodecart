const Category = require('../models/Category');
const Product = require('../models/Product');
const {
  AppError,
  asyncHandler,
  responseFormatter,
  logger
} = require('@nodecart/shared');

/**
 * @desc    Get all categories
 * @route   GET /api/categories
 * @access  Public
 */
exports.getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ isActive: true })
    .populate('parent', 'name slug')
    .sort('name');

  responseFormatter.success(res, categories);
});

/**
 * @desc    Get single category
 * @route   GET /api/categories/:id
 * @access  Public
 */
exports.getCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id).populate('parent', 'name slug');

  if (!category) {
    throw new AppError('Category not found', 404);
  }

  responseFormatter.success(res, category);
});

/**
 * @desc    Get category by slug
 * @route   GET /api/categories/slug/:slug
 * @access  Public
 */
exports.getCategoryBySlug = asyncHandler(async (req, res) => {
  const category = await Category.findOne({ slug: req.params.slug }).populate(
    'parent',
    'name slug'
  );

  if (!category) {
    throw new AppError('Category not found', 404);
  }

  // Get products count
  const productCount = await Product.countDocuments({
    categories: category._id,
    status: 'active',
  });

  const categoryData = {
    ...category.toObject(),
    productCount,
  };

  responseFormatter.success(res, categoryData);
});

/**
 * @desc    Create new category
 * @route   POST /api/categories
 * @access  Private/Admin
 */
exports.createCategory = asyncHandler(async (req, res) => {
  const { name, description, image, parent } = req.body;

  // Check if category exists
  const existingCategory = await Category.findOne({ name });
  if (existingCategory) {
    throw new AppError('Category already exists', 400);
  }

  const category = await Category.create({
    name,
    description,
    image,
    parent: parent || null,
  });

  logger.info('Category created', { categoryId: category._id, name: category.name });

  responseFormatter.success(res, category, 'Category created successfully', 201);
});

/**
 * @desc    Update category
 * @route   PUT /api/categories/:id
 * @access  Private/Admin
 */
exports.updateCategory = asyncHandler(async (req, res) => {
  let category = await Category.findById(req.params.id);

  if (!category) {
    throw new AppError('Category not found', 404);
  }

  category = await Category.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  logger.info('Category updated', { categoryId: category._id });

  responseFormatter.success(res, category, 'Category updated successfully');
});

/**
 * @desc    Delete category
 * @route   DELETE /api/categories/:id
 * @access  Private/Admin
 */
exports.deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    throw new AppError('Category not found', 404);
  }

  // Check if category has products
  const productCount = await Product.countDocuments({ categories: category._id });

  if (productCount > 0) {
    throw new AppError(
      'Cannot delete category with products. Please reassign or delete products first.',
      400
    );
  }

  // Check if category has subcategories
  const subcategoryCount = await Category.countDocuments({ parent: category._id });

  if (subcategoryCount > 0) {
    throw new AppError(
      'Cannot delete category with subcategories. Please delete subcategories first.',
      400
    );
  }

  await category.deleteOne();

  logger.info('Category deleted', { categoryId: req.params.id });

  responseFormatter.success(res, null, 'Category deleted successfully');
});
