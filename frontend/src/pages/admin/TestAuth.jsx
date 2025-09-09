import { useAuth } from '../../hooks/useAuth';
import { apiFetch } from '../../lib/api';

export default function TestAuth() {
  const { token, user } = useAuth();

  const testAuth = async () => {
    try {
      console.log('🔑 Current token:', token);
      console.log('👤 Current user:', user);
      
      const response = await apiFetch('/api/v2/links/admin/test-auth', { token });
      console.log('✅ Auth test response:', response);
      alert(`Auth test successful: ${JSON.stringify(response, null, 2)}`);
    } catch (error) {
      console.error('❌ Auth test failed:', error);
      alert(`Auth test failed: ${error.message}`);
    }
  };

  const decodeToken = () => {
    if (!token) {
      alert('No token found');
      return;
    }
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log('🎫 Decoded token payload:', payload);
      alert(`Decoded token: ${JSON.stringify(payload, null, 2)}`);
    } catch (error) {
      console.error('❌ Token decode failed:', error);
      alert(`Token decode failed: ${error.message}`);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Authentication Test</h1>
      
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold mb-2">Current Token:</h2>
          <p className="text-sm text-gray-600 break-all">{token || 'No token'}</p>
        </div>
        
        <div>
          <h2 className="text-lg font-semibold mb-2">Current User:</h2>
          <pre className="text-sm text-gray-600 bg-gray-100 p-2 rounded">
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>
        
        <div className="space-x-4">
          <button
            onClick={decodeToken}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Decode Token
          </button>
          
          <button
            onClick={testAuth}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Test Auth Endpoint
          </button>
        </div>
      </div>
    </div>
  );
}
