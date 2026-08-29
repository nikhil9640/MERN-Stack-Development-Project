import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('chat_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [usernameInput, setUsernameInput] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    if (!usernameInput.trim()) return;

    const generatedUser = {
      id: `user_${usernameInput.toLowerCase().replace(/\s+/g, '_')}`,
      name: usernameInput
    };

    localStorage.setItem('chat_user', JSON.stringify(generatedUser));
    setUser(generatedUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('chat_user');
    setUser(null);
    window.location.reload();
  };

  if (!user) {
    return (
      <div style={styles.loginContainer}>
        <form onSubmit={handleLogin} style={styles.loginCard}>
          <h2 style={{ marginBottom: "20px" }}>Enter Chat App Workspace</h2>
          <input
            type="text"
            placeholder="Choose your Username..."
            value={usernameInput}
            onChange={(e) => setUsernameInput(e.target.value)}
            style={styles.inputField}
          />
          <button type="submit" style={styles.button}>Join Server</button>
        </form>
      </div>
    );
  }

  return <ChatDashboard currentUser={user} onLogout={handleLogout} />;
}

function ChatDashboard({ currentUser, onLogout }) {
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [typingUser, setTypingUser] = useState('');
  
  // New Functional States
  const [newRoomName, setNewRoomName] = useState(''); // [Option A]
  const [onlineUsers, setOnlineUsers] = useState([]); // [Option B]
  const [hasMoreMessages, setHasMoreMessages] = useState(true); // [Option C]

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messagePanelRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isInitialLoad = useRef(true);

  useEffect(() => {
    socketRef.current = io('http://localhost:3001', {
      auth: { userId: currentUser.id, username: currentUser.name }
    });

    const socket = socketRef.current;

    // Fetch rooms list from database on boot
    socket.emit('get_initial_rooms');

    socket.on('rooms_list', (roomsData) => {
      setRooms(roomsData);
      if (!activeRoom && roomsData.length > 0) {
        setActiveRoom(roomsData[0]);
      }
    });

    // [Option B]: Handle incoming active user matrix listings
    socket.on('online_users_list', (usersArray) => {
      setOnlineUsers(usersArray);
    });

    socket.on('message_history', ({ roomId, history, hasMore }) => {
      if (activeRoom && roomId !== activeRoom.id) return;
      
      setHasMoreMessages(hasMore);

      if (isInitialLoad.current) {
        setMessages(history);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
        }, 50);
      } else {
        // [Option C]: Prepend historical messages, saving the exact scroll container height
        const prevScrollHeight = messagePanelRef.current.scrollHeight;
        setMessages((prev) => [...history, ...prev]);
        
        setTimeout(() => {
          if (messagePanelRef.current) {
            messagePanelRef.current.scrollTop = messagePanelRef.current.scrollHeight - prevScrollHeight;
          }
        }, 10);
      }
    });

    socket.on('new_message', (msg) => {
      if (activeRoom && msg.roomId === activeRoom.id) {
        setMessages((prev) => [...prev, msg]);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 50);
        if (msg.senderId !== currentUser.id) {
          socket.emit('msg_seen', { msgId: msg._id, roomId: activeRoom.id, userId: currentUser.id });
        }
      }
    });

    socket.on('status_update', ({ msgId, status, userId }) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg._id === msgId) {
            const cleanStatus = (msg.status || []).filter((s) => s.userId !== userId);
            return { ...msg, status: [...cleanStatus, { userId, deliveryState: status }] };
          }
          return msg;
        })
      );
    });

    socket.on('user_typing', (data) => {
      setTypingUser(data.username);
    });

    socket.on('user_stop_typing', () => {
      setTypingUser('');
    });

    return () => {
      socket.disconnect();
    };
  }, [currentUser]);

  // Handle joining rooms
  useEffect(() => {
    if (!activeRoom) return;
    isInitialLoad.current = true;
    setMessages([]);
    setHasMoreMessages(true);
    socketRef.current.emit('join_room', { roomId: activeRoom.id, skip: 0 });
  }, [activeRoom]);

  // [Option C]: Infinite scroll pagination logic
  const handleScrollPanel = () => {
    if (!messagePanelRef.current || !hasMoreMessages) return;

    // Detect if container hits the top edge
    if (messagePanelRef.current.scrollTop === 0) {
      isInitialLoad.current = false;
      socketRef.current.emit('join_room', { roomId: activeRoom.id, skip: messages.length });
    }
  };

  // [Option A]: Emit dynamic room creation strings
  const handleCreateRoom = (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    socketRef.current.emit('create_room', { roomName: newRoomName });
    setNewRoomName('');
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeRoom) return;
    socketRef.current.emit('send_message', { roomId: activeRoom.id, text: inputText });
    socketRef.current.emit('stop_typing', { roomId: activeRoom.id });
    setInputText('');
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    if (activeRoom) {
      socketRef.current.emit('typing', { roomId: activeRoom.id });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current.emit('stop_typing', { roomId: activeRoom.id });
      }, 2000);
    }
  };

  const getReadReceipt = (msg) => {
    if (!msg.status || msg.status.length === 0) return '✓';
    return msg.status.some((s) => s.deliveryState === 'seen') ? '✓✓ (Read)' : '✓';
  };

  // [Option B]: Presence tracking checks
  const isOpponentOnline = () => {
    if (!activeRoom || activeRoom.isGroup) return false;
    // For DMs, simulate user presence monitoring (e.g., matching Alice if active user is Bob)
    const targetId = currentUser.id === 'user_alice' ? 'user_bob' : 'user_alice';
    return onlineUsers.includes(targetId);
  };

  return (
    <div style={styles.appLayout}>
      {/* Sidebar Panel Navigation */}
      <div style={styles.sidebar}>
        <h3>Logged in as: <span style={{ color: '#28a745' }}>{currentUser.name}</span></h3>
        <button onClick={onLogout} style={styles.logoutBtn}>Logout</button>
        
        <hr style={{ border: '0.5px solid #eee', margin: '15px 0' }} />
        
        {/* [Option A]: Create Dynamic Room Form Component */}
        <h4>Create Channel</h4>
        <form onSubmit={handleCreateRoom} style={{ display: 'flex', gap: '5px', marginBottom: '15px' }}>
          <input 
            type="text" 
            placeholder="Room Name..." 
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            style={{ flex: 1, padding: '6px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px' }}
          />
          <button type="submit" style={{ padding: '6px 12px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>+</button>
        </form>

        <h4>Conversations</h4>
        {rooms.map((room) => (
          <div
            key={room.id}
            onClick={() => setActiveRoom(room)}
            style={{
              ...styles.roomItem,
              background: activeRoom?.id === room.id ? '#007bff' : '#fff',
              color: activeRoom?.id === room.id ? '#fff' : '#000',
            }}
          >
            {room.name}
          </div>
        ))}
      </div>

      {/* Main UI Chat Panel Stream */}
      <div style={styles.mainChat}>
        <div style={styles.chatHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ margin: 0 }}>{activeRoom ? activeRoom.name : 'Loading Workspace...'}</h2>
            {/* [Option B]: Presence Indicator rendering marker node updates */}
            {activeRoom && !activeRoom.isGroup && (
              <span style={{ 
                padding: '4px 8px', 
                borderRadius: '12px', 
                fontSize: '11px', 
                fontWeight: 'bold',
                background: isOpponentOnline() ? '#d4edda' : '#f8d7da',
                color: isOpponentOnline() ? '#155724' : '#721c24'
              }}>
                {isOpponentOnline() ? '● Online' : '○ Offline'}
              </span>
            )}
          </div>
        </div>

        {/* Message Panel Area with scroll handler hook embedded */}
        <div ref={messagePanelRef} onScroll={handleScrollPanel} style={styles.messagePanel}>
          {hasMoreMessages && messages.length >= 20 && (
            <div style={{ textAlign: 'center', color: '#666', fontSize: '12px', padding: '5px 0' }}>
              Scroll to top to view past messages
            </div>
          )}
          
          {messages.map((msg) => {
            const isMe = msg.senderId === currentUser.id;
            const isRead = getReadReceipt(msg).includes('Read');
            return (
              <div key={msg._id || Math.random()} style={{ ...styles.messageWrapper, justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                <div style={{ ...styles.messageBubble, background: isMe ? '#dcf8c6' : '#fff', borderRadius: isMe ? "12px 12px 0px 12px" : "12px 12px 12px 0px" }}>
                  {!isMe && <small style={styles.senderName}>{msg.senderName}</small>}
                  <span style={{ fontSize: '15px' }}>{msg.text}</span>
                  <div style={styles.metaRow}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {isMe && <span style={{ marginLeft: '5px', color: isRead ? '#34b7f1' : '#777', fontWeight: 'bold' }}>{getReadReceipt(msg)}</span>}
                  </div>
                </div>
              </div>
            );
          })}
          
          {typingUser && (
            <div style={styles.typingIndicator}>
              <em>{typingUser} is typing...</em>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} style={styles.inputFooter}>
          <input
            type="text"
            value={inputText}
            onChange={handleInputChange}
            placeholder="Type a message..."
            style={styles.chatInput}
            disabled={!activeRoom}
          />
          <button type="submit" style={styles.sendBtn} disabled={!activeRoom}>Send</button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  loginContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif', background: '#f5f5f5' },
  loginCard: { padding: '30px', background: '#fff', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '320px' },
  inputField: { width: '100%', padding: '10px', boxSizing: 'border-box', marginBottom: '15px', border: '1px solid #ccc', borderRadius: '4px' },
  button: { width: '100%', padding: '10px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
  logoutBtn: { padding: '5px 10px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', marginTop: '4px' },
  appLayout: { display: 'flex', height: '100vh', fontFamily: 'sans-serif', width: '100vw', overflow: 'hidden' },
  sidebar: { width: '25%', borderRight: '1px solid #ddd', background: '#f8f9fa', padding: '15px', boxSizing: 'border-box' },
  roomItem: { padding: '12px', margin: '8px 0', borderRadius: '6px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', fontWeight: '500' },
  mainChat: { width: '75%', display: 'flex', flexDirection: 'column', height: '100%' },
  chatHeader: { padding: '15px', background: '#fff', borderBottom: '1px solid #ddd' },
  messagePanel: { flex: 1, padding: '20px', overflowY: 'auto', background: '#e5ddd5', display: 'flex', flexDirection: 'column', gap: '2px' },
  messageWrapper: { display: 'flex', width: '100%', marginBottom: '6px' },
  messageBubble: { padding: '10px 14px', maxWidth: '60%', boxShadow: '0 1px 2px rgba(0,0,0,0.15)', position: 'relative' },
  senderName: { color: '#888', fontWeight: 'bold', display: 'block', fontSize: '11px', marginBottom: '4px' },
  metaRow: { textAlign: 'right', fontSize: '10px', color: '#777', marginTop: '4px' },
  typingIndicator: { padding: '4px 10px', color: '#666', fontSize: '13px' },
  inputFooter: { padding: '15px', background: '#f0f0f0', display: 'flex', alignItems: 'center' },
  chatInput: { flex: 1, padding: '12px', border: '1px solid #ccc', borderRadius: '20px', outline: 'none', paddingLeft: '20px', fontSize: '14px' },
  sendBtn: { marginLeft: '10px', padding: '12px 25px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }
};