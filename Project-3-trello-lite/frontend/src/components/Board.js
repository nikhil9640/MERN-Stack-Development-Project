import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { AuthContext } from '../context/AuthContext';

const socket = io('http://localhost:5001');
const COLUMNS = ['To Do', 'In Progress', 'Done'];

const Board = () => {
  const [tasks, setTasks] = useState([]);
  const [taskTitle, setTaskTitle] = useState('');
  const { token, user, logout } = useContext(AuthContext);

  useEffect(() => {
    fetchTasks();

    socket.on('taskCreated', (newTask) => {
      setTasks((prev) => [...prev, newTask]);
    });

    socket.on('taskUpdated', (updatedTask) => {
      setTasks((prev) => prev.map((t) => (t._id === updatedTask._id ? updatedTask : t)));
    });

    socket.on('taskDeleted', (deletedId) => {
      setTasks((prev) => prev.filter((t) => t._id !== deletedId));
    });

    return () => {
      socket.off('taskCreated');
      socket.off('taskUpdated');
      socket.off('taskDeleted');
    };
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await axios.get('http://localhost:5001/api/tasks', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTasks(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!taskTitle) return;
    try {
      await axios.post(
        'http://localhost:5001/api/tasks',
        { title: taskTitle },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTaskTitle('');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create task');
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await axios.delete(`http://localhost:5001/api/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete task');
    }
  };

  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('taskId', taskId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');

    setTasks((prev) =>
      prev.map((t) => (t._id === taskId ? { ...t, status: targetStatus } : t))
    );

    try {
      await axios.patch(
        `http://localhost:5001/api/tasks/${taskId}/status`,
        { status: targetStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      fetchTasks();
    }
  };

  return (
    <div className="board-container">
      <header>
        <h2>Trello Lite Board ({user.role} Mode)</h2>
        <div>
          <span style={{ marginRight: '15px' }}>User: {user.name}</span>
          <button onClick={logout}>Logout</button>
        </div>
      </header>

      {user.role === 'Admin' && (
        <form onSubmit={handleCreateTask} className="task-form">
          <input
            type="text"
            placeholder="New Task Title..."
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
          />
          <button type="submit">Add Task</button>
        </form>
      )}

      <div className="columns">
        {COLUMNS.map((colStatus) => (
          <div
            key={colStatus}
            className="column"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, colStatus)}
          >
            <h3>{colStatus}</h3>
            {tasks
              .filter((task) => task.status === colStatus)
              .map((task) => (
                <div
                  key={task._id}
                  className="card"
                  draggable
                  onDragStart={(e) => handleDragStart(e, task._id)}
                >
                  <div className="card-header">
                    <h4>{task.title}</h4>
                    {user.role === 'Admin' && (
                      <button 
                        className="delete-btn" 
                        onClick={() => handleDeleteTask(task._id)}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Board;