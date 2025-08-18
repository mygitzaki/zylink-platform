// Use production API URL directly for deployment
const API_BASE = import.meta.env.VITE_API_URL || 
                 (import.meta.env.PROD ? 'https://zylike-creator-platform-production.up.railway.app' : 'http://localhost:4000');

export async function apiFetch(path, { method = 'GET', body, token, headers: customHeaders } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  
  // Add custom headers if provided
  if (customHeaders) {
    Object.assign(headers, customHeaders);
  }
  
  // Add token to Authorization header if provided
  if (token) headers.Authorization = `Bearer ${token}`;
  
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const data = isJson ? await res.json() : await res.text();
  if (!res.ok) {
    const message = (isJson && data && data.message) || res.statusText || 'Request failed';
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }
  return data;
}

export { API_BASE };




