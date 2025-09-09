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

  const getStatusBadge = (brand) => {
    if (brand.impactProgramId) {
      return (
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
          ✅ Configured
        </span>
      );
    } else {
      return (
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
          ⚠️ Needs Setup
        </span>
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Available Brands</h1>
          <p className="text-gray-600 mt-1">
            Browse and discover brands available for link generation
          </p>
          <div className="mt-2 px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full inline-block">
            🔒 Secret Feature - Access via direct URL
          </div>
        </div>
        <div className="text-sm text-gray-500">
          {filteredAndSortedBrands.length} of {brands.length} brands
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="p-6">
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
              Configuration Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Brands</option>
              <option value="configured">Configured</option>
              <option value="unconfigured">Needs Setup</option>
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

      {/* Brands Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="text-gray-500">Loading brands...</div>
        </div>
      ) : filteredAndSortedBrands.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No brands found</h3>
          <p className="text-gray-600">
            {searchTerm || filterStatus !== 'all' 
              ? 'Try adjusting your search or filter criteria'
              : 'No brands are currently available'
            }
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedBrands.map((brand) => (
            <Card key={brand.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <span className="text-3xl mr-3">{brand.settings?.icon || '🏪'}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {brand.displayName}
                    </h3>
                    {brand.domain && (
                      <p className="text-sm text-gray-500">{brand.domain}</p>
                    )}
                  </div>
                </div>
                {getStatusBadge(brand)}
              </div>

              {brand.settings?.description && (
                <p className="text-sm text-gray-600 mb-4">
                  {brand.settings.description}
                </p>
              )}

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Program ID:</span>
                  <span className="font-mono text-gray-900">
                    {brand.impactProgramId || 'Not configured'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status:</span>
                  <span className={brand.isActive ? 'text-green-600' : 'text-red-600'}>
                    {brand.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <Button
                  onClick={() => window.location.href = '/link-generator'}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={!brand.impactProgramId}
                >
                  {brand.impactProgramId ? 'Generate Link' : 'Setup Required'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => window.location.href = '/link-generator'}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            🚀 Go to Link Generator
          </Button>
          <Button
            onClick={() => window.location.href = '/creator-v2'}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            🚀 Try V2 Link Generator
          </Button>
          <Button
            onClick={loadBrands}
            className="bg-gray-600 hover:bg-gray-700 text-white"
          >
            🔄 Refresh Brands
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Brands;
