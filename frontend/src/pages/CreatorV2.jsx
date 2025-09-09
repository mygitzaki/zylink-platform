import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../lib/api';

const CreatorV2 = () => {
  const { user, token } = useAuth();
  const [destinationUrl, setDestinationUrl] = useState('');
  const [customShortCode, setCustomShortCode] = useState('');
  const [generatedLink, setGeneratedLink] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [userLinks, setUserLinks] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('generate');
  const [discovering, setDiscovering] = useState(false);
  const [discoveryResults, setDiscoveryResults] = useState(null);
  const [autoConfiguring, setAutoConfiguring] = useState(false);
  const [loadingPrograms, setLoadingPrograms] = useState(false);

  // Load data on component mount
  useEffect(() => {
    if (token) {
      fetchBrands();
      loadUserLinks();
      loadStats();
    }
  }, [token]);

  const fetchBrands = async () => {
    setLoadingBrands(true);
    try {
      console.log('🔍 Fetching brands...');
      const response = await apiFetch('/api/v2/links/admin/brands', { token });
      console.log('📊 Brands response:', response);
      if (response.success) {
        setBrands(response.data || []);
        console.log('✅ Brands loaded:', response.data?.length || 0);
      } else {
        console.error('❌ Failed to fetch brands:', response.message);
      }
    } catch (error) {
      console.error('❌ Error fetching brands:', error);
    } finally {
      setLoadingBrands(false);
    }
  };

  const loadUserLinks = async () => {
    try {
      console.log('🔍 Loading user links...');
      const data = await apiFetch('/api/v2/links', { 
        method: 'GET',
        token 
      });
      if (data.success) {
        setUserLinks(data.data.links || []);
      }
    } catch (error) {
      console.error('❌ Error loading user links:', error);
    }
  };

  const loadStats = async () => {
    try {
      const data = await apiFetch('/api/v2/links/stats/user', { 
        method: 'GET',
        token 
      });
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  // Brand management functions
  const createPopularBrands = async () => {
    try {
      const response = await apiFetch('/api/v2/links/admin/brands/bulk-create', {
        method: 'POST',
        token
      });
      
      if (response.success) {
        console.log('✅ Brands created:', response.data);
        await fetchBrands();
        alert(`Successfully created ${response.data.created.length} brands!`);
      } else {
        console.error('Failed to create brands:', response.message);
        alert('Failed to create brands: ' + response.message);
      }
    } catch (error) {
      console.error('Error creating brands:', error);
      alert('Error creating brands: ' + error.message);
    }
  };

  const discoverBrands = async () => {
    setDiscovering(true);
    setDiscoveryResults(null);
    try {
      console.log('🚀 Starting brand discovery...');
      
      const response = await apiFetch('/api/v2/links/admin/brands/discover', {
        method: 'POST',
        token
      });
      
      if (response.success) {
        setDiscoveryResults(response.data);
        console.log('✅ Brand discovery completed:', response.data);
        
        await fetchBrands();
        
        alert(`🎉 Brand Discovery Complete!\n\n` +
              `📊 Summary:\n` +
              `• ${response.data.summary.created} new brands created\n` +
              `• ${response.data.summary.updated} brands updated\n` +
              `• ${response.data.summary.skipped} brands skipped\n` +
              `• ${response.data.summary.failed} failed\n\n` +
              `Total: ${response.data.processed} brands processed`);
      } else {
        alert(`❌ Brand discovery failed: ${response.message}`);
      }
    } catch (error) {
      console.error('❌ Error in brand discovery:', error);
      alert('❌ Error in brand discovery: ' + error.message);
    } finally {
      setDiscovering(false);
    }
  };

  const autoConfigureAllBrands = async () => {
    setAutoConfiguring(true);
    try {
      const response = await apiFetch('/api/v2/links/admin/brands/auto-configure', {
        method: 'POST',
        token
      });
      
      if (response.success) {
        const { configured, errors } = response.data;
        
        let message = `✅ Auto-configured ${configured.length} brands:\n\n`;
        configured.forEach(item => {
          message += `• ${item.brand} → Program ID ${item.programId} (${item.programName})\n`;
        });
        
        if (errors.length > 0) {
          message += `\n⚠️ ${errors.length} brands not configured:\n`;
          errors.forEach(item => {
            message += `• ${item.brand}: ${item.reason}\n`;
          });
        }
        
        alert(message);
        fetchBrands();
      } else {
        alert(`❌ Error: ${response.message}`);
      }
    } catch (error) {
      console.error('Error auto-configuring brands:', error);
      alert('Error auto-configuring brands: ' + error.message);
    } finally {
      setAutoConfiguring(false);
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
          brandId: selectedBrand?.id || null,
          customShortCode: customShortCode || null
        }),
        token
      });

      if (response.success) {
        setGeneratedLink(response.data);
        console.log('✅ V2 Link generated successfully:', response.data);
        
        // Start countdown and refresh data
        setCountdown(3);
        const countdownInterval = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              clearInterval(countdownInterval);
              setGeneratedLink(null);
              setDestinationUrl('');
              setCustomShortCode('');
              setSelectedBrand(null);
              loadUserLinks();
              loadStats();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
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

  // Filter brands to only show those with program IDs configured
  const availableBrands = brands.filter(brand => brand.impactProgramId);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
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
            <div className="flex gap-2">
              <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                BETA
              </div>
              {stats && (
                <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                  {stats.totalLinks} Links
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('generate')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'generate'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Generate Link
              </button>
              <button
                onClick={() => setActiveTab('links')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'links'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                My Links ({userLinks.length})
              </button>
              <button
                onClick={() => setActiveTab('brands')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'brands'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Brand Management
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Generate Tab */}
            {activeTab === 'generate' && (
              <div className="space-y-6">
                {/* Link Generation Form */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                      Generate New Link
                    </h2>
                    
                    <form onSubmit={handleGenerateLink} className="space-y-4">
                      {/* Brand Selection */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select Brand (Optional)
                        </label>
                        <div className="flex gap-3">
                          <select
                            value={selectedBrand?.id || ''}
                            onChange={(e) => {
                              console.log('🔄 Brand selection changed:', e.target.value);
                              const brand = availableBrands.find(b => b.id === e.target.value);
                              console.log('🎯 Selected brand:', brand);
                              setSelectedBrand(brand || null);
                            }}
                            className="flex-1 py-3 px-4 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-0 bg-white"
                            disabled={!!generatedLink}
                          >
                            <option value="">Auto-detect from URL</option>
                            {availableBrands.map((brand) => (
                              <option key={brand.id} value={brand.id}>
                                {brand.settings?.icon || '🏪'} {brand.displayName}
                              </option>
                            ))}
                          </select>
                          {brands.length === 0 && (
                            <button
                              type="button"
                              onClick={createPopularBrands}
                              className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg"
                            >
                              Setup Brands
                            </button>
                          )}
                        </div>
                        
                        {/* Debug Info */}
                        <div className="mt-2 text-xs text-gray-500">
                          Brands loaded: {brands.length} | Available: {availableBrands.length} | Selected: {selectedBrand?.displayName || 'None'} | Loading: {loadingBrands ? 'Yes' : 'No'}
                        </div>
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
                          className="w-full py-3 px-4 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-0"
                          required
                          disabled={!!generatedLink}
                        />
                      </div>

                      {/* Custom Short Code */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Custom Short Code (Optional)
                        </label>
                        <input
                          type="text"
                          value={customShortCode}
                          onChange={(e) => setCustomShortCode(e.target.value)}
                          placeholder="my-custom-code"
                          className="w-full py-3 px-4 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-0"
                          disabled={!!generatedLink}
                        />
                      </div>

                      {/* Generate Button */}
                      <button
                        type="submit"
                        disabled={loading || !!generatedLink}
                        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                      Generated Link
                    </h2>
                    
                    {generatedLink ? (
                      <div className="space-y-4">
                        {/* Countdown */}
                        {countdown > 0 && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                            <div className="text-2xl font-bold text-blue-600 mb-2">
                              {countdown}
                            </div>
                            <p className="text-blue-800">Returning to generation in {countdown} seconds...</p>
                          </div>
                        )}

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
              </div>
            )}

            {/* Links Tab */}
            {activeTab === 'links' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  My V2 Links ({userLinks.length})
                </h2>
                
                {userLinks.length > 0 ? (
                  <div className="space-y-4">
                    {userLinks.map((link) => (
                      <div key={link.id} className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-medium text-gray-900">
                                {link.brandName || 'Unknown Brand'}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(link.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 mb-2">
                              <div>Short: <code className="bg-white px-1 rounded">{link.shortUrl}</code></div>
                              <div className="truncate">Original: {link.destinationUrl}</div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => copyToClipboard(link.shortUrl)}
                              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              Copy
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <div className="text-4xl mb-2">📝</div>
                    <p>No links generated yet</p>
                  </div>
                )}
              </div>
            )}

            {/* Brands Tab */}
            {activeTab === 'brands' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Brand Management
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={createPopularBrands}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      Create Popular Brands
                    </button>
                    <button
                      onClick={discoverBrands}
                      disabled={discovering}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
                    >
                      {discovering ? 'Discovering...' : 'Auto-Discover All Brands'}
                    </button>
                    <button
                      onClick={autoConfigureAllBrands}
                      disabled={autoConfiguring}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm"
                    >
                      {autoConfiguring ? 'Configuring...' : 'Auto-Configure All'}
                    </button>
                  </div>
                </div>

                {/* Brands List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {brands.map((brand) => (
                    <div key={brand.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{brand.settings?.icon || '🏪'}</span>
                        <div>
                          <h3 className="font-medium text-gray-900">{brand.displayName}</h3>
                          <p className="text-sm text-gray-500">{brand.name}</p>
                        </div>
                      </div>
                      <div className="text-xs text-gray-600">
                        <p>Program ID: {brand.impactProgramId || 'Not configured'}</p>
                        <p>Status: {brand.impactProgramId ? '✅ Ready' : '⚠️ Needs setup'}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {brands.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <div className="text-4xl mb-2">🏪</div>
                    <p>No brands configured yet</p>
                    <p className="text-sm">Click "Create Popular Brands" to get started</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatorV2;
