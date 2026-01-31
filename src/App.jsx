import React, { useState, useEffect } from 'react';

const App = () => {
  const [apiKey, setApiKey] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [agentInfo, setAgentInfo] = useState(null);
  const [submolts, setSubmolts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Registration state
  const [showRegister, setShowRegister] = useState(false);
  const [registerName, setRegisterName] = useState('');
  const [registerDesc, setRegisterDesc] = useState('');
  const [registrationResult, setRegistrationResult] = useState(null);
  const [registerError, setRegisterError] = useState({ field: null, message: '' });
  
  // Post state
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postSubmolt, setPostSubmolt] = useState('general');
  const [postUrl, setPostUrl] = useState('');
  const [postType, setPostType] = useState('text');

  const BASE_URL = 'https://www.moltbook.com/api/v1';

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const fetchAgentInfo = async (key) => {
    try {
      const res = await fetch(`${BASE_URL}/agents/me`, {
        headers: { 'Authorization': `Bearer ${key}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAgentInfo(data.agent || data);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  };

  const fetchSubmolts = async (key) => {
    try {
      const res = await fetch(`${BASE_URL}/submolts`, {
        headers: { 'Authorization': `Bearer ${key}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSubmolts(data.submolts || data.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch submolts');
    }
  };

  const handleLogin = async () => {
    if (!apiKey.trim()) {
      showMessage('error', 'Please enter your API key');
      return;
    }
    setLoading(true);
    const success = await fetchAgentInfo(apiKey);
    if (success) {
      setIsAuthenticated(true);
      await fetchSubmolts(apiKey);
      showMessage('success', 'Logged in successfully! 🦞');
    } else {
      showMessage('error', 'Invalid API key. Make sure to include the full key starting with "moltbook_"');
    }
    setLoading(false);
  };

  const handleRegister = async () => {
    setRegisterError({ field: null, message: '' });

    if (!registerName.trim()) {
      setRegisterError({ field: 'name', message: 'Please enter an agent name' });
      return;
    }
    setLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(`${BASE_URL}/agents/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: registerName,
          description: registerDesc || `A friendly molty named ${registerName}`
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      let data;
      try {
        data = await res.json();
      } catch {
        showMessage('error', 'Invalid response from server');
        setLoading(false);
        return;
      }

      if (res.ok && data.agent) {
        setRegistrationResult(data);
        showMessage('success', 'Registration successful! Save your API key!');
      } else if (res.status === 409) {
        setRegisterError({
          field: 'name',
          message: `The name "${registerName}" is already taken. Please choose a different name.`
        });
      } else if (res.status === 400) {
        const errorMsg = data.error || 'Invalid input';
        if (errorMsg.toLowerCase().includes('name')) {
          setRegisterError({ field: 'name', message: errorMsg });
        } else if (errorMsg.toLowerCase().includes('description')) {
          setRegisterError({ field: 'description', message: errorMsg });
        } else {
          showMessage('error', errorMsg);
        }
      } else {
        showMessage('error', data.error || 'Registration failed');
      }
    } catch (e) {
      if (e.name === 'AbortError') {
        showMessage('error', 'Request timed out. Please try again.');
      } else {
        showMessage('error', 'Network error during registration');
      }
    }
    setLoading(false);
  };

  const handlePost = async () => {
    if (!postTitle.trim()) {
      showMessage('error', 'Please enter a title');
      return;
    }
    if (postType === 'text' && !postContent.trim()) {
      showMessage('error', 'Please enter content for your post');
      return;
    }
    if (postType === 'link' && !postUrl.trim()) {
      showMessage('error', 'Please enter a URL for your link post');
      return;
    }

    setLoading(true);
    try {
      const body = {
        submolt: postSubmolt,
        title: postTitle,
      };
      if (postType === 'text') {
        body.content = postContent;
      } else {
        body.url = postUrl;
      }

      const res = await fetch(`${BASE_URL}/posts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      
      if (res.ok && data.success !== false) {
        showMessage('success', '🦞 Post published successfully!');
        setPostTitle('');
        setPostContent('');
        setPostUrl('');
      } else if (res.status === 429) {
        showMessage('error', `Rate limited. Try again in ${data.retry_after_minutes || 30} minutes.`);
      } else {
        showMessage('error', data.error || data.hint || 'Failed to create post');
      }
    } catch (e) {
      showMessage('error', 'Network error while posting');
    }
    setLoading(false);
  };

  const handleLogout = () => {
    setApiKey('');
    setIsAuthenticated(false);
    setAgentInfo(null);
    setSubmolts([]);
    setRegistrationResult(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-amber-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-2">🦞</div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
            MeatBook
          </h1>
          <p className="text-gray-600 mt-2">Post to Moltbook — the social network for AI agents</p>
        </div>

        {/* Message Toast */}
        {message.text && (
          <div className={`mb-4 p-4 rounded-xl shadow-lg ${
            message.type === 'success' 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {!isAuthenticated ? (
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-orange-100">
            {!showRegister && !registrationResult ? (
              <>
                <h2 className="text-xl font-semibold mb-4 text-gray-800">Login with API Key</h2>
                <input
                  type="password"
                  placeholder="moltbook_xxx..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl mb-4 focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none"
                />
                <button
                  onClick={handleLogin}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 rounded-xl font-semibold hover:from-orange-600 hover:to-red-600 transition-all disabled:opacity-50 shadow-lg"
                >
                  {loading ? 'Logging in...' : 'Login 🦞'}
                </button>
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <p className="text-gray-600 text-sm mb-3">Don't have an account?</p>
                  <button
                    onClick={() => setShowRegister(true)}
                    className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-all"
                  >
                    Register New Agent
                  </button>
                </div>
              </>
            ) : registrationResult ? (
              <div className="text-center">
                <div className="text-5xl mb-4">🎉</div>
                <h2 className="text-xl font-semibold mb-4 text-green-700">Registration Successful!</h2>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                  <p className="text-amber-800 font-semibold mb-2">⚠️ Save your API key immediately!</p>
                  <code className="block bg-white p-3 rounded-lg text-sm break-all border border-amber-200">
                    {registrationResult.agent.api_key}
                  </code>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                  <p className="text-blue-800 mb-2">Share this link with your human to claim your agent:</p>
                  <a 
                    href={registrationResult.agent.claim_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 underline break-all text-sm"
                  >
                    {registrationResult.agent.claim_url}
                  </a>
                </div>
                <p className="text-gray-600 text-sm mb-4">
                  Verification code: <strong>{registrationResult.agent.verification_code}</strong>
                </p>
                <button
                  onClick={() => {
                    setApiKey(registrationResult.agent.api_key);
                    setRegistrationResult(null);
                    setShowRegister(false);
                  }}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 rounded-xl font-semibold hover:from-orange-600 hover:to-red-600 transition-all shadow-lg"
                >
                  Continue to Login
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => setShowRegister(false)}
                  className="text-gray-500 hover:text-gray-700 mb-4"
                >
                  ← Back to Login
                </button>
                <h2 className="text-xl font-semibold mb-4 text-gray-800">Register New Agent</h2>
                <div className="mb-3">
                  <input
                    type="text"
                    placeholder="Agent name (e.g., ClaudeHelper)"
                    value={registerName}
                    onChange={(e) => {
                      setRegisterName(e.target.value);
                      if (registerError.field === 'name') {
                        setRegisterError({ field: null, message: '' });
                      }
                    }}
                    className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none ${
                      registerError.field === 'name'
                        ? 'border-red-400 bg-red-50'
                        : 'border-gray-200'
                    }`}
                  />
                  {registerError.field === 'name' && (
                    <p className="mt-1 text-sm text-red-600">{registerError.message}</p>
                  )}
                </div>
                <div className="mb-4">
                  <textarea
                    placeholder="Description (optional)"
                    value={registerDesc}
                    onChange={(e) => {
                      setRegisterDesc(e.target.value);
                      if (registerError.field === 'description') {
                        setRegisterError({ field: null, message: '' });
                      }
                    }}
                    rows={3}
                    className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none resize-none ${
                      registerError.field === 'description'
                        ? 'border-red-400 bg-red-50'
                        : 'border-gray-200'
                    }`}
                  />
                  {registerError.field === 'description' && (
                    <p className="mt-1 text-sm text-red-600">{registerError.message}</p>
                  )}
                </div>
                <button
                  onClick={handleRegister}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 rounded-xl font-semibold hover:from-orange-600 hover:to-red-600 transition-all disabled:opacity-50 shadow-lg"
                >
                  {loading ? 'Registering...' : 'Register 🦞'}
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Agent Info */}
            <div className="bg-white rounded-2xl shadow-xl p-4 mb-4 border border-orange-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-400 rounded-full flex items-center justify-center text-white text-xl">
                    🦞
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{agentInfo?.name || 'Agent'}</p>
                    <p className="text-sm text-gray-500">{agentInfo?.karma || 0} karma</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-gray-500 hover:text-red-500 transition-colors text-sm"
                >
                  Logout
                </button>
              </div>
            </div>

            {/* Create Post */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-orange-100">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Create a Post</h2>
              
              {/* Post Type Toggle */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setPostType('text')}
                  className={`flex-1 py-2 rounded-xl font-medium transition-all ${
                    postType === 'text'
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  📝 Text Post
                </button>
                <button
                  onClick={() => setPostType('link')}
                  className={`flex-1 py-2 rounded-xl font-medium transition-all ${
                    postType === 'link'
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  🔗 Link Post
                </button>
              </div>

              {/* Submolt Select */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Submolt</label>
                <select
                  value={postSubmolt}
                  onChange={(e) => setPostSubmolt(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none bg-white"
                >
                  <option value="general">m/general</option>
                  {submolts.filter(s => s.name !== 'general').map(s => (
                    <option key={s.name} value={s.name}>m/{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  placeholder="An interesting title..."
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none"
                />
              </div>

              {/* Content or URL based on post type */}
              {postType === 'text' ? (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                  <textarea
                    placeholder="What's on your mind?"
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    rows={5}
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none resize-none"
                  />
                </div>
              ) : (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={postUrl}
                    onChange={(e) => setPostUrl(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none"
                  />
                </div>
              )}

              <button
                onClick={handlePost}
                disabled={loading}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 rounded-xl font-semibold hover:from-orange-600 hover:to-red-600 transition-all disabled:opacity-50 shadow-lg"
              >
                {loading ? 'Posting...' : 'Post to Moltbook 🦞'}
              </button>

              <p className="text-xs text-gray-500 mt-3 text-center">
                Note: You can only post once every 30 minutes
              </p>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="text-center mt-6 text-gray-500 text-sm">
          <a 
            href="https://www.moltbook.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-orange-500 transition-colors"
          >
            Visit moltbook.com →
          </a>
        </div>
      </div>
    </div>
  );
};

export default App;
