const API_BASE = '';

const getAuthHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('jwt')}`,
  'Content-Type': 'application/json'
});

const getAuthHeadersOnly = () => ({
  'Authorization': `Bearer ${localStorage.getItem('jwt')}`
});

const handleResponse = async (response) => {
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401) {
      // Try to refresh token
      const refreshed = await refreshToken();
      if (!refreshed) {
        localStorage.clear();
        window.location.href = '/signin';
      }
    }
    throw new Error(data.error || 'Something went wrong');
  }
  return data;
};

const refreshToken = async () => {
  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include'
    });
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem('jwt', data.token);
      return true;
    }
    return false;
  } catch {
    return false;
  }
};

// Auth API
export const authAPI = {
  signup: (data) => fetch(`${API_BASE}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(handleResponse),

  login: (data) => fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data)
  }).then(handleResponse),

  googleLogin: (credential) => fetch(`${API_BASE}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ credential })
  }).then(handleResponse),

  logout: () => fetch(`${API_BASE}/api/auth/logout`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include'
  }).then(handleResponse)
};

// User API
export const userAPI = {
  getUser: (id) => fetch(`${API_BASE}/api/users/${id}`, {
    headers: getAuthHeaders()
  }).then(handleResponse),

  updateProfile: (data) => fetch(`${API_BASE}/api/users/profile`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  }).then(handleResponse),

  uploadProfilePic: (formData) => fetch(`${API_BASE}/api/users/profile-pic`, {
    method: 'PUT',
    headers: getAuthHeadersOnly(),
    body: formData
  }).then(handleResponse),

  follow: (id) => fetch(`${API_BASE}/api/users/follow/${id}`, {
    method: 'POST',
    headers: getAuthHeaders()
  }).then(handleResponse),

  unfollow: (id) => fetch(`${API_BASE}/api/users/unfollow/${id}`, {
    method: 'POST',
    headers: getAuthHeaders()
  }).then(handleResponse),

  search: (q) => fetch(`${API_BASE}/api/users/search?q=${encodeURIComponent(q)}`, {
    headers: getAuthHeaders()
  }).then(handleResponse)
};

// Post API
export const postAPI = {
  create: (formData) => fetch(`${API_BASE}/api/posts`, {
    method: 'POST',
    headers: getAuthHeadersOnly(),
    body: formData
  }).then(handleResponse),

  getFeed: (cursor) => {
    const url = cursor
      ? `${API_BASE}/api/posts/feed?cursor=${cursor}`
      : `${API_BASE}/api/posts/feed`;
    return fetch(url, { headers: getAuthHeaders() }).then(handleResponse);
  },

  getExplore: (cursor) => {
    const url = cursor
      ? `${API_BASE}/api/posts/explore?cursor=${cursor}`
      : `${API_BASE}/api/posts/explore`;
    return fetch(url, { headers: getAuthHeaders() }).then(handleResponse);
  },

  getPost: (id) => fetch(`${API_BASE}/api/posts/${id}`, {
    headers: getAuthHeaders()
  }).then(handleResponse),

  updateCaption: (id, caption) => fetch(`${API_BASE}/api/posts/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ caption })
  }).then(handleResponse),

  deletePost: (id) => fetch(`${API_BASE}/api/posts/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  }).then(handleResponse),

  like: (id) => fetch(`${API_BASE}/api/posts/${id}/like`, {
    method: 'POST',
    headers: getAuthHeaders()
  }).then(handleResponse),

  unlike: (id) => fetch(`${API_BASE}/api/posts/${id}/unlike`, {
    method: 'POST',
    headers: getAuthHeaders()
  }).then(handleResponse),

  save: (id) => fetch(`${API_BASE}/api/posts/${id}/save`, {
    method: 'POST',
    headers: getAuthHeaders()
  }).then(handleResponse),

  unsave: (id) => fetch(`${API_BASE}/api/posts/${id}/unsave`, {
    method: 'POST',
    headers: getAuthHeaders()
  }).then(handleResponse),

  getSaved: () => fetch(`${API_BASE}/api/posts/saved/me`, {
    headers: getAuthHeaders()
  }).then(handleResponse),

  getUserPosts: (userId, cursor) => {
    const url = cursor
      ? `${API_BASE}/api/posts/user/${userId}?cursor=${cursor}`
      : `${API_BASE}/api/posts/user/${userId}`;
    return fetch(url, { headers: getAuthHeaders() }).then(handleResponse);
  }
};

// Comment API
export const commentAPI = {
  getComments: (postId, cursor) => {
    const url = cursor
      ? `${API_BASE}/api/comments/${postId}?cursor=${cursor}`
      : `${API_BASE}/api/comments/${postId}`;
    return fetch(url, { headers: getAuthHeaders() }).then(handleResponse);
  },

  create: (data) => fetch(`${API_BASE}/api/comments`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  }).then(handleResponse),

  delete: (id) => fetch(`${API_BASE}/api/comments/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  }).then(handleResponse),

  reply: (id, text) => fetch(`${API_BASE}/api/comments/${id}/reply`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ text })
  }).then(handleResponse),

  like: (id) => fetch(`${API_BASE}/api/comments/${id}/like`, {
    method: 'POST',
    headers: getAuthHeaders()
  }).then(handleResponse),

  unlike: (id) => fetch(`${API_BASE}/api/comments/${id}/unlike`, {
    method: 'POST',
    headers: getAuthHeaders()
  }).then(handleResponse)
};

// Notification API
export const notificationAPI = {
  getAll: (cursor) => {
    const url = cursor
      ? `${API_BASE}/api/notifications?cursor=${cursor}`
      : `${API_BASE}/api/notifications`;
    return fetch(url, { headers: getAuthHeaders() }).then(handleResponse);
  },

  markRead: () => fetch(`${API_BASE}/api/notifications/read`, {
    method: 'PUT',
    headers: getAuthHeaders()
  }).then(handleResponse),

  getUnreadCount: () => fetch(`${API_BASE}/api/notifications/unread-count`, {
    headers: getAuthHeaders()
  }).then(handleResponse)
};

// Story API
export const storyAPI = {
  create: (formData) => fetch(`${API_BASE}/api/stories`, {
    method: 'POST',
    headers: getAuthHeadersOnly(),
    body: formData
  }).then(handleResponse),

  getAll: () => fetch(`${API_BASE}/api/stories`, {
    headers: getAuthHeaders()
  }).then(handleResponse),

  view: (id) => fetch(`${API_BASE}/api/stories/${id}/view`, {
    method: 'POST',
    headers: getAuthHeaders()
  }).then(handleResponse),

  delete: (id) => fetch(`${API_BASE}/api/stories/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  }).then(handleResponse)
};

// Message API
export const messageAPI = {
  getConversations: () => fetch(`${API_BASE}/api/messages`, {
    headers: getAuthHeaders()
  }).then(handleResponse),

  getMessages: (userId, cursor) => {
    const url = cursor
      ? `${API_BASE}/api/messages/${userId}?cursor=${cursor}`
      : `${API_BASE}/api/messages/${userId}`;
    return fetch(url, { headers: getAuthHeaders() }).then(handleResponse);
  },

  send: (data) => fetch(`${API_BASE}/api/messages`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  }).then(handleResponse)
};
