import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';

// Page Imports
import BlogFeed from './pages/BlogFeed';
import PostDetail from './pages/PostDetail';
import PostForm from './pages/PostForm';
import Login from './pages/Login';
import Register from './pages/Register';

// Protected Route Wrapper using Context
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>;
  }

  return user ? children : <Navigate to="/login" replace />;
};

// Main Navigation Header
function Navigation() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav style={{
      padding: '1rem 1.5rem',
      backgroundColor: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }}>
      <Link to="/" style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)', textDecoration: 'none' }}>
        BlogHub
      </Link>

      <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
        <Link to="/" style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>Home</Link>
        
        {user ? (
          <>
            <Link to="/create" style={{ color: 'var(--accent)', fontWeight: 500, textDecoration: 'none' }}>
              Write Post
            </Link>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Hi, <strong>{user.username}</strong>
            </span>
            <button 
              onClick={handleLogout}
              style={{
                padding: '6px 14px',
                backgroundColor: 'transparent',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                borderRadius: 'var(--radius)',
                cursor: 'pointer'
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>Login</Link>
            <Link 
              to="/register" 
              style={{ 
                color: 'var(--accent)', 
                fontWeight: 'bold', 
                textDecoration: 'none',
                padding: '6px 12px',
                backgroundColor: 'var(--accent-bg)',
                borderRadius: 'var(--radius)'
              }}
            >
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

// App Root
export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Navigation />
        <main style={{ padding: '2rem 1rem', maxWidth: '900px', margin: '0 auto' }}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<BlogFeed />} />
            <Route path="/posts/:id" element={<PostDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected Routes */}
            <Route 
              path="/create" 
              element={
                <ProtectedRoute>
                  <PostForm />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/edit/:id" 
              element={
                <ProtectedRoute>
                  <PostForm />
                </ProtectedRoute>
              } 
            />

            {/* Fallback 404 Redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </Router>
    </AuthProvider>
  );
}