import { io, Socket } from 'socket.io-client';
import { getSocketUrl } from '@/config/environment';

export interface SocketConfig {
  roomId: string;
  walletAddress: string;
  userId?: string;
  userName?: string; // Add user name for better identification
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  reconnectionDelayMax?: number;
  timeout?: number;
  transports?: string[];
}

export interface SocketState {
  isConnected: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;
  connectionAttempts: number;
  lastConnectedAt: Date | null;
  lastDisconnectedAt: Date | null;
  error: string | null;
  roomId: string | null;
  participantCount: number;
}

export interface SocketEventHandlers {
  onConnect?: (socket: Socket) => void;
  onDisconnect?: (reason: string) => void;
  onConnectError?: (error: Error) => void;
  onReconnect?: (attemptNumber: number) => void;
  onReconnectError?: (error: Error) => void;
  onReconnectFailed?: () => void;
  onParticipantJoined?: (participant: any) => void;
  onParticipantLeft?: (participantId: string) => void;
  onParticipantReady?: (participantId: string) => void;
  onParticipantReadyUpdated?: (data: { participantId: string; isReady: boolean; userId: string }) => void;
  onRoomStatsUpdate?: (data: any) => void;
  onGameStarting?: (countdownTime: number) => void;
  onCountdownUpdate?: (timeLeft: number) => void;
  onCountdownRestarted?: (data: { message: string; timestamp: string }) => void;
  onAdminMessage?: (data: { message: string; timestamp: string }) => void;
  onQuestionStart?: (question: any) => void;
  onQuestionEnd?: () => void;
  onQuestionTimeUpdate?: (timeLeft: number) => void;
  onAnswerReveal?: (data: { questionId: string; correctAnswer: string; userAnswers: Array<{ userId: string; answerId: string; isCorrect: boolean; points: number }> }) => void;
  onLeaderboardUpdate?: (newLeaderboard: Array<{ userId: string; score: number; name: string }>) => void;
  onRedirectToLeaderboard?: (data: { snarkelId: string; message: string }) => void;
  onRewardsDistributed?: (data: { success: boolean; message: string; results?: any[]; error?: string }) => void;
  onGameEnd?: (results: any) => void;
  onRoomEmpty?: () => void;
  onRoomReset?: (data: { message: string; timestamp: string }) => void;
  onConnectionHealth?: (health: { latency: number; status: string }) => void;
}

export class SocketManager {
  private socket: Socket | null = null;
  private config: SocketConfig;
  private eventHandlers: SocketEventHandlers;
  private state: SocketState;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private maxReconnectionAttempts: number;
  private isManualDisconnect: boolean = false;
  private roomConnectionAttempts: number = 0;
  private maxRoomConnectionAttempts: number = 3;

  constructor(config: SocketConfig, eventHandlers: SocketEventHandlers = {}) {
    this.config = config;
    this.eventHandlers = eventHandlers;
    this.maxReconnectionAttempts = config.reconnectionAttempts || 5;
    
    this.state = {
      isConnected: false,
      isConnecting: false,
      isReconnecting: false,
      connectionAttempts: 0,
      lastConnectedAt: null,
      lastDisconnectedAt: null,
      error: null,
      roomId: config.roomId,
      participantCount: 0
    };
  }

  // Initialize socket connection with optimized settings and room-specific handling
  public connect(): Promise<Socket> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve(this.socket);
        return;
      }

      this.isManualDisconnect = false;
      this.state.isConnecting = true;
      this.state.error = null;

      // Disconnect existing socket if it exists
      if (this.socket) {
        this.socket.disconnect();
      }

      console.log('Initializing socket connection to room...', {
        url: getSocketUrl(),
        roomId: this.config.roomId,
        walletAddress: this.config.walletAddress,
        userName: this.config.userName
      });

      this.socket = io(getSocketUrl(), {
        query: {
          roomId: this.config.roomId,
          walletAddress: this.config.walletAddress,
          userId: this.config.userId,
          userName: this.config.userName
        },
        // Optimized reconnection settings
        reconnection: true,
        reconnectionAttempts: this.maxReconnectionAttempts,
        reconnectionDelay: this.config.reconnectionDelay || 1000,
        reconnectionDelayMax: this.config.reconnectionDelayMax || 5000,
        timeout: this.config.timeout || 20000,
        // Transport optimization
        transports: this.config.transports || ['websocket', 'polling'],
        upgrade: true,
        rememberUpgrade: true,
        // Connection optimization
        forceNew: true,
        // Add connection metadata
        extraHeaders: {
          'X-Client-Type': 'quiz-room',
          'X-Client-Version': '1.0.0',
          'X-Room-ID': this.config.roomId
        }
      });

      this.setupEventHandlers();
      this.setupConnectionHandlers(resolve, reject);
      this.setupRoomSpecificHandlers();
    });
  }

  // Setup room-specific event handlers
  private setupRoomSpecificHandlers(): void {
    if (!this.socket) return;

    // Room-specific events
    this.socket.on('roomJoined', (data: any) => {
      console.log('Successfully joined room:', data);
      this.state.participantCount = data.participantCount || 0;
      this.eventHandlers.onRoomStatsUpdate?.(data);
    });

    this.socket.on('roomStatsUpdate', (data: any) => {
      this.state.participantCount = data.currentParticipants || 0;
      this.eventHandlers.onRoomStatsUpdate?.(data);
    });

    this.socket.on('roomEmpty', () => {
      console.log('Room is now empty');
      this.eventHandlers.onRoomEmpty?.();
    });

    // Connection health monitoring
    this.socket.on('pong', (latency: number) => {
      this.eventHandlers.onConnectionHealth?.({
        latency,
        status: 'healthy'
      });
    });
  }

  // Setup optimized event handlers
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Core connection events
    this.socket.on('connect', () => {
      console.log('Socket connected successfully to room', {
        socketId: this.socket?.id,
        roomId: this.config.roomId,
        walletAddress: this.config.walletAddress,
        userName: this.config.userName
      });

      this.state.isConnected = true;
      this.state.isConnecting = false;
      this.state.isReconnecting = false;
      this.state.connectionAttempts = 0;
      this.state.lastConnectedAt = new Date();
      this.state.error = null;

      // Reset room connection attempts on successful connection
      this.roomConnectionAttempts = 0;

      this.eventHandlers.onConnect?.(this.socket!);
      this.startHealthCheck();
      
      // Immediately try to join the room
      this.joinRoom();
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('Socket disconnected from room', { reason, socketId: this.socket?.id });
      
      this.state.isConnected = false;
      this.state.lastDisconnectedAt = new Date();

      if (reason === 'io client disconnect') {
        this.isManualDisconnect = true;
        this.stopHealthCheck();
        this.eventHandlers.onDisconnect?.(reason);
        return;
      }

      // Handle unexpected disconnections with room-specific logic
      this.handleRoomDisconnection(reason);
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('Socket connection error to room:', error);
      
      this.state.isConnecting = false;
      this.state.error = error.message;
      this.state.connectionAttempts++;

      this.eventHandlers.onConnectError?.(error);
      
      // Attempt reconnection if not manual disconnect
      if (!this.isManualDisconnect && this.state.connectionAttempts < this.maxReconnectionAttempts) {
        this.scheduleReconnection();
      }
    });

    // Reconnection events
    this.socket.on('reconnect', (attemptNumber: number) => {
      console.log('Socket reconnected to room', { attemptNumber, socketId: this.socket?.id });
      
      this.state.isConnected = true;
      this.state.isReconnecting = false;
      this.state.connectionAttempts = 0;
      this.state.lastConnectedAt = new Date();
      this.state.error = null;

      this.eventHandlers.onReconnect?.(attemptNumber);
      this.startHealthCheck();
      
      // Rejoin room after reconnection
      this.joinRoom();
    });

    this.socket.on('reconnect_error', (error: Error) => {
      console.error('Socket reconnection error to room:', error);
      
      this.state.isReconnecting = true;
      this.state.error = error.message;
      this.state.connectionAttempts++;

      this.eventHandlers.onReconnectError?.(error);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('Socket reconnection failed after all attempts');
      
      this.state.isReconnecting = false;
      this.state.error = 'Failed to reconnect after all attempts';
      this.state.connectionAttempts = this.maxReconnectionAttempts;

      this.eventHandlers.onReconnectFailed?.();
      this.stopHealthCheck();
    });

    // Quiz-specific events
    this.socket.on('participantJoined', (participant: any) => {
      this.eventHandlers.onParticipantJoined?.(participant);
    });

    this.socket.on('participantLeft', (participantId: string) => {
      this.eventHandlers.onParticipantLeft?.(participantId);
    });

    this.socket.on('participantReady', (participantId: string) => {
      this.eventHandlers.onParticipantReady?.(participantId);
    });

    this.socket.on('participantReadyUpdated', (data: { participantId: string; isReady: boolean; userId: string }) => {
      this.eventHandlers.onParticipantReadyUpdated?.(data);
    });

    this.socket.on('gameStarting', (countdownTime: number) => {
      this.eventHandlers.onGameStarting?.(countdownTime);
    });

    this.socket.on('countdownUpdate', (timeLeft: number) => {
      this.eventHandlers.onCountdownUpdate?.(timeLeft);
    });

    this.socket.on('countdownRestarted', (data: { message: string; timestamp: string }) => {
      this.eventHandlers.onCountdownRestarted?.(data);
    });

    this.socket.on('adminMessageReceived', (data: { message: string; timestamp: string }) => {
      this.eventHandlers.onAdminMessage?.(data);
    });

    this.socket.on('tvMessage', (message: string) => {
      // Handle TV message updates
      console.log('TV message received:', message);
    });

    this.socket.on('participantJoined', (data: { walletAddress: string; timestamp: string }) => {
      // Handle legacy participant joined event
      console.log('Legacy participant joined:', data);
    });

    this.socket.on('participantLeft', (participantId: string) => {
      // Handle legacy participant left event
      console.log('Legacy participant left:', participantId);
    });

    this.socket.on('gameStarting', (countdownTime: number) => {
      // Handle legacy game starting event
      console.log('Legacy game starting:', countdownTime);
    });

    this.socket.on('countdownUpdate', (timeLeft: number) => {
      // Handle legacy countdown update event
      console.log('Legacy countdown update:', timeLeft);
    });

    this.socket.on('adminMessageReceived', (data: { message: string; timestamp: string }) => {
      // Handle legacy admin message event
      console.log('Legacy admin message:', data);
    });

    this.socket.on('questionStart', (question: any) => {
      // Handle legacy question start event
      console.log('Legacy question start:', question);
      this.eventHandlers.onQuestionStart?.(question);
    });

    this.socket.on('questionEnd', () => {
      this.eventHandlers.onQuestionEnd?.();
    });

    this.socket.on('questionTimeUpdate', (timeLeft: number) => {
      this.eventHandlers.onQuestionTimeUpdate?.(timeLeft);
    });

    this.socket.on('answerReveal', (data: { questionId: string; correctAnswer: string; userAnswers: Array<{ userId: string; answerId: string; isCorrect: boolean; points: number }> }) => {
      this.eventHandlers.onAnswerReveal?.(data);
    });

    this.socket.on('leaderboardUpdate', (newLeaderboard: Array<{ userId: string; score: number; name: string }>) => {
      this.eventHandlers.onLeaderboardUpdate?.(newLeaderboard);
    });

    this.socket.on('redirectToLeaderboard', (data: { snarkelId: string; message: string }) => {
      this.eventHandlers.onRedirectToLeaderboard?.(data);
    });

    this.socket.on('rewardsDistributed', (data: { success: boolean; message: string; results?: any[]; error?: string }) => {
      this.eventHandlers.onRewardsDistributed?.(data);
    });

    this.socket.on('gameEnd', (results: any) => {
      this.eventHandlers.onGameEnd?.(results);
    });

    this.socket.on('roomEmpty', () => {
      this.eventHandlers.onRoomEmpty?.();
    });

    this.socket.on('roomReset', (data: { message: string; timestamp: string }) => {
      this.eventHandlers.onRoomReset?.(data);
    });

    this.socket.on('error', (error: string) => {
      console.error('Socket error:', error);
    });
  }

  // Join room with retry logic
  private joinRoom(): void {
    if (!this.socket?.connected) {
      console.log('Cannot join room - socket not connected');
      return;
    }

    console.log('Attempting to join room:', this.config.roomId);
    
    this.socket.emit('joinRoom', {
      roomId: this.config.roomId,
      walletAddress: this.config.walletAddress,
      userId: this.config.userId,
      userName: this.config.userName
    });

    // Set up room join timeout
    setTimeout(() => {
      if (this.state.participantCount === 0 && this.roomConnectionAttempts < this.maxRoomConnectionAttempts) {
        console.log('Room join timeout, retrying...');
        this.roomConnectionAttempts++;
        this.joinRoom();
      }
    }, 5000);
  }

  // Handle room-specific disconnections
  private handleRoomDisconnection(reason: string): void {
    if (this.isManualDisconnect) return;

    console.log('Handling room disconnection:', reason);
    
    // For room-specific issues, try to reconnect immediately
    if (['transport error', 'ping timeout', 'server namespace disconnect', 'room_full', 'room_closed'].includes(reason)) {
      console.log('Room-specific disconnection, attempting immediate reconnection');
      this.scheduleReconnection(1000);
    } else {
      // Exponential backoff for other disconnection reasons
      const delay = Math.min(1000 * Math.pow(2, this.state.connectionAttempts), 10000);
      this.scheduleReconnection(delay);
    }
  }

  // Setup connection promise handlers
  private setupConnectionHandlers(resolve: (socket: Socket) => void, reject: (error: Error) => void): void {
    if (!this.socket) return;

    const connectionTimeout = setTimeout(() => {
      reject(new Error('Connection timeout'));
    }, this.config.timeout || 20000);

    this.socket.once('connect', () => {
      clearTimeout(connectionTimeout);
      resolve(this.socket!);
    });

    this.socket.once('connect_error', (error: Error) => {
      clearTimeout(connectionTimeout);
      reject(error);
    });
  }

  // Handle unexpected disconnections with smart reconnection
  private handleUnexpectedDisconnection(reason: string): void {
    if (this.isManualDisconnect) return;

    console.log('Handling unexpected disconnection:', reason);
    
    // Immediate reconnection for certain error types
    if (['transport error', 'ping timeout', 'server namespace disconnect'].includes(reason)) {
      console.log('Attempting immediate reconnection for:', reason);
      this.scheduleReconnection(1000);
    } else {
      // Exponential backoff for other disconnection reasons
      const delay = Math.min(1000 * Math.pow(2, this.state.connectionAttempts), 10000);
      this.scheduleReconnection(delay);
    }
  }

  // Schedule reconnection with exponential backoff
  private scheduleReconnection(delay: number = 1000): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.state.connectionAttempts >= this.maxReconnectionAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }

    this.state.isReconnecting = true;
    console.log(`Scheduling reconnection in ${delay}ms (attempt ${this.state.connectionAttempts + 1})`);

    this.reconnectTimer = setTimeout(() => {
      if (this.socket && !this.isManualDisconnect) {
        console.log('Attempting reconnection...');
        this.socket.connect();
      }
    }, delay);
  }

  // Health check to detect stale connections
  private startHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(() => {
      if (this.socket && this.socket.connected) {
        // Send a ping to check connection health
        this.socket.emit('ping');
      } else {
        console.log('Health check failed - socket not connected');
        this.stopHealthCheck();
      }
    }, 30000); // Check every 30 seconds
  }

  private stopHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  // Public methods for external use
  public getSocket(): Socket | null {
    return this.socket;
  }

  public getState(): SocketState {
    return { ...this.state };
  }

  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  public emit(event: string, data?: any): boolean {
    if (!this.socket?.connected) {
      console.warn('Cannot emit event - socket not connected:', event);
      return false;
    }
    
    this.socket.emit(event, data);
    return true;
  }

  public disconnect(): void {
    this.isManualDisconnect = true;
    this.stopHealthCheck();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.disconnect();
    }

    this.state.isConnected = false;
    this.state.isConnecting = false;
    this.state.isReconnecting = false;
  }

  public reconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
    
    this.isManualDisconnect = false;
    this.state.connectionAttempts = 0;
    this.roomConnectionAttempts = 0;
    this.connect();
  }

  // Cleanup method
  public destroy(): void {
    this.disconnect();
    this.socket = null;
    this.state = {
      isConnected: false,
      isConnecting: false,
      isReconnecting: false,
      connectionAttempts: 0,
      lastConnectedAt: null,
      lastDisconnectedAt: null,
      error: null,
      roomId: null,
      participantCount: 0
    };
  }
}

// Utility functions for socket management
export const createSocketManager = (config: SocketConfig, eventHandlers: SocketEventHandlers = {}): SocketManager => {
  return new SocketManager(config, eventHandlers);
};

export const validateSocketConfig = (config: SocketConfig): boolean => {
  return !!(config.roomId && config.walletAddress);
};

export const getSocketStatusText = (state: SocketState): string => {
  if (state.isConnected) return 'Connected';
  if (state.isConnecting) return 'Connecting...';
  if (state.isReconnecting) return 'Reconnecting...';
  if (state.error) return 'Error';
  return 'Disconnected';
};

export const getSocketStatusColor = (state: SocketState): string => {
  if (state.isConnected) return 'text-green-500';
  if (state.isConnecting) return 'text-yellow-500';
  if (state.isReconnecting) return 'text-orange-500';
  if (state.error) return 'text-red-500';
  return 'text-gray-500';
};
