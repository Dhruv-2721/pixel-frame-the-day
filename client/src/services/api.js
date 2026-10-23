const API_BASE = '/api';

export const getAuthToken = () => localStorage.getItem('pixel_auth_token');
export const setAuthToken = (token) => localStorage.setItem('pixel_auth_token', token);
export const removeAuthToken = () => localStorage.removeItem('pixel_auth_token');

export const apiRequest = async (endpoint, options = {}) => {
  const token = getAuthToken();
  const headers = {
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If body is NOT FormData, set JSON Content-Type
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const contentType = response.headers.get('content-type');
  let data;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else if (contentType && contentType.includes('text/csv')) {
    return await response.text();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMsg = (data && data.error) || (data && data.message) || response.statusText;
    throw new Error(errorMsg);
  }

  return data;
};

export const api = {
  // Auth
  register: (payload) => apiRequest('/auth/register', { method: 'POST', body: payload }),
  login: (payload) => apiRequest('/auth/login', { method: 'POST', body: payload }),
  getMe: () => apiRequest('/auth/me', { method: 'GET' }),

  // Event
  getEventSettings: () => apiRequest('/event/settings', { method: 'GET' }),
  updateSettings: (payload) => apiRequest('/admin/settings/admin/settings', { method: 'PUT', body: payload }),
  uploadQrCode: (formData) => apiRequest('/admin/settings/admin/upload-qr', { method: 'POST', body: formData }),
  createAnnouncement: (payload) => apiRequest('/admin/settings/admin/announcements', { method: 'POST', body: payload }),
  deleteAnnouncement: (id) => apiRequest(`/admin/settings/admin/announcements/${id}`, { method: 'DELETE' }),

  // Payments (Participant)
  submitPaymentProof: (formData) => apiRequest('/payment/submit', { method: 'POST', body: formData }),
  getMyPayment: () => apiRequest('/payment/my-payment', { method: 'GET' }),

  // Payments (Admin)
  getAdminPayments: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/admin/payments/admin/list?${query}`, { method: 'GET' });
  },
  approvePayment: (id) => apiRequest(`/admin/payments/admin/${id}/approve`, { method: 'POST' }),
  rejectPayment: (id, reason) => apiRequest(`/admin/payments/admin/${id}/reject`, { method: 'POST', body: { reason } }),

  // Tickets
  getMyTicket: () => apiRequest('/tickets/my-ticket', { method: 'GET' }),
  verifyTicket: (identifier) => apiRequest(`/tickets/verify/${encodeURIComponent(identifier)}`, { method: 'GET' }),
  checkInTicket: (identifier) => apiRequest('/staff/check-in', { method: 'POST', body: { identifier } }),
  cancelTicket: (id, reason) => apiRequest(`/tickets/admin/${id}/cancel`, { method: 'POST', body: { reason } }),

  // Photo Submissions & Competition
  uploadSubmission: (formData) => apiRequest('/submissions/upload', { method: 'POST', body: formData }),
  getMySubmissions: () => apiRequest('/submissions/my', { method: 'GET' }),
  getLeaderboard: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/submissions/leaderboard?${query}`, { method: 'GET' });
  },
  getAdminSubmissions: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/submissions/admin/list?${query}`, { method: 'GET' });
  },
  scoreSubmission: (id, payload) => apiRequest(`/submissions/admin/${id}/score`, { method: 'POST', body: payload }),

  // Admin Management & Email Logs
  getAnalytics: () => apiRequest('/admin/analytics', { method: 'GET' }),
  getParticipants: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/admin/participants?${query}`, { method: 'GET' });
  },
  updateParticipantRound: (id, round_status) => apiRequest(`/admin/participants/${id}/round`, { method: 'POST', body: { round_status } }),
  exportParticipantsCsv: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/admin/export-csv${query ? `?${query}` : ''}`, { method: 'GET' });
  },
  getExportCsvUrl: (params = {}) => {
    const p = { ...params };
    const token = getAuthToken();
    if (token) p.token = token;
    const query = new URLSearchParams(p).toString();
    return `${API_BASE}/admin/export-csv${query ? `?${query}` : ''}`;
  },
  getAuditLogs: () => apiRequest('/admin/audit-logs', { method: 'GET' }),
  getEmailLogs: () => apiRequest('/admin/email-logs', { method: 'GET' }),
  createStaffUser: (payload) => apiRequest('/admin/users/create', { method: 'POST', body: payload }),

  // Notifications SSE URL
  getNotificationStreamUrl: () => `${API_BASE}/notifications/stream?token=${getAuthToken() || ''}`
};
