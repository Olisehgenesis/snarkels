'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { isValidWalletAddress } from '@/lib/wallet-utils';
import { useQuizContract } from '@/hooks/useViemContract';
import { useSocket, SocketConfig, SocketEventHandlers } from '@/hooks/useSocket';
import { 
  Users, 
  Clock, 
  Trophy, 
  Star, 
  Play, 
  Pause, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Gamepad2,
  Sparkles,
  Award,
  BarChart3,
  Target,
  Zap,
  MessageSquare,
  Wallet,
  Settings,
  Crown,
  Coins,
  LogOut,
  AlertTriangle
} from 'lucide-react';
import WalletConnectButton from '@/components/WalletConnectButton';
import AdminControls from '@/components/AdminControls';
import { getSocketUrl } from '@/config/environment';
import { sdk } from '@farcaster/miniapp-sdk';

interface Participant {
  id: string;
  userId: string;
  isAdmin: boolean;
  isReady: boolean;
  joinedAt: string;
  user: {
    id: string;
    address: string;
    name: string;
  };
}

interface Room {
  id: string;
  name: string;
  currentParticipants: number;
  maxParticipants: number;
  minParticipants: number;
  isWaiting: boolean;
  isStarted: boolean;
  isFinished: boolean;
  countdownDuration: number;
  sessionNumber?: number;
  scheduledStartTime?: string;
  snarkel?: Snarkel;
}

interface Snarkel {
  id: string;
  title: string;
  description: string;
  totalQuestions: number;
  basePointsPerQuestion: number;
  speedBonusEnabled: boolean;
  maxSpeedBonus: number;
  rewardsEnabled?: boolean;
}

interface Question {
  id: string;
  text: string;
  timeLimit: number;
  options: Array<{
    id: string;
    text: string;
    isCorrect: boolean;
  }>;
}

export default function QuizRoomPage() {
  const params = useParams();
  const router = useRouter();
  const { address, isConnected } = useAccount();
  
  // Get route parameters
  const snarkelId = params.snarkelId as string;
  const roomId = params.roomId as string;
  
  // Initialize rewards functionality
  const {
    areRewardsDistributed,
    getExpectedRewardToken,
    getExpectedRewardAmount
  } = useQuizContract();
  
  // Core state
  const [room, setRoom] = useState<Room | null>(null);
  const [snarkel, setSnarkel] = useState<Snarkel | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  
  // Game state
  const [gameState, setGameState] = useState<'waiting' | 'countdown' | 'playing' | 'finished'>('waiting');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [questionTimeLeft, setQuestionTimeLeft] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [leaderboard, setLeaderboard] = useState<Array<{userId: string, score: number, name: string}>>([]);
  
  // UI state
  const [showCountdownModal, setShowCountdownModal] = useState(false);
  const [countdownTime, setCountdownTime] = useState<number>(1);
  const [showAdminControls, setShowAdminControls] = useState(false);
  const [showCountdownDisplay, setShowCountdownDisplay] = useState(false);
  const [countdownDisplay, setCountdownDisplay] = useState<number>(0);
  const [showAnswerReveal, setShowAnswerReveal] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState<{questionId: string, correctAnswer: string, userAnswers: Array<{userId: string, answerId: string, isCorrect: boolean, points: number}>} | null>(null);
  const [showQuestionComplete, setShowQuestionComplete] = useState(false);
  const [showNextQuestion, setShowNextQuestion] = useState(false);
  
  // Debug state
  const [debugStopRequested, setDebugStopRequested] = useState(false);
  const [debugStopReason, setDebugStopReason] = useState<string>('');
  
  // Notifications
  const [participantLeaveNotification, setParticipantLeaveNotification] = useState<string>('');
  const [participantJoinNotification, setParticipantJoinNotification] = useState<string>('');
  const [messageSentNotification, setMessageSentNotification] = useState<string>('');
  
  // Admin features
  const [adminMessage, setAdminMessage] = useState<string>('');
  const [showAdminMessageModal, setShowAdminMessageModal] = useState(false);
  const [tvMessage, setTvMessage] = useState<string>('');
  const [showAdminMessage, setShowAdminMessage] = useState(false);
  const [adminMessageDisplay, setAdminMessageDisplay] = useState<string>('');
  const [messageProgress, setMessageProgress] = useState<number>(100);
  const [messageDuration, setMessageDuration] = useState<number>(5000);
  const [messageTimeout, setMessageTimeout] = useState<NodeJS.Timeout | null>(null);
  const [fadeTimeout, setFadeTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Future start countdown
  const [futureStartCountdown, setFutureStartCountdown] = useState<number | null>(null);
  const [showFutureStartCountdown, setShowFutureStartCountdown] = useState(false);
  
  // Participant display
  const [participantTabs, setParticipantTabs] = useState<Array<{id: string, name: string, address: string, isAdmin: boolean}>>([]);
  
  // Rewards
  const [showRewardsSection, setShowRewardsSection] = useState(false);
  const [rewardsDistributed, setRewardsDistributed] = useState(false);
  const [distributingRewards, setDistributingRewards] = useState(false);
  
  // Quiz timing
  const [quizStartTime, setQuizStartTime] = useState<Date | null>(null);
  
  // Socket configuration
  const socketConfig: SocketConfig | null = roomId && address ? {
    roomId,
    walletAddress: address,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    transports: ['websocket', 'polling']
  } : null;

  // Use the socket hook
  const {
    socket,
    state: socketState,
    isConnected: socketConnected,
    isConnecting: socketConnecting,
    isReconnecting: socketReconnecting,
    error: socketError,
    connect: socketConnect,
    disconnect: socketDisconnect,
    reconnect: socketReconnect,
    emit: socketEmit
  } = useSocket(socketConfig, {
    onConnect: (socket) => {
      console.log('Socket connected successfully to room');
      setError(null);
    },
    onDisconnect: (reason) => {
      console.log('Socket disconnected from room:', reason);
    },
    onConnectError: (error) => {
      console.error('Socket connection error:', error);
      setError(error.message);
    },
    onReconnect: (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      setError(null);
    },
    onReconnectError: (error) => {
      console.error('Socket reconnection error:', error);
      setError(error.message);
    },
    onReconnectFailed: () => {
      console.error('Socket reconnection failed after all attempts');
      setError('Failed to connect to quiz server. Please refresh the page and try again.');
    },
    onParticipantJoined: (participant) => {
      console.log('Participant joined data received:', participant);
      if (participant && participant.user?.address) {
        setParticipants(prev => [...prev, participant]);
        setParticipantTabs(prev => [...prev, {
          id: participant.id,
          name: participant.name || (participant.user?.address ? `${participant.user.address.slice(0, 6)}...${participant.user.address.slice(-4)}` : 'Unknown'),
          address: participant.user?.address || 'Unknown',
          isAdmin: participant.isAdmin
        }]);
        
        const shortAddress = participant.user?.address 
          ? `${participant.user.address.slice(0, 6)}...${participant.user.address.slice(-4)}`
          : 'Unknown';
        setParticipantJoinNotification(`User ${shortAddress} joined the room`);
        setTimeout(() => {
          setParticipantJoinNotification('');
        }, 3000);
      }
    },
    onParticipantLeft: (participantId) => {
      const leavingParticipant = participants.find(p => p.id === participantId);
      const participantName = leavingParticipant && leavingParticipant.user?.address 
        ? `${leavingParticipant.user.address.slice(0, 6)}...${leavingParticipant.user.address.slice(-4)}` 
        : 'Unknown';
      
      setParticipants(prev => prev.filter(p => p.id !== participantId));
      setParticipantTabs(prev => prev.filter(p => p.id !== participantId));
      setLeaderboard(prev => prev.filter(p => {
        return leavingParticipant ? p.userId !== leavingParticipant.userId : true;
      }));
      
      setParticipantLeaveNotification(`${participantName} left the room`);
      setTimeout(() => {
        setParticipantLeaveNotification('');
      }, 3000);
      
      console.log('Participant left:', participantId);
    },

    onRoomStatsUpdate: (data) => {
      setRoom(prev => prev ? {
        ...prev,
        currentParticipants: data.currentParticipants,
        maxParticipants: data.maxParticipants,
        minParticipants: data.minParticipants,
        isStarted: data.isStarted,
        isWaiting: data.isWaiting
      } : null);
      
      setParticipants(prev => {
        if (!data.participants || !Array.isArray(data.participants)) {
          return prev;
        }
        
        const existingParticipantsMap = new Map(prev.map(p => [p.id, p]));
        
        const mergedParticipants = data.participants.map((newParticipant: any) => {
          return newParticipant;
        });
        
        console.log('Merged participants with merged participant data:', mergedParticipants);
        return mergedParticipants;
      });
      
      if (data.participants && Array.isArray(data.participants)) {
        setParticipantTabs(data.participants.map((p: any) => ({
          id: p.id || 'unknown',
          name: p.user?.name || (p.user?.address ? `${p.user.address.slice(0, 6)}...${p.user.address.slice(-4)}` : 'Unknown'),
          address: p.user?.address || 'Unknown',
          isAdmin: p.isAdmin || false
        })));
      }
      
      console.log('Stats updated with merged participant data');
    },
    onGameStarting: (countdownTime) => {
      console.log('=== gameStarting event received ===');
      console.log('Countdown time received:', countdownTime);
      console.log('Previous gameState:', gameState);
      
      setGameState('countdown');
      setCountdown(countdownTime);
      setCountdownDisplay(countdownTime);
      setShowCountdownDisplay(true);
      setQuizStartTime(new Date());
      
      setShowFutureStartCountdown(false);
      setFutureStartCountdown(null);
      
      console.log('New gameState set to:', 'countdown');
      console.log('Countdown set to:', countdownTime);
      console.log('CountdownDisplay set to:', countdownTime);
      console.log('=== gameStarting event processed ===');
    },
    onCountdownUpdate: (timeLeft) => {
      console.log('=== countdownUpdate event received ===');
      console.log('Time left:', timeLeft);
      console.log('Current gameState:', gameState);
      
      setCountdown(timeLeft);
      setCountdownDisplay(timeLeft);
      
      if (timeLeft <= 0) {
        console.log('Countdown finished, transitioning to playing state');
        setGameState('playing');
        setShowCountdownDisplay(false);
        console.log('GameState changed to: playing');
      }
      
      console.log('=== countdownUpdate event processed ===');
    },
    onCountdownRestarted: (data) => {
      console.log('=== countdownRestarted event received ===');
      console.log('Countdown restarted data:', data);
      
      setParticipantJoinNotification(data.message);
      setTimeout(() => {
        setParticipantJoinNotification('');
      }, 5000);
      
      console.log('=== countdownRestarted event processed ===');
    },
    onRoomReset: (data) => {
      console.log('=== roomReset event received ===');
      console.log('Room reset data:', data);
      
      setParticipantJoinNotification(data.message);
      setTimeout(() => {
        setParticipantJoinNotification('');
      }, 5000);
      
      setGameState('waiting');
      setCountdown(null);
      setShowCountdownDisplay(false);
      setCurrentQuestion(null);
      setQuestionTimeLeft(0);
      setSelectedAnswers([]);
      setLeaderboard([]);
      
      console.log('=== roomReset event processed ===');
    },
    onAdminMessage: (data) => {
      setAdminMessageDisplay(data.message);
      setShowAdminMessage(true);
      setTvMessage(data.message);
      
      const wordCount = data.message.split(' ').length;
      const duration = Math.min(Math.max(wordCount * 0.5, 5), 10) * 1000;
      
      setMessageDuration(duration);
      setMessageProgress(100);
      
      const startTime = Date.now();
      const animateProgress = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.max(0, 100 - (elapsed / duration) * 100);
        setMessageProgress(progress);
        
        if (progress > 0) {
          requestAnimationFrame(animateProgress);
        }
      };
      requestAnimationFrame(animateProgress);
      
      const timeout = setTimeout(() => {
        setShowAdminMessage(false);
        setMessageProgress(0);
        const fadeOut = setTimeout(() => {
          setTvMessage('');
          setMessageProgress(100);
          setShowAdminMessage(false);
          setMessageTimeout(null);
          setFadeTimeout(null);
        }, 500);
        setFadeTimeout(fadeOut);
      }, duration);
      
      setMessageTimeout(timeout);
    },
    onQuestionStart: (question) => {
      setGameState('playing');
      setCurrentQuestion(question);
      setQuestionTimeLeft(question.timeLimit);
      setSelectedAnswers([]);
      setShowAnswerReveal(false);
      setCurrentAnswer(null);
      setShowQuestionComplete(false);
      setShowNextQuestion(false);
      
      // Check if debug stop was requested during countdown
      if (debugStopRequested) {
        console.log('Debug stop requested - stopping quiz after question starts');
        setDebugStopReason('Debug stop requested during countdown - stopping after question');
        // The question will run normally, but we'll stop after it completes
      }
    },
    onQuestionTimeUpdate: (timeLeft) => {
      setQuestionTimeLeft(timeLeft);
    },
    onAnswerReveal: (data) => {
      setShowAnswerReveal(true);
      setCurrentAnswer(data);
      setShowQuestionComplete(true);
      
      // Check if debug stop was requested - stop after this question
      if (debugStopRequested) {
        console.log('Debug stop requested - stopping quiz after answer reveal');
        setDebugStopReason('Debug stop requested - stopping after current question');
        // Stop the quiz after this question completes
        setTimeout(() => {
          if (socket && isAdmin) {
            socket.emit('endGame', { roomId: room?.id });
            setDebugStopRequested(false);
            setDebugStopReason('');
          }
        }, 5000); // Give time to show the answer reveal
        return; // Don't continue with normal flow
      }
      
      setTimeout(() => {
        setShowQuestionComplete(false);
        setShowNextQuestion(true);
        
        setTimeout(() => {
          setShowNextQuestion(false);
        }, 3000);
      }, 5000);
    },
    onLeaderboardUpdate: (newLeaderboard) => {
      setLeaderboard(newLeaderboard);
    },
    onGameEnd: (results) => {
      setGameState('finished');
      setLeaderboard(results);
      // Reset debug stop when game naturally ends
      setDebugStopRequested(false);
      setDebugStopReason('');
    },
    onRoomEmpty: () => {
      setError('All participants have left the room. The quiz has been reset.');
    }
  });

  // Helper functions

  const confirmStartGame = () => {
    if (socket && isAdmin) {
      console.log('=== confirmStartGame started ===');
      console.log('Socket:', socket);
      console.log('Is admin:', isAdmin);
      console.log('Countdown time (minutes):', countdownTime);
      
      const countdownSeconds = countdownTime * 60;
      console.log('Countdown time (seconds):', countdownSeconds);
      
      socketEmit('startGame', { countdownTime: countdownSeconds });
      
      console.log('Closing countdown modal');
      setShowCountdownModal(false);
      
      console.log('=== confirmStartGame completed ===');
    } else {
      console.log('Cannot start game:', { hasSocket: !!socket, isAdmin });
    }
  };

  const sendMessage = () => {
    if (!socketConnected) {
      console.log('Cannot send message: socket not connected');
      setError('Connection lost. Please wait for reconnection or refresh the page.');
      return;
    }
    
    if (socket && isAdmin && adminMessage.trim()) {
      const message = adminMessage.trim();
      
      console.log('Sending message:', message);
      console.log('Socket connected:', socketConnected);
      console.log('Is admin:', isAdmin);
      
      setTvMessage('');
      setMessageProgress(100);
      setShowAdminMessage(false);
      
      socketEmit('sendMessage', { message });
      
      setMessageSentNotification('Message sent successfully!');
      setAdminMessage('');
      setShowAdminMessageModal(false);
      
      setTimeout(() => {
        setMessageSentNotification('');
      }, 3000);
    } else {
      console.log('Cannot send message:', { 
        hasSocket: !!socket, 
        isAdmin, 
        hasMessage: !!adminMessage.trim(),
        socketConnected: socketConnected 
      });
    }
  };

  const selectAnswer = (optionId: string) => {
    if (selectedAnswers.includes(optionId)) {
      setSelectedAnswers(prev => prev.filter(id => id !== optionId));
    } else {
      setSelectedAnswers(prev => [...prev, optionId]);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const leaveRoom = () => {
    if (socket) {
      console.log('Leaving room, disconnecting socket...');
      socketDisconnect();
    }
    
    setError(null);
    setJoinError(null);
    
    router.push('/join');
  };

  useEffect(() => {
    // Call sdk.actions.ready() to hide Farcaster Mini App splash screen
    const callReady = async () => {
      try {
        await sdk.actions.ready();
        console.log('Farcaster Mini App ready() called successfully on quiz room page');
      } catch (error) {
        console.error('Error calling sdk.actions.ready():', error);
      }
    };
    
    callReady();
    
    // Enhanced wallet address validation
    if (!isConnected) {
      setError('Please connect your wallet to join the quiz');
      setLoading(false);
      return;
    }

    if (!address) {
      setError('No wallet address detected. Please connect your wallet and try again.');
      setLoading(false);
      return;
    }

    // Validate wallet address format
    if (!isValidWalletAddress(address)) {
      setError('Invalid wallet address format. Please ensure your wallet is properly connected.');
      setLoading(false);
      return;
    }

    if (!roomId) {
      setError('No room ID provided');
      setLoading(false);
      return;
    }

    if (roomId) {
      joinExistingRoom();
    }

    return () => {
      // Cleanup timeouts on unmount
      if (messageTimeout) {
        clearTimeout(messageTimeout);
      }
      if (fadeTimeout) {
        clearTimeout(fadeTimeout);
      }
      
      // Socket cleanup is now handled by the useSocket hook
    };
  }, [isConnected, address, roomId]);

  // Add useEffect to update isReady state when participants are loaded
  useEffect(() => {
    if (participants.length > 0 && address) {
      // Find the current user's participant and update isReady state
      const currentParticipant = participants.find(p => 
        p.user?.address?.toLowerCase() === address?.toLowerCase()
      );
      
      if (currentParticipant) {
        console.log('🔍 Participant found:', currentParticipant);
      }
    }
  }, [participants, address]);

  // Socket connection management is now handled by the useSocket hook

  // Add useEffect for future start time countdown
  useEffect(() => {
    console.log('=== Future Start Countdown useEffect triggered ===');
    console.log('Room data:', room);
    console.log('Room scheduledStartTime:', room?.scheduledStartTime);
    console.log('Room isStarted:', room?.isStarted);
    console.log('Game state:', gameState);
    console.log('Show future start countdown:', showFutureStartCountdown);
    console.log('Future start countdown value:', futureStartCountdown);
    
    if (room?.scheduledStartTime && !room.isStarted && gameState === 'waiting') {
      console.log('✅ Conditions met - showing future start countdown');
      const startTime = new Date(room.scheduledStartTime);
      const now = new Date();
      
      console.log('Start time (parsed):', startTime);
      console.log('Current time:', now);
      console.log('Time difference (ms):', startTime.getTime() - now.getTime());
      
      if (startTime > now) {
        console.log('✅ Start time is in the future - setting up countdown');
        // Quiz has a future start time
        setShowFutureStartCountdown(true);
        
        const updateCountdown = () => {
          const currentTime = new Date();
          const timeDiff = startTime.getTime() - currentTime.getTime();
          
          console.log('Countdown update - time diff (ms):', timeDiff);
          
          if (timeDiff > 0) {
            const secondsLeft = Math.floor(timeDiff / 1000);
            console.log('Setting countdown to:', secondsLeft, 'seconds');
            setFutureStartCountdown(secondsLeft);
          } else {
            console.log('❌ Start time has passed - hiding countdown');
            // Start time has passed, hide countdown
            setShowFutureStartCountdown(false);
            setFutureStartCountdown(null);
          }
        };
        
        // Update immediately
        updateCountdown();
        
        // Update every second
        const interval = setInterval(updateCountdown, 1000);
        
        return () => {
          console.log('Clearing future start countdown interval');
          clearInterval(interval);
        };
      } else {
        console.log('❌ Start time is in the past - hiding countdown');
        setShowFutureStartCountdown(false);
        setFutureStartCountdown(null);
      }
    } else {
      console.log('❌ Conditions not met for future start countdown:');
      console.log('- Has scheduledStartTime:', !!room?.scheduledStartTime);
      console.log('- Is not started:', !room?.isStarted);
      console.log('- Game state is waiting:', gameState === 'waiting');
      setShowFutureStartCountdown(false);
      setFutureStartCountdown(null);
    }
  }, [room?.scheduledStartTime, room?.isStarted, gameState]);

  // Add logging for room state changes
  useEffect(() => {
    console.log('=== Room State Changed ===');
    console.log('Room updated:', room);
    console.log('Room scheduledStartTime:', room?.scheduledStartTime);
    console.log('Room isStarted:', room?.isStarted);
    console.log('Game state:', gameState);
  }, [room, gameState]);

  const joinExistingRoom = async () => {
    try {
      setLoading(true);
      setError(null);
      setJoinError(null);

      const response = await fetch(`/api/room/${roomId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: address
        }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log('=== Room Join API Response ===');
        console.log('Full API Response:', data);
        console.log('Room data:', data.room);
        console.log('Room scheduledStartTime:', data.room?.scheduledStartTime);
        console.log('Room isStarted:', data.room?.isStarted);
        console.log('Snarkel data:', data.snarkel);
        console.log('Snarkel startTime:', data.snarkel?.startTime);
        console.log('Admin Address:', data.adminAddress);
        console.log('Snarkel Creator Address:', data.snarkelCreatorAddress);
        console.log('Current User Address:', address);
        console.log('Is Admin:', data.isAdmin);
        
        setRoom(data.room);
        setSnarkel(data.snarkel);
        setParticipants(data.participants);
        setIsAdmin(data.isAdmin);
        
        // Initialize participant tabs with existing participants
        setParticipantTabs(data.participants.map((p: any) => ({
          id: p.id,
          name: `${p.user.address.slice(0, 6)}...${p.user.address.slice(-4)}`,
          address: p.user.address,
          isAdmin: p.isAdmin
        })));
        
        // Socket connection handled by useSocket hook
      } else {
        const errorMessage = data.error || 'Failed to join room';
        setError(errorMessage);
        setJoinError(errorMessage);
      }
    } catch (err) {
      const errorMessage = 'Network error occurred';
      setError(errorMessage);
      setJoinError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  console.log('isAdmin', isAdmin);
  console.log('room', room);
  console.log("user", address);
  console.log('participants', participants);
  console.log('current user is admin?', participants.find(p => p.user?.address?.toLowerCase() === address?.toLowerCase())?.isAdmin);
  console.log('All participant addresses:', participants.map(p => ({ address: p.user?.address || 'Unknown', isAdmin: p.isAdmin, userId: p.userId })));
  console.log('Current user address:', address);
  console.log('Admin participant:', participants.find(p => p.isAdmin));

  // All socket event handling is now managed by the useSocket hook

  // Answer submission is now handled immediately when option is clicked
  // No separate submit function needed

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Gamepad2 className="w-16 h-16 mx-auto text-purple-600 mb-4" />
          <h1 className="text-2xl font-handwriting font-bold text-gray-800 mb-2">
            Connect Wallet to Join
          </h1>
          <p className="text-gray-600 mb-6">Connect your wallet to participate in the quiz</p>
          <WalletConnectButton />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Joining quiz room...</p>
        </div>
      </div>
    );
  }

  if (error || joinError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <h1 className="text-2xl font-handwriting font-bold text-gray-800 mb-2">
            Join Error
          </h1>
          <p className="text-gray-600 mb-6">{error || joinError}</p>
          <div className="space-y-3">
            <button
              onClick={() => {
                setError(null);
                setJoinError(null);
                router.push('/join');
              }}
              className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-400 transition-all duration-300 mr-3 border-2 border-purple-600 shadow-[0_4px_0_0_rgba(0,0,0,1)] hover:shadow-[0_6px_0_0_rgba(0,0,0,1)] active:shadow-[0_2px_0_0_rgba(0,0,0,1)] active:translate-y-[2px]"
            >
              Back to Join
            </button>
            <button
              onClick={() => {
                setError(null);
                setJoinError(null);
                window.location.reload();
              }}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-400 transition-all duration-300 border-2 border-blue-600 shadow-[0_4px_0_0_rgba(0,0,0,1)] hover:shadow-[0_6px_0_0_rgba(0,0,0,1)] active:shadow-[0_2px_0_0_rgba(0,0,0,1)] active:translate-y-[2px]"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Mobile-First Responsive Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-2 sm:px-4 py-2 sm:py-4">
          {/* Mobile Layout - Stacked */}
          <div className="block sm:hidden space-y-3">
            {/* Top Row - Title and Icon */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                  <Gamepad2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg sm:text-xl font-handwriting font-bold text-gray-800 truncate">
                    {snarkel?.title || 'Quiz Room'}
                  </h1>
                  <p className="text-gray-600 text-xs sm:text-sm truncate">{room?.name || 'Loading...'}</p>
                </div>
              </div>
              
              {/* Mobile Exit Button */}
              <button
                onClick={leaveRoom}
                className="flex items-center gap-1 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-400 transition-all duration-300 font-medium text-sm border-2 border-red-600 shadow-[0_4px_0_0_rgba(0,0,0,1)] hover:shadow-[0_6px_0_0_rgba(0,0,0,1)] active:shadow-[0_2px_0_0_rgba(0,0,0,1)] active:translate-y-[2px]"
              >
                <LogOut size={14} />
                <span className="hidden min-[480px]:inline">Exit</span>
              </button>
            </div>
            
            {/* Bottom Row - Wallet Status and Connect */}
            <div className="flex items-center justify-between gap-2">
              {/* Wallet Status - Compact */}
              {isConnected ? (
                <div className="flex items-center gap-2 px-2 py-1.5 bg-gradient-to-r from-green-400 to-emerald-500 rounded-lg shadow-md flex-1 min-w-0">
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse flex-shrink-0"></div>
                  <span className="font-handwriting text-xs font-medium text-white truncate">
                    {address?.slice(0, 4)}...{address?.slice(-4)}
                  </span>
                  {isAdmin && (
                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-yellow-500 rounded text-xs text-white flex-shrink-0">
                      <Trophy className="w-2.5 h-2.5" />
                      <span className="hidden min-[480px]:inline">Admin</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 px-2 py-1.5 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-lg shadow-md flex-1">
                  <Wallet className="w-3 h-3 text-gray-800" />
                  <span className="font-handwriting text-xs font-medium text-gray-800 truncate">
                    Connect Wallet
                  </span>
                </div>
              )}
              
              {/* Connection Status Indicator */}
              <div className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium ${
                socketConnected 
                  ? 'bg-green-100 text-green-700 border border-green-200' 
                  : 'bg-red-100 text-red-700 border border-red-200'
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${
                  socketConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                }`}></div>
                <span className="hidden min-[480px]:inline">
                  {socketConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              
              {/* Manual Reconnect Button - Mobile */}
              {!socketConnected && (
                <button
                  onClick={() => {
                    console.log('Manual reconnect requested');
                    socketReconnect();
                  }}
                  className="px-2 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-400 transition-all duration-300 text-xs font-medium border-2 border-blue-600 shadow-[0_4px_0_0_rgba(0,0,0,1)] hover:shadow-[0_6px_0_0_rgba(0,0,0,1)] active:shadow-[0_2px_0_0_rgba(0,0,0,1)] active:translate-y-[2px]"
                >
                  <Zap className="w-3 h-3" />
                </button>
              )}
              
              {/* Mobile Wallet Connect Button */}
              <div className="flex-shrink-0">
                <WalletConnectButton />
              </div>
            </div>
          </div>
          
          {/* Desktop Layout - Horizontal */}
          <div className="hidden sm:flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                <Gamepad2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-handwriting font-bold text-gray-800">
                  {snarkel?.title || 'Quiz Room'}
                </h1>
                <p className="text-gray-600 text-sm">{room?.name || 'Loading...'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Wallet Connection Status */}
              <div className="flex items-center gap-3">
                {isConnected ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-green-400 to-emerald-500 rounded-lg shadow-md">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    <span className="font-handwriting text-sm font-medium text-white">
                      {address?.slice(0, 6)}...{address?.slice(-4)}
                    </span>
                    {isAdmin && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-yellow-500 rounded text-xs text-white">
                        <Trophy className="w-3 h-3" />
                        Admin
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105">
                    <Wallet className="w-4 h-4 text-gray-800" />
                    <span className="font-handwriting text-sm font-medium text-gray-800">
                      Connect Wallet
                    </span>
                  </div>
                )}
                
                {/* Connection Status Indicator */}
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                  socketConnected 
                    ? 'bg-green-100 text-green-700 border border-green-200' 
                    : 'bg-red-100 text-red-700 border border-red-200'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    socketConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                  }`}></div>
                  <span>
                    {socketConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                
                {/* Manual Reconnect Button - Desktop */}
                {!socketConnected && (
                  <button
                    onClick={() => {
                      console.log('Manual reconnect requested');
                      socketReconnect();
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-400 transition-all duration-300 text-sm font-medium border-2 border-blue-600 shadow-[0_4px_0_0_rgba(0,0,0,1)] hover:shadow-[0_6px_0_0_rgba(0,0,0,1)] active:shadow-[0_2px_0_0_rgba(0,0,0,1)] active:translate-y-[2px]"
                  >
                    <Zap className="w-4 h-4" />
                    Reconnect
                  </button>
                )}
                
                <WalletConnectButton />
              </div>
              
              {/* Desktop Exit Button */}
              <button
                onClick={leaveRoom}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-400 transition-all duration-300 font-medium border-2 border-red-600 shadow-[0_4px_0_0_rgba(0,0,0,1)] hover:shadow-[0_6px_0_0_rgba(0,0,0,1)] active:shadow-[0_2px_0_0_rgba(0,0,0,1)] active:translate-y-[2px]"
              >
                <LogOut size={16} />
                Exit Room
              </button>
            </div>
          </div>
        </div>
      </div>





      <div className="max-w-6xl mx-auto px-2 sm:px-4 py-4 sm:py-6">
        {/* Connection Status Banner */}
        {!socketConnected && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div>
                  <h3 className="font-medium text-red-800">Connection Lost</h3>
                  <p className="text-sm text-red-600">Unable to communicate with the quiz server. Some features may not work.</p>
                </div>
              </div>
              <button
                onClick={() => {
                  console.log('Manual reconnect requested from banner');
                  socketReconnect();
                }}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-400 transition-all duration-300 text-sm font-medium border-2 border-red-600 shadow-[0_4px_0_0_rgba(0,0,0,1)] hover:shadow-[0_6px_0_0_rgba(0,0,0,1)] active:shadow-[0_2px_0_0_rgba(0,0,0,1)] active:translate-y-[2px]"
              >
                <Zap className="w-4 h-4" />
                Reconnect
              </button>
            </div>
          </div>
        )}
        
        {/* TV Display and Admin Dashboard - Side by Side */}
        {room && snarkel && (
          <div className="mb-6">
            {isAdmin ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* TV Display */}
                <div className="bg-white rounded-xl shadow-2xl p-4 sm:p-6 md:p-10 border-2 sm:border-4 border-lime-500 relative overflow-hidden min-h-[400px]">
              <div className="absolute top-1 sm:top-2 left-1 sm:left-2 w-2 h-2 sm:w-3 sm:h-3 bg-red-500 rounded-full animate-pulse"></div>
              <div className="absolute top-1 sm:top-2 left-4 sm:left-6 w-2 h-2 sm:w-3 sm:h-3 bg-yellow-500 rounded-full animate-pulse"></div>
              <div className="absolute top-1 sm:top-2 left-7 sm:left-10 w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full animate-pulse"></div>
              
              <div className="text-center text-gray-800 py-6 sm:py-8">
                {gameState !== 'playing' && (
                  <>
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-handwriting font-bold mb-2 sm:mb-3 text-blue-400">
                  📺 SNARKEL TV
                </h2>
                {room?.sessionNumber && (
                  <div className="text-center mb-2">
                    <span className="inline-block px-3 py-1 bg-blue-600 text-white rounded-full text-sm font-bold">
                      Session #{room.sessionNumber}
                    </span>
                  </div>
                    )}
                  </>
                )}
                
                {/* Future Start Time Countdown - Prominent Display */}
                {showFutureStartCountdown && futureStartCountdown !== null && (
                  <div className="bg-gradient-to-r from-purple-900 via-blue-900 to-indigo-900 rounded-lg p-3 sm:p-4 md:p-6 mb-4 border-2 sm:border-4 border-purple-400 shadow-2xl animate-pulse">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2 sm:gap-4 mb-2 sm:mb-4">
                        <Clock className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-yellow-400 animate-bounce" />
                        <h3 className="text-xl sm:text-2xl md:text-3xl font-handwriting font-bold text-white">⏰ Quiz Starts In</h3>
                        <Clock className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-yellow-400 animate-bounce" />
                      </div>
                      <div className="text-3xl sm:text-4xl md:text-6xl font-bold text-yellow-400 mb-2 sm:mb-3 font-mono">
                        {formatTime(futureStartCountdown)}
                      </div>
                      <p className="text-lg sm:text-xl md:text-2xl font-handwriting text-blue-200 mb-2">
                        Scheduled Start: {room?.scheduledStartTime ? new Date(room.scheduledStartTime).toLocaleString() : ''}
                      </p>
                      <p className="text-base sm:text-lg md:text-xl text-purple-200 font-handwriting">
                        🎯 Get ready! The quiz will begin automatically
                      </p>
                    </div>
                  </div>
                )}

                {/* Dynamic Content Based on Game State */}
                {gameState === 'countdown' && countdownDisplay > 0 ? (
                  <>
                    <div className="text-6xl font-bold text-gray-800 mb-2 animate-pulse">{formatTime(countdownDisplay)}</div>
                    <p className="text-xl font-handwriting text-gray-800">Quiz Starting Soon!</p>
                  </>
                ) : gameState === 'waiting' && !showFutureStartCountdown ? (
                  <div className="bg-gradient-to-r from-lime-600 to-green-600 rounded-lg p-4 mb-3">
                    <h3 className="text-xl font-handwriting font-bold text-white mb-3">👤 Ready to Start!</h3>
                    <div className="text-center">
                      <div className="text-4xl font-bold text-yellow-400 mb-2">{participants.length}</div>
                      <p className="text-lime-200 text-lg">Participants Joined</p>
                    </div>
                  </div>
                ) : null}
                
                {/* Question Display - Directly on TV */}
                {gameState === 'playing' && currentQuestion && !showAnswerReveal && (
                  <>
                    <div className="text-center mb-6">
                      <div className="flex items-center justify-center gap-3 mb-4">
                        <h3 className="text-3xl font-handwriting font-bold text-gray-800">🎯 Question</h3>
                        <div className="flex items-center gap-2 px-4 py-2 bg-lime-100 rounded-lg border-2 border-lime-500">
                          <Clock className="w-6 h-6 text-gray-800 animate-pulse" />
                          <span className="font-bold text-gray-800 text-xl">{formatTime(questionTimeLeft)}</span>
                        </div>
                      </div>
                      <p className="text-3xl font-handwriting text-black leading-relaxed">{currentQuestion.text}</p>
                    </div>
                    
                    {/* Enhanced Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-4 mb-4 border-2 border-lime-500">
                      <div 
                        className="bg-gradient-to-r from-lime-400 to-lime-600 h-4 rounded-full transition-all duration-1000 ease-linear shadow-lg"
                        style={{ 
                          width: `${((currentQuestion.timeLimit - questionTimeLeft) / currentQuestion.timeLimit) * 100}%` 
                        }}
                      ></div>
                    </div>
                    
                    {/* Answer Options Preview */}
                    <div className="text-center">
                      <p className="text-gray-600 text-lg font-handwriting">
                        Select your answer below ↓
                      </p>
                    </div>
                  </>
                )}

                {/* Answer Reveal Display - Prominent after question */}
                {showAnswerReveal && currentAnswer && (
                  <div className="bg-gradient-to-r from-yellow-900 to-orange-900 rounded-lg p-8 mb-6 border-4 border-yellow-400 shadow-2xl animate-pulse">
                    <div className="text-center mb-6">
                      <h3 className="text-4xl font-handwriting font-bold text-white mb-4">🎉 Answer Reveal!</h3>
                      <div className="text-6xl font-handwriting font-bold text-yellow-400 mb-4 animate-bounce">
                        {currentAnswer.correctAnswer}
                      </div>
                      <p className="text-xl text-yellow-200 font-handwriting">Correct Answer</p>
                    </div>
                    
                    {/* User Answers with Better Layout */}
                    <div className="space-y-3 mb-4">
                      <h4 className="text-xl font-handwriting font-bold text-white text-center mb-4">Player Results</h4>
                      {currentAnswer.userAnswers.map((userAnswer, index) => {
                        const participant = participants.find(p => p.userId === userAnswer.userId);
                        const displayName = participant?.user?.name || 
                                          (participant?.user?.address ? 
                                            `${participant.user.address.slice(0, 6)}...${participant.user.address.slice(-4)}` : 
                                            'Unknown Player');
                        
                        return (
                          <div key={index} className="flex items-center justify-between bg-gray-800 rounded-lg p-4 border border-gray-600">
                            <span className="text-white font-medium text-lg">
                              {displayName}
                            </span>
                            <div className="flex items-center gap-3">
                              <span className={`px-3 py-1 rounded-lg text-lg font-bold ${
                                userAnswer.isCorrect ? 'bg-green-600 text-white border-2 border-green-400' : 'bg-red-600 text-white border-2 border-red-400'
                              }`}>
                                {userAnswer.isCorrect ? '✓ Correct' : '✗ Wrong'}
                              </span>
                              <span className="text-yellow-400 font-bold text-xl">
                                +{userAnswer.points} pts
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Mini Leaderboard after answer reveal */}
                    {leaderboard.length > 0 && (
                      <div className="mt-6 p-4 bg-gray-800 rounded-lg border border-gray-600">
                        <h4 className="text-lg font-handwriting font-bold text-white text-center mb-3">📊 Current Standings</h4>
                        <div className="space-y-2">
                          {leaderboard.slice(0, 3).map((entry, index) => {
                            const participant = participants.find(p => p.userId === entry.userId);
                            const displayName = participant?.user?.name || 
                                              (participant?.user?.address ? 
                                                `${participant.user.address.slice(0, 6)}...${participant.user.address.slice(-4)}` : 
                                                'Unknown Player');
                            
                            return (
                              <div key={entry.userId} className="flex items-center justify-between bg-gray-700 rounded-lg p-2">
                                <div className="flex items-center gap-2">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                                    index === 0 ? 'bg-yellow-500' : 
                                    index === 1 ? 'bg-gray-400' : 
                                    index === 2 ? 'bg-orange-500' : 'bg-gray-600'
                                  }`}>
                                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🥉'}
                                  </div>
                                  <span className="text-white font-medium text-sm">{displayName}</span>
                                </div>
                                <span className="text-yellow-400 font-bold text-lg">{entry.score} pts</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {/* Next Question Indicator */}
                    <div className="mt-4 text-center">
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-800 text-blue-200 rounded-lg border border-blue-600">
                        <Clock className="w-4 h-4 animate-pulse" />
                        <span className="font-handwriting text-sm">Next question coming soon...</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Question Complete Indicator - Show briefly between questions */}
                {showQuestionComplete && gameState === 'playing' && leaderboard.length > 0 && (
                  <div className="bg-gradient-to-r from-green-900 to-emerald-900 rounded-lg p-6 mb-6 border-4 border-green-400 shadow-2xl text-center">
                    <div className="flex items-center justify-center gap-3 mb-4">
                      <CheckCircle className="w-8 h-8 text-green-300" />
                      <h3 className="text-3xl font-handwriting font-bold text-white">✅ Question Complete!</h3>
                    </div>
                    <p className="text-xl text-green-200 font-handwriting mb-4">
                      Great job everyone! Here's how you're doing so far:
                    </p>
                    
                    {/* Compact Leaderboard */}
                    <div className="max-w-md mx-auto space-y-2">
                      {leaderboard.slice(0, 3).map((entry, index) => {
                        const participant = participants.find(p => p.userId === entry.userId);
                        const displayName = participant?.user?.name || 
                                          (participant?.user?.address ? 
                                            `${participant.user.address.slice(0, 6)}...${participant.user.address.slice(-4)}` : 
                                            'Unknown Player');
                        
                        return (
                          <div key={entry.userId} className="flex items-center justify-between bg-green-800 rounded-lg p-3 border border-green-600">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                                index === 0 ? 'bg-yellow-500' : 
                                index === 1 ? 'bg-gray-400' : 
                                index === 2 ? 'bg-orange-500' : 'bg-gray-600'
                              }`}>
                                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                              </div>
                              <span className="text-white font-medium">{displayName}</span>
                            </div>
                            <span className="text-yellow-300 font-bold text-xl">{entry.score} pts</span>
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="mt-4">
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-800 text-blue-200 rounded-lg border border-blue-600">
                        <Clock className="w-4 h-4 animate-pulse" />
                        <span className="font-handwriting text-sm">Preparing next question...</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Quiz Complete Indicator - Show when game ends */}
                {gameState === 'finished' && (
                  <div className="bg-gradient-to-r from-purple-900 to-indigo-900 rounded-lg p-8 mb-6 border-4 border-purple-400 shadow-2xl text-center">
                    <div className="flex items-center justify-center gap-3 mb-6">
                      <Trophy className="w-10 h-10 text-yellow-400" />
                      <h3 className="text-4xl font-handwriting font-bold text-white">🎉 Quiz Complete!</h3>
                      <Trophy className="w-10 h-10 text-yellow-400" />
                    </div>
                    <p className="text-xl text-purple-200 font-handwriting mb-6">
                      Congratulations to all participants! Here are the final results:
                    </p>
                    
                    {/* Final Results Leaderboard */}
                    <div className="max-w-2xl mx-auto space-y-3">
                      {leaderboard.length > 0 ? (
                        leaderboard.slice(0, 5).map((entry, index) => {
                          const participant = participants.find(p => p.userId === entry.userId);
                          const displayName = participant?.user?.name || 
                                            (participant?.user?.address ? 
                                              `${participant.user.address.slice(0, 6)}...${participant.user.address.slice(-4)}` : 
                                              'Unknown Player');
                          
                          return (
                            <div key={entry.userId} className={`flex items-center justify-between rounded-lg p-4 transition-all duration-300 ${
                              index === 0 ? 'bg-gradient-to-r from-yellow-600 to-yellow-700 border-2 border-yellow-400' :
                              index === 1 ? 'bg-gradient-to-r from-gray-600 to-gray-700 border-2 border-gray-400' :
                              index === 2 ? 'bg-gradient-to-r from-orange-600 to-orange-700 border-2 border-orange-400' :
                              'bg-gray-800 border-2 border-gray-600'
                            }`}>
                              <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                                  index === 0 ? 'bg-yellow-500 shadow-lg' : 
                                  index === 1 ? 'bg-gray-400 shadow-lg' : 
                                  index === 2 ? 'bg-orange-500 shadow-lg' : 'bg-gray-600'
                                }`}>
                                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                                </div>
                                <span className="text-white font-medium text-lg">{displayName}</span>
                              </div>
                              <span className="text-yellow-400 font-bold text-2xl">{entry.score} pts</span>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-8">
                          <div className="w-16 h-16 mx-auto mb-4 bg-gray-700 rounded-full flex items-center justify-center">
                            <Trophy className="w-8 h-8 text-gray-400" />
                          </div>
                          <p className="text-gray-300 text-lg">Final results are being calculated...</p>
                          <p className="text-gray-400 text-sm mt-2">Please wait while we process the scores.</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Rewards Status */}
                    {room?.snarkel?.rewardsEnabled && (
                      <div className="mt-6">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-800 text-yellow-200 rounded-lg border border-yellow-600">
                          <Coins className="w-4 h-4" />
                          <span className="text-sm">
                            {rewardsDistributed ? '🎉 Rewards have been distributed!' : '⏳ Rewards are being processed...'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              
              {/* Next Question Indicator - Show briefly before next question */}
              {showNextQuestion && gameState === 'playing' && (
                <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-lg p-6 mb-6 border-4 border-blue-400 shadow-2xl text-center animate-pulse">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <Target className="w-8 h-8 text-blue-300" />
                    <h3 className="text-3xl font-handwriting font-bold text-white">🎯 Next Question Coming!</h3>
                  </div>
                  <p className="text-xl text-blue-200 font-handwriting">
                    Get ready for the next challenge...
                  </p>
                </div>
              )}

                {/* Leaderboard Display - Show after each question, but hide during active questions and when quiz ends */}
                {leaderboard.length > 0 && gameState !== 'playing' && gameState !== 'finished' && (
                  <div className="bg-gradient-to-r from-blue-900 to-purple-900 rounded-lg p-8 mb-6 border-4 border-blue-400 shadow-2xl">
                    <h3 className="text-4xl font-handwriting font-bold text-white mb-6 text-center">
                      📊 Question Results
                    </h3>
                    <div className="space-y-3">
                      {leaderboard.slice(0, 5).map((entry, index) => {
                        // Find participant to get their name
                        const participant = participants.find(p => p.userId === entry.userId);
                        const displayName = participant?.user?.name || 
                                          (participant?.user?.address ? 
                                            `${participant.user.address.slice(0, 6)}...${participant.user.address.slice(-4)}` : 
                                            'Unknown Player');
                        
                        return (
                          <div key={entry.userId} className={`flex items-center justify-between rounded-lg p-4 transition-all duration-300 ${
                            index === 0 ? 'bg-gradient-to-r from-yellow-600 to-yellow-700 border-2 border-yellow-400' :
                            index === 1 ? 'bg-gradient-to-r from-gray-600 to-gray-700 border-2 border-gray-400' :
                            index === 2 ? 'bg-gradient-to-r from-orange-600 to-orange-700 border-2 border-orange-400' :
                            'bg-gray-800 border-2 border-gray-600'
                          }`}>
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                                index === 0 ? 'bg-yellow-500 shadow-lg' : 
                                index === 1 ? 'bg-gray-400 shadow-lg' : 
                                index === 2 ? 'bg-orange-500 shadow-lg' : 'bg-gray-600'
                              }`}>
                                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                              </div>
                              <span className="text-white font-medium text-lg">{displayName}</span>
                            </div>
                            <span className="text-yellow-400 font-bold text-2xl">{entry.score} pts</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* Admin Message - Prominent when displayed */}
                {tvMessage && gameState !== 'playing' && (
                  <div className="bg-gradient-to-r from-blue-900 to-purple-900 rounded-lg p-8 mb-6 border-4 border-blue-400 shadow-2xl relative overflow-hidden transition-all duration-500">
                    {/* Enhanced Fading Progress Bar */}
                    <div className="absolute bottom-0 left-0 h-2 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 transition-all duration-100 ease-linear rounded-full"
                         style={{ width: `${messageProgress}%` }}>
                    </div>
                    
                    <div className="flex items-center justify-center gap-3 mb-4">
                      <MessageSquare className="w-8 h-8 text-blue-300" />
                      <h3 className="font-handwriting font-bold text-2xl text-blue-300">📢 Admin Message</h3>
                    </div>
                    <p className="text-3xl font-handwriting text-white text-center leading-relaxed">{tvMessage}</p>
                  </div>
                )}
                

                
                {/* Recent Joins - Enhanced display - Hidden during quiz */}
                {participantTabs.length > 0 && gameState === 'waiting' && (
                  <div className="mb-6">
                    <h3 className="text-2xl font-handwriting font-bold mb-4 text-center text-lime-600">🟢 People Who Have Joined</h3>
                    <div className="flex flex-wrap justify-center gap-3">
                      {participantTabs.slice(-3).map((participant, index) => (
                        <div
                          key={participant.id}
                          className={`flex items-center gap-3 px-4 py-2 rounded-full transition-all duration-500 hover:scale-105 ${
                            participant.isAdmin 
                              ? 'bg-gradient-to-r from-lime-400 to-green-500 text-black shadow-lg border-2 border-lime-300' 
                              : 'bg-gradient-to-r from-lime-300 to-lime-400 text-black shadow-lg border-2 border-lime-200'
                          }`}
                          style={{
                            animationDelay: `${index * 200}ms`,
                            animation: 'fadeInUp 0.5s ease-out forwards'
                          }}
                        >
                          <div className="w-5 h-5 rounded-full bg-white bg-opacity-30 flex items-center justify-center">
                            {participant.isAdmin ? (
                              <span className="text-lg">👑</span>
                            ) : (
                              <span className="text-lg">⚫</span>
                            )}
                          </div>
                          <span className="text-sm font-bold">
                            {participant.name}
                          </span>
                          {participant.isAdmin && (
                            <span className="text-lg">👑</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Future Start Time Notification for Participants */}
                {showFutureStartCountdown && futureStartCountdown !== null && (
                  <div className="mb-4">
                    <div className="bg-gradient-to-r from-purple-800 to-indigo-800 rounded-lg p-4 text-white text-center animate-pulse border-2 border-purple-400 shadow-lg">
                      <div className="flex items-center justify-center gap-3">
                        <Clock className="w-5 h-5 text-yellow-400 animate-bounce" />
                        <span className="font-handwriting font-bold text-lg">
                          ⏰ Quiz starts in {formatTime(futureStartCountdown)} - Get ready!
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* TV Countdown Display - Lower TV Area */}
                {showFutureStartCountdown && futureStartCountdown !== null && (
                  <div className="fixed bottom-20 sm:bottom-24 left-1/2 transform -translate-x-1/2 z-40 bg-gradient-to-r from-purple-900 to-indigo-900 rounded-t-2xl p-3 sm:p-4 text-white text-center border-2 border-purple-400 shadow-2xl animate-pulse max-w-xs sm:max-w-sm">
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400 animate-bounce" />
                        <span className="font-handwriting font-bold text-xs sm:text-sm text-yellow-300">Quiz Starts In</span>
                      </div>
                      <div className="text-2xl sm:text-3xl font-bold text-white font-mono">
                        {formatTime(futureStartCountdown)}
                      </div>
                      <div className="text-xs text-purple-200 hidden sm:block">
                        {room?.scheduledStartTime ? new Date(room.scheduledStartTime).toLocaleString() : ''}
                      </div>
                    </div>
                  </div>
                )}


                {/* Join Notification */}
                {participantJoinNotification && (
                  <div className="mb-4">
                    <div className="bg-gradient-to-r from-green-800 to-blue-800 rounded-lg p-4 text-white text-center animate-pulse border-2 border-green-400 shadow-lg">
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-3 h-3 bg-green-400 rounded-full animate-bounce"></div>
                        <span className="font-handwriting font-bold text-lg">🎉 {participantJoinNotification}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Message Sent Notification */}
                {messageSentNotification && (
                  <div className="mb-4">
                    <div className="bg-gradient-to-r from-green-800 to-blue-800 rounded-lg p-4 text-white text-center animate-pulse border-2 border-green-400 shadow-lg">
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-3 h-3 bg-green-400 rounded-full animate-bounce"></div>
                        <span className="font-handwriting font-bold text-lg">📢 {messageSentNotification}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Leave Notification */}
                {participantLeaveNotification && (
                  <div className="mb-4">
                    <div className="bg-gradient-to-r from-red-800 to-orange-800 rounded-lg p-4 text-white text-center animate-pulse border-2 border-red-400 shadow-lg">
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-3 h-3 bg-red-400 rounded-full animate-bounce"></div>
                        <span className="font-handwriting font-bold text-lg">👋 {participantLeaveNotification}</span>
                      </div>
                    </div>
                  </div>
                )}
                

              </div>
            </div>

              {/* Admin Dashboard - Only show for admins */}
        {isAdmin && (
              <div className="space-y-6">
                {/* Future Start Time Info for Admin */}
                {showFutureStartCountdown && futureStartCountdown !== null && (
                  <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl shadow-lg p-6 border-l-4 border-purple-400">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-handwriting font-bold text-gray-800 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-purple-500" />
                        ⏰ Scheduled Quiz Start
                      </h3>
                      <div className="flex items-center gap-2 px-3 py-1 bg-purple-100 rounded-full">
                        <Clock className="w-4 h-4 text-purple-600" />
                        <span className="text-sm font-medium text-purple-800">Auto-Start Enabled</span>
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        <h4 className="font-handwriting font-bold text-gray-700 mb-2">Countdown</h4>
                        <div className="text-center">
                          <div className="text-3xl font-bold text-purple-600 mb-1">{formatTime(futureStartCountdown)}</div>
                          <p className="text-sm text-gray-600">Time Remaining</p>
                        </div>
                      </div>
                      
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        <h4 className="font-handwriting font-bold text-gray-700 mb-2">Start Time</h4>
                        <div className="text-center">
                          <div className="text-lg font-bold text-gray-800 mb-1">
                            {room?.scheduledStartTime ? new Date(room.scheduledStartTime).toLocaleTimeString() : ''}
                          </div>
                          <p className="text-sm text-gray-600">
                            {room?.scheduledStartTime ? new Date(room.scheduledStartTime).toLocaleDateString() : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-800 text-center">
                        💡 The quiz will start automatically when the scheduled time is reached. 
                        Participants can join and get ready while waiting.
                      </p>
                    </div>
                  </div>
                )}

                {/* Enhanced Admin Controls */}
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl shadow-lg p-6 border-l-4 border-purple-400">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-handwriting font-bold text-gray-800 flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-yellow-500" />
                        🎮 Admin Dashboard
                      </h3>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 rounded-full">
                          <Trophy className="w-4 h-4 text-yellow-600" />
                          <span className="text-sm font-medium text-yellow-800">Admin Mode</span>
                        </div>
                        <button
                          onClick={() => setShowAdminControls(true)}
                          className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-400 transition-all duration-300 font-handwriting font-bold text-xs sm:text-sm border-2 border-blue-600 shadow-[0_4px_0_0_rgba(0,0,0,1)] hover:shadow-[0_6px_0_0_rgba(0,0,0,1)] active:shadow-[0_2px_0_0_rgba(0,0,0,1)] active:translate-y-[2px]"
                        >
                          <Settings size={14} className="sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline">Full Controls</span>
                          <span className="sm:hidden">Controls</span>
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        <h4 className="font-handwriting font-bold text-gray-700 mb-2">Room Stats</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Participants:</span>
                            <span className="font-bold">{participants.length}/{room?.maxParticipants}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Status:</span>
                            <span className="font-bold text-green-600">Ready to Start</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Min Required:</span>
                            <span className="font-bold">{room?.minParticipants}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        <h4 className="font-handwriting font-bold text-gray-700 mb-2">Quiz Info</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Questions:</span>
                            <span className="font-bold">{snarkel?.totalQuestions}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Base Points:</span>
                            <span className="font-bold">{snarkel?.basePointsPerQuestion}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Speed Bonus:</span>
                            <span className="font-bold">{snarkel?.speedBonusEnabled ? 'Enabled' : 'Disabled'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 sm:gap-3">
                      <button
                        onClick={() => setShowCountdownModal(true)}
                        className="flex items-center gap-1 sm:gap-2 px-3 sm:px-6 py-2 sm:py-3 bg-green-500 text-white rounded-lg hover:bg-green-400 transition-all duration-300 font-handwriting font-bold text-sm sm:text-base border-2 border-green-600 shadow-[0_4px_0_0_rgba(0,0,0,1)] hover:shadow-[0_6px_0_0_rgba(0,0,0,1)] active:shadow-[0_2px_0_0_rgba(0,0,0,1)] active:translate-y-[2px]"
                      >
                        <Play size={16} className="sm:w-[18px] sm:h-[18px]" />
                        <span className="hidden sm:inline">Start Quiz</span>
                        <span className="sm:hidden">Start</span>
                      </button>
                      <button
                        onClick={() => setShowAdminMessageModal(true)}
                        className="flex items-center gap-1 sm:gap-2 px-3 sm:px-6 py-2 sm:py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-400 transition-all duration-300 font-handwriting font-bold text-sm sm:text-base border-2 border-blue-600 shadow-[0_4px_0_0_rgba(0,0,0,1)] hover:shadow-[0_6px_0_0_rgba(0,0,0,1)] active:shadow-[0_2px_0_0_rgba(0,0,0,1)] active:translate-y-[2px]"
                      >
                        <MessageSquare size={16} className="sm:w-[18px] sm:h-[18px]" />
                        <span className="hidden sm:inline">Send Message</span>
                        <span className="sm:hidden">Message</span>
                      </button>
                    </div>
                  </div>
              </div>
            )}

                {/* Debug Controls - Only show for admins */}
                <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl shadow-lg p-6 border-l-4 border-red-400">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-handwriting font-bold text-gray-800 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                      🐛 Debug Controls
                    </h3>
                    <div className="flex items-center gap-2 px-3 py-1 bg-red-100 rounded-full">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <span className="text-sm font-medium text-red-800">Development Only</span>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <h4 className="font-handwriting font-bold text-gray-700 mb-2">Stop Quiz at Next Safe Point</h4>
                      <p className="text-sm text-gray-600 mb-3">
                        This will stop the quiz at the next natural stopping point:
                      </p>
                      <ul className="text-xs text-gray-500 space-y-1 mb-4">
                        <li>• If in countdown: Stop immediately</li>
                        <li>• If playing: Stop after current question</li>
                        <li>• If waiting: Stop immediately</li>
                      </ul>
                      
                      {debugStopRequested ? (
                        <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-yellow-600" />
                            <span className="text-sm font-medium text-yellow-800">Stop Requested</span>
                    </div>
                          <p className="text-xs text-yellow-700 mt-1">{debugStopReason}</p>
                  </div>
                      ) : (
                        <button
                          onClick={() => {
                            if (window.confirm('Stop quiz at next safe point? This will end the current session.')) {
                              setDebugStopRequested(true);
                              setDebugStopReason('Debug stop requested - will stop at next safe point');
                              
                              // Handle immediate stops
                              if (gameState === 'waiting' || gameState === 'countdown') {
                                if (socket && isAdmin) {
                                  socket.emit('endGame', { roomId: room?.id });
                                  setDebugStopRequested(false);
                                  setDebugStopReason('');
                                }
                              }
                            }
                          }}
                          className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-400 transition-all duration-300 font-handwriting font-bold text-sm border-2 border-red-600 shadow-[0_4px_0_0_rgba(0,0,0,1)] hover:shadow-[0_6px_0_0_rgba(0,0,0,1)] active:shadow-[0_2px_0_0_rgba(0,0,0,1)] active:translate-y-[2px]"
                        >
                          🛑 Stop Quiz (Debug)
                        </button>
                      )}
                        </div>
                        </div>
                      </div>
                    </div>
            ) : (
              /* Non-Admin Layout - TV and Answers Side by Side */
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* TV Display */}
                <div className="bg-white rounded-xl shadow-2xl p-4 sm:p-6 md:p-10 border-2 sm:border-4 border-lime-500 relative overflow-hidden min-h-[400px]">
                  <div className="absolute top-1 sm:top-2 left-1 sm:left-2 w-2 h-2 sm:w-3 sm:h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <div className="absolute top-1 sm:top-2 left-4 sm:left-6 w-2 h-2 sm:w-3 sm:h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                  <div className="absolute top-1 sm:top-2 left-7 sm:left-10 w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full animate-pulse"></div>
                  
                  <div className="text-center text-gray-800 py-6 sm:py-8">
                    {gameState !== 'playing' && (
                      <>
                        <h2 className="text-xl sm:text-2xl md:text-3xl font-handwriting font-bold mb-2 sm:mb-3 text-blue-400">
                          📺 SNARKEL TV
                        </h2>
                        {room?.sessionNumber && (
                          <div className="text-center mb-2">
                            <span className="inline-block px-3 py-1 bg-blue-600 text-white rounded-full text-sm font-bold">
                              Session #{room.sessionNumber}
                            </span>
                        </div>
                        )}
                      </>
                    )}

                    {/* Future Start Time Countdown - Prominent Display */}
                    {showFutureStartCountdown && futureStartCountdown !== null && (
                      <div className="bg-gradient-to-r from-purple-900 via-blue-900 to-indigo-900 rounded-lg p-3 sm:p-4 md:p-6 mb-4 border-2 sm:border-4 border-purple-400 shadow-2xl animate-pulse">
                  <div className="text-center">
                          <div className="flex items-center justify-center gap-2 sm:gap-4 mb-2 sm:mb-4">
                            <Clock className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-yellow-400 animate-bounce" />
                            <h3 className="text-xl sm:text-2xl md:text-3xl font-handwriting font-bold text-white">⏰ Quiz Starts In</h3>
                            <Clock className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-yellow-400 animate-bounce" />
                        </div>
                          <div className="text-3xl sm:text-4xl md:text-6xl font-bold text-yellow-400 mb-2 sm:mb-3 font-mono">
                            {formatTime(futureStartCountdown)}
                      </div>
                          <p className="text-lg sm:text-xl md:text-2xl font-handwriting text-blue-200 mb-2">
                            Scheduled Start: {room?.scheduledStartTime ? new Date(room.scheduledStartTime).toLocaleString() : ''}
                          </p>
                          <p className="text-base sm:text-lg md:text-xl text-purple-200 font-handwriting">
                            🎯 Get ready! The quiz will begin automatically
                          </p>
                </div>
              </div>
            )}

                    {/* Dynamic Content Based on Game State */}
                    {gameState === 'countdown' && countdownDisplay > 0 ? (
                      <>
                        <div className="text-6xl font-bold text-gray-800 mb-2 animate-pulse">{formatTime(countdownDisplay)}</div>
                        <p className="text-xl font-handwriting text-gray-800">Quiz Starting Soon!</p>
                      </>
                    ) : gameState === 'waiting' && !showFutureStartCountdown ? (
                      <div className="bg-gradient-to-r from-lime-600 to-green-600 rounded-lg p-4 mb-3">
                        <h3 className="text-xl font-handwriting font-bold text-white mb-3">👤 Ready to Start!</h3>
                        <div className="text-center">
                          <div className="text-4xl font-bold text-yellow-400 mb-2">{participants.length}</div>
                          <p className="text-lime-200 text-lg">Participants Joined</p>
                </div>
                      </div>
                    ) : null}
                    
                    {/* Participants List Inside TV Screen */}
                    {participantTabs.length > 0 && gameState === 'waiting' && (
                      <div className="mt-4">
                        <h3 className="text-lg font-handwriting font-bold mb-3 text-center text-lime-600">🟢 People Who Have Joined</h3>
                        <div className="flex flex-wrap justify-center gap-2">
                          {participantTabs.map((participant, index) => (
                            <div
                              key={participant.id}
                              className={`flex items-center gap-2 px-3 py-1 rounded-full transition-all duration-500 hover:scale-105 ${
                                participant.isAdmin 
                                  ? 'bg-gradient-to-r from-lime-400 to-green-500 text-black shadow-lg border-2 border-lime-300' 
                                  : 'bg-gradient-to-r from-lime-300 to-lime-400 text-black shadow-lg border-2 border-lime-200'
                              }`}
                              style={{
                                animationDelay: `${index * 200}ms`,
                                animation: 'fadeInUp 0.5s ease-out forwards'
                              }}
                            >
                              <div className="w-4 h-4 rounded-full bg-white bg-opacity-30 flex items-center justify-center">
                                {participant.isAdmin ? (
                                  <span className="text-sm">👑</span>
                                ) : (
                                  <span className="text-sm">⚫</span>
                                )}
                        </div>
                              <span className="text-xs font-bold">
                                {participant.name}
                  </span>
                              {participant.isAdmin && (
                                <span className="text-sm">👑</span>
                              )}
                    </div>
                  ))}
                </div>
              </div>
            )}
                      </div>
          </div>

                {/* Answer Options Grid for Non-Admin Users */}
                {gameState === 'playing' && currentQuestion && (
                  <div className="space-y-4">
                    <h3 className="text-2xl font-handwriting font-bold text-gray-800 text-center mb-4">
                      Choose Your Answer
                </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {currentQuestion.options.map((option, index) => (
                        <button
                          key={option.id}
                          onClick={() => {
                            // Immediately submit the answer when clicked
                            socket?.emit('submitAnswer', {
                              roomId: room?.id,
                              questionId: currentQuestion.id,
                              answerId: option.id,
                              timeLeft: questionTimeLeft
                            });
                          }}
                          disabled={selectedAnswers.includes(option.id)}
                          className={`p-4 rounded-lg border-2 transition-all duration-200 font-handwriting text-base sm:text-lg text-center min-h-[80px] flex items-center justify-center relative ${
                            selectedAnswers.includes(option.id)
                              ? 'bg-lime-200 border-lime-400 text-gray-600 cursor-not-allowed'
                              : 'bg-lime-100 border-lime-500 text-black hover:bg-lime-200 hover:border-lime-600 active:scale-95'
                          }`}
                        >
                          <span className="font-medium leading-tight">{option.text}</span>
                          {selectedAnswers.includes(option.id) && (
                            <div className="absolute top-2 right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                              <CheckCircle className="w-4 h-4 text-white" />
              </div>
                          )}
                        </button>
                      ))}
                </div>
                    
                    {selectedAnswers.length > 0 && (
                      <div className="text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg border-2 border-green-300">
                          <CheckCircle className="w-4 h-4" />
                          <span className="font-handwriting font-bold">Answer Submitted!</span>
                </div>
                  </div>
                )}
                  </div>
                )}

                {/* Leave Room Button - Hidden during quiz session */}
                {gameState === 'waiting' && (
                  <button
                    onClick={() => router.push('/')}
                    className="w-full max-w-md inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium border-2 transition-all duration-100 text-black border-black bg-lime-300 hover:bg-lime-400 shadow-[0_4px_0_0_rgba(0,0,0,1)] hover:shadow-[0_6px_0_0_rgba(0,0,0,1)] active:shadow-[0_2px_0_0_rgba(0,0,0,1)] active:translate-y-[2px] max-h-[10vh]"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Leave Room</span>
                  </button>
                )}
                        </div>
                      )}
                  </div>
                )}

        {/* Mobile-First Answer Options - Only for Admin Users */}
        {gameState === 'playing' && currentQuestion && isAdmin && (
           <div className="mt-4 sm:mt-6 px-2 sm:px-0">
             <div className="space-y-2 sm:space-y-3 max-w-2xl mx-auto">
               {currentQuestion.options.map((option, index) => (
                 <button
                   key={option.id}
                   onClick={() => {
                     // Immediately submit the answer when clicked
                     socket?.emit('submitAnswer', {
                       roomId: room?.id,
                       questionId: currentQuestion.id,
                       answerId: option.id,
                       timeLeft: questionTimeLeft
                     });
                     // Disable all buttons after selection
                     setSelectedAnswers([option.id]);
                   }}
                   disabled={selectedAnswers.length > 0}
                   className={`w-full p-2 sm:p-3 rounded-lg border-2 transition-all duration-300 text-left font-handwriting text-xs sm:text-sm md:text-base ${
                     selectedAnswers.includes(option.id)
                       ? 'border-green-500 bg-green-50 shadow-lg scale-[1.02]'
                       : selectedAnswers.length > 0
                       ? 'border-gray-300 bg-gray-100 opacity-50 cursor-not-allowed'
                       : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 hover:scale-[1.01]'
                   }`}
                 >
                   <div className="flex items-center gap-2 sm:gap-3">
                     <div className={`w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                       selectedAnswers.includes(option.id)
                         ? 'border-green-500 bg-green-500'
                         : 'border-gray-300'
                     }`}>
                       {selectedAnswers.includes(option.id) && (
                         <CheckCircle className="w-2 h-2 sm:w-3 sm:h-3 md:w-4 md:h-4 text-white" />
                       )}
                        </div>
                     <span className="font-medium text-gray-800 leading-tight">{option.text}</span>
                      </div>
                 </button>
               ))}
                      </div>

             {selectedAnswers.length > 0 && (
               <div className="mt-4 sm:mt-6 text-center">
                 <div className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-green-100 text-green-800 rounded-lg">
                   <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                   <span className="font-handwriting font-bold text-sm sm:text-base">Answer Submitted!</span>
                    </div>
                  </div>
                )}
              </div>
                )}

        {/* Ready Button and Participant Controls for All Non-Admin Users */}




       </div>

       {/* Countdown Modal */}
       {showCountdownModal && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
             <h3 className="text-xl font-handwriting font-bold text-gray-800 mb-4">
               ⏰ Set Countdown Time
             </h3>
             <div className="space-y-4">
               <div className="grid grid-cols-4 gap-2 sm:gap-3">
                 <button
                   onClick={() => setCountdownTime(0.25)}
                   className={`p-2 sm:p-3 md:p-4 rounded-lg border-2 transition-all ${
                     countdownTime === 0.25 
                       ? 'border-purple-500 bg-purple-50' 
                       : 'border-gray-200 hover:border-gray-300'
                   }`}
                 >
                   <div className="text-lg sm:text-xl md:text-2xl font-bold">15</div>
                   <div className="text-xs sm:text-sm text-gray-600">Seconds</div>
                 </button>
                 <button
                   onClick={() => setCountdownTime(1)}
                   className={`p-2 sm:p-3 md:p-4 rounded-lg border-2 transition-all ${
                     countdownTime === 1 
                       ? 'border-purple-500 bg-purple-50' 
                       : 'border-gray-200 hover:border-gray-300'
                   }`}
                 >
                   <div className="text-lg sm:text-xl md:text-2xl font-bold">1</div>
                   <div className="text-xs sm:text-sm text-gray-600">Minute</div>
                 </button>
                 <button
                   onClick={() => setCountdownTime(2)}
                   className={`p-2 sm:p-3 md:p-4 rounded-lg border-2 transition-all ${
                     countdownTime === 2 
                       ? 'border-purple-500 bg-purple-50' 
                       : 'border-gray-200 hover:border-gray-300'
                   }`}
                 >
                   <div className="text-lg sm:text-xl md:text-2xl font-bold">2</div>
                   <div className="text-xs sm:text-sm text-gray-600">Minutes</div>
                 </button>
                 <button
                   onClick={() => setCountdownTime(5)}
                   className={`p-2 sm:p-3 md:p-4 rounded-lg border-2 transition-all ${
                     countdownTime === 5 
                       ? 'border-purple-500 bg-purple-50' 
                       : 'border-gray-200 hover:border-gray-300'
                   }`}
                 >
                   <div className="text-lg sm:text-xl md:text-2xl font-bold">5</div>
                   <div className="text-xs sm:text-sm text-gray-600">Minutes</div>
                 </button>
               </div>
               <div className="flex gap-2 sm:gap-3 pt-4">
                 <button
                   onClick={confirmStartGame}
                   className="flex-1 px-3 sm:px-4 py-1.5 sm:py-2 bg-green-500 text-white rounded-lg hover:bg-green-400 transition-all duration-300 text-sm sm:text-base border-2 border-green-600 shadow-[0_4px_0_0_rgba(0,0,0,1)] hover:shadow-[0_6px_0_0_rgba(0,0,0,1)] active:shadow-[0_2px_0_0_rgba(0,0,0,1)] active:translate-y-[2px]"
                 >
                   <span className="hidden sm:inline">Start Quiz</span>
                   <span className="sm:hidden">Start</span>
                 </button>
                 <button
                   onClick={() => setShowCountdownModal(false)}
                   className="flex-1 px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-400 transition-all duration-300 text-sm sm:text-base border-2 border-gray-600 shadow-[0_4px_0_0_rgba(0,0,0,1)] hover:shadow-[0_6px_0_0_rgba(0,0,0,1)] active:shadow-[0_2px_0_0_rgba(0,0,0,1)] active:translate-y-[2px]"
                 >
                   Cancel
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}

       {/* Admin Message Modal */}
       {showAdminMessageModal && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
             <h3 className="text-xl font-handwriting font-bold text-gray-800 mb-4">
               📢 Send Message to All Participants
             </h3>
             <div className="space-y-4">
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">
                   Message
                 </label>
                 <textarea
                   value={adminMessage}
                   onChange={(e) => setAdminMessage(e.target.value)}
                   placeholder="Enter your message here..."
                   className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                   rows={4}
                   maxLength={200}
                 />
                 <div className="text-xs text-gray-500 mt-1 text-right">
                   {adminMessage.length}/200
                 </div>
               </div>
               <div className="flex gap-2 sm:gap-3">
                 <button
                   onClick={sendMessage}
                   disabled={!adminMessage.trim()}
                   className="flex-1 px-3 sm:px-4 py-2 sm:py-3 bg-blue-500 text-white rounded-lg font-handwriting font-bold hover:bg-blue-400 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-300 text-sm sm:text-base border-2 border-blue-600 shadow-[0_4px_0_0_rgba(0,0,0,1)] hover:shadow-[0_6px_0_0_rgba(0,0,0,1)] active:shadow-[0_2px_0_0_rgba(0,0,0,1)] active:translate-y-[2px] disabled:shadow-none disabled:translate-y-0"
                 >
                   <span className="hidden sm:inline">Send Message</span>
                   <span className="sm:hidden">Send</span>
                 </button>
                 <button
                   onClick={() => {
                     setShowAdminMessageModal(false);
                     setAdminMessage('');
                   }}
                   className="flex-1 px-3 sm:px-4 py-2 sm:py-3 bg-gray-500 text-white rounded-lg font-handwriting font-bold hover:bg-gray-400 transition-all duration-300 text-sm sm:text-base border-2 border-gray-600 shadow-[0_4px_0_0_rgba(0,0,0,1)] hover:shadow-[0_6px_0_0_rgba(0,0,0,1)] active:shadow-[0_2px_0_0_rgba(0,0,0,1)] active:translate-y-[2px]"
                 >
                   Cancel
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}

       {/* Admin Controls Modal */}
       {showAdminControls && (
         <AdminControls
           socket={socket}
           room={room}
           snarkel={snarkel}
           participants={participants}
           isAdmin={isAdmin}
           onClose={() => setShowAdminControls(false)}
         />
       )}
     </div>
   );
 } 