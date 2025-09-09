import React, { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { apiFetch } from '../lib/api';
import { useAuth } from '../hooks/useAuth';

const Brands = () => {
  const { token, user } = useAuth();
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, configured, unconfigured
  const [sortBy, setSortBy] = useState('name'); // name, programId, created

  useEffect(() => {
    if (token) {
      loadBrands();
    }
  }, [token]);

  const loadBrands = async () => {
    setLoading(true);
    try {
      const response = await apiFetch('/api/v2/links/creator/brands', { token });
      if (response.success) {
        setBrands(response.data || []);
      }
    } catch (error) {
      console.error('Error loading brands:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedBrands = brands
    .filter(brand => {
      // Search filter
      const matchesSearch = brand.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (brand.domain && brand.domain.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Status filter
      const hasProgramId = !!brand.impactProgramId;
      const matchesStatus = filterStatus === 'all' || 
                           (filterStatus === 'configured' && hasProgramId) ||
                           (filterStatus === 'unconfigured' && !hasProgramId);
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.displayName.localeCompare(b.displayName);
        case 'programId':
          return (a.impactProgramId || '').localeCompare(b.impactProgramId || '');
        case 'created':
          return new Date(b.createdAt) - new Date(a.createdAt);
        default:
          return 0;
      }
    });

  const getBrandUrl = (brand) => {
    if (brand.domain) {
      // Add https:// if not present
      const domain = brand.domain.startsWith('http') ? brand.domain : `https://${brand.domain}`;
      return domain;
    }
    // Fallback to common brand URLs based on name
    const name = brand.displayName.toLowerCase();
    if (name.includes('amazon')) return 'https://amazon.com';
    if (name.includes('walmart')) return 'https://walmart.com';
    if (name.includes('target')) return 'https://target.com';
    if (name.includes('best buy')) return 'https://bestbuy.com';
    if (name.includes('home depot')) return 'https://homedepot.com';
    if (name.includes('lowes')) return 'https://lowes.com';
    if (name.includes('macy')) return 'https://macys.com';
    if (name.includes('nordstrom')) return 'https://nordstrom.com';
    if (name.includes('costco')) return 'https://costco.com';
    if (name.includes('sam')) return 'https://samsclub.com';
    return null;
  };

  const handleBrandClick = (brand) => {
    const url = getBrandUrl(brand);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const getStatusBadge = (brand) => {
    if (brand.impactProgramId) {
      return (
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
          ✅ Ready
        </span>
      );
    } else {
      return (
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
          ⚠️ Setup Needed
        </span>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Discover Brands
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            Click on any brand to visit their website
          </p>
          <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 text-sm rounded-full">
            🔒 Secret Feature - Access via direct URL
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-8">
          <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Brands
                </label>
                <Input
                  type="text"
                  placeholder="Search by name or domain..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Brands</option>
                  <option value="configured">Ready</option>
                  <option value="unconfigured">Setup Needed</option>
                </select>
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="name">Name (A-Z)</option>
                  <option value="programId">Program ID</option>
                  <option value="created">Recently Added</option>
                </select>
              </div>
            </div>
          </Card>
        </div>

        {/* Stats */}
        <div className="mb-8 text-center">
          <p className="text-gray-600">
            Showing <span className="font-semibold text-blue-600">{filteredAndSortedBrands.length}</span> of{' '}
            <span className="font-semibold text-gray-900">{brands.length}</span> brands
          </p>
        </div>

        {/* Brands Grid */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-500">Loading brands...</p>
          </div>
        ) : filteredAndSortedBrands.length === 0 ? (
          <Card className="p-20 text-center bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <div className="text-8xl mb-6">🔍</div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">No brands found</h3>
            <p className="text-gray-600 text-lg">
              {searchTerm || filterStatus !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'No brands are currently available'
              }
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAndSortedBrands.map((brand) => {
              const brandUrl = getBrandUrl(brand);
              return (
                <Card 
                  key={brand.id} 
                  className={`group cursor-pointer transition-all duration-300 transform hover:scale-105 hover:shadow-2xl ${
                    brandUrl ? 'hover:bg-gradient-to-br hover:from-blue-50 hover:to-purple-50' : 'opacity-60 cursor-not-allowed'
                  } bg-white/90 backdrop-blur-sm border-0 shadow-lg`}
                  onClick={() => brandUrl && handleBrandClick(brand)}
                >
                  <div className="p-6">
                    {/* Brand Icon and Name */}
                    <div className="text-center mb-4">
                      <div className="text-6xl mb-3 group-hover:scale-110 transition-transform duration-300">
                        {brand.settings?.icon || '🏪'}
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {brand.displayName}
                      </h3>
                      {brand.domain && (
                        <p className="text-sm text-gray-500 mt-1">{brand.domain}</p>
                      )}
                    </div>

                    {/* Description */}
                    {brand.settings?.description && (
                      <p className="text-sm text-gray-600 text-center mb-4 line-clamp-2">
                        {brand.settings.description}
                      </p>
                    )}

                    {/* Status Badge */}
                    <div className="flex justify-center mb-4">
                      {getStatusBadge(brand)}
                    </div>

                    {/* Click to Visit */}
                    {brandUrl ? (
                      <div className="text-center">
                        <div className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-full group-hover:bg-blue-700 transition-colors">
                          <span className="mr-2">🌐</span>
                          Visit Website
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="inline-flex items-center px-4 py-2 bg-gray-400 text-white text-sm font-medium rounded-full">
                          <span className="mr-2">❌</span>
                          No URL Available
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-12 text-center">
          <Card className="p-8 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <h3 className="text-2xl font-semibold text-gray-900 mb-6">Quick Actions</h3>
            <div className="flex flex-wrap justify-center gap-4">
              <Button
                onClick={() => window.location.href = '/link-generator'}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-3 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
              >
                🚀 Link Generator
              </Button>
              <Button
                onClick={() => window.location.href = '/creator-v2'}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-8 py-3 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
              >
                🚀 V2 Generator
              </Button>
              <Button
                onClick={loadBrands}
                className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white px-8 py-3 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
              >
                🔄 Refresh
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Brands;
