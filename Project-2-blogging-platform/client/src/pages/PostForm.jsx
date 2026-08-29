import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { postsAPI } from '../services/api';

export default function PostForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit) {
      postsAPI.getOne(id).then((res) => {
        setTitle(res.data.title);
        setContent(res.data.content);
        setTags(res.data.tags ? res.data.tags.join(', ') : '');
      }).catch(err => console.error(err));
    }
  }, [id, isEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { title, content, tags };
      if (isEdit) {
        await postsAPI.update(id, payload);
      } else {
        await postsAPI.create(payload);
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Action failed');
    }
  };

  return (
    <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h2>{isEdit ? 'Edit Post' : 'Create New Post'}</h2>
      {error && <p style={{ color: 'var(--danger)', margin: '10px 0' }}>{error}</p>}
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
        <div>
          <label>Title</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required style={{ width: '100%', padding: '8px' }} />
        </div>
        <div>
          <label>Content</label>
          <textarea rows="6" value={content} onChange={(e) => setContent(e.target.value)} required style={{ width: '100%', padding: '8px' }} />
        </div>
        <div>
          <label>Tags (comma separated)</label>
          <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tech, react, node" style={{ width: '100%', padding: '8px' }} />
        </div>
        <button type="submit" style={{ padding: '10px' }}>{isEdit ? 'Update Post' : 'Publish Post'}</button>
      </form>
    </div>
  );
}