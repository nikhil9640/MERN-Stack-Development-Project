const express = require('express');
const { getTasks, createTask, updateTaskStatus, deleteTask } = require('../controllers/taskController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, getTasks);
router.post('/', protect, authorize('Admin'), createTask);
router.patch('/:id/status', protect, updateTaskStatus);
router.delete('/:id', protect, authorize('Admin'), deleteTask);

module.exports = router;