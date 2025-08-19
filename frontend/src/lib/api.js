// API configuration for different environments
// Uses environment variables for production deployment
const API_BASE = import.meta.env.DEV 
  ? 'http://localhost:4000' 
  : (import.meta.env.VITE_API_URL || 'https://your-railway-backend-url.railway.app');

console.log('🌐 API Configuration:', {
  DEV: import.meta.env.DEV,
  PROD: import.meta.env.PROD,
  API_BASE,
  VITE_API_URL: import.meta.env.VITE_API_URL,
  NODE_ENV: import.meta.env.NODE_ENV
});

export async function apiFetch(path, { method = 'GET', body, token, headers: customHeaders } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  
  // Add custom headers if provided
  if (customHeaders) {
    Object.assign(headers, customHeaders);
  }
  
  // Add token to Authorization header if provided
  if (token) headers.Authorization = `Bearer ${token}`;
  
  const fullUrl = `${API_BASE}${path}`;
  console.log('🌐 API Call:', { method, url: fullUrl, hasToken: !!token, body });
  
  try {
    const res = await fetch(fullUrl, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include', // Include credentials for CORS
    });
    
    console.log('📡 Response status:', res.status, res.statusText);
    
    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const data = isJson ? await res.json() : await res.text();
    
    console.log('📊 Response data:', data);
    
    if (!res.ok) {
      const message = (isJson && data && data.message) || res.statusText || 'Request failed';
      const error = new Error(message);
      error.status = res.status;
      error.response = data;
      throw error;
    }
    return data;
  } catch (error) {
    console.error('❌ API Fetch Error:', error);
    throw error;
  }
}

export { API_BASE };




