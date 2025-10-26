import { useState, useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { 
  SocketManager, 
  SocketConfig, 
  SocketEventHandlers, 
  SocketState 
} from '@/lib/socket-utils';

export interface UseSocketOptions {
  autoConnect?: boolean;
  autoReconnect?: boolean;
  onConnect?: (socket: Socket) => void;
  onDisconnect?: (reason: string) => void;
  onError?: (error: Error) => void;
}

export interface UseSocketReturn {
  socket: Socket | null;
  socketManager: SocketManager | null;
  state: SocketState;
  isConnected: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;
  error: string | null;
  connect: () => Promise<Socket>;
  disconnect: () => void;
  reconnect: () => void;
  emit: (event: string, data?: any) => boolean;
  getState: () => SocketState;
}

export function useSocket(
  config: SocketConfig | null,
  eventHandlers: SocketEventHandlers = {},
  options: UseSocketOptions = {}
): UseSocketReturn {
  const [state, setState] = useState<SocketState>({
    isConnected: false,
    isConnecting: false,
    isReconnecting: false,
    connectionAttempts: 0,
    lastConnectedAt: null,
    lastDisconnectedAt: null,
    error: null,
    roomId: config?.roomId || null,
    participantCount: 0
  });

  const socketManagerRef = useRef<SocketManager | null>(null);
  const isInitializedRef = useRef(false);

  // Initialize socket manager when config changes
  useEffect(() => {
    if (!config || !validateSocketConfig(config)) {
      console.warn('Invalid socket config, cannot initialize socket manager');
      return;
    }

    // Clean up existing manager
    if (socketManagerRef.current) {
      socketManagerRef.current.destroy();
    }

    // Create new manager
    const manager = new SocketManager(config, {
      ...eventHandlers,
      onConnect: (socket: Socket) => {
        setState(prev => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          isReconnecting: false,
          connectionAttempts: 0,
          lastConnectedAt: new Date(),
          error: null
        }));
        eventHandlers.onConnect?.(socket);
        options.onConnect?.(socket);
      },
      onDisconnect: (reason: string) => {
        setState(prev => ({
          ...prev,
          isConnected: false,
          lastDisconnectedAt: new Date()
        }));
        eventHandlers.onDisconnect?.(reason);
        options.onDisconnect?.(reason);
      },
      onConnectError: (error: Error) => {
        setState(prev => ({
          ...prev,
          isConnecting: false,
          error: error.message,
          connectionAttempts: prev.connectionAttempts + 1
        }));
        eventHandlers.onConnectError?.(error);
        options.onError?.(error);
      },
      onReconnect: (attemptNumber: number) => {
        setState(prev => ({
          ...prev,
          isConnected: true,
          isReconnecting: false,
          connectionAttempts: 0,
          lastConnectedAt: new Date(),
          error: null
        }));
        eventHandlers.onReconnect?.(attemptNumber);
      },
      onReconnectError: (error: Error) => {
        setState(prev => ({
          ...prev,
          isReconnecting: true,
          error: error.message,
          connectionAttempts: prev.connectionAttempts + 1
        }));
        eventHandlers.onReconnectError?.(error);
        options.onError?.(error);
      },
              onReconnectFailed: () => {
          setState(prev => ({
            ...prev,
            isReconnecting: false,
            error: 'Failed to reconnect after all attempts',
            connectionAttempts: prev.connectionAttempts || 5
          }));
          eventHandlers.onReconnectFailed?.();
        }
    });

    socketManagerRef.current = manager;
    isInitializedRef.current = true;

    // Auto-connect if enabled
    if (options.autoConnect !== false) {
      manager.connect().catch((error) => {
        console.error('Auto-connect failed:', error);
        setState(prev => ({
          ...prev,
          isConnecting: false,
          error: error.message
        }));
      });
    }

    // Cleanup function
    return () => {
      if (manager) {
        manager.destroy();
      }
      socketManagerRef.current = null;
      isInitializedRef.current = false;
    };
  }, [config?.roomId, config?.walletAddress, config?.userId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socketManagerRef.current) {
        socketManagerRef.current.destroy();
        socketManagerRef.current = null;
      }
      isInitializedRef.current = false;
    };
  }, []);

  // Connect method
  const connect = useCallback(async (): Promise<Socket> => {
    if (!socketManagerRef.current) {
      throw new Error('Socket manager not initialized');
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));
    
    try {
      const socket = await socketManagerRef.current.connect();
      return socket;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      setState(prev => ({ 
        ...prev, 
        isConnecting: false, 
        error: errorMessage 
      }));
      throw error;
    }
  }, []);

  // Disconnect method
  const disconnect = useCallback(() => {
    if (socketManagerRef.current) {
      socketManagerRef.current.disconnect();
    }
  }, []);

  // Reconnect method
  const reconnect = useCallback(() => {
    if (socketManagerRef.current) {
      socketManagerRef.current.reconnect();
    }
  }, []);

  // Emit method
  const emit = useCallback((event: string, data?: any): boolean => {
    if (!socketManagerRef.current) {
      console.warn('Cannot emit event - socket manager not initialized');
      return false;
    }
    return socketManagerRef.current.emit(event, data);
  }, []);

  // Get state method
  const getState = useCallback((): SocketState => {
    if (!socketManagerRef.current) {
      return state;
    }
    return socketManagerRef.current.getState();
  }, [state]);

  // Sync state with manager state
  useEffect(() => {
    if (!socketManagerRef.current) return;

    const syncState = () => {
      const managerState = socketManagerRef.current!.getState();
      setState(prev => ({
        ...prev,
        ...managerState,
        // Preserve local state for properties that shouldn't be overridden
        roomId: managerState.roomId || prev.roomId,
        participantCount: managerState.participantCount || prev.participantCount
      }));
    };

    // Initial sync
    syncState();

    // Set up periodic sync for state consistency
    const interval = setInterval(syncState, 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    socket: socketManagerRef.current?.getSocket() || null,
    socketManager: socketManagerRef.current,
    state,
    isConnected: state.isConnected,
    isConnecting: state.isConnecting,
    isReconnecting: state.isReconnecting,
    error: state.error,
    connect,
    disconnect,
    reconnect,
    emit,
    getState
  };
}

// Utility function to validate socket config
function validateSocketConfig(config: SocketConfig): boolean {
  return !!(config.roomId && config.walletAddress);
}

// Export the hook and related types
export type { SocketConfig, SocketEventHandlers, SocketState };
export { SocketManager } from '@/lib/socket-utils';
