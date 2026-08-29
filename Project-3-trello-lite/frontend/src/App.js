import React, { useContext } from 'react';
import { AuthContext, AuthProvider } from './context/AuthContext';
import Login from './components/Login';
import Board from './components/Board';
import './App.css';

function Main() {
  const { token } = useContext(AuthContext);
  return <div className="App">{token ? <Board /> : <Login />}</div>;
}

function App() {
  return (
    <AuthProvider>
      <Main />
    </AuthProvider>
  );
}

export default App;