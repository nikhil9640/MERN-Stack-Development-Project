import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const Home = () => {
  const [threads, setThreads] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchThreads = useCallback(async () => {
    try {
      const res = await axios.get(`http://localhost:5001/api/threads?page=${page}&search=${search}`);
      setThreads(res.data.threads);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error(err);
    }
  }, [page, search]);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Recent Threads</h2>
        <Link to="/create-thread" style={{ padding: '8px 16px', backgroundColor: '#007bff', color: '#fff', textDecoration: 'none', borderRadius: '4px' }}>
          + New Thread
        </Link>
      </div>

      <input
        type="text"
        placeholder="Search threads..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        style={{ width: '100%', padding: '10px', marginBottom: '20px', boxSizing: 'border-box' }}
      />

      {threads.length === 0 ? (
        <p>No threads found. Create one to start a discussion!</p>
      ) : (
        threads.map((thread) => (
          <div key={thread._id} style={{ border: '1px solid #ccc', padding: '15px', marginBottom: '10px', borderRadius: '5px' }}>
            <h3>
              <Link to={`/thread/${thread._id}`} style={{ textDecoration: 'none', color: '#007bff' }}>
                {thread.title}
              </Link>
            </h3>
            <p>Score: {thread.score} | Author: {thread.author?.username || 'Unknown'}</p>
          </div>
        ))
      )}

      <div style={{ marginTop: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button disabled={page <= 1} onClick={() => setPage((prev) => prev - 1)}>
          Previous
        </button>
        <span>Page {page} of {totalPages}</span>
        <button disabled={page >= totalPages} onClick={() => setPage((prev) => prev + 1)}>
          Next
        </button>
      </div>
    </div>
  );
};

export default Home;