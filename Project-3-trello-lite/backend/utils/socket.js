const nodemailer = require('nodemailer');

let io;

const initSocket = (server) => {
  io = require('socket.io')(server, {
    cors: { origin: '*' }
  });

  io.on('connection', (socket) => {
    console.log('Client connected to socket:', socket.id);
    socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized!');
  return io;
};

const sendEmailNotification = async (to, subject, text) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    await transporter.sendMail({
      from: '"Trello Lite" <no-reply@trellolite.com>',
      to,
      subject,
      text
    });
  } catch (error) {
    console.error('Email Notification Error:', error.message);
  }
};

module.exports = { initSocket, getIO, sendEmailNotification };