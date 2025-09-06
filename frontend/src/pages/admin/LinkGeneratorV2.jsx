import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

const LinkGeneratorV2 = () => {
  const [destinationUrl, setDestinationUrl] = useState('');
  const [customShortCode, setCustomShortCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState(null);

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
          customShortCode: customShortCode || null,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setGeneratedLink(data.data);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🚀 Link Generator V2
          </h1>
          <p className="text-gray-600">
            Modern, fast link generation with advanced features
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Generation Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">⚡</span>
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
                  Custom Short Code (Optional)
                </label>
                <Input
                  placeholder="my-custom-code"
                  value={customShortCode}
                  onChange={(e) => setCustomShortCode(e.target.value)}
                  className="w-full"
                />
              </div>

              <Button
                onClick={handleGenerateLink}
                disabled={isGenerating || !destinationUrl}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
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
                  <span className="text-2xl">🔗</span>
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
                      value={generatedLink.shortLink || 'Generating...'}
                      readOnly
                      className="flex-1"
                    />
                    <Button
                      onClick={() => copyToClipboard(generatedLink.shortLink)}
                      className="px-4"
                    >
                      Copy
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Impact.com Tracking Link
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={generatedLink.impactLink || 'Generating...'}
                      readOnly
                      className="flex-1"
                    />
                    <Button
                      onClick={() => copyToClipboard(generatedLink.impactLink)}
                      className="px-4"
                    >
                      Copy
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Generation Time:</span>
                    <br />
                    <span className="text-green-600 font-mono">
                      {generatedLink.generationTime ? `${generatedLink.generationTime}ms` : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Method:</span>
                    <br />
                    <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                      {generatedLink.method || 'V2'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Status Message */}
        <div className="mt-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  V2 System Status
                </h3>
                <p className="text-gray-600 mb-4">
                  This is the new Link Generator V2 system with improved performance and features.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="font-medium text-green-800">✅ Independent</div>
                    <div className="text-green-600">Completely separate from V1</div>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="font-medium text-blue-800">⚡ Fast</div>
                    <div className="text-blue-600">Optimized for speed</div>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <div className="font-medium text-purple-800">🔧 Modern</div>
                    <div className="text-purple-600">Latest technology stack</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LinkGeneratorV2;