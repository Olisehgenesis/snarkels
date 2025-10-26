'use client';

import React from 'react';
import { useMiniApp } from '@/hooks/useMiniApp';
import { useFarcaster } from '@/components/FarcasterProvider';
import { MiniAppHeader } from '@/components/MiniAppHeader';
import { MiniAppContextDisplay } from '@/components/MiniAppContextDisplay';
import { FarcasterUserProfile } from '@/components/FarcasterUserProfile';
import { FarcasterUserInfo } from '@/components/FarcasterContextDisplay';
import { sdk } from '@farcaster/miniapp-sdk';
import { 
  Users, 
  Star, 
  MapPin, 
  Zap, 
  Gamepad2,
  CheckCircle,
  AlertCircle,
  Info,
  TestTube
} from 'lucide-react';

export default function FarcasterDemoPage() {
  const { 
    isMiniApp, 
    context, 
    userFid, 
    username, 
    displayName, 
    pfpUrl, 
    isAdded, 
    location
  } = useMiniApp();

  const { 
    isFarcasterApp, 
    isReady, 
    callReady
  } = useFarcaster();

  // Show loading state while detecting Mini App environment
  // Fix: Use isReady from useFarcaster to determine loading state
  if (!isReady) {
    return (
      <div className="min-h-screen  flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Detecting Mini App environment...</p>
        </div>
      </div>
    );
  }



  // Show ready state while Mini App is initializing
  if (isMiniApp && !isReady) {
    return (
      <div className="min-h-screen  flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse rounded-full h-12 w-12 bg-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 mb-2">Preparing Mini App...</p>
          <p className="text-sm text-gray-500">Calling ready() to hide splash screen...</p>
        </div>
      </div>
    );
  }

  // Check if we have valid context data
  const hasValidContext = context && Object.keys(context).length > 0;
  const hasUserData = hasValidContext && context.user && (context.user.fid || context.user.username || context.user.displayName);

  return (
    <div className="min-h-screen ">
      {/* Mini App Context Display */}
      <MiniAppContextDisplay />
      
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Gamepad2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-handwriting font-bold text-gray-800">
                  Farcaster Mini App Demo
                </h1>
                <p className="text-gray-600 text-sm">
                  Test your mini app connection and features
                </p>
              </div>
            </div>
            
            {/* Connection Status */}
            <div className="flex items-center gap-2">
              {isMiniApp ? (
                <div className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-2 rounded-lg">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Connected</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-gray-100 text-gray-800 px-3 py-2 rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Not in Mini App</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Ready Status */}
          {isMiniApp && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-blue-800">Ready Status:</span>
                {isReady ? (
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">Ready (Splash Screen Hidden)</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-orange-600">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">Preparing Interface...</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-blue-600 mt-2">
                The ready() function is called automatically at the app level when your interface is ready, following Farcaster best practices.
              </p>
            </div>
          )}
          
          {/* SDK Initialization Status */}
          {isMiniApp && (
            <div className="mt-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-yellow-800">SDK Status:</span>
                {isReady ? (
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">SDK Ready & Interface Prepared</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-orange-600">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">Preparing Interface...</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-yellow-600 mt-1">
                {isReady ? 'Interface is ready and splash screen should be hidden' : 'Preparing interface to avoid jitter and content reflowing...'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Mini App Header */}
      <div className="max-w-6xl mx-auto px-4 pt-4">
        <MiniAppHeader />
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {isMiniApp ? (
          <div className="space-y-6">
            {/* Connection Success */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <h2 className="text-xl font-bold text-green-800">
                  Mini App Connected Successfully! 🎉
                </h2>
              </div>
              <p className="text-green-700">
                You're now running inside a Farcaster Mini App environment. 
                All mini app features should be working properly.
              </p>
            </div>

            {/* Context Loading State */}
            {!hasValidContext && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <AlertCircle className="w-8 h-8 text-yellow-600" />
                  <h2 className="text-xl font-bold text-yellow-800">
                    Waiting for Context Data...
                  </h2>
                </div>
                <p className="text-yellow-700 mb-4">
                  The Mini App is connected and ready() has been called, but we're still waiting for your Farcaster profile and context data to load.
                </p>
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-600"></div>
                  <span className="text-yellow-700">Loading context...</span>
                </div>
                <p className="text-xs text-yellow-600 mt-2">
                  Context loading is handled automatically by the Farcaster SDK. This can take a few seconds.
                </p>
              </div>
            )}

            {/* User Profile Card - Only show when we have user data */}
            {hasUserData && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Your Farcaster Profile
                </h3>
                <FarcasterUserProfile variant="card" showPfp={true} showEmoji={true} showFid={true} />
              </div>
            )}

            {/* Context Information - Only show when we have valid context */}
            {hasValidContext && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-600" />
                  Mini App Context
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* User Info */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800 mb-2">User Information</h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">FID:</span> {userFid || 'Not available'}</p>
                      <p><span className="font-medium">Username:</span> {username ? `@${username}` : 'Not available'}</p>
                      <p><span className="font-medium">Display Name:</span> {displayName || 'Not available'}</p>
                      <p><span className="font-medium">Profile Picture:</span> {pfpUrl ? 'Available' : 'Not available'}</p>
                    </div>
                  </div>

                  {/* Client Info */}
                  <div className="bg-purple-50 rounded-lg p-4">
                    <h4 className="font-medium text-purple-800 mb-2">Client Information</h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Platform:</span> {context?.client?.platformType || 'Unknown'}</p>
                      <p><span className="font-medium">Client FID:</span> {context?.client?.clientFid || 'Unknown'}</p>
                      <p><span className="font-medium">Added to Favorites:</span> {isAdded ? 'Yes' : 'No'}</p>
                    </div>
                  </div>

                  {/* Location Info */}
                  <div className="bg-green-50 rounded-lg p-4">
                    <h4 className="font-medium text-green-800 mb-2">Location Context</h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Type:</span> {location?.type || 'Unknown'}</p>
                      {location?.type === 'cast_embed' && location.cast && (
                        <p><span className="font-medium">Cast by:</span> {location.cast.author?.displayName || location.cast.author?.username || 'Unknown'}</p>
                      )}
                      {location?.type === 'channel' && location.channel && (
                        <p><span className="font-medium">Channel:</span> {location.channel.name}</p>
                      )}
                    </div>
                  </div>

                  {/* Features */}
                  <div className="bg-orange-50 rounded-lg p-4">
                    <h4 className="font-medium text-orange-800 mb-2">Available Features</h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Haptics:</span> {context?.features?.haptics ? 'Yes' : 'No'}</p>
                      <p><span className="font-medium">Camera/Mic:</span> {context?.features?.cameraAndMicrophoneAccess ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Safe Area Insets - Only show when we have context */}
            {hasValidContext && context?.client?.safeAreaInsets && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  Safe Area Insets
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{context?.client?.safeAreaInsets?.top}</p>
                    <p className="text-sm text-gray-600">Top</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{context?.client?.safeAreaInsets?.bottom}</p>
                    <p className="text-sm text-gray-600">Bottom</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{context?.client?.safeAreaInsets?.left}</p>
                    <p className="text-sm text-gray-600">Left</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{context?.client?.safeAreaInsets?.right}</p>
                    <p className="text-sm text-gray-600">Right</p>
                  </div>
                </div>
              </div>
            )}

            {/* Raw Context Data - Always show for debugging */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-600" />
                Raw Context Data vs Expected
              </h3>
              
              {/* Expected Context Structure */}
              <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-800 mb-2">📚 Expected Context Structure (from docs)</h4>
                <div className="text-sm text-blue-700 space-y-1">
                  <p><strong>sdk.context</strong> should contain:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li><strong>user:</strong> {`{ fid, username, displayName, pfpUrl }`}</li>
                    <li><strong>location:</strong> {`{ type, cast, channel, etc. }`}</li>
                    <li><strong>client:</strong> {`{ platformType, clientFid, added, safeAreaInsets }`}</li>
                    <li><strong>features:</strong> {`{ haptics, cameraAndMicrophoneAccess }`}</li>
                  </ul>
                </div>
              </div>

              {/* Actual Context Data */}
              <div className="mb-4">
                <h4 className="font-medium text-gray-800 mb-2">🔍 Actual Context Data (what we get)</h4>
                <div className="bg-gray-100 rounded-lg p-4 overflow-auto">
                  <pre className="text-xs text-gray-800">
                    {hasValidContext ? JSON.stringify(context, null, 2) : 'Context not yet loaded...'}
                  </pre>
                </div>
                {!hasValidContext && (
                  <p className="text-sm text-gray-600 mt-2">
                    Context data is still loading. This can take a few seconds in some cases.
                  </p>
                )}
              </div>

              {/* Context Analysis */}
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <h4 className="font-medium text-yellow-800 mb-2">📊 Context Analysis</h4>
                <div className="text-sm text-yellow-700 space-y-2">
                  {!context ? (
                    <p><strong>Status:</strong> ❌ Context is completely null</p>
                  ) : Object.keys(context).length === 0 ? (
                    <p><strong>Status:</strong> ⚠️ Context exists but is an empty object</p>
                  ) : (
                    <>
                      <p><strong>Status:</strong> ✅ Context has {Object.keys(context).length} keys</p>
                      <p><strong>Keys found:</strong> {Object.keys(context).join(', ')}</p>
                      {context.user && (
                        <p><strong>User data:</strong> ✅ Available with {Object.keys(context.user).length} fields</p>
                      )}
                      {context.client && (
                        <p><strong>Client data:</strong> ✅ Available with {Object.keys(context.client).length} fields</p>
                      )}
                      {context.location && (
                        <p><strong>Location data:</strong> ✅ Available with type: {context.location.type}</p>
                      )}
                      {context.features && (
                        <p><strong>Features data:</strong> ✅ Available with {Object.keys(context.features).length} features</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* SDK Test Section */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <TestTube className="w-5 h-5 text-blue-600" />
                SDK Test & Debug - How Hard Is It Really?
              </h3>
              
              {/* Documentation Examples */}
              <div className="mb-6 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                <h4 className="font-medium text-indigo-800 mb-2">📖 What the Documentation Promises</h4>
                <div className="text-sm text-indigo-700 space-y-3">
                  <div>
                    <p className="font-medium">Example 1: User Context</p>
                    <pre className="bg-white p-2 rounded text-xs overflow-x-auto">
{`sdk.context.user = {
  "fid": 6841,
  "username": "deodad",
  "displayName": "Tony D'Addeo",
  "pfpUrl": "https://i.imgur.com/dMoIan7.jpg"
}`}
                    </pre>
                  </div>
                  <div>
                    <p className="font-medium">Example 2: Client Context</p>
                    <pre className="bg-white p-2 rounded text-xs overflow-x-auto">
{`sdk.context.client = {
  platformType: "mobile",
  clientFid: 9152,
  added: true,
  safeAreaInsets: { top: 0, bottom: 20, left: 0, right: 0 }
}`}
                    </pre>
                  </div>
                  <div>
                    <p className="font-medium">Example 3: Cast Embed Location</p>
                    <pre className="bg-white p-2 rounded text-xs overflow-x-auto">
{`sdk.context.location = {
  type: "cast_embed",
  embed: "https://myapp.example.com",
  cast: {
    author: { fid: 3621, username: "alice", displayName: "Alice" },
    hash: "0xa2fbef8c8e4d00d8f84ff45f9763b8bae2c5c544",
    text: "Check out this awesome mini app!"
  }
}`}
                    </pre>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <h4 className="font-medium text-red-800 mb-2">⚠️ The Reality Check</h4>
                  <p className="text-sm text-red-700">
                    Getting Farcaster context data is <strong>surprisingly difficult</strong>. 
                    Even with the latest SDK (v0.1.9), the context often comes back empty or undefined.
                    This is a common issue that many developers face.
                  </p>
                </div>

                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium text-blue-800 mb-2">Direct SDK Access Tests</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">sdk.isInMiniApp():</span> 
                      <button 
                        onClick={async () => {
                          try {
                            const result = await sdk.isInMiniApp();
                            console.log('Direct sdk.isInMiniApp() result:', result);
                            alert(`sdk.isInMiniApp() result: ${result}`);
                          } catch (error) {
                            console.error('Direct sdk.isInMiniApp() error:', error);
                            alert(`Error: ${error}`);
                          }
                        }}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                      >
                        Test Now
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="font-medium">sdk.context (raw):</span> 
                      <button 
                        onClick={() => {
                          const context = sdk.context;
                          console.log('Direct sdk.context:', context);
                          console.log('Context type:', typeof context);
                          console.log('Context keys:', context ? Object.keys(context) : 'null');
                          console.log('Context stringified:', JSON.stringify(context, null, 2));
                          
                          if (!context || Object.keys(context).length === 0) {
                            alert('❌ sdk.context is EMPTY or undefined!\n\nThis is the main problem - even when isInMiniApp() returns true, the context is often not populated.\n\nCheck the console for detailed debugging info.');
                          } else {
                            alert(`✅ sdk.context has data!\n\nKeys: ${Object.keys(context).join(', ')}\n\nFull context:\n${JSON.stringify(context, null, 2)}`);
                          }
                        }}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                      >
                        Test Now
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="font-medium">sdk.actions.ready():</span> 
                      <button 
                        onClick={async () => {
                          try {
                            await sdk.actions.ready();
                            console.log('Direct sdk.actions.ready() success');
                            alert('✅ sdk.actions.ready() called successfully\n\nThis should hide the splash screen, but it doesn\'t guarantee context will be available.');
                          } catch (error) {
                            console.error('Direct sdk.actions.ready() error:', error);
                            alert(`❌ Error calling ready(): ${error}`);
                          }
                        }}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                      >
                        Test Now
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="font-medium">sdk.getCapabilities():</span> 
                      <button 
                        onClick={async () => {
                          try {
                            const capabilities = await sdk.getCapabilities();
                            console.log('Direct sdk.getCapabilities() result:', capabilities);
                            alert(`sdk.getCapabilities() result:\n${capabilities.join('\n')}`);
                          } catch (error) {
                            console.error('Direct sdk.getCapabilities() error:', error);
                            alert(`Error: ${error}`);
                          }
                        }}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                      >
                        Test Now
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-medium text-green-800 mb-2">Hook State & Context Analysis</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">isMiniApp:</span> 
                      <span className={`px-2 py-1 rounded text-xs ${isMiniApp ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {isMiniApp ? 'true' : 'false'}
                      </span>
                    </p>
                    <p><span className="font-medium">isLoading:</span> 
                      <span className={`px-2 py-1 rounded text-xs ${isReady ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                        {isReady ? 'true' : 'false'}
                      </span>
                    </p>
                    <p><span className="font-medium">Hook isReady:</span> 
                      <span className={`px-2 py-1 rounded text-xs ${isReady ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {isReady ? 'true' : 'false'}
                      </span>
                    </p>
                    <p><span className="font-medium">Interface Ready:</span> 
                      <span className={`px-2 py-1 rounded text-xs ${isReady ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {isReady ? 'true' : 'false'}
                      </span>
                    </p>
                    <p><span className="font-medium">Ready Called:</span> 
                      <span className={`px-2 py-1 rounded text-xs ${isReady ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                        {isReady ? 'true' : 'false'}
                      </span>
                    </p>
                    <p><span className="font-medium">Context Monitoring:</span> 
                      <span className={`px-2 py-1 rounded text-xs ${isReady ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                        {isReady ? 'inactive' : 'inactive'}
                      </span>
                    </p>
                    <p><span className="font-medium">Context Retries:</span> 
                      <span className={`px-2 py-1 rounded text-xs ${isReady ? 'bg-gray-100 text-gray-800' : 'bg-gray-100 text-gray-800'}`}>
                        {0}
                      </span>
                    </p>
                    <p><span className="font-medium">Context Status:</span> 
                      <span className={`px-2 py-1 rounded text-xs ${
                        !context ? 'bg-red-100 text-red-800' : 
                        Object.keys(context).length === 0 ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-green-100 text-green-800'
                      }`}>
                        {!context ? 'null' : Object.keys(context).length === 0 ? 'empty object' : `${Object.keys(context).length} keys`}
                      </span>
                    </p>
                    <p><span className="font-medium">Context Keys:</span> 
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {context ? Object.keys(context).join(', ') || 'none' : 'null'}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                  <h4 className="font-medium text-orange-800 mb-2">Why Is This So Hard?</h4>
                  <div className="text-sm text-orange-700 space-y-2">
                    <p><strong>1. Timing Issues:</strong> The SDK needs time to initialize and communicate with the Farcaster client</p>
                    <p><strong>2. Context Population:</strong> Even when `isInMiniApp()` returns true, `sdk.context` is often empty</p>
                    <p><strong>3. Client Dependencies:</strong> The context depends on the Farcaster client (Warpcast, etc.) being ready</p>
                    <p><strong>4. SDK Version:</strong> We're using v0.1.9, but context loading is still unreliable</p>
                    <p><strong>5. Environment Detection:</strong> The SDK detection works, but context loading is a separate challenge</p>
                    <p><strong>6. Documentation Gap:</strong> The docs focus on calling ready() but don't address context loading issues</p>
                  </div>
                </div>

                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <h4 className="font-medium text-red-800 mb-2">🚨 Common Farcaster SDK Issues</h4>
                  <div className="text-sm text-red-700 space-y-2">
                    <p><strong>Issue 1:</strong> Context is null even after ready() is called</p>
                    <p><strong>Issue 2:</strong> Context appears empty in some Farcaster clients but not others</p>
                    <p><strong>Issue 3:</strong> Context loading is inconsistent between different SDK versions</p>
                    <p><strong>Issue 4:</strong> The ready() function works but context population doesn't</p>
                    <p><strong>Issue 5:</strong> Context appears after a long delay or never appears</p>
                  </div>
                  <div className="mt-3 p-3 bg-red-100 rounded-lg">
                    <p className="text-xs text-red-800">
                      <strong>Note:</strong> These issues are well-documented in the Farcaster community and GitHub issues. 
                      Many developers have reported similar problems with context loading reliability.
                    </p>
                  </div>
                </div>

                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <h4 className="font-medium text-purple-800 mb-2">What We've Tried</h4>
                  <div className="text-sm text-purple-700 space-y-2">
                    <p>✅ <strong>SDK Detection:</strong> `sdk.isInMiniApp()` works reliably</p>
                    <p>✅ <strong>Ready Function:</strong> `sdk.actions.ready()` executes without errors</p>
                    <p>✅ <strong>Loading Optimization:</strong> Implemented proper ready() timing following Farcaster docs</p>
                    <p>❌ <strong>Context Loading:</strong> `sdk.context` remains empty most of the time</p>
                    <p>❌ <strong>Timing Workarounds:</strong> Delays and retries don't solve the core issue</p>
                    <p>❌ <strong>Context Monitoring:</strong> Periodic checking doesn't populate the context</p>
                  </div>
                </div>

                <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                  <h4 className="font-medium text-emerald-800 mb-2">✅ New Loading Implementation</h4>
                  <div className="text-sm text-emerald-700 space-y-2">
                    <p><strong>Following Farcaster Best Practices:</strong></p>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                      <li>Call ready() as soon as possible while avoiding jitter</li>
                      <li>Use useEffect to prevent running on every re-render</li>
                      <li>Small delay to ensure interface stability (prevents content reflowing)</li>
                      <li>Proper error handling for the ready() function</li>
                      <li>Smooth transition states to avoid jarring user experience</li>
                    </ul>
                    <p className="mt-2"><strong>Loading Flow:</strong></p>
                    <ol className="list-decimal list-inside ml-4 space-y-1">
                      <li>Detect Mini App environment</li>
                      <li>Render interface components</li>
                      <li>Call sdk.actions.ready() with small delay</li>
                      <li>Show smooth transition state</li>
                      <li>Display full interface when ready</li>
                    </ol>
                  </div>
                </div>

                <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                  <h4 className="font-medium text-indigo-800 mb-2">🔄 New Context Monitoring Strategies</h4>
                  <div className="text-sm text-indigo-700 space-y-2">
                    <p><strong>Multi-Strategy Context Population:</strong></p>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                      <li><strong>Strategy 1:</strong> Initial delay (2s) then context check</li>
                      <li><strong>Strategy 2:</strong> Periodic monitoring every 3 seconds with retry counting</li>
                      <li><strong>Strategy 3:</strong> SDK method triggers (getCapabilities) to force context population</li>
                      <li><strong>Manual Override:</strong> Button to manually trigger refresh attempts</li>
                    </ul>
                    <p className="mt-2"><strong>Why These Strategies?</strong></p>
                    <p>Since the Farcaster SDK context loading is unreliable, we implement multiple fallback approaches to maximize the chances of getting context data. This is a common workaround that many developers use.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-12 h-12 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Not Running in Mini App
            </h2>
            <p className="text-gray-600 max-w-md mx-auto">
              This page is designed to test Farcaster Mini App functionality. 
              To see the full demo, open this app from within a Farcaster client like Warpcast.
            </p>
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-2">How to Test:</h3>
              <ol className="text-sm text-blue-700 text-left max-w-md mx-auto space-y-1">
                <li>1. Open Warpcast or another Farcaster client</li>
                <li>2. Navigate to this app's URL</li>
                <li>3. The app should detect the Mini App environment</li>
                <li>4. You'll see your Farcaster profile and context</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
