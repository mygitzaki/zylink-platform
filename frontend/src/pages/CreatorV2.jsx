import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../lib/api';

const CreatorV2 = () => {
  const { user, token } = useAuth();
  const [destinationUrl, setDestinationUrl] = useState('');
  const [generatedLink, setGeneratedLink] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [loadingBrands, setLoadingBrands] = useState(false);

  // Fetch available brands
  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      setLoadingBrands(true);
      const response = await apiFetch('/api/v2/links/admin/brands', {
        method: 'GET',
        token
      });
      
      if (response.success) {
        setBrands(response.data || []);
        console.log('📦 Available brands:', response.data);
      } else {
        console.error('❌ Failed to fetch brands:', response.message);
      }
    } catch (error) {
      console.error('❌ Error fetching brands:', error);
    } finally {
      setLoadingBrands(false);
    }
  };

  const handleGenerateLink = async (e) => {
    e.preventDefault();
    
    if (!destinationUrl.trim()) {
      setError('Please enter a destination URL');
      return;
    }

    setLoading(true);
    setError(null);
    setGeneratedLink(null);

    try {
      const response = await apiFetch('/api/v2/links/generate', {
        method: 'POST',
        body: JSON.stringify({
          destinationUrl: destinationUrl.trim(),
          brandId: selectedBrand?.id || null
        }),
        token
      });

      if (response.success) {
        setGeneratedLink(response.data);
        console.log('✅ V2 Link generated successfully:', response.data);
      } else {
        setError(response.message || 'Failed to generate link');
        console.error('❌ Link generation failed:', response.message);
      }
    } catch (error) {
      setError('Network error. Please try again.');
      console.error('❌ Network error:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                🚀 Link Generator V2
              </h1>
              <p className="text-gray-600">
                Next-generation link generation with enhanced features
              </p>
            </div>
            <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
              BETA
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Link Generation Form */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Generate New Link
            </h2>
            
            <form onSubmit={handleGenerateLink} className="space-y-4">
              {/* Brand Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Brand (Optional)
                </label>
                <select
                  value={selectedBrand?.id || ''}
                  onChange={(e) => {
                    const brand = brands.find(b => b.id === e.target.value);
                    setSelectedBrand(brand || null);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loadingBrands}
                >
                  <option value="">Auto-detect from URL</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.displayName || brand.name}
                    </option>
                  ))}
                </select>
                {loadingBrands && (
                  <p className="text-sm text-gray-500 mt-1">Loading brands...</p>
                )}
              </div>

              {/* URL Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Destination URL
                </label>
                <input
                  type="url"
                  value={destinationUrl}
                  onChange={(e) => setDestinationUrl(e.target.value)}
                  placeholder="https://example.com/product"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Generate Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Generating...' : 'Generate Link'}
              </button>
            </form>

            {/* Error Display */}
            {error && (
              <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}
          </div>

          {/* Generated Link Display */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Generated Link
            </h2>
            
            {generatedLink ? (
              <div className="space-y-4">
                {/* Short Link */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Short Link
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={generatedLink.shortUrl}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                    />
                    <button
                      onClick={() => copyToClipboard(generatedLink.shortUrl)}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                    >
                      {copySuccess ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* Long Link */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tracking Link
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={generatedLink.trackingUrl}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-xs"
                    />
                    <button
                      onClick={() => copyToClipboard(generatedLink.trackingUrl)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      {copySuccess ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* Link Info */}
                <div className="bg-gray-50 p-3 rounded-md">
                  <h3 className="font-medium text-gray-900 mb-2">Link Details</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><strong>Brand:</strong> {generatedLink.brandName || 'Auto-detected'}</p>
                    <p><strong>Created:</strong> {new Date(generatedLink.createdAt).toLocaleString()}</p>
                    <p><strong>Short Code:</strong> {generatedLink.shortCode}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <div className="text-4xl mb-2">🔗</div>
                <p>Generate a link to see it here</p>
              </div>
            )}
          </div>
        </div>

        {/* Features Info */}
        <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            V2 Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl mb-2">⚡</div>
              <h3 className="font-medium text-gray-900">Faster Generation</h3>
              <p className="text-sm text-gray-600">Optimized for speed</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl mb-2">🎯</div>
              <h3 className="font-medium text-gray-900">Auto-Detection</h3>
              <p className="text-sm text-gray-600">Smart brand detection</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl mb-2">🔧</div>
              <h3 className="font-medium text-gray-900">Enhanced Tracking</h3>
              <p className="text-sm text-gray-600">Better analytics</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatorV2;
