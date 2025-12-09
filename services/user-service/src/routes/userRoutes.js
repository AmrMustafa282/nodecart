const express = require('express');
const { body } = require('express-validator');
const {
  authMiddleware,
  rbacMiddleware,
  validateRequest
} = require('@nodecart/shared');
const userController = require('../controllers/userController');

const router = express.Router();

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/profile', authMiddleware, userController.getProfile);

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phone:
 *                 type: string
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *               preferences:
 *                 type: object
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
router.put(
  '/profile',
  authMiddleware,
  [
    body('firstName').optional().isString().trim(),
    body('lastName').optional().isString().trim(),
    body('phone').optional().isString().trim(),
    body('dateOfBirth').optional().isISO8601(),
    body('preferences').optional().isObject(),
    validateRequest,
  ],
  userController.updateProfile
);

/**
 * @swagger
 * /api/users/profile:
 *   delete:
 *     summary: Delete user account
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account deleted successfully
 */
router.delete('/profile', authMiddleware, userController.deleteAccount);

// Admin routes
router.get('/', authMiddleware, rbacMiddleware(['admin']), userController.getAllUsers);
router.get('/:id', authMiddleware, rbacMiddleware(['admin']), userController.getUserById);

module.exports = router;
