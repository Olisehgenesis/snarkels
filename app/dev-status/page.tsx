'use client';

import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { getSocketUrl, getAppUrl } from '@/config/environment';
import { 
  Wifi, 
  WifiOff, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Activity,
  Server,
  RefreshCw,
  Network,
  Database,
  Globe,
  Settings,
  Terminal,
  Info,
  AlertTriangle,
  Zap,
  Shield,
  BarChart3
} from 'lucide-react';

interface SocketStatus {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  lastPing: number | null;
  connectionTime: Date | null;
  disconnectReason: string | null;
  reconnectAttempts: number;
  totalConnections: number;
}

interface ServerStatus {
  app: boolean;
  socket: boolean;
  worker: boolean;
  lastCheck: Date;
  responseTime: number | null;
  httpStatus: number | null;
  errorDetails: string | null;
}

interface ConnectionTest {
  success: boolean;
  error?: string;
  type: string;
  responseTime: number;
  timestamp: Date;
  details: string;
}

export default function DevStatusPage() {
  const [socketStatus, setSocketStatus] = useState<SocketStatus>({
    connected: false,
    connecting: false,
    error: null,
    lastPing: null,
    connectionTime: null,
    disconnectReason: null,
    reconnectAttempts: 0,
    totalConnections: 0
  });
  
  const [serverStatus, setServerStatus] = useState<ServerStatus>({
    app: false,
    socket: false,
    worker: true,
    lastCheck: new Date(),
    responseTime: null,
    httpStatus: null,
    errorDetails: null
  });
  
  const [socket, setSocket] = useState<Socket | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [testResults, setTestResults] = useState<ConnectionTest[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [connectionHistory, setConnectionHistory] = useState<Array<{
    timestamp: Date;
    event: string;
    details: string;
  }>>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<{
    avgResponseTime: number;
    successRate: number;
    totalTests: number;
  }>({
    avgResponseTime: 0,
    successRate: 0,
    totalTests: 0
  });

  // Add log entry with different log levels
  const addLog = (message: string, level: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const levelIcon = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    }[level];
    
    setLogs(prev => [`[${timestamp}] ${levelIcon} ${message}`, ...prev.slice(0, 199)]);
  };

  // Add connection history entry
  const addConnectionHistory = (event: string, details: string) => {
    setConnectionHistory(prev => [{
      timestamp: new Date(),
      event,
      details
    }, ...prev.slice(0, 49)]);
  };

  // Test socket connection with detailed diagnostics
  const testSocketConnection = async () => {
    setIsTesting(true);
    addLog('Starting comprehensive socket connection test...', 'info');
    
    const tests: ConnectionTest[] = [];
    
    try {
      // Test 1: Localhost connection
      addLog('Testing localhost socket connection...', 'info');
      const localStart = Date.now();
      const localSocket = io('http://localhost:4001', {
        query: { roomId: 'test', walletAddress: '0x1234567890123456789012345678901234567890' },
        timeout: 10000
      });

      const localResult = await new Promise<ConnectionTest>((resolve) => {
        const timeout = setTimeout(() => {
          resolve({
            success: false,
            error: 'Connection timeout after 10 seconds',
            type: 'localhost',
            responseTime: Date.now() - localStart,
            timestamp: new Date(),
            details: 'Socket connection timed out - server may be down or blocked'
          });
        }, 10000);

        localSocket.on('connect', () => {
          clearTimeout(timeout);
          const responseTime = Date.now() - localStart;
          localSocket.disconnect();
          resolve({
            success: true,
            type: 'localhost',
            responseTime,
            timestamp: new Date(),
            details: `Connected successfully in ${responseTime}ms`
          });
        });

        localSocket.on('connect_error', (error) => {
          clearTimeout(timeout);
          resolve({
            success: false,
            error: error.message,
            type: 'localhost',
            responseTime: Date.now() - localStart,
            timestamp: new Date(),
            details: `Connection failed: ${error.message}`
          });
        });
      });

      tests.push(localResult);
      addLog(`Localhost test: ${localResult.success ? 'PASS' : 'FAIL'} - ${localResult.details}`, 
        localResult.success ? 'success' : 'error');

      // Test 2: Domain connection
      addLog('Testing domain socket connection...', 'info');
      const domainStart = Date.now();
      const domainSocket = io(getSocketUrl(), {
        query: { roomId: 'test', walletAddress: '0x1234567890123456789012345678901234567890' },
        timeout: 10000
      });

      const domainResult = await new Promise<ConnectionTest>((resolve) => {
        const timeout = setTimeout(() => {
          resolve({
            success: false,
            error: 'Connection timeout after 10 seconds',
            type: 'domain',
            responseTime: Date.now() - domainStart,
            timestamp: new Date(),
            details: 'Socket connection timed out - nginx proxy or server issue'
          });
        }, 10000);

        domainSocket.on('connect', () => {
          clearTimeout(timeout);
          const responseTime = Date.now() - domainStart;
          domainSocket.disconnect();
          resolve({
            success: true,
            type: 'domain',
            responseTime,
            timestamp: new Date(),
            details: `Connected successfully in ${responseTime}ms via ${getSocketUrl()}`
          });
        });

        domainSocket.on('connect_error', (error) => {
          clearTimeout(timeout);
          resolve({
            success: false,
            error: error.message,
            type: 'domain',
            responseTime: Date.now() - domainStart,
            timestamp: new Date(),
            details: `Connection failed: ${error.message}`
          });
        });
      });

      tests.push(domainResult);
      addLog(`Domain test: ${domainResult.success ? 'PASS' : 'FAIL'} - ${domainResult.details}`, 
        domainResult.success ? 'success' : 'error');

      // Test 3: HTTP endpoint check
      addLog('Testing HTTP endpoints...', 'info');
      const httpStart = Date.now();
      try {
        const appResponse = await fetch(`${getAppUrl()}/dev-status`, { 
          method: 'GET',
          signal: AbortSignal.timeout(10000)
        });
        
        const httpResult: ConnectionTest = {
          success: appResponse.ok,
          error: appResponse.ok ? undefined : `HTTP ${appResponse.status}`,
          type: 'http',
          responseTime: Date.now() - httpStart,
          timestamp: new Date(),
          details: appResponse.ok 
            ? `HTTP ${appResponse.status} - App server responding` 
            : `HTTP ${appResponse.status} - App server error`
        };
        
        tests.push(httpResult);
        addLog(`HTTP test: ${httpResult.success ? 'PASS' : 'FAIL'} - ${httpResult.details}`, 
          httpResult.success ? 'success' : 'error');
      } catch (error) {
        const httpResult: ConnectionTest = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          type: 'http',
          responseTime: Date.now() - httpStart,
          timestamp: new Date(),
          details: `HTTP request failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
        
        tests.push(httpResult);
        addLog(`HTTP test: FAIL - ${httpResult.details}`, 'error');
      }

      setTestResults(tests);
      
      // Analyze results and provide recommendations
      const successCount = tests.filter(t => t.success).length;
      const avgResponseTime = tests.reduce((sum, t) => sum + t.responseTime, 0) / tests.length;
      
      setPerformanceMetrics({
        avgResponseTime: Math.round(avgResponseTime),
        successRate: Math.round((successCount / tests.length) * 100),
        totalTests: tests.length
      });

      if (successCount === tests.length) {
        addLog('🎉 All tests passed! Your socket setup is working perfectly.', 'success');
      } else if (successCount === 0) {
        addLog('💥 All tests failed! Check if your servers are running and accessible.', 'error');
      } else if (tests[0].success && !tests[1].success) {
        addLog('⚠️ Localhost works but domain fails - this is likely an nginx proxy issue.', 'warning');
        addLog('💡 Check nginx logs: sudo tail -f /var/log/nginx/error.log', 'info');
      } else if (!tests[0].success && tests[1].success) {
        addLog('⚠️ Domain works but localhost fails - unexpected configuration issue.', 'warning');
      } else {
        addLog('⚠️ Mixed results - some services are working, others are not.', 'warning');
      }

    } catch (error) {
      addLog(`❌ Test error: ${error}`, 'error');
    } finally {
      setIsTesting(false);
    }
  };

  // Enhanced server status check
  const checkServerStatus = async () => {
    setServerStatus(prev => ({ ...prev, lastCheck: new Date() }));
    addLog('🔍 Checking server status...', 'info');
    
    try {
      // Check app server
      const appStart = Date.now();
      const appResponse = await fetch(`${getAppUrl()}/dev-status`, { 
        method: 'GET',
        signal: AbortSignal.timeout(10000)
      }).catch(() => null);
      
      const appResponseTime = appResponse ? Date.now() - appStart : null;
      
      // Check socket server
      const socketStart = Date.now();
      const socketResponse = await fetch(`${getSocketUrl()}/socket.io/`, { 
        method: 'GET',
        signal: AbortSignal.timeout(10000)
      }).catch(() => null);
      
      const socketResponseTime = socketResponse ? Date.now() - socketStart : null;

      setServerStatus({
        app: appResponse?.ok || false,
        socket: socketResponse?.ok || false,
        worker: true,
        lastCheck: new Date(),
        responseTime: appResponseTime || socketResponseTime,
        httpStatus: appResponse?.status || null,
        errorDetails: appResponse?.ok ? null : `HTTP ${appResponse?.status || 'No response'}`
      });

      addLog(`Server check complete: App ${appResponse?.ok ? '✅' : '❌'} (${appResponse?.status || 'No response'}), Socket ${socketResponse?.ok ? '✅' : '❌'}`, 
        appResponse?.ok && socketResponse?.ok ? 'success' : 'warning');
      
      if (appResponseTime) {
        addLog(`App response time: ${appResponseTime}ms`, 'info');
      }
      if (socketResponseTime) {
        addLog(`Socket response time: ${socketResponseTime}ms`, 'info');
      }
      
    } catch (error) {
      addLog(`Server check error: ${error}`, 'error');
      setServerStatus(prev => ({
        ...prev,
        errorDetails: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  };

  // Initialize socket connection for monitoring
  useEffect(() => {
    addLog('🚀 Initializing socket monitoring...', 'info');
    addConnectionHistory('Initialization', 'Starting socket monitoring');
    
    const newSocket = io(getSocketUrl(), {
      query: { roomId: 'dev-monitor', walletAddress: '0x1234567890123456789012345678901234567890' },
      timeout: 15000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    newSocket.on('connect', () => {
      addLog('✅ Socket connected successfully', 'success');
      addConnectionHistory('Connected', 'Socket connection established');
      setSocketStatus(prev => ({
        ...prev,
        connected: true,
        connecting: false,
        error: null,
        connectionTime: new Date(),
        disconnectReason: null,
        totalConnections: prev.totalConnections + 1
      }));
    });

    newSocket.on('connecting', () => {
      addLog('🔄 Socket connecting...', 'info');
      addConnectionHistory('Connecting', 'Attempting socket connection');
      setSocketStatus(prev => ({
        ...prev,
        connecting: true,
        connected: false
      }));
    });

    newSocket.on('connect_error', (error) => {
      addLog(`❌ Socket connection error: ${error.message}`, 'error');
      addConnectionHistory('Connection Error', error.message);
      setSocketStatus(prev => ({
        ...prev,
        connected: false,
        connecting: false,
        error: error.message
      }));
    });

    newSocket.on('disconnect', (reason) => {
      addLog(`🔌 Socket disconnected: ${reason}`, 'warning');
      addConnectionHistory('Disconnected', reason);
      setSocketStatus(prev => ({
        ...prev,
        connected: false,
        connecting: false,
        disconnectReason: reason
      }));
    });

    newSocket.on('reconnect', (attemptNumber) => {
      addLog(`🔄 Socket reconnected after ${attemptNumber} attempts`, 'success');
      addConnectionHistory('Reconnected', `Attempt ${attemptNumber}`);
    });

    newSocket.on('reconnect_attempt', (attemptNumber) => {
      addLog(`🔄 Reconnection attempt ${attemptNumber}`, 'info');
      setSocketStatus(prev => ({
        ...prev,
        reconnectAttempts: attemptNumber
      }));
    });

    newSocket.on('reconnect_error', (error) => {
      addLog(`❌ Reconnection error: ${error.message}`, 'error');
    });

    newSocket.on('reconnect_failed', () => {
      addLog('💥 Reconnection failed after all attempts', 'error');
    });

    newSocket.on('pong', (latency) => {
      setSocketStatus(prev => ({
        ...prev,
        lastPing: latency
      }));
    });

    setSocket(newSocket);

    // Initial server check
    checkServerStatus();

    // Periodic server check every 30 seconds
    const interval = setInterval(checkServerStatus, 30000);

    return () => {
      clearInterval(interval);
      newSocket.disconnect();
    };
  }, []);

  // Send ping to socket server
  const sendPing = () => {
    if (socket && socket.connected) {
      socket.emit('ping');
      addLog('📡 Ping sent to socket server', 'info');
    }
  };

  // Clear all logs and history
  const clearAllData = () => {
    setLogs([]);
    setConnectionHistory([]);
    setTestResults([]);
    addLog('🧹 All data cleared', 'info');
  };

  // Export logs for debugging
  const exportLogs = () => {
    const logData = {
      timestamp: new Date().toISOString(),
      socketStatus,
      serverStatus,
      testResults,
      connectionHistory,
      logs: logs.slice(0, 100)
    };
    
    const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dev-status-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    addLog('📁 Logs exported to JSON file', 'success');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🔧 Enhanced Dev Status Dashboard</h1>
          <p className="text-gray-600">Advanced socket monitoring, server diagnostics, and debugging tools</p>
        </div>

        {/* Performance Metrics */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">📊 Performance Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{performanceMetrics.successRate}%</div>
              <div className="text-sm text-gray-600">Success Rate</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{performanceMetrics.avgResponseTime}ms</div>
              <div className="text-sm text-gray-600">Avg Response Time</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">{performanceMetrics.totalTests}</div>
              <div className="text-sm text-gray-600">Total Tests</div>
            </div>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* App Server Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">App Server</p>
                <p className="text-2xl font-bold text-gray-900">Port 4000</p>
              </div>
              <div className={`p-2 rounded-full ${serverStatus.app ? 'bg-green-100' : 'bg-red-100'}`}>
                {serverStatus.app ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-red-600" />
                )}
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {serverStatus.app ? 'Running' : 'Down'}
            </p>
            {serverStatus.responseTime && (
              <p className="text-xs text-gray-400 mt-1">
                Response: {serverStatus.responseTime}ms
              </p>
            )}
          </div>

          {/* Socket Server Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Socket Server</p>
                <p className="text-2xl font-bold text-gray-900">Port 4001</p>
              </div>
              <div className={`p-2 rounded-full ${serverStatus.socket ? 'bg-green-100' : 'bg-red-100'}`}>
                {serverStatus.socket ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-red-600" />
                )}
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {serverStatus.socket ? 'Running' : 'Down'}
            </p>
            {serverStatus.httpStatus && (
              <p className="text-xs text-gray-400 mt-1">
                Status: {serverStatus.httpStatus}
              </p>
            )}
          </div>

          {/* Socket Connection Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Socket Connection</p>
                <p className="text-2xl font-bold text-gray-900">
                  {socketStatus.connected ? 'Connected' : socketStatus.connecting ? 'Connecting' : 'Disconnected'}
                </p>
              </div>
              <div className={`p-2 rounded-full ${
                socketStatus.connected ? 'bg-green-100' : 
                socketStatus.connecting ? 'bg-yellow-100' : 'bg-red-100'
              }`}>
                {socketStatus.connected ? (
                  <Wifi className="w-6 h-6 text-green-600" />
                ) : socketStatus.connecting ? (
                  <Clock className="w-6 h-6 text-yellow-600" />
                ) : (
                  <WifiOff className="w-6 h-6 text-red-600" />
                )}
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {socketStatus.lastPing ? `${socketStatus.lastPing}ms` : 'No ping data'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Connections: {socketStatus.totalConnections}
            </p>
          </div>

          {/* Worker Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Worker</p>
                <p className="text-2xl font-bold text-gray-900">
                  {serverStatus.worker ? 'Running' : 'Unknown'}
                </p>
              </div>
              <div className={`p-2 rounded-full ${serverStatus.worker ? 'bg-green-100' : 'bg-gray-100'}`}>
                {serverStatus.worker ? (
                  <Activity className="w-6 h-6 text-green-600" />
                ) : (
                  <Server className="w-6 h-6 text-gray-600" />
                )}
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Last check: {serverStatus.lastCheck.toLocaleTimeString()}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Actions</h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={testSocketConnection}
              disabled={isTesting}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isTesting ? 'animate-spin' : ''}`} />
              {isTesting ? 'Testing...' : 'Comprehensive Test'}
            </button>
            
            <button
              onClick={checkServerStatus}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Server className="w-4 h-4" />
              Check Server Status
            </button>
            
            <button
              onClick={sendPing}
              disabled={!socketStatus.connected}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              <Network className="w-4 h-4" />
              Send Ping
            </button>

            <button
              onClick={exportLogs}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
            >
              <Terminal className="w-4 h-4" />
              Export Logs
            </button>

            <button
              onClick={clearAllData}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <Settings className="w-4 h-4" />
              Clear All Data
            </button>
          </div>
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Connection Test Results</h2>
            <div className="space-y-4">
              {testResults.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      result.success ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {result.success ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {result.type === 'localhost' ? 'Localhost:4001' : 
                         result.type === 'domain' ? 'Domain Socket' : 'HTTP Endpoint'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {result.success ? result.details : `Error: ${result.error}`}
                      </p>
                      <p className="text-xs text-gray-500">
                        Response time: {result.responseTime}ms | {result.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {result.success ? 'PASS' : 'FAIL'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Connection Details */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Connection Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Socket Status</h3>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Connected:</span> {socketStatus.connected ? 'Yes' : 'No'}</p>
                <p><span className="font-medium">Connecting:</span> {socketStatus.connecting ? 'Yes' : 'No'}</p>
                <p><span className="font-medium">Connection Time:</span> {socketStatus.connectionTime?.toLocaleString() || 'N/A'}</p>
                <p><span className="font-medium">Last Ping:</span> {socketStatus.lastPing ? `${socketStatus.lastPing}ms` : 'N/A'}</p>
                <p><span className="font-medium">Disconnect Reason:</span> {socketStatus.disconnectReason || 'N/A'}</p>
                <p><span className="font-medium">Reconnect Attempts:</span> {socketStatus.reconnectAttempts}</p>
                <p><span className="font-medium">Total Connections:</span> {socketStatus.totalConnections}</p>
              </div>
            </div>
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Error Information</h3>
              <div className="space-y-2 text-sm">
                {socketStatus.error ? (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 font-medium">Connection Error:</p>
                    <p className="text-red-700">{socketStatus.error}</p>
                  </div>
                ) : (
                  <p className="text-gray-500">No errors detected</p>
                )}
                {serverStatus.errorDetails && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mt-3">
                    <p className="text-yellow-800 font-medium">Server Error:</p>
                    <p className="text-yellow-700">{serverStatus.errorDetails}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Connection History */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Connection History</h2>
          <div className="max-h-48 overflow-y-auto">
            {connectionHistory.length === 0 ? (
              <p className="text-gray-500">No connection history yet...</p>
            ) : (
              <div className="space-y-2">
                {connectionHistory.map((entry, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                    <span className="text-xs text-gray-500">{entry.timestamp.toLocaleTimeString()}</span>
                    <span className="font-medium text-gray-700">{entry.event}</span>
                    <span className="text-sm text-gray-600">{entry.details}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Live Logs */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Live Logs</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setLogs([])}
                className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded"
              >
                Clear Logs
              </button>
              <span className="text-sm text-gray-500">
                {logs.length} entries
              </span>
            </div>
          </div>
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm h-80 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-500">No logs yet...</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
