import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const ThreadDetail = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const [thread, setThread] = useState(null);
  const [replies, setReplies] = useState([]);
  const [replyContent, setReplyContent] = useState('');

  const fetchThreadData = useCallback(async () => {
    try {
      const threadRes = await axios.get(`http://localhost:5001/api/threads/${id}`);
      const repliesRes = await axios.get(`http://localhost:5001/api/replies/thread/${id}`);
      setThread(threadRes.data);
      setReplies(repliesRes.data);
    } catch (err) {
      console.error(err);
    }
  }, [id]);

  useEffect(() => {
    fetchThreadData();
  }, [fetchThreadData]);

  const handleVote = async (voteType) => {
    if (!user) return alert('Please login to vote');
    try {
      const res = await axios.post(`http://localhost:5001/api/threads/${id}/vote`, { voteType });
      setThread(res.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Voting failed');
    }
  };

  const handlePostReply = async (e) => {
    e.preventDefault();
    if (!user) return alert('Please login to reply');
    try {
      await axios.post(`http://localhost:5001/api/replies/thread/${id}`, { content: replyContent });
      setReplyContent('');
      fetchThreadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to post reply');
    }
  };

  if (!thread) return <div style={{ padding: '20px' }}>Loading...</div>;

  return (
    <div style={{ maxWidth: '800px', margin: '20px auto', padding: '20px' }}>
      <div style={{ borderBottom: '2px solid #ddd', paddingBottom: '10px' }}>
        <h2>{thread.title}</h2>
        <p>Posted by <strong>{thread.author?.username || 'Anonymous'}</strong></p>
        <p style={{ background: '#f9f9f9', padding: '15px', borderRadius: '5px', whiteSpace: 'pre-wrap' }}>{thread.content}</p>
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '10px' }}>
          <button onClick={() => handleVote('upvote')}>▲ Upvote</button>
          <span>Score: {thread.score}</span>
          <button onClick={() => handleVote('downvote')}>▼ Downvote</button>
        </div>
      </div>

      <h3 style={{ marginTop: '30px' }}>Replies ({replies.length})</h3>
      {replies.map((reply) => (
        <div key={reply._id} style={{ border: '1px solid #ccc', padding: '15px', marginBottom: '10px', borderRadius: '5px' }}>
          <p><strong>{reply.author?.username || 'Anonymous'}</strong></p>
          <p style={{ whiteSpace: 'pre-wrap' }}>{reply.content}</p>
        </div>
      ))}

      {user ? (
        <form onSubmit={handlePostReply} style={{ marginTop: '30px' }}>
          <h4>Leave a Reply</h4>
          <textarea
            required
            rows={4}
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            style={{ width: '100%', padding: '8px', marginBottom: '10px', boxSizing: 'border-box' }}
          />
          <button type="submit" style={{ padding: '10px 20px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Post Reply
          </button>
        </form>
      ) : (
        <p style={{ marginTop: '20px' }}>Please log in to participate in the discussion.</p>
      )}
    </div>
  );
};

export default ThreadDetail;