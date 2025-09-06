import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/Tabs';
import { Copy, ExternalLink, BarChart3, Zap, Globe, Settings } from 'lucide-react';

const LinkGeneratorV2 = () => {
  const [destinationUrl, setDestinationUrl] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [customShortCode, setCustomShortCode] = useState('');
  const [generateQR, setGenerateQR] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState(null);
  const [brands, setBrands] = useState([]);
  const [userLinks, setUserLinks] = useState([]);
  const [performanceStats, setPerformanceStats] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [activeTab, setActiveTab] = useState('generate');

  // Load brands on component mount
  useEffect(() => {
    loadBrands();
    loadUserLinks();
    loadPerformanceStats();
    loadUserStats();
  }, []);

  const loadBrands = async () => {
    try {
      const response = await fetch('/api/v2/links/admin/brands');
      const data = await response.json();
      if (data.success) {
        setBrands(data.data);
      }
    } catch (error) {
      console.error('Error loading brands:', error);
    }
  };

  const loadUserLinks = async () => {
    try {
      const response = await fetch('/api/v2/links');
      const data = await response.json();
      if (data.success) {
        setUserLinks(data.data.links);
      }
    } catch (error) {
      console.error('Error loading user links:', error);
    }
  };

  const loadPerformanceStats = async () => {
    try {
      const response = await fetch('/api/v2/links/stats/performance');
      const data = await response.json();
      if (data.success) {
        setPerformanceStats(data.data);
      }
    } catch (error) {
      console.error('Error loading performance stats:', error);
    }
  };

  const loadUserStats = async () => {
    try {
      const response = await fetch('/api/v2/links/stats/user');
      const data = await response.json();
      if (data.success) {
        setUserStats(data.data);
      }
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  const handleGenerateLink = async () => {
    if (!destinationUrl) {
      alert('Please enter a destination URL');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/v2/links/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          destinationUrl,
          brandId: selectedBrand || null,
          customShortCode: customShortCode || null,
          generateQR
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setGeneratedLink(data.data);
        loadUserLinks(); // Refresh the links list
        loadUserStats(); // Refresh user stats
        loadPerformanceStats(); // Refresh performance stats
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Error generating link:', error);
      alert('Failed to generate link');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const formatTime = (ms) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🚀 Link Generator V2
          </h1>
          <p className="text-gray-600">
            Modern, fast link generation with multi-brand support and advanced analytics
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="generate" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Generate
            </TabsTrigger>
            <TabsTrigger value="links" className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              My Links
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Generate Tab */}
          <TabsContent value="generate" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Generation Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-purple-600" />
                    Generate New Link
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Destination URL *
                    </label>
                    <Input
                      type="url"
                      placeholder="https://example.com"
                      value={destinationUrl}
                      onChange={(e) => setDestinationUrl(e.target.value)}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Brand (Optional)
                    </label>
                    <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a brand" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Default</SelectItem>
                        {brands.map((brand) => (
                          <SelectItem key={brand.id} value={brand.id}>
                            {brand.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Custom Short Code (Optional)
                    </label>
                    <Input
                      placeholder="my-custom-code"
                      value={customShortCode}
                      onChange={(e) => setCustomShortCode(e.target.value)}
                      className="w-full"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="generateQR"
                      checked={generateQR}
                      onChange={(e) => setGenerateQR(e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="generateQR" className="text-sm font-medium text-gray-700">
                      Generate QR Code
                    </label>
                  </div>

                  <Button
                    onClick={handleGenerateLink}
                    disabled={isGenerating || !destinationUrl}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    {isGenerating ? 'Generating...' : 'Generate Link'}
                  </Button>
                </CardContent>
              </Card>

              {/* Generated Link Display */}
              {generatedLink && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ExternalLink className="w-5 h-5 text-green-600" />
                      Generated Link
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Short Link
                      </label>
                      <div className="flex gap-2">
                        <Input
                          value={generatedLink.shortLink}
                          readOnly
                          className="flex-1"
                        />
                        <Button
                          onClick={() => copyToClipboard(generatedLink.shortLink)}
                          size="sm"
                          variant="outline"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Impact.com Tracking Link
                      </label>
                      <div className="flex gap-2">
                        <Input
                          value={generatedLink.impactLink}
                          readOnly
                          className="flex-1"
                        />
                        <Button
                          onClick={() => copyToClipboard(generatedLink.impactLink)}
                          size="sm"
                          variant="outline"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Generation Time:</span>
                        <br />
                        <span className="text-green-600 font-mono">
                          {formatTime(generatedLink.generationTime)}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Method:</span>
                        <br />
                        <Badge variant="outline">
                          {generatedLink.method}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Links Tab */}
          <TabsContent value="links" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>My Generated Links</CardTitle>
              </CardHeader>
              <CardContent>
                {userLinks.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No links generated yet</p>
                ) : (
                  <div className="space-y-4">
                    {userLinks.map((link) => (
                      <div key={link.id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <a
                                href={link.shortLink.shortCode}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-blue-600 hover:underline"
                              >
                                {link.shortLink.shortCode}
                              </a>
                              <Badge variant="outline">
                                {link.brand?.displayName || 'Default'}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 truncate">
                              {link.destinationUrl}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              <span>👆 {link.shortLink.clicks} clicks</span>
                              <span>📅 {new Date(link.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => copyToClipboard(link.shortLink.shortCode)}
                              size="sm"
                              variant="outline"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Performance Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  {performanceStats ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Average Generation Time</p>
                          <p className="text-2xl font-bold text-green-600">
                            {formatTime(performanceStats.averageTime)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Success Rate</p>
                          <p className="text-2xl font-bold text-blue-600">
                            {performanceStats.successRate}%
                          </p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Generated</p>
                        <p className="text-xl font-semibold">
                          {performanceStats.totalGenerated} links
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500">No performance data available</p>
                  )}
                </CardContent>
              </Card>

              {/* User Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Your Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  {userStats ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Total Links</p>
                          <p className="text-2xl font-bold text-purple-600">
                            {userStats.totalLinks}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Total Clicks</p>
                          <p className="text-2xl font-bold text-orange-600">
                            {userStats.totalClicks}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500">No user data available</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>V2 Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Available Brands</h3>
                    {brands.length === 0 ? (
                      <p className="text-gray-500">No brands configured</p>
                    ) : (
                      <div className="space-y-2">
                        {brands.map((brand) => (
                          <div key={brand.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">{brand.displayName}</p>
                              <p className="text-sm text-gray-600">{brand.name}</p>
                            </div>
                            <Badge variant={brand.isActive ? "default" : "secondary"}>
                              {brand.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default LinkGeneratorV2;
