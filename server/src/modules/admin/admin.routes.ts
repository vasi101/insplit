import { Router } from 'express';
import {
  getDashboardStats,
  getAllUsers,
  getUserDetails,
  createUser,
  updateUser,
  deleteUser,
  setUserAdminRole,
  getAllTransactions,
  createTransaction,
  deleteTransaction,
  updateTransactionStatus,
  getAllRooms,
  createRoom,
  deleteRoom,
  getAllInventory,
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  createUserValidation,
  sendUserVerificationEmail,
  toggleUserVerification,
} from './admin.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { adminMiddleware } from '../../middleware/admin.middleware';

const router = Router();

// All admin routes strictly require valid authentication AND administrator privilege
router.use(authMiddleware, adminMiddleware);

// Analytics
router.get('/stats', getDashboardStats);

// Users
router.get('/users', getAllUsers);
router.post('/users', createUserValidation, createUser);
router.get('/users/:userId', getUserDetails);
router.patch('/users/:userId', updateUser);
router.delete('/users/:userId', deleteUser);
router.patch('/users/:userId/role', setUserAdminRole);
router.post('/users/:userId/send-verification', sendUserVerificationEmail);
router.patch('/users/:userId/verification', toggleUserVerification);

// Transactions
router.get('/transactions', getAllTransactions);
router.post('/transactions', createTransaction);
router.patch('/transactions/:transactionId/status', updateTransactionStatus);
router.delete('/transactions/:transactionId', deleteTransaction);

// Rooms
router.get('/rooms', getAllRooms);
router.post('/rooms', createRoom);
router.delete('/rooms/:roomId', deleteRoom);

// Inventory
router.get('/inventory', getAllInventory);
router.post('/inventory', addInventoryItem);
router.patch('/inventory/:itemId', updateInventoryItem);
router.delete('/inventory/:itemId', deleteInventoryItem);

export default router;
