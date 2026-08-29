import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { postsAPI } from '../services/api';

export default function BlogFeed() {
  const [posts, setPosts] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const res = await postsAPI.getAll(page, search);
      setPosts(res.data.posts);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [page, search]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Search Input */}
      <input
        type="text"
        placeholder="Search posts by title, content, or tag..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        style={{ width: '100%', padding: '10px 14px' }}
      />

      {loading ? (
        <p>Loading posts...</p>
      ) : posts.length === 0 ? (
        <p>No blog posts found.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {posts.map((post) => (
            <div key={post._id} className="card">
              <Link to={`/posts/${post._id}`} style={{ textDecoration: 'none' }}>
                <h2>{post.title}</h2>
              </Link>
              <p style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                By <strong>{post.author?.username || 'Unknown'}</strong> on {new Date(post.createdAt).toLocaleDateString()}
              </p>
              <p>{post.content.substring(0, 150)}...</p>
              
              {post.tags && post.tags.length > 0 && (
                <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                  {post.tags.map((tag, i) => (
                    <span key={i} style={{ fontSize: '0.75rem', backgroundColor: 'var(--border)', padding: '2px 8px', borderRadius: '4px' }}>
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '1rem' }}>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
          <span>Page {page} of {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}