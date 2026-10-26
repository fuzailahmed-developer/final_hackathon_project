export const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Standard HTTP Request helper supporting both HTTP-only cookies and Authorization headers
 */
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('hcm_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const config = {
    ...options,
    headers,
    credentials: 'include' // Sends HTTP-only cookie
  };

  const response = await fetch(`${API_BASE}${endpoint}`, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || 'Request failed with status ' + response.status);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const authApi = {
  login: async (email, password) => {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (res.data?.token) {
      localStorage.setItem('hcm_token', res.data.token);
    }
    return res;
  },

  getMe: async () => {
    return await request('/auth/me', {
      method: 'GET'
    });
  },

  logout: async () => {
    try {
      await request('/auth/logout', { method: 'POST' });
    } finally {
      localStorage.removeItem('hcm_token');
    }
  }
};

export const dashboardApi = {
  getAdminDashboard: (params = {}) => {
    const query = new URLSearchParams();
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request(`/dashboard/admin${qs}`);
  },
  getHrDashboard: (params = {}) => {
    const query = new URLSearchParams();
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request(`/dashboard/hr${qs}`);
  },
  getEmployeeDashboard: (params = {}) => {
    const query = new URLSearchParams();
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request(`/dashboard/employee${qs}`);
  }
};

export const organizationApi = {
  getSettings: () => request('/organization'),
  saveSettings: (data) => request('/organization', { method: 'POST', body: JSON.stringify(data) }),
  updateSettings: (data) => request('/organization', { method: 'PUT', body: JSON.stringify(data) })
};

export const departmentApi = {
  getAll: () => request('/departments'),
  create: (data) => request('/departments', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/departments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleStatus: (id) => request(`/departments/${id}/status`, { method: 'PATCH' })
};

export const designationApi = {
  getAll: (departmentId, activeOnly = false) => {
    const query = new URLSearchParams();
    if (departmentId) query.set('department', departmentId);
    if (activeOnly) query.set('activeOnly', 'true');
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request(`/designations${qs}`);
  },
  create: (data) => request('/designations', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/designations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleStatus: (id) => request(`/designations/${id}/status`, { method: 'PATCH' })
};

export const leaveTypeApi = {
  getAll: () => request('/leave-types'),
  create: (data) => request('/leave-types', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/leave-types/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleStatus: (id) => request(`/leave-types/${id}/status`, { method: 'PATCH' })
};

export const holidayApi = {
  getAll: () => request('/holidays'),
  create: (data) => request('/holidays', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/holidays/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/holidays/${id}`, { method: 'DELETE' })
};

export const userManagementApi = {
  getHrUsers: () => request('/users/hr'),
  createHrUser: (data) => request('/users/hr', { method: 'POST', body: JSON.stringify(data) }),
  toggleHrStatus: (id) => request(`/users/hr/${id}/status`, { method: 'PATCH' })
};

export const employeeApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.department) query.set('department', params.department);
    if (params.status) query.set('status', params.status);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request(`/employees${qs}`);
  },
  getById: (id) => request(`/employees/${id}`),
  getMyProfile: () => request('/employees/me/profile'),
  create: (data) => request('/employees', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) })
};

export const attendanceApi = {
  checkIn: () => request('/attendance/check-in', { method: 'POST' }),
  checkOut: () => request('/attendance/check-out', { method: 'POST' }),
  getToday: () => request('/attendance/me/today'),
  getMyHistory: (params = {}) => {
    const query = new URLSearchParams();
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request(`/attendance/me${qs}`);
  },
  getMySummary: () => request('/attendance/me/summary'),
  getWorkforceAttendance: (params = {}) => {
    const query = new URLSearchParams();
    if (params.date) query.set('date', params.date);
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    if (params.department) query.set('department', params.department);
    if (params.status) query.set('status', params.status);
    if (params.search) query.set('search', params.search);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request(`/attendance${qs}`);
  },
  correctAttendance: (id, data) => request(`/attendance/${id}/correct`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  })
};

export const leaveApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.employeeId) query.set('employeeId', params.employeeId);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request(`/leaves${qs}`);
  },
  getBalance: (employeeId) => {
    const qs = employeeId ? `?employeeId=${employeeId}` : '';
    return request(`/leaves/balance${qs}`);
  },
  apply: (data) => request('/leaves', { method: 'POST', body: JSON.stringify(data) }),
  updateStatus: (id, data) => request(`/leaves/${id}/status`, { method: 'PATCH', body: JSON.stringify(data) })
};

export const payrollApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams();
    if (params.month) query.set('month', params.month);
    if (params.year) query.set('year', params.year);
    if (params.status) query.set('status', params.status);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request(`/payrolls${qs}`);
  },
  getById: (id) => request(`/payrolls/${id}`),
  generateMonthly: (data) => request('/payrolls/generate', { method: 'POST', body: JSON.stringify(data) }),
  finalize: (id) => request(`/payrolls/${id}/finalize`, { method: 'POST' }),
  getPayslip: (payrollId, employeeId) => request(`/payrolls/${payrollId}/payslip/${employeeId}`)
};

export const aiApi = {
  chat: (message) => request('/ai/chat', { method: 'POST', body: JSON.stringify({ message }) }),
  smartLeave: (text) => request('/ai/smart-leave', { method: 'POST', body: JSON.stringify({ text }) }),
  dashboardSummary: (kpis) => request('/ai/dashboard-summary', { method: 'POST', body: JSON.stringify({ kpis }) })
};

export const announcementApi = {
  getAll: (params = {}) => {
    const qs = params.all ? '?all=true' : '';
    return request(`/announcements${qs}`);
  },
  create: (data) => request('/announcements', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/announcements/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/announcements/${id}`, { method: 'DELETE' })
};

export const notificationApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams();
    if (params.limit) query.set('limit', params.limit);
    if (params.unread) query.set('unread', 'true');
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request(`/notifications${qs}`);
  },
  getUnreadCount: () => request('/notifications/unread-count'),
  markRead: (id) => request(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllRead: () => request('/notifications/read-all', { method: 'PATCH' })
};

export const auditApi = {
  getLogs: (params = {}) => {
    const query = new URLSearchParams();
    if (params.action) query.set('action', params.action);
    if (params.entity) query.set('entity', params.entity);
    if (params.actor) query.set('actor', params.actor);
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    if (params.page) query.set('page', params.page);
    if (params.limit) query.set('limit', params.limit);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request(`/audit${qs}`);
  },
  getDistinct: () => request('/audit/distinct')
};
