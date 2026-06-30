import axios from 'axios';

export const ADMIN_TOKEN_KEY = 'sams_admin_token';
export const COACH_TOKEN_KEY = 'sams_coach_token';
export const SUPER_ADMIN_TOKEN_KEY = 'sams_super_admin_token';
export const SIDEBAR_COLLAPSED_KEY = 'sams_sidebar_collapsed';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || error.message || 'Request failed';
    const wrapped = new Error(message);
    wrapped.status = error.response?.status;
    wrapped.payload = error.response?.data;
    return Promise.reject(wrapped);
  }
);

function unwrap(response) {
  return response.data;
}

export function getAdminToken() {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  // 🎯 FIX: Check for invalid token values
  if (!token || token === 'null' || token === 'undefined' || token === '""') {
    return null;
  }
  return token;
}

export function setAdminToken(token) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

export function getCoachToken() {
  return localStorage.getItem(COACH_TOKEN_KEY);
}

export function setCoachToken(token) {
  localStorage.setItem(COACH_TOKEN_KEY, token);
}

export function clearCoachToken() {
  localStorage.removeItem(COACH_TOKEN_KEY);
}

export function getSuperAdminToken() {
  return localStorage.getItem(SUPER_ADMIN_TOKEN_KEY);
}

export function setSuperAdminToken(token) {
  localStorage.setItem(SUPER_ADMIN_TOKEN_KEY, token);
}

export function clearSuperAdminToken() {
  localStorage.removeItem(SUPER_ADMIN_TOKEN_KEY);
}

/* ==========================================
   🎯 NEW: AUTHENTICATED ACADEMY ADMIN WRAPPERS
   ========================================== */
export async function adminGet(path) {
  const token = getAdminToken();
  if (!token) {
    const error = new Error('Unauthorized: No valid academy admin token found');
    error.status = 401;
    return Promise.reject(error);
  }
  return api
    .get(path, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(unwrap);
}

export async function adminPost(path, body) {
  return api
    .post(path, body, {
      headers: { Authorization: `Bearer ${getAdminToken()}` }
    })
    .then(unwrap);
}

export async function adminPatch(path, body) {
  return api
    .patch(path, body, {
      headers: { Authorization: `Bearer ${getAdminToken()}` }
    })
    .then(unwrap);
}

export async function adminPut(path, body) {
  return api
    .put(path, body, {
      headers: { Authorization: `Bearer ${getAdminToken()}` }
    })
    .then(unwrap);
}

export async function adminDelete(path) {
  return api
    .delete(path, {
      headers: { Authorization: `Bearer ${getAdminToken()}` }
    })
    .then(unwrap);
}

/* ==========================================
   🎯 AUTH LOGIN / SIGNUP MODULES
   ========================================== */
export async function signup(body) {
  const response = await api.post('/auth/signup', body).then(unwrap);
  // Interceptor ke unwrap ke baad backend payload check
  const token = response?.token || response?.data?.token;
  if (token) {
    setAdminToken(token);
  }
  return response;
}

export async function adminLogin(body) {
  const response = await api.post('/auth/login', body).then(unwrap);
  const token = response?.token || response?.data?.token;
  if (token) {
    setAdminToken(token);
  }
  return response;
}

export async function coachLogin(body) {
  const response = await api.post('/auth/coach/login', body).then(unwrap);
  const token = response?.token || response?.data?.token;
  if (token) {
    setCoachToken(token);
  }
  return response;
}

export async function forgotPassword(body) {
  return api.post('/auth/forgot-password', body).then(unwrap);
}

export async function resetPassword(body) {
  return api.post('/auth/reset-password', body).then(unwrap);
}

/* ==========================================
   🎯 COACH AUTHENTICATED WRAPPERS
   ========================================== */
export async function coachGet(path) {
  return api
    .get(path, {
      headers: { Authorization: `Bearer ${getCoachToken()}` }
    })
    .then(unwrap);
}

export async function coachPost(path, body) {
  const headers = { Authorization: `Bearer ${getCoachToken()}` };
  if (!(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  return api.post(path, body, { headers }).then(unwrap);
}

/* ==========================================
   🎯 SUPER ADMIN AUTHENTICATED WRAPPERS
   ========================================== */
export async function superAdminLogin(body) {
  // 🎯 FIX: Controller `/super-admin/login` hit ho raha hai
  const response = await api.post('/super-admin/login', body).then(unwrap);
  
  // Interceptor se unwrapped data ko dynamic parse kar rahe hain
  const token = response?.token || response?.data?.token;
  if (token) {
    setSuperAdminToken(token);
  }
  return response;
}

export async function superAdminGet(path) {
  return api
    .get(path, {
      headers: { Authorization: `Bearer ${getSuperAdminToken()}` }
    })
    .then(unwrap);
}

export async function superAdminPost(path, body) {
  return api
    .post(path, body, {
      headers: { Authorization: `Bearer ${getSuperAdminToken()}` }
    })
    .then(unwrap);
}

export async function superAdminPatch(path, body) {
  return api
    .patch(path, body, {
      headers: { Authorization: `Bearer ${getSuperAdminToken()}` }
    })
    .then(unwrap);
}

export async function publicPost(path, body) {
  return api.post(path, body).then(unwrap);
}

/* ==========================================
   🎯 STATIC DESIGN CONSTANTS
   ========================================== */
export const TIMING_OPTIONS = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00'
];

export const PRICING_PLANS = [
  {
    id: 'free',
    name: 'Free Grassroots Pack',
    price: 0,
    coaches: 3,
    students: 30,
    featured: false,
    features: ['Smart batch scheduling tracking', 'Automated email notification systems', 'Standard portal access support']
  },
  {
    id: 'pro',
    name: 'Pro Academy Track',
    price: 79,
    coaches: 6,
    students: 80,
    featured: true,
    features: ['Advanced analytic dashboard data', 'Pending fee transaction metrics', 'Priority live support channels']
  },
  {
    id: 'plus',
    name: 'Plus Enterprise Level',
    price: 199,
    coaches: 'Unlimited',
    students: 'Unlimited',
    featured: false,
    features: ['Multi-branch sports architecture', 'Custom system API mappings', 'Dedicated customer success manager']
  }
];