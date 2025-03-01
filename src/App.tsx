import React, { useState } from 'react';
import { Newspaper, Loader2, ExternalLink, Copy, Check, AlertCircle } from 'lucide-react';
import { summarizeArticle } from './services/openai';

function App() {
  const [url, setUrl] = useState('');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url) {
      setError('Please enter a URL');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSummary('');
      
      // Call the OpenAI API to summarize the article
      const result = await summarizeArticle(url);
      setSummary(result);
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to summarize article. Please check the URL and try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <Newspaper className="h-10 w-10 text-indigo-600 mr-2" />
            <h1 className="text-3xl font-bold text-gray-800">ArticleSummarizer</h1>
          </div>
          <p className="text-gray-600 max-w-xl mx-auto">
            Enter any article URL below and get a concise, easy-to-read summary in seconds.
          </p>
        </header>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <form onSubmit={handleSubmit} className="mb-6">
            <div className="mb-4">
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
                Article URL
              </label>
              <input
                type="url"
                id="url"
                placeholder="https://example.com/article"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
              />
            </div>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg transition flex items-center justify-center disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5 mr-2" />
                  Summarizing...
                </>
              ) : (
                'Summarize Article'
              )}
            </button>
          </form>

          {summary && (
            <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Summary</h2>
                <div className="flex space-x-2">
                  <button
                    onClick={copyToClipboard}
                    className="text-gray-500 hover:text-indigo-600 p-1 rounded transition"
                    title="Copy to clipboard"
                  >
                    {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                  </button>
                  {url && (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-500 hover:text-indigo-600 p-1 rounded transition"
                      title="Open original article"
                    >
                      <ExternalLink className="h-5 w-5" />
                    </a>
                  )}
                </div>
              </div>
              <div className="prose prose-indigo max-w-none">
                {summary.split('\n\n').map((paragraph, index) => (
                  <div key={index} className="mb-4">
                    {paragraph.startsWith('**Title:**') ? (
                      <h3 className="text-xl font-bold mb-2">
                        {paragraph.replace('**Title:** ', '')}
                      </h3>
                    ) : (
                      <div>
                        {paragraph.split('\n').map((line, lineIndex) => (
                          <div key={lineIndex} className="mb-1">
                            {line.startsWith('- ') ? (
                              <div className="flex">
                                <span className="mr-2">•</span>
                                <span 
                                  dangerouslySetInnerHTML={{ 
                                    __html: line
                                      .substring(2)
                                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
                                  }} 
                                />
                              </div>
                            ) : (
                              <span 
                                dangerouslySetInnerHTML={{ 
                                  __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
                                }} 
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <footer className="text-center text-gray-500 text-sm">
          <p>
            Powered by OpenAI. Enter a valid URL to an article to generate a summary.
          </p>
          <p className="mt-1">
            Note: For best results, use URLs to articles from major news sites or blogs.
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;