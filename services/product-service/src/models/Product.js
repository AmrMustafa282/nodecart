const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [200, 'Product name cannot exceed 200 characters'],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
    },
    shortDescription: {
      type: String,
      maxlength: [500, 'Short description cannot exceed 500 characters'],
    },
    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: [0, 'Price cannot be negative'],
    },
    compareAtPrice: {
      type: Number,
      min: [0, 'Compare price cannot be negative'],
    },
    cost: {
      type: Number,
      min: [0, 'Cost cannot be negative'],
    },
    sku: {
      type: String,
      unique: true,
      sparse: true,
    },
    barcode: {
      type: String,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0, 'Quantity cannot be negative'],
      default: 0,
    },
    lowStockThreshold: {
      type: Number,
      default: 10,
    },
    categories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
      },
    ],
    images: [
      {
        url: String,
        alt: String,
        objectName: String,
      },
    ],
    variants: [
      {
        name: String,
        values: [String],
      },
    ],
    specifications: {
      type: Map,
      of: String,
    },
    tags: [String],
    vendor: {
      type: String,
    },
    vendorId: {
      type: String,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'out_of_stock', 'discontinued'],
      default: 'active',
    },
    featured: {
      type: Boolean,
      default: false,
    },
    rating: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      count: {
        type: Number,
        default: 0,
      },
    },
    seo: {
      title: String,
      description: String,
      keywords: [String],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ slug: 1 });
productSchema.index({ sku: 1 });
productSchema.index({ categories: 1 });
productSchema.index({ status: 1 });
productSchema.index({ price: 1 });
productSchema.index({ quantity: 1 });

// Create slug from name before saving
productSchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  next();
});

// Update status based on quantity
productSchema.pre('save', function (next) {
  if (this.quantity === 0 && this.status === 'active') {
    this.status = 'out_of_stock';
  } else if (this.quantity > 0 && this.status === 'out_of_stock') {
    this.status = 'active';
  }
  next();
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
