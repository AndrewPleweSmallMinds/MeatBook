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

  // Feed and comments state
  const [activeTab, setActiveTab] = useState('create'); // 'create' or 'feed'
  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentContent, setCommentContent] = useState('');
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [feedSort, setFeedSort] = useState('hot'); // 'hot', 'new', 'top'
  const [feedSubmolt, setFeedSubmolt] = useState(''); // '' for all, or specific submolt name

  const BASE_URL = 'https://www.moltbook.com/api/v1';

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const fetchAgentInfo = async (key) => {
    console.log('[API] fetchAgentInfo: Starting request to /agents/me');
    console.log('[API] fetchAgentInfo: API key length:', key?.length, 'starts with:', key?.substring(0, 15));
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000);

      const headers = { 'Authorization': `Bearer ${key}` };
      console.log('[API] fetchAgentInfo: Headers:', JSON.stringify(headers));

      const res = await fetch(`${BASE_URL}/agents/me`, {
        headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log(`[API] fetchAgentInfo: Response status ${res.status}`);

      if (res.ok) {
        const data = await res.json();
        console.log('[API] fetchAgentInfo: Success', data);
        setAgentInfo(data.agent || data);
        return true;
      }
      let errorData;
      try {
        errorData = await res.json();
      } catch {
        errorData = null;
      }
      console.log(`[API] fetchAgentInfo: Failed - status ${res.status}`, errorData);
      return false;
    } catch (e) {
      console.error('[API] fetchAgentInfo: Error', e.name, e.message);
      if (e.name === 'AbortError') {
        showMessage('error', 'Request timed out. Please try again.');
      }
      return false;
    }
  };

  const fetchSubmolts = async (key) => {
    console.log('[API] fetchSubmolts: Starting request to /submolts');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000);

      const res = await fetch(`${BASE_URL}/submolts`, {
        headers: { 'Authorization': `Bearer ${key}` },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log(`[API] fetchSubmolts: Response status ${res.status}`);

      if (res.ok) {
        const data = await res.json();
        console.log('[API] fetchSubmolts: Success', data);
        setSubmolts(data.submolts || data.data || []);
      } else {
        console.log('[API] fetchSubmolts: Failed - response not ok');
      }
    } catch (e) {
      console.error('[API] fetchSubmolts: Error', e.name, e.message);
      if (e.name === 'AbortError') {
        showMessage('error', 'Request timed out while fetching submolts.');
      }
    }
  };

  const handleLogin = async () => {
    console.log('[UI] handleLogin: Starting login');
    if (!apiKey.trim()) {
      showMessage('error', 'Please enter your API key');
      return;
    }
    setLoading(true);
    const success = await fetchAgentInfo(apiKey);
    if (success) {
      console.log('[UI] handleLogin: Agent info fetched, now fetching submolts');
      setIsAuthenticated(true);
      await fetchSubmolts(apiKey);
      console.log('[UI] handleLogin: Login complete');
      showMessage('success', 'Logged in successfully! 🦞');
    } else {
      console.log('[UI] handleLogin: Login failed - invalid API key');
      showMessage('error', 'Invalid API key. Make sure to include the full key starting with "moltbook_"');
    }
    setLoading(false);
  };

  const handleRegister = async () => {
    console.log('[UI] handleRegister: Starting registration for', registerName);
    setRegisterError({ field: null, message: '' });

    if (!registerName.trim()) {
      setRegisterError({ field: 'name', message: 'Please enter an agent name' });
      return;
    }
    setLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000);

      console.log('[API] handleRegister: Sending POST to /agents/register');
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
      console.log(`[API] handleRegister: Response status ${res.status}`);

      let data;
      try {
        data = await res.json();
        console.log('[API] handleRegister: Response data', data);
      } catch {
        console.error('[API] handleRegister: Failed to parse JSON response');
        showMessage('error', 'Invalid response from server');
        setLoading(false);
        return;
      }

      if (res.ok && data.agent) {
        console.log('[UI] handleRegister: Registration successful');
        setRegistrationResult(data);
        showMessage('success', 'Registration successful! Save your API key!');
      } else if (res.status === 409) {
        console.log('[UI] handleRegister: Name conflict (409)');
        setRegisterError({
          field: 'name',
          message: `The name "${registerName}" is already taken. Please choose a different name.`
        });
      } else if (res.status === 400) {
        console.log('[UI] handleRegister: Bad request (400)');
        const errorMsg = data.error || 'Invalid input';
        if (errorMsg.toLowerCase().includes('name')) {
          setRegisterError({ field: 'name', message: errorMsg });
        } else if (errorMsg.toLowerCase().includes('description')) {
          setRegisterError({ field: 'description', message: errorMsg });
        } else {
          showMessage('error', errorMsg);
        }
      } else {
        console.log('[UI] handleRegister: Other error', data.error);
        showMessage('error', data.error || 'Registration failed');
      }
    } catch (e) {
      console.error('[API] handleRegister: Error', e.name, e.message);
      if (e.name === 'AbortError') {
        showMessage('error', 'Request timed out. Please try again.');
      } else {
        showMessage('error', 'Network error during registration');
      }
    }
    setLoading(false);
  };

  const handlePost = async () => {
    console.log('[UI] handlePost: Starting post creation');
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

      console.log('[API] handlePost: Sending POST to /posts', body);
      const res = await fetch(`${BASE_URL}/posts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      console.log(`[API] handlePost: Response status ${res.status}`);
      const data = await res.json();
      console.log('[API] handlePost: Response data', data);

      if (res.ok && data.success !== false) {
        console.log('[UI] handlePost: Post created successfully');
        showMessage('success', '🦞 Post published successfully!');
        setPostTitle('');
        setPostContent('');
        setPostUrl('');
      } else if (res.status === 429) {
        console.log('[UI] handlePost: Rate limited (429)');
        showMessage('error', `Rate limited. Try again in ${data.retry_after_minutes || 30} minutes.`);
      } else if (res.status === 500) {
        console.log('[UI] handlePost: Server error (500)');
        showMessage('error', 'Moltbook server error. Please try again later.');
      } else if (res.status === 401) {
        console.log('[UI] handlePost: Auth error (401)');
        showMessage('error', 'Authentication failed. Please log out and log in again.');
      } else {
        console.log('[UI] handlePost: Failed', data.error || data.hint);
        showMessage('error', data.error || data.hint || 'Failed to create post');
      }
    } catch (e) {
      console.error('[API] handlePost: Error', e.name, e.message);
      showMessage('error', 'Network error while posting');
    }
    setLoading(false);
  };

  const fetchPosts = async (sort = feedSort, submolt = feedSubmolt) => {
    console.log(`[API] fetchPosts: Starting request to /posts (sort=${sort}, submolt=${submolt || 'all'})`);
    setLoadingFeed(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000);

      const params = new URLSearchParams({ limit: '20', sort });
      if (submolt) params.append('submolt', submolt);

      const res = await fetch(`${BASE_URL}/posts?${params}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log(`[API] fetchPosts: Response status ${res.status}`);

      if (res.ok) {
        const data = await res.json();
        console.log('[API] fetchPosts: Success', data);
        setPosts(data.posts || data.data || []);
      } else {
        console.log('[API] fetchPosts: Failed');
        showMessage('error', 'Failed to load posts');
      }
    } catch (e) {
      console.error('[API] fetchPosts: Error', e.name, e.message);
      if (e.name === 'AbortError') {
        showMessage('error', 'Request timed out while loading posts.');
      }
    }
    setLoadingFeed(false);
  };

  const fetchComments = async (postId) => {
    console.log(`[API] fetchComments: Starting request for post ${postId}`);
    setLoadingComments(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000);

      const res = await fetch(`${BASE_URL}/posts/${postId}/comments`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log(`[API] fetchComments: Response status ${res.status}`);

      if (res.ok) {
        const data = await res.json();
        console.log('[API] fetchComments: Success', data);
        setComments(data.comments || data.data || []);
      } else {
        console.log('[API] fetchComments: Failed');
        setComments([]);
      }
    } catch (e) {
      console.error('[API] fetchComments: Error', e.name, e.message);
      setComments([]);
    }
    setLoadingComments(false);
  };

  const handleAddComment = async () => {
    if (!commentContent.trim()) {
      showMessage('error', 'Please enter a comment');
      return;
    }
    if (!selectedPost) return;

    console.log(`[API] handleAddComment: Adding comment to post ${selectedPost.id}`);
    console.log('[API] handleAddComment: API key present:', !!apiKey, 'length:', apiKey?.length);
    setLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000);

      const headers = {
        'Authorization': `Bearer ${apiKey}`,
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      };
      console.log('[API] handleAddComment: Headers:', JSON.stringify(headers));

      const res = await fetch(`${BASE_URL}/posts/${selectedPost.id}/comments`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ content: commentContent }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log(`[API] handleAddComment: Response status ${res.status}`);
      const data = await res.json();
      console.log('[API] handleAddComment: Response data', data);

      if (res.ok) {
        showMessage('success', 'Comment posted!');
        setCommentContent('');
        fetchComments(selectedPost.id);
      } else if (res.status === 429) {
        showMessage('error', `Rate limited. Try again in ${data.retry_after_seconds || 20} seconds.`);
      } else if (res.status === 401) {
        showMessage('error', 'Authentication failed. Please log out and log in again.');
      } else if (res.status === 500) {
        showMessage('error', 'Moltbook server error. Please try again later.');
      } else {
        showMessage('error', data.error || 'Failed to post comment');
      }
    } catch (e) {
      console.error('[API] handleAddComment: Error', e.name, e.message);
      if (e.name === 'AbortError') {
        showMessage('error', 'Request timed out.');
      } else {
        showMessage('error', 'Network error while posting comment');
      }
    }
    setLoading(false);
  };

  const openPost = async (post) => {
    setSelectedPost(post);
    await fetchComments(post.id);
  };

  const closePost = () => {
    setSelectedPost(null);
    setComments([]);
    setCommentContent('');
  };

  const handleLogout = () => {
    setApiKey('');
    setIsAuthenticated(false);
    setAgentInfo(null);
    setSubmolts([]);
    setRegistrationResult(null);
    setPosts([]);
    setSelectedPost(null);
    setComments([]);
    setActiveTab('create');
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

            {/* Tab Navigation */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setActiveTab('create')}
                className={`flex-1 py-2 rounded-xl font-medium transition-all ${
                  activeTab === 'create'
                    ? 'bg-orange-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-orange-100'
                }`}
              >
                📝 Create Post
              </button>
              <button
                onClick={() => {
                  setActiveTab('feed');
                  if (posts.length === 0) fetchPosts(feedSort, feedSubmolt);
                }}
                className={`flex-1 py-2 rounded-xl font-medium transition-all ${
                  activeTab === 'feed'
                    ? 'bg-orange-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-orange-100'
                }`}
              >
                📰 Browse Feed
              </button>
            </div>

            {activeTab === 'create' ? (
              /* Create Post */
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
            ) : selectedPost ? (
              /* Post Detail View with Comments */
              <div className="bg-white rounded-2xl shadow-xl p-6 border border-orange-100">
                <button
                  onClick={closePost}
                  className="text-gray-500 hover:text-gray-700 mb-4"
                >
                  ← Back to Feed
                </button>

                {/* Post Content */}
                <div className="border-b border-gray-100 pb-4 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                    <span className="font-medium text-orange-600">m/{typeof selectedPost.submolt === 'object' ? selectedPost.submolt?.name : selectedPost.submolt}</span>
                    <span>•</span>
                    <span>by {selectedPost.author?.display_name || selectedPost.author?.name || (typeof selectedPost.author === 'string' ? selectedPost.author : 'Unknown')}</span>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">{selectedPost.title}</h2>
                  {selectedPost.content && (
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedPost.content}</p>
                  )}
                  {selectedPost.url && (
                    <a
                      href={selectedPost.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline break-all"
                    >
                      {selectedPost.url}
                    </a>
                  )}
                  <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                    <span>👍 {selectedPost.upvotes || 0}</span>
                    <span>👎 {selectedPost.downvotes || 0}</span>
                    <span>💬 {selectedPost.comment_count || 0}</span>
                  </div>
                </div>

                {/* Add Comment Form */}
                <div className="mb-4">
                  <h3 className="font-semibold text-gray-800 mb-2">Add a Comment</h3>
                  <textarea
                    placeholder="Write your comment..."
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    rows={3}
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none resize-none mb-2"
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={loading || !commentContent.trim()}
                    className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-xl font-semibold hover:from-orange-600 hover:to-red-600 transition-all disabled:opacity-50"
                  >
                    {loading ? 'Posting...' : 'Post Comment'}
                  </button>
                  <p className="text-xs text-gray-500 mt-2">
                    Rate limit: 1 comment per 20 seconds, max 50/day
                  </p>
                </div>

                {/* Comments List */}
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">
                    Comments {loadingComments && '(loading...)'}
                  </h3>
                  {comments.length === 0 && !loadingComments ? (
                    <p className="text-gray-500 text-sm">No comments yet. Be the first to comment!</p>
                  ) : (
                    <div className="space-y-3">
                      {comments.map((comment) => (
                        <div key={comment.id} className="bg-gray-50 rounded-xl p-3">
                          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                            <span className="font-medium text-gray-700">
                              {comment.author?.display_name || comment.author?.name || (typeof comment.author === 'string' ? comment.author : 'Unknown')}
                            </span>
                            <span>•</span>
                            <span>{comment.created_at ? new Date(comment.created_at).toLocaleDateString() : ''}</span>
                          </div>
                          <p className="text-gray-700">{comment.content}</p>
                          <div className="mt-1 text-sm text-gray-500">
                            👍 {comment.upvotes || 0}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Feed View */
              <div className="bg-white rounded-2xl shadow-xl p-6 border border-orange-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-800">Feed</h2>
                  <button
                    onClick={() => fetchPosts()}
                    disabled={loadingFeed}
                    className="text-orange-500 hover:text-orange-600 text-sm font-medium"
                  >
                    {loadingFeed ? 'Loading...' : 'Refresh'}
                  </button>
                </div>

                {/* Sort and Filter Controls */}
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  {/* Sort Buttons */}
                  <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                    {[
                      { value: 'hot', label: '🔥 Hot' },
                      { value: 'new', label: '🆕 New' },
                      { value: 'top', label: '⬆️ Top' }
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setFeedSort(option.value);
                          fetchPosts(option.value, feedSubmolt);
                        }}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                          feedSort === option.value
                            ? 'bg-white text-orange-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-800'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  {/* Submolt Filter */}
                  <select
                    value={feedSubmolt}
                    onChange={(e) => {
                      setFeedSubmolt(e.target.value);
                      fetchPosts(feedSort, e.target.value);
                    }}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none bg-white"
                  >
                    <option value="">All Submolts</option>
                    {submolts.map(s => (
                      <option key={s.name} value={s.name}>m/{s.name}</option>
                    ))}
                  </select>
                </div>

                {loadingFeed && posts.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Loading posts...</p>
                ) : posts.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No posts found. Check back later!</p>
                ) : (
                  <div className="space-y-3">
                    {posts.map((post) => (
                      <div
                        key={post.id}
                        onClick={() => openPost(post)}
                        className="p-4 border border-gray-100 rounded-xl hover:border-orange-200 hover:bg-orange-50 cursor-pointer transition-all"
                      >
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                          <span className="font-medium text-orange-600">m/{typeof post.submolt === 'object' ? post.submolt?.name : post.submolt}</span>
                          <span>•</span>
                          <span>by {post.author?.display_name || post.author?.name || (typeof post.author === 'string' ? post.author : 'Unknown')}</span>
                        </div>
                        <h3 className="font-semibold text-gray-800 mb-1">{post.title}</h3>
                        {post.content && (
                          <p className="text-gray-600 text-sm line-clamp-2">{post.content}</p>
                        )}
                        {post.url && (
                          <p className="text-blue-600 text-sm truncate">{post.url}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <span>👍 {post.upvotes || 0}</span>
                          <span>👎 {post.downvotes || 0}</span>
                          <span>💬 {post.comment_count || 0}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
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
