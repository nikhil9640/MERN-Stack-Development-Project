import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { postsAPI, commentsAPI } from '../services/api';
import { AuthContext } from '../context/AuthContext';

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [postRes, commentsRes] = await Promise.all([
          postsAPI.getOne(id),
          commentsAPI.getByPost(id)
        ]);
        setPost(postRes.data);
        setComments(commentsRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  const handleDelete = async () => {
    if (window.confirm('Delete this post?')) {
      await postsAPI.delete(id);
      navigate('/');
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      const res = await commentsAPI.create(id, commentText);
      setComments([res.data, ...comments]);
      setCommentText('');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to post comment');
    }
  };

  if (loading) return <p>Loading post...</p>;
  if (!post) return <p>Post not found.</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <article className="card">
        <h1>{post.title}</h1>
        <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
          Written by <strong>{post.author?.username}</strong> on {new Date(post.createdAt).toLocaleDateString()}
        </p>
        <p style={{ whiteSpace: 'pre-line' }}>{post.content}</p>

        {user && user.id === post.author?._id && (
          <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem' }}>
            <Link to={`/edit/${post._id}`}><button>Edit</button></Link>
            <button onClick={handleDelete} style={{ backgroundColor: 'var(--danger)', color: '#fff' }}>Delete</button>
          </div>
        )}
      </article>

      {/* Comment Section */}
      <section className="card">
        <h3>Comments ({comments.length})</h3>
        
        {user ? (
          <form onSubmit={handleCommentSubmit} style={{ display: 'flex', gap: '10px', margin: '1rem 0' }}>
            <input
              type="text"
              placeholder="Add a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              style={{ flex: 1, padding: '8px 12px' }}
            />
            <button type="submit">Submit</button>
          </form>
        ) : (
          <p style={{ margin: '1rem 0' }}><Link to="/login">Log in</Link> to leave a comment.</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {comments.map((c) => (
            <div key={c._id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
              <strong>{c.author?.username}</strong>
              <p style={{ margin: '2px 0' }}>{c.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}