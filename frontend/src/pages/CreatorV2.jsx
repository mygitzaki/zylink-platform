import React, { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
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
      const response = await apiFetch('/api/v2/links/creator/brands', { token });
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
      const response = await apiFetch('/api/v2/links/creator/brands/bulk-create', {
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
      
      // For creators, we'll use auto-configure instead of full discovery
      const response = await apiFetch('/api/v2/links/creator/brands/auto-configure', {
        method: 'POST',
        token
      });
      
      if (response.success) {
        setDiscoveryResults(response.data);
        console.log('✅ Brand auto-configuration completed:', response.data);
        
        await fetchBrands();
        
        alert(`🎉 Brand Auto-Configuration Complete!\n\n` +
              `📊 Summary:\n` +
              `• ${response.data.configured.length} brands configured\n` +
              `• ${response.data.errors.length} brands failed\n\n` +
              `Total: ${response.data.configured.length + response.data.errors.length} brands processed`);
      } else {
        alert(`❌ Brand auto-configuration failed: ${response.message}`);
      }
    } catch (error) {
      console.error('❌ Error in brand auto-configuration:', error);
      alert('❌ Error in brand auto-configuration: ' + error.message);
    } finally {
      setDiscovering(false);
    }
  };

  const autoConfigureAllBrands = async () => {
    setAutoConfiguring(true);
    try {
      const response = await apiFetch('/api/v2/links/creator/brands/auto-configure', {
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
        body: {
          destinationUrl: destinationUrl.trim(),
          brandId: selectedBrand?.id || null,
          customShortCode: customShortCode || null
        },
        token
      });

      if (response.success) {
        setGeneratedLink(response.data);
        console.log('✅ V2 Link generated successfully:', response.data);
        
        // Refresh user links and stats
        loadUserLinks();
        loadStats();
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

  // Show all brands, but mark those without program IDs
  const availableBrands = brands.filter(brand => brand.isActive !== false);

  // Fetch available affiliate programs
  const [availablePrograms, setAvailablePrograms] = useState([]);

  const fetchImpactPrograms = async () => {
    setLoadingPrograms(true);
    try {
      console.log('🔑 Token available:', !!token);
      console.log('🔑 Token value:', token ? token.substring(0, 20) + '...' : 'null');
      
      const response = await apiFetch('/api/v2/links/creator/impact-programs', { token });
      if (response.success) {
        setAvailablePrograms(response.data);
        console.log('📋 Available affiliate programs:', response.data);
        
        // Log program IDs for easy reference
        console.log('🔢 Program IDs for easy reference:');
        response.data.forEach((program, index) => {
          console.log(`${index + 1}. ${program.name || program.advertiserName}: ID = ${program.id || 'N/A'}`);
        });
      } else {
        alert(`❌ Error: ${response.message}`);
      }
    } catch (error) {
      console.error('Error fetching affiliate programs:', error);
      alert('Error fetching affiliate programs: ' + error.message);
    } finally {
      setLoadingPrograms(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🚀 Link Generator V2 - Creator Edition
          </h1>
          <p className="text-gray-600">
            Modern, fast link generation with advanced features and analytics
          </p>
          <div className="mt-2 text-sm text-green-600">
            ✅ Creator V2 - Full admin functionality available!
          </div>
        </div>

        <div className="mb-6">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
            <button
              onClick={() => setActiveTab('generate')}
              className={`px-4 py-2 rounded-md font-medium transition-all ${
                activeTab === 'generate'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              ⚡ Generate
            </button>
            <button
              onClick={() => setActiveTab('links')}
              className={`px-4 py-2 rounded-md font-medium transition-all ${
                activeTab === 'links'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🔗 My Links
            </button>
            <button
              onClick={() => setActiveTab('brands')}
              className={`px-4 py-2 rounded-md font-medium transition-all ${
                activeTab === 'brands'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🏪 Brand Management
            </button>
          </div>
        </div>

        {activeTab === 'generate' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Create an affiliate link
                </h2>
                <div className="flex items-center justify-center gap-2 text-gray-600">
                  <span>Paste any product URL</span>
                  <div className="w-4 h-4 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-xs text-gray-600">i</span>
                  </div>
                </div>
              </div>

            <div className="space-y-6">
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
                        {!brand.impactProgramId && ' (Needs Program ID)'}
                      </option>
                    ))}
                  </select>
                  {brands.length === 0 && (
                    <Button
                      onClick={createPopularBrands}
                      className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm"
                    >
                      Setup Brands
                    </Button>
                  )}
                </div>
                
                  {/* Debug Info */}
                  <div className="mt-2 text-xs text-gray-500">
                    Brands loaded: {brands.length} | Available: {availableBrands.length} | Selected: {selectedBrand?.displayName || 'None'} | Loading: {loadingBrands ? 'Yes' : 'No'}
                  </div>
                  
                  {/* Fetch Affiliate Programs Button */}
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-blue-800">
                        🔍 Find Program IDs
                      </h4>
                      <div className="flex gap-2">
                        <button
                          onClick={fetchImpactPrograms}
                          disabled={loadingPrograms}
                          className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                        >
                          {loadingPrograms ? 'Loading...' : 'Fetch Programs'}
                        </button>
                        <button
                          onClick={autoConfigureAllBrands}
                          disabled={autoConfiguring || loadingPrograms}
                          className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                        >
                          {autoConfiguring ? 'Auto-Configuring...' : 'Auto-Configure All'}
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-blue-600 mb-2">
                      Use this to find program IDs for brand configuration
                    </p>
                    {availablePrograms.length > 0 && (
                      <div className="text-xs text-gray-600 max-h-32 overflow-y-auto">
                        <strong>Available Programs:</strong>
                        {availablePrograms.slice(0, 10).map((program, index) => (
                          <div key={index} className="flex justify-between">
                            <span>{program.name || program.advertiserName}</span>
                            <span className="font-mono">{program.id}</span>
                          </div>
                        ))}
                        {availablePrograms.length > 10 && (
                          <div className="text-gray-500">... and {availablePrograms.length - 10} more</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Brands without program IDs */}
                  {brands.filter(brand => !brand.impactProgramId).length > 0 && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <h4 className="text-sm font-medium text-yellow-800 mb-2">
                        ⚠️ Brands Need Program ID Configuration
                      </h4>
                      <div className="space-y-2">
                        {brands.filter(brand => !brand.impactProgramId).map(brand => (
                          <div key={brand.id} className="flex items-center justify-between bg-white p-2 rounded border">
                            <span className="text-sm">
                              {brand.settings?.icon} {brand.displayName}
                            </span>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="Program ID"
                                className="text-xs px-2 py-1 border rounded w-24"
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    const programId = e.target.value;
                                    if (programId) {
                                      // updateBrandProgramId(brand.id, programId);
                                      e.target.value = '';
                                    }
                                  }
                                }}
                              />
                              <button
                                onClick={() => {
                                  const programId = prompt(`Enter Program ID for ${brand.displayName}:`);
                                  if (programId) {
                                    // updateBrandProgramId(brand.id, programId);
                                  }
                                }}
                                className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                              >
                                Set
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* URL Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Destination URL
                  </label>
                  <Input
                    type="url"
                    value={destinationUrl}
                    onChange={(e) => setDestinationUrl(e.target.value)}
                    placeholder="https://example.com/product"
                    disabled={!!generatedLink}
                    className="w-full"
                  />
                </div>

                {/* Custom Short Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Short Code (Optional)
                  </label>
                  <Input
                    type="text"
                    value={customShortCode}
                    onChange={(e) => setCustomShortCode(e.target.value)}
                    placeholder="my-custom-code"
                    disabled={!!generatedLink}
                    className="w-full"
                  />
                </div>

                {/* Generate Button */}
                <Button
                  onClick={handleGenerateLink}
                  disabled={loading || !!generatedLink || !destinationUrl}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3"
                >
                  {loading ? 'Generating...' : 'Generate Link'}
                </Button>

                {/* Error Display */}
                {error && (
                  <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                    {error}
                  </div>
                )}

                {/* Generated Link Display */}
                {generatedLink && (
                  <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h3 className="text-lg font-semibold text-green-800 mb-3">✅ Link Generated Successfully!</h3>
                    

                    <div className="space-y-3">
                      {/* Short Link */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Short Link
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={generatedLink.shortLink || ''}
                            readOnly
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
                          />
                          <Button
                            onClick={() => copyToClipboard(generatedLink.shortLink)}
                            className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm"
                          >
                            {copySuccess ? 'Copied!' : 'Copy'}
                          </Button>
                        </div>
                      </div>

                      {/* Long Link */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Tracking Link
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={generatedLink.impactLink || ''}
                            readOnly
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-xs"
                          />
                          <Button
                            onClick={() => copyToClipboard(generatedLink.impactLink)}
                            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm"
                          >
                            {copySuccess ? 'Copied!' : 'Copy'}
                          </Button>
                        </div>
                      </div>

                      {/* Link Info */}
                      <div className="bg-white p-3 rounded border">
                        <h4 className="font-medium text-gray-900 mb-2 text-sm">Link Details</h4>
                        <div className="text-xs text-gray-600 space-y-1">
                          <p><strong>Brand:</strong> {generatedLink.brandName || 'Auto-detected'}</p>
                          <p><strong>Created:</strong> {new Date(generatedLink.createdAt).toLocaleString()}</p>
                          <p><strong>Short Code:</strong> {generatedLink.shortCode}</p>
                        </div>
                      </div>

                      {/* Generate New Link Button */}
                      <div className="pt-4 border-t border-green-200">
                        <Button
                          onClick={() => {
                            setGeneratedLink(null);
                            setDestinationUrl('');
                            setCustomShortCode('');
                            setSelectedBrand(null);
                            setError(null);
                          }}
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2"
                        >
                          Generate New Link
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'links' && (
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                My V2 Links ({userLinks.length})
              </h2>
              
              {userLinks.length > 0 ? (
                <div className="space-y-4">
                  {userLinks.map((link) => (
                    <div key={link.id} className="bg-gray-50 p-4 rounded-lg border">
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
                          <Button
                            onClick={() => copyToClipboard(link.shortUrl)}
                            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            Copy
                          </Button>
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
            </Card>
          </div>
        )}

        {activeTab === 'brands' && (
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Brand Management
                </h2>
                <div className="flex gap-2">
                  <Button
                    onClick={createPopularBrands}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >
                    Create Popular Brands
                  </Button>
                  <Button
                    onClick={discoverBrands}
                    disabled={discovering}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
                  >
                    {discovering ? 'Discovering...' : 'Auto-Discover All Brands'}
                  </Button>
                  <Button
                    onClick={autoConfigureAllBrands}
                    disabled={autoConfiguring}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm"
                  >
                    {autoConfiguring ? 'Configuring...' : 'Auto-Configure All'}
                  </Button>
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
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreatorV2;
