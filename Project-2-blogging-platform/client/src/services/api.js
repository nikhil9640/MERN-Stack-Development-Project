import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api'
});

// Auto-attach JWT token to all requests
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  login: (data) => API.post('/auth/login', data),
  register: (data) => API.post('/auth/register', data)
};

export const postsAPI = {
  getAll: (page = 1, search = '', tag = '') => 
    API.get(`/posts?page=${page}&search=${encodeURIComponent(search)}&tag=${encodeURIComponent(tag)}`),
  getOne: (id) => API.get(`/posts/${id}`),
  create: (postData) => API.post('/posts', postData),
  update: (id, postData) => API.put(`/posts/${id}`, postData),
  delete: (id) => API.delete(`/posts/${id}`)
};

export const commentsAPI = {
  getByPost: (postId) => API.get(`/comments/${postId}`),
  create: (postId, text) => API.post(`/comments/${postId}`, { text })
};

export default API;