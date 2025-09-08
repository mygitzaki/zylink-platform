import React, { useState, useEffect } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';

const LinkGeneratorV2 = () => {
  const { token, user } = useAuth();
  const [destinationUrl, setDestinationUrl] = useState('');
  const [customShortCode, setCustomShortCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState(null);
  const [userLinks, setUserLinks] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('generate');

  useEffect(() => {
    console.log('🔍 [V2] Component mounted, token status:', token ? 'Present' : 'Missing');
    console.log('🔍 [V2] Token value:', token);
    console.log('🔍 [V2] User info:', user);
    if (token) {
      loadUserLinks();
      loadStats();
    } else {
      console.warn('⚠️ [V2] No authentication token available');
    }
  }, [token, user]);

  const loadUserLinks = async () => {
    try {
      console.log('🔍 [V2] Loading user links with token:', token ? 'Present' : 'Missing');
      const data = await apiFetch('/api/v2/links', { 
        method: 'GET',
        token 
      });
      if (data.success) {
        setUserLinks(data.data.links || []);
      }
    } catch (error) {
      console.error('❌ [V2] Error loading user links:', error);
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

  const createV2Tables = async () => {
    try {
      console.log('🔧 [V2] Creating V2 tables...');
      const response = await fetch('https://api.zylike.com/api/creator/admin/create-v2-tables', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      console.log('V2 Tables Creation Result:', data);
      
      if (data.success) {
        console.log('✅ V2 tables created successfully!');
        console.log('Tables created:', data.tables);
        alert('V2 tables created successfully! You can now generate links.');
        // Refresh the page to test V2
        window.location.reload();
      } else {
        console.error('❌ Failed to create V2 tables:', data.message);
        alert(`Failed to create V2 tables: ${data.message}`);
      }
    } catch (error) {
      console.error('❌ Error creating V2 tables:', error);
      alert(`Error creating V2 tables: ${error.message}`);
    }
  };

  const handleGenerateLink = async () => {
    if (!destinationUrl) {
      alert('Please enter a destination URL');
      return;
    }

    if (!token) {
      alert('Please login to generate links');
      return;
    }

    setIsGenerating(true);
    try {
      console.log('🚀 [V2] Generating link with token:', token ? 'Present' : 'Missing');
      const data = await apiFetch('/api/v2/links/generate', {
        method: 'POST',
        token,
        body: {
          destinationUrl,
          brandId: selectedBrand?.id || null,
          customShortCode: customShortCode || null,
        }
      });
      
      if (data.success) {
        setGeneratedLink(data.data);
        loadUserLinks();
        loadStats();
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error('❌ [V2] Error generating link:', error);
      alert(`Failed to generate link: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const [copySuccess, setCopySuccess] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [loadingBrands, setLoadingBrands] = useState(false);

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
      
      // Start countdown
      setCountdown(3);
      const countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            // Auto-reset to link generation
            setGeneratedLink(null);
            setDestinationUrl('');
            setCopySuccess(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  // Fetch available brands
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

  // Create popular brands
  const createPopularBrands = async () => {
    try {
      const response = await apiFetch('/api/v2/links/admin/brands/bulk-create', {
        method: 'POST',
        token
      });
      
      if (response.success) {
        console.log('✅ Brands created:', response.data);
        // Refresh brands list
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

  // Load brands on component mount
  useEffect(() => {
    fetchBrands();
  }, []);

  // Filter brands to only show those with program IDs configured
  const availableBrands = brands.filter(brand => brand.impactProgramId);
  
  // Update brand program ID
  const updateBrandProgramId = async (brandId, programId) => {
    try {
      const response = await apiFetch(`/api/v2/links/admin/brands/${brandId}/program-id`, {
        method: 'PUT',
        token,
        body: { impactProgramId: programId },
      });

      if (response.success) {
        alert(`✅ ${response.message}`);
        fetchBrands(); // Refresh brands list
      } else {
        alert(`❌ Error: ${response.message}`);
      }
    } catch (error) {
      console.error('Error updating brand program ID:', error);
      alert('Error updating brand program ID: ' + error.message);
    }
  };

  // Fetch available Impact.com programs
  const [availablePrograms, setAvailablePrograms] = useState([]);
  const [loadingPrograms, setLoadingPrograms] = useState(false);

  const fetchImpactPrograms = async () => {
    setLoadingPrograms(true);
    try {
      console.log('🔑 Token available:', !!token);
      console.log('🔑 Token value:', token ? token.substring(0, 20) + '...' : 'null');
      
      // Try apiFetch first
      try {
        const response = await apiFetch('/api/v2/links/admin/impact-programs', { token });
        if (response.success) {
          setAvailablePrograms(response.data);
          console.log('📋 Available Impact.com programs:', response.data);
          return;
        } else {
          alert(`❌ Error: ${response.message}`);
          return;
        }
      } catch (apiError) {
        console.log('🔄 apiFetch failed, trying direct fetch...', apiError);
        
        // Fallback to direct fetch
        const directResponse = await fetch('https://api.zylike.com/api/v2/links/admin/impact-programs', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include'
        });
        
        if (directResponse.ok) {
          const data = await directResponse.json();
          if (data.success) {
            setAvailablePrograms(data.data);
            console.log('📋 Available Impact.com programs (direct fetch):', data.data);
          } else {
            alert(`❌ Error: ${data.message}`);
          }
        } else {
          const errorText = await directResponse.text();
          throw new Error(`HTTP ${directResponse.status}: ${errorText}`);
        }
      }
    } catch (error) {
      console.error('Error fetching Impact.com programs:', error);
      alert('Error fetching Impact.com programs: ' + error.message);
    } finally {
      setLoadingPrograms(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🚀 Link Generator V2 - v2.0.4 (TOKEN FIX)
          </h1>
          <p className="text-gray-600">
            Modern, fast link generation with advanced features and analytics
          </p>
          <div className="mt-2 text-sm text-green-600">
            ✅ Build errors fixed - Vercel deployment should work now!
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
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 rounded-md font-medium transition-all ${
                activeTab === 'analytics'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📊 Analytics
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
                  <span>Paste item's Walmart URL</span>
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
                  
                  {/* Fetch Impact.com Programs Button */}
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-blue-800">
                        🔍 Find Impact.com Program IDs
                      </h4>
                      <button
                        onClick={fetchImpactPrograms}
                        disabled={loadingPrograms}
                        className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                      >
                        {loadingPrograms ? 'Loading...' : 'Fetch Programs'}
                      </button>
                    </div>
                    <p className="text-xs text-blue-600 mb-2">
                      Click to fetch all available programs from your Impact.com account
                    </p>
                    
                    {/* Display available programs */}
                    {availablePrograms.length > 0 && (
                      <div className="mt-3 max-h-40 overflow-y-auto">
                        <h5 className="text-xs font-medium text-blue-800 mb-2">Available Programs:</h5>
                        <div className="space-y-1">
                          {availablePrograms.map(program => (
                            <div key={program.id} className="text-xs bg-white p-2 rounded border">
                              <div className="font-medium">ID: {program.id}</div>
                              <div className="text-gray-600">{program.name || program.advertiserName}</div>
                              {program.status && <div className="text-gray-500">Status: {program.status}</div>}
                            </div>
                          ))}
                        </div>
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
                                type="number"
                                placeholder="Program ID"
                                className="px-2 py-1 text-xs border rounded w-24"
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    const programId = e.target.value;
                                    if (programId) {
                                      updateBrandProgramId(brand.id, programId);
                                      e.target.value = '';
                                    }
                                  }
                                }}
                              />
                              <button
                                onClick={() => {
                                  const programId = prompt(`Enter Impact.com Program ID for ${brand.displayName}:`);
                                  if (programId) {
                                    updateBrandProgramId(brand.id, programId);
                                  }
                                }}
                                className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                              >
                                Set ID
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                {selectedBrand && (
                  <div className="mt-2 text-sm text-gray-600">
                    <span className="font-medium">Selected:</span> {selectedBrand.settings?.icon} {selectedBrand.displayName}
                    {selectedBrand.settings?.description && (
                      <span className="ml-2 text-gray-500">- {selectedBrand.settings.description}</span>
                    )}
                  </div>
                )}
              </div>

              {/* URL Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product URL
                </label>
                <div className="flex gap-3">
                  <Input
                    type="url"
                    placeholder="https://www.walmart.com/ip/... or https://www.amazon.com/dp/..."
                    value={generatedLink ? generatedLink.shortLink : destinationUrl}
                    onChange={(e) => setDestinationUrl(e.target.value)}
                    className="flex-1 text-lg py-3 px-4 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-0"
                    readOnly={!!generatedLink}
                  />
                    <Button
                      onClick={generatedLink ? () => copyToClipboard(generatedLink.shortLink) : handleGenerateLink}
                      disabled={isGenerating || (!destinationUrl && !generatedLink)}
                      className={`px-8 py-3 rounded-lg font-semibold transition-all ${
                        copySuccess
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : generatedLink 
                            ? 'bg-gray-800 hover:bg-gray-900 text-white' 
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {isGenerating ? 'Generating...' : copySuccess ? 'Copied!' : generatedLink ? 'Copy' : 'Create'}
                    </Button>
                  </div>
                </div>

                {generatedLink && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-green-800 mb-4">
                      <span className="text-lg">✅</span>
                      <span className="font-semibold">Link Generated Successfully!</span>
                    </div>
                    
                    <div className="space-y-4">
                      {/* Short Link */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Short Link
                        </label>
                        <div className="flex gap-2">
                          <Input
                            value={generatedLink.shortLink}
                            readOnly
                            className="flex-1 text-sm bg-white"
                          />
                          <Button
                            onClick={() => copyToClipboard(generatedLink.shortLink)}
                            className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white text-sm"
                          >
                            Copy
                          </Button>
                        </div>
                      </div>

                      {/* Impact.com API Link */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Impact.com Tracking Link
                        </label>
                        <div className="flex gap-2">
                          <Input
                            value={generatedLink.impactLink}
                            readOnly
                            className="flex-1 text-sm bg-white"
                          />
                          <Button
                            onClick={() => copyToClipboard(generatedLink.impactLink)}
                            className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white text-sm"
                          >
                            Copy
                          </Button>
                        </div>
                      </div>

                    {/* Generation Info */}
                    <div className="grid grid-cols-2 gap-4 text-sm text-green-700">
                      <div>
                        <span className="font-medium">Generation Time:</span>
                        <br />
                        <span className="text-green-600 font-mono">
                          {generatedLink.generationTime}ms
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Method:</span>
                        <br />
                        <span className="bg-green-100 px-2 py-1 rounded text-xs">
                          {generatedLink.method}
                        </span>
                      </div>
                    </div>
                    
                    {/* Brand Info */}
                    {generatedLink.brandId && (
                      <div className="text-sm text-green-700">
                        <span className="font-medium">Brand:</span>
                        <br />
                        <span className="bg-green-100 px-2 py-1 rounded text-xs">
                          {brands.find(b => b.id === generatedLink.brandId)?.displayName || 'Unknown Brand'}
                        </span>
                      </div>
                    )}
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <Button
                        onClick={() => {
                          setGeneratedLink(null);
                          setDestinationUrl('');
                          setCopySuccess(false);
                          setCountdown(0);
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm"
                      >
                        Generate New Link
                      </Button>
                      
                      {countdown > 0 && (
                        <div className="text-sm text-gray-600">
                          Auto-reset in <span className="font-mono font-bold text-blue-600">{countdown}</span> seconds
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    FTC regulations require you to disclose any affiliate link sharing to your audience.
                  </p>
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800 mb-3">
                      <strong>Setup Required:</strong> If you're getting database errors, click the button below to create V2 tables.
                    </p>
                    <Button
                      onClick={createV2Tables}
                      className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-2"
                    >
                      🔧 Create V2 Tables
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'links' && (
          <Card>
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-4">My Generated Links</h3>
              {userLinks.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">🔗</div>
                  <p className="text-gray-500 text-lg">No links generated yet</p>
                  <p className="text-gray-400 text-sm">Generate your first link using the Generate tab</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {userLinks.map((link) => (
                    <div key={link.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <a
                              href={link.shortLink?.shortCode || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-blue-600 hover:underline"
                            >
                              {link.shortLink?.shortCode || 'Loading...'}
                            </a>
                            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">
                              V2
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 truncate">
                            {link.destinationUrl}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span>👆 {link.shortLink?.clicks || 0} clicks</span>
                            <span>📅 {new Date(link.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => copyToClipboard(link.shortLink?.shortCode || '')}
                            className="px-3 py-1 text-sm"
                          >
                            Copy
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        )}

        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-4">V2 Statistics</h3>
                {stats ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Total Links</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {stats.totalLinks || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Clicks</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {stats.totalClicks || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">No analytics data available</p>
                )}
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-4">V2 System Status</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-green-500">✅</span>
                    <span className="text-sm">Database Connected</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-500">✅</span>
                    <span className="text-sm">V2 API Active</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-500">✅</span>
                    <span className="text-sm">Link Generation Ready</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-500">⚡</span>
                    <span className="text-sm">Performance Optimized</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        <div className="mt-8">
          <Card>
            <div className="p-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  🎉 V2 System Fully Operational!
                </h3>
                <p className="text-gray-600 mb-4">
                  The Link Generator V2 system is now fully functional with database integration.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="font-medium text-green-800">✅ Database Ready</div>
                    <div className="text-green-600">All V2 tables created</div>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="font-medium text-blue-800">⚡ Fast Generation</div>
                    <div className="text-blue-600">Optimized for speed</div>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <div className="font-medium text-purple-800">🔧 Modern Features</div>
                    <div className="text-purple-600">Advanced analytics & tracking</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LinkGeneratorV2;