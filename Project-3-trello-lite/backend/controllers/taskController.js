const Task = require('../models/Task');
const { getIO, sendEmailNotification } = require('../utils/socket');

exports.getTasks = async (req, res) => {
  try {
    const tasks = await Task.find().populate('assignedTo', 'name email');
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createTask = async (req, res) => {
  const { title, description, assignedTo } = req.body;
  try {
    const newTask = new Task({ title, description, assignedTo });
    await newTask.save();

    getIO().emit('taskCreated', newTask);
    res.status(201).json(newTask);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateTaskStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const task = await Task.findByIdAndUpdate(id, { status }, { new: true }).populate('assignedTo');
    if (!task) return res.status(404).json({ message: 'Task not found' });

    getIO().emit('taskUpdated', task);

    if (task.assignedTo && task.assignedTo.email) {
      sendEmailNotification(
        task.assignedTo.email,
        'Task Status Updated',
        `Task "${task.title}" status changed to: ${status}`
      );
    }

    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    getIO().emit('taskDeleted', req.params.id);
    res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};