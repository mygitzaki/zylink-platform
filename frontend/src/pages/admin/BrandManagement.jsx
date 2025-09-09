import React, { useState, useEffect } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';

const BrandManagement = () => {
  const { token, user } = useAuth();
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedBrands, setSelectedBrands] = useState(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [formData, setFormData] = useState({
    displayName: '',
    domain: '',
    impactProgramId: '',
    isActive: true,
    isVisibleToCreators: true,
    settings: {
      icon: '🏪',
      description: '',
      color: '#3B82F6'
    }
  });

  useEffect(() => {
    if (token) {
      loadBrands();
    }
  }, [token]);

  const loadBrands = async () => {
    setLoading(true);
    try {
      const response = await apiFetch('/api/v2/links/admin/brands', { token });
      if (response.success) {
        setBrands(response.data || []);
      }
    } catch (error) {
      console.error('Error loading brands:', error);
    } finally {
      setLoading(false);
    }
  };

  // Bulk selection functions
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedBrands(new Set(brands.map(brand => brand.id)));
    } else {
      setSelectedBrands(new Set());
    }
  };

  const handleSelectBrand = (brandId, checked) => {
    const newSelected = new Set(selectedBrands);
    if (checked) {
      newSelected.add(brandId);
    } else {
      newSelected.delete(brandId);
    }
    setSelectedBrands(newSelected);
  };

  const isAllSelected = selectedBrands.size === brands.length && brands.length > 0;
  const isIndeterminate = selectedBrands.size > 0 && selectedBrands.size < brands.length;

  // Bulk visibility toggle
  const handleBulkVisibilityToggle = async (isVisible) => {
    if (selectedBrands.size === 0) return;

    setBulkActionLoading(true);
    try {
      const promises = Array.from(selectedBrands).map(brandId => {
        const brand = brands.find(b => b.id === brandId);
        if (!brand) return Promise.resolve();

        return apiFetch(`/api/v2/links/admin/brands/${brandId}`, {
          method: 'PUT',
          token,
          body: {
            displayName: brand.displayName,
            domain: brand.customDomain,
            impactProgramId: brand.impactProgramId,
            isActive: brand.isActive,
            isVisibleToCreators: isVisible,
            settings: {
              ...brand.settings,
              isVisibleToCreators: isVisible
            }
          }
        });
      });

      await Promise.all(promises);
      
      // Refresh the brands list
      await loadBrands();
      setSelectedBrands(new Set());
      
      alert(`Successfully updated ${selectedBrands.size} brand(s) visibility to ${isVisible ? 'Visible' : 'Hidden'}`);
    } catch (error) {
      console.error('Error updating brand visibility:', error);
      alert('Error updating brand visibility. Please try again.');
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedBrands.size === 0) return;

    if (!confirm(`Are you sure you want to delete ${selectedBrands.size} brand(s)? This action cannot be undone.`)) {
      return;
    }

    setBulkActionLoading(true);
    try {
      const promises = Array.from(selectedBrands).map(brandId => 
        apiFetch(`/api/v2/links/admin/brands/${brandId}`, {
          method: 'DELETE',
          token
        })
      );

      await Promise.all(promises);
      
      // Refresh the brands list
      await loadBrands();
      setSelectedBrands(new Set());
      
      alert(`Successfully deleted ${selectedBrands.size} brand(s)`);
    } catch (error) {
      console.error('Error deleting brands:', error);
      alert('Error deleting brands. Please try again.');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleCreateBrand = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await apiFetch('/api/v2/links/admin/brands', {
        method: 'POST',
        token,
        body: formData
      });
      
      if (response.success) {
        setShowCreateForm(false);
        setFormData({
          displayName: '',
          domain: '',
          impactProgramId: '',
          isActive: true,
          isVisibleToCreators: true,
          settings: {
            icon: '🏪',
            description: '',
            color: '#3B82F6'
          }
        });
        loadBrands();
      }
    } catch (error) {
      console.error('Error creating brand:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBrand = async (e) => {
    e.preventDefault();
    console.log('🔄 Updating brand:', editingBrand.id, formData);
    setLoading(true);
    try {
      const response = await apiFetch(`/api/v2/links/admin/brands/${editingBrand.id}`, {
        method: 'PUT',
        token,
        body: formData
      });
      
      console.log('📡 Update response:', response);
      
      if (response.success) {
        console.log('✅ Brand updated successfully');
        setEditingBrand(null);
        setFormData({
          displayName: '',
          domain: '',
          impactProgramId: '',
          isActive: true,
          isVisibleToCreators: true,
          settings: {
            icon: '🏪',
            description: '',
            color: '#3B82F6'
          }
        });
        loadBrands();
      } else {
        console.error('❌ Update failed:', response.message);
        alert(`Update failed: ${response.message}`);
      }
    } catch (error) {
      console.error('❌ Error updating brand:', error);
      alert(`Error updating brand: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBrand = async (brandId) => {
    if (!confirm('Are you sure you want to delete this brand? This action cannot be undone.')) {
      return;
    }
    
    setLoading(true);
    try {
      const response = await apiFetch(`/api/v2/links/admin/brands/${brandId}`, {
        method: 'DELETE',
        token
      });
      
      if (response.success) {
        loadBrands();
      }
    } catch (error) {
      console.error('Error deleting brand:', error);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (brand) => {
    console.log('🔧 Starting edit for brand:', brand);
    setEditingBrand(brand);
    setShowCreateForm(false); // Make sure create form is closed
    setFormData({
      displayName: brand.displayName || '',
      domain: brand.domain || '',
      impactProgramId: brand.impactProgramId || '',
      isActive: brand.isActive !== false,
      isVisibleToCreators: brand.isVisibleToCreators !== false,
      settings: {
        icon: brand.settings?.icon || '🏪',
        description: brand.settings?.description || '',
        color: brand.settings?.color || '#3B82F6'
      }
    });
    console.log('🔧 Form data set:', {
      displayName: brand.displayName || '',
      domain: brand.domain || '',
      impactProgramId: brand.impactProgramId || '',
      isActive: brand.isActive !== false,
      isVisibleToCreators: brand.isVisibleToCreators !== false
    });
  };

  const cancelEdit = () => {
    setEditingBrand(null);
    setShowCreateForm(false);
    setFormData({
      displayName: '',
      domain: '',
      impactProgramId: '',
      isActive: true,
      isVisibleToCreators: true,
      settings: {
        icon: '🏪',
        description: '',
        color: '#3B82F6'
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Brand Management</h1>
        <Button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          + Add New Brand
        </Button>
      </div>

      {/* Create/Edit Form */}
      {(showCreateForm || editingBrand) && (
        <Card className="p-6 border-2 border-blue-200 bg-blue-50">
          <h2 className="text-xl font-semibold mb-4 text-blue-800">
            {editingBrand ? `Edit Brand: ${editingBrand.displayName}` : 'Create New Brand'}
          </h2>
          {editingBrand && (
            <div className="mb-4 p-3 bg-blue-100 rounded-lg">
              <p className="text-sm text-blue-700">
                Editing brand ID: {editingBrand.id}
              </p>
            </div>
          )}
          <form onSubmit={editingBrand ? handleUpdateBrand : handleCreateBrand} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Brand Name *
                </label>
                <Input
                  value={formData.displayName}
                  onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                  placeholder="e.g., Amazon, Walmart, Target"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Domain
                </label>
                <Input
                  value={formData.domain}
                  onChange={(e) => setFormData({...formData, domain: e.target.value})}
                  placeholder="e.g., amazon.com, walmart.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Program ID
                </label>
                <Input
                  value={formData.impactProgramId}
                  onChange={(e) => setFormData({...formData, impactProgramId: e.target.value})}
                  placeholder="e.g., 12345"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Icon
                </label>
                <Input
                  value={formData.settings.icon}
                  onChange={(e) => setFormData({
                    ...formData, 
                    settings: {...formData.settings, icon: e.target.value}
                  })}
                  placeholder="🏪"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <Input
                  value={formData.settings.description}
                  onChange={(e) => setFormData({
                    ...formData, 
                    settings: {...formData.settings, description: e.target.value}
                  })}
                  placeholder="Brief description of the brand"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color
                </label>
                <Input
                  type="color"
                  value={formData.settings.color}
                  onChange={(e) => setFormData({
                    ...formData, 
                    settings: {...formData.settings, color: e.target.value}
                  })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Active</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isVisibleToCreators}
                  onChange={(e) => setFormData({...formData, isVisibleToCreators: e.target.checked})}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Visible to Creators</span>
              </label>
            </div>

            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? 'Saving...' : (editingBrand ? 'Update Brand' : 'Create Brand')}
              </Button>
              <Button
                type="button"
                onClick={cancelEdit}
                className="bg-gray-500 hover:bg-gray-600 text-white"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Brands List */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">All Brands ({brands.length})</h2>
          {selectedBrands.size > 0 && (
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600">
                {selectedBrands.size} selected
              </span>
              <div className="flex space-x-2">
                <Button
                  onClick={() => handleBulkVisibilityToggle(true)}
                  disabled={bulkActionLoading}
                  className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1"
                >
                  {bulkActionLoading ? 'Updating...' : 'Make Visible'}
                </Button>
                <Button
                  onClick={() => handleBulkVisibilityToggle(false)}
                  disabled={bulkActionLoading}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white text-sm px-3 py-1"
                >
                  {bulkActionLoading ? 'Updating...' : 'Make Hidden'}
                </Button>
                <Button
                  onClick={handleBulkDelete}
                  disabled={bulkActionLoading}
                  className="bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1"
                >
                  {bulkActionLoading ? 'Deleting...' : 'Delete Selected'}
                </Button>
                <Button
                  onClick={() => setSelectedBrands(new Set())}
                  className="bg-gray-500 hover:bg-gray-600 text-white text-sm px-3 py-1"
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          )}
        </div>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="text-gray-500">Loading brands...</div>
          </div>
        ) : brands.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-500">No brands found</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={input => {
                        if (input) input.indeterminate = isIndeterminate;
                      }}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Brand
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Domain
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Program ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Visibility
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {brands.map((brand) => (
                  <tr key={brand.id} className={`hover:bg-gray-50 ${selectedBrands.has(brand.id) ? 'bg-blue-50' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedBrands.has(brand.id)}
                        onChange={(e) => handleSelectBrand(brand.id, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">{brand.settings?.icon || '🏪'}</span>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {brand.displayName}
                          </div>
                          {brand.settings?.description && (
                            <div className="text-sm text-gray-500">
                              {brand.settings.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {brand.customDomain || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {brand.impactProgramId || (
                        <span className="text-red-500">Not configured</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        brand.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {brand.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        brand.settings?.isVisibleToCreators !== false
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {brand.settings?.isVisibleToCreators !== false ? 'Visible' : 'Hidden'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => startEdit(brand)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteBrand(brand.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default BrandManagement;
