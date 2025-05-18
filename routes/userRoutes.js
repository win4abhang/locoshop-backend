const express = require('express');
const router = express.Router();

const {
  getAllUsers,
  createUser,
  deleteUserById,
  updateUserById,
} = require('../controllers/userController');

router.get('/', getAllUsers);
router.post('/', createUser);
router.put('/:id', updateUserById);
router.delete('/:id', deleteUserById);

module.exports = router;
