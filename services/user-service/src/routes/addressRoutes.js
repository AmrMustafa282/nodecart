const express = require('express');
const { body } = require('express-validator');
const { authMiddleware, validateRequest } = require('@nodecart/shared');
const addressController = require('../controllers/addressController');

const router = express.Router();

/**
 * @swagger
 * /api/addresses:
 *   get:
 *     summary: Get all addresses
 *     tags: [Addresses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Addresses retrieved successfully
 */
router.get('/', authMiddleware, addressController.getAddresses);

/**
 * @swagger
 * /api/addresses/{id}:
 *   get:
 *     summary: Get single address
 *     tags: [Addresses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Address retrieved successfully
 *       404:
 *         description: Address not found
 */
router.get('/:id', authMiddleware, addressController.getAddress);

/**
 * @swagger
 * /api/addresses:
 *   post:
 *     summary: Create new address
 *     tags: [Addresses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - phone
 *               - addressLine1
 *               - city
 *               - state
 *               - postalCode
 *               - country
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [shipping, billing, both]
 *               fullName:
 *                 type: string
 *               phone:
 *                 type: string
 *               addressLine1:
 *                 type: string
 *               addressLine2:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               postalCode:
 *                 type: string
 *               country:
 *                 type: string
 *               isDefault:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Address created successfully
 */
router.post(
  '/',
  authMiddleware,
  [
    body('type').optional().isIn(['shipping', 'billing', 'both']),
    body('fullName').notEmpty().trim(),
    body('phone').notEmpty().trim(),
    body('addressLine1').notEmpty().trim(),
    body('addressLine2').optional().trim(),
    body('city').notEmpty().trim(),
    body('state').notEmpty().trim(),
    body('postalCode').notEmpty().trim(),
    body('country').notEmpty().trim(),
    body('isDefault').optional().isBoolean(),
    validateRequest,
  ],
  addressController.createAddress
);

/**
 * @swagger
 * /api/addresses/{id}:
 *   put:
 *     summary: Update address
 *     tags: [Addresses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Address updated successfully
 */
router.put('/:id', authMiddleware, addressController.updateAddress);

/**
 * @swagger
 * /api/addresses/{id}:
 *   delete:
 *     summary: Delete address
 *     tags: [Addresses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Address deleted successfully
 */
router.delete('/:id', authMiddleware, addressController.deleteAddress);

module.exports = router;
