import React from 'react';
import { Wifi, WifiOff, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { SocketState, getSocketStatusText, getSocketStatusColor } from '@/lib/socket-utils';

interface SocketStatusIndicatorProps {
  state: SocketState;
  onReconnect?: () => void;
  showText?: boolean;
  showReconnectButton?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function SocketStatusIndicator({
  state,
  onReconnect,
  showText = true,
  showReconnectButton = true,
  size = 'md',
  className = ''
}: SocketStatusIndicatorProps) {
  const statusText = getSocketStatusText(state);
  const statusColor = getSocketStatusColor(state);
  
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const getStatusIcon = () => {
    if (state.isConnecting) {
      return <Loader2 className={`${sizeClasses[size]} animate-spin text-yellow-500`} />;
    }
    
    if (state.isReconnecting) {
      return <RefreshCw className={`${sizeClasses[size]} animate-spin text-orange-500`} />;
    }
    
    if (state.isConnected) {
      return <Wifi className={`${sizeClasses[size]} text-green-500`} />;
    }
    
    if (state.error) {
      return <AlertCircle className={`${sizeClasses[size]} text-red-500`} />;
    }
    
    return <WifiOff className={`${sizeClasses[size]} text-gray-500`} />;
  };

  const getStatusDescription = () => {
    if (state.isConnecting) return 'Connecting...';
    if (state.isReconnecting) return `Reconnecting... (${state.connectionAttempts}/${state.connectionAttempts || 5})`;
    if (state.isConnected) return 'Connected';
    if (state.error) return state.error;
    return 'Disconnected';
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Status Icon */}
      <div className="flex-shrink-0">
        {getStatusIcon()}
      </div>

      {/* Status Text */}
      {showText && (
        <div className="flex flex-col">
          <span className={`font-medium ${textSizeClasses[size]} ${statusColor}`}>
            {statusText}
          </span>
          <span className={`text-xs text-gray-500 ${size === 'sm' ? 'hidden' : ''}`}>
            {getStatusDescription()}
          </span>
        </div>
      )}

      {/* Reconnect Button */}
      {showReconnectButton && onReconnect && !state.isConnected && !state.isConnecting && (
        <button
          onClick={onReconnect}
          disabled={state.isReconnecting}
          className={`
            flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md
            transition-colors duration-200
            ${state.isReconnecting 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : 'bg-blue-50 text-blue-600 hover:bg-blue-100 active:bg-blue-200'
            }
          `}
          title="Reconnect to server"
        >
          <RefreshCw className={`w-3 h-3 ${state.isReconnecting ? 'animate-spin' : ''}`} />
          {state.isReconnecting ? 'Reconnecting...' : 'Reconnect'}
        </button>
      )}

      {/* Connection Stats (for larger sizes) */}
      {size === 'lg' && state.lastConnectedAt && (
        <div className="ml-2 text-xs text-gray-400 border-l pl-2">
          <div>Last connected: {state.lastConnectedAt.toLocaleTimeString()}</div>
          {state.lastDisconnectedAt && (
            <div>Last disconnected: {state.lastDisconnectedAt.toLocaleTimeString()}</div>
          )}
        </div>
      )}
    </div>
  );
}

// Compact version for headers and small spaces
export function CompactSocketStatus({ state, onReconnect }: { state: SocketState; onReconnect?: () => void }) {
  return (
    <SocketStatusIndicator
      state={state}
      onReconnect={onReconnect}
      showText={false}
      showReconnectButton={false}
      size="sm"
      className="flex-shrink-0"
    />
  );
}

// Banner version for prominent display
export function SocketStatusBanner({ 
  state, 
  onReconnect 
}: { 
  state: SocketState; 
  onReconnect?: () => void;
}) {
  if (state.isConnected) return null;

  return (
    <div className="bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-400 p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SocketStatusIndicator
            state={state}
            showReconnectButton={false}
            size="lg"
          />
          <div>
            <h3 className="text-sm font-medium text-red-800">
              Connection Issue
            </h3>
            <p className="text-sm text-red-700">
              {state.error || 'Unable to connect to the quiz server. Some features may not work properly.'}
            </p>
          </div>
        </div>
        
        {onReconnect && (
          <button
            onClick={onReconnect}
            disabled={state.isConnecting || state.isReconnecting}
            className={`
              px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200
              ${state.isConnecting || state.isReconnecting
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800'
              }
            `}
          >
            {state.isConnecting || state.isReconnecting ? 'Connecting...' : 'Reconnect'}
          </button>
        )}
      </div>
    </div>
  );
}
