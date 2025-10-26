import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import Link from 'next/link';
import { 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle,
  Play,
  Trophy,
  Star,
  AlertCircle,
  Gamepad2,
  Sparkles,
  Award,
  BarChart3,
  Target,
  Zap,
  MessageSquare,
  Wallet,
  Crown,
  Home
} from 'lucide-react';

import useFarcasterCelebration from '@/hooks/useFarcasterCelebration'
import FarcasterCelebration from '@/components/FarcasterCelebration'

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
}

interface Snarkel {
  id: string;
  title: string;
  description: string;
  totalQuestions: number;
  basePointsPerQuestion: number;
  speedBonusEnabled: boolean;
  maxSpeedBonus: number;
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

interface ParticipantRoomProps {
  socket: Socket | null;
  room: Room | null;
  snarkel: Snarkel | null;
  participants: Participant[];
  isReady: boolean;
  onToggleReady: () => void;
  gameState: 'waiting' | 'countdown' | 'playing' | 'finished';
  currentQuestion: Question | null;
  questionTimeLeft: number;
  selectedAnswers: string[];
  onSelectAnswer: (optionId: string) => void;
  onSubmitAnswer: () => void;
  leaderboard: Array<{userId: string, score: number, name: string}>;
  tvMessage: string;
  countdown: number | null;
  onLeaveRoom: () => void;
}

export default function ParticipantRoom({
  socket,
  room,
  snarkel,
  participants,
  isReady,
  onToggleReady,
  gameState,
  currentQuestion,
  questionTimeLeft,
  selectedAnswers,
  onSelectAnswer,
  onSubmitAnswer,
  leaderboard,
  tvMessage,
  countdown,
  onLeaveRoom
}: ParticipantRoomProps) {
  const { showCelebration, celebration, hideCelebration } = useFarcasterCelebration()

  const [showParticipants, setShowParticipants] = useState(false);
  const [showCountdownDisplay, setShowCountdownDisplay] = useState(false);
  const [countdownDisplay, setCountdownDisplay] = useState<number>(0);
  const [adminMessageDisplay, setAdminMessageDisplay] = useState<string>('');
  const [showAdminMessage, setShowAdminMessage] = useState(false);
  const [participantTabs, setParticipantTabs] = useState<Array<{id: string, name: string, address: string, isReady: boolean, isAdmin: boolean}>>([]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const readyParticipants = participants.filter(p => p.isReady).length;
  const totalParticipants = participants.length;

  // Socket event listeners for countdown and admin messages
  useEffect(() => {
    if (!socket) return;

    const handleGameStarting = (countdownTime: number) => {
      setShowCountdownDisplay(true);
      setCountdownDisplay(countdownTime);
      // Hide countdown after it reaches 0
      if (countdownTime <= 0) {
        setTimeout(() => {
          setShowCountdownDisplay(false);
        }, 1000);
      }
    };

    const handleCountdownUpdate = (timeLeft: number) => {
      setCountdownDisplay(timeLeft);
      // Hide countdown when it reaches 0
      if (timeLeft <= 0) {
        setTimeout(() => {
          setShowCountdownDisplay(false);
        }, 1000);
      }
    };

    const handleAdminMessage = (data: { message: string, timestamp: string }) => {
      setAdminMessageDisplay(data.message);
      setShowAdminMessage(true);
      // Auto-hide after 3 seconds
      setTimeout(() => {
        setShowAdminMessage(false);
      }, 3000);
    };

    socket.on('gameStarting', handleGameStarting);
    socket.on('countdownUpdate', handleCountdownUpdate);
    socket.on('adminMessageReceived', handleAdminMessage);

    return () => {
      socket.off('gameStarting', handleGameStarting);
      socket.off('countdownUpdate', handleCountdownUpdate);
      socket.off('adminMessageReceived', handleAdminMessage);
    };
  }, [socket]);

  // Show celebration when quiz is finished
  useEffect(() => {
    if (gameState === 'finished' && leaderboard && leaderboard.length > 0) {
      // Find current user's position - we'll use the first participant as current user for now
      // In a real implementation, you'd get this from user context
      const currentUser = participants[0] // Assuming first participant is current user
      if (currentUser) {
        const userPosition = leaderboard.findIndex(entry => entry.userId === currentUser.userId) + 1
        const userScore = leaderboard.find(entry => entry.userId === currentUser.userId)?.score || 0
        
        // Determine celebration type based on position
        let celebrationType: 'quiz_completed' | 'high_score' | 'first_win' = 'quiz_completed'
        
        if (userPosition === 1) {
          celebrationType = 'first_win'
        } else if (userScore >= 8) { // Assuming 8+ is high score
          celebrationType = 'high_score'
        }
        
        showCelebration(celebrationType, {
          score: userScore,
          maxScore: snarkel?.totalQuestions || 10,
          position: userPosition
        })
      }
    }
  }, [gameState, leaderboard, participants, snarkel, showCelebration])

  return (
    <div className="min-h-screen">
      {/* Countdown Display - Full Screen Overlay */}
      {showCountdownDisplay && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="text-center text-white">
            <div className="w-48 h-48 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
              <span className="text-8xl font-bold">{countdownDisplay}</span>
            </div>
            <h2 className="text-4xl font-handwriting font-bold mb-4">
              Quiz Starting Soon!
            </h2>
            <p className="text-xl text-gray-300">
              Get ready to answer questions...
            </p>
            
            {/* Admin Message Display */}
            {showAdminMessage && (
              <div className="mt-8 bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-xl shadow-2xl">
                <div className="flex items-center gap-3 mb-3">
                  <MessageSquare className="w-6 h-6" />
                  <h3 className="font-handwriting font-bold text-xl">Admin Message</h3>
                </div>
                <p className="text-lg">{adminMessageDisplay}</p>
              </div>
            )}

            {/* Recent Join Cards */}
            <div className="mt-8">
              <h3 className="text-2xl font-handwriting font-bold mb-4">Recent Joins</h3>
              <div className="flex flex-wrap justify-center gap-3">
                {participants.slice(-3).map((participant, index) => (
                  <div
                    key={participant.id}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-500 ${
                      participant.isAdmin 
                        ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-black shadow-lg' 
                        : participant.isReady
                        ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-black shadow-lg'
                        : 'bg-gradient-to-r from-blue-400 to-purple-500 text-black shadow-lg'
                    }`}
                    style={{
                      animationDelay: `${index * 200}ms`,
                      animation: 'fadeInUp 0.5s ease-out forwards'
                    }}
                  >
                    <div className="w-6 h-6 rounded-full bg-white bg-opacity-30 flex items-center justify-center">
                      {participant.isAdmin ? (
                        <Crown className="w-3 h-3" />
                      ) : participant.isReady ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : (
                        <Users className="w-3 h-3" />
                      )}
                    </div>
                    <span className="text-sm font-medium">
                      {participant.user.name || `User ${participant.user.address.slice(0, 8)}...`}
                    </span>
                    {participant.isAdmin && (
                      <Crown className="w-3 h-3" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Message Display - Floating Notification (when not in countdown) */}
      {showAdminMessage && !showCountdownDisplay && (
        <div className="fixed top-4 right-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-xl shadow-2xl z-50 animate-slide-in">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-6 h-6" />
            <div>
              <h3 className="font-handwriting font-bold text-lg">Admin Message</h3>
              <p className="text-sm">{adminMessageDisplay}</p>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Gamepad2 className="w-8 h-8 text-purple-600" />
                <h1 className="text-xl font-handwriting font-bold text-gray-800">
                  {snarkel?.title || 'Quiz Room'}
                </h1>
              </div>
              <div className="hidden md:flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span className="text-gray-600">{totalParticipants} participants</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-gray-600">{readyParticipants} ready</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowParticipants(!showParticipants)}
                className="flex items-center gap-2 px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-400 transition-all duration-300 border-2 border-purple-600 shadow-[0_4px_0_0_rgba(0,0,0,1)] hover:shadow-[0_6px_0_0_rgba(0,0,0,1)] active:shadow-[0_2px_0_0_rgba(0,0,0,1)] active:translate-y-[2px]"
              >
                <Users className="w-4 h-4" />
                <span className="text-sm font-medium">Participants</span>
              </button>
              {gameState === 'waiting' && (
                <button
                  onClick={onToggleReady}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300 border-2 shadow-[0_4px_0_0_rgba(0,0,0,1)] hover:shadow-[0_6px_0_0_rgba(0,0,0,1)] active:shadow-[0_2px_0_0_rgba(0,0,0,1)] active:translate-y-[2px] ${
                    isReady
                      ? 'bg-green-600 hover:bg-green-500 text-white border-green-700'
                      : 'bg-yellow-500 hover:bg-yellow-400 text-white border-yellow-600'
                  }`}
                >
                  {isReady ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <Clock className="w-4 h-4" />
                  )}
                  <span className="text-sm font-semibold">{isReady ? 'Ready' : "I'm Ready!"}</span>
                </button>
              )}
              
              <button
                onClick={onLeaveRoom}
                className="flex items-center gap-2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-400 transition-all duration-300 border-2 border-red-600 shadow-[0_4px_0_0_rgba(0,0,0,1)] hover:shadow-[0_6px_0_0_rgba(0,0,0,1)] active:shadow-[0_2px_0_0_rgba(0,0,0,1)] active:translate-y-[2px]"
              >
                <Home className="w-4 h-4" />
                <span className="text-sm font-medium">Leave</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* TV Message Display */}
            {tvMessage && (
              <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl p-6 text-center shadow-lg animate-pulse">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <MessageSquare className="w-6 h-6 text-white" />
                  <h3 className="text-lg font-handwriting font-bold text-white">Admin Message</h3>
                </div>
                <p className="text-white font-handwriting text-lg">{tvMessage}</p>
              </div>
            )}

            {/* Game State Display */}
            {gameState === 'waiting' && (
              <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                <div className="mb-6">
                  <div className="w-24 h-24 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-12 h-12 text-white" />
                  </div>
                  <h2 className="text-3xl font-handwriting font-bold text-gray-800 mb-2">
                    Waiting Room
                  </h2>
                  <p className="text-gray-600 mb-6">
                    Waiting for the admin to start the quiz...
                  </p>
                </div>
                
                {/* Ready Status */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border-l-4 border-green-400">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    {isReady ? (
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    ) : (
                      <Clock className="w-8 h-8 text-yellow-600" />
                    )}
                    <h3 className="text-xl font-handwriting font-bold text-gray-800">
                      {isReady ? 'You are Ready!' : 'Are you Ready?'}
                    </h3>
                  </div>
                  <p className="text-gray-600 text-center">
                    {isReady 
                      ? 'You will be able to participate when the quiz starts!'
                      : 'Click the button above to join as a player when ready.'
                    }
                  </p>
                </div>
              </div>
            )}
            


            {/* Countdown State */}
            {gameState === 'countdown' && countdown && (
              <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                <div className="mb-6">
                  <div className="w-32 h-32 bg-gradient-to-r from-red-400 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                    <span className="text-6xl font-bold text-white">{countdown}</span>
                  </div>
                  <h2 className="text-3xl font-handwriting font-bold text-gray-800 mb-2">
                    Quiz Starting Soon!
                  </h2>
                  <p className="text-gray-600">
                    Get ready to answer questions...
                  </p>
                </div>
              </div>
            )}

            {/* Playing State - Questions now shown on TV */}
            {gameState === 'playing' && currentQuestion && (
              <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                <div className="mb-6">
                  <div className="w-24 h-24 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Target className="w-12 h-12 text-white" />
                  </div>
                  <h2 className="text-3xl font-handwriting font-bold text-gray-800 mb-2">
                    Question Active!
                  </h2>
                  <p className="text-gray-600">
                    Look at the TV above to see the question and answer options below.
                  </p>
                </div>
              </div>
            )}

            {/* Finished State */}
            {gameState === 'finished' && (
              <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                <div className="mb-6">
                  <div className="w-24 h-24 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trophy className="w-12 h-12 text-white" />
                  </div>
                  <h2 className="text-3xl font-handwriting font-bold text-gray-800 mb-2">
                    Quiz Finished!
                  </h2>
                  <p className="text-gray-600 mb-6">
                    Thanks for participating!
                  </p>
                  <Link
                    href={`/quiz/${snarkel?.id || ''}/leaderboard`}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-600 text-white rounded-lg hover:from-purple-600 hover:to-blue-700 transition-all font-semibold"
                  >
                    <BarChart3 className="w-5 h-5" />
                    View Full Leaderboard
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Room Info */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-handwriting font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Gamepad2 className="w-5 h-5 text-purple-600" />
                Room Info
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={`font-bold ${
                    gameState === 'waiting' ? 'text-yellow-600' :
                    gameState === 'countdown' ? 'text-orange-600' :
                    gameState === 'playing' ? 'text-green-600' :
                    'text-gray-600'
                  }`}>
                    {gameState === 'waiting' ? 'Waiting' :
                     gameState === 'countdown' ? 'Starting' :
                     gameState === 'playing' ? 'Playing' :
                     'Finished'}
                  </span>
                </div>
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
                  <span className="font-bold">
                    {snarkel?.speedBonusEnabled ? `+${snarkel.maxSpeedBonus}` : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>

            {/* Leaderboard - Hide during active questions */}
            {leaderboard.length > 0 && gameState !== 'playing' && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-handwriting font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-600" />
                  {gameState === 'finished' ? 'Final Results' : 'Current Standings'}
                </h3>
                <div className="space-y-3 mb-4">
                  {leaderboard.slice(0, 5).map((player, index) => (
                    <div key={player.userId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0 ? 'bg-yellow-500 text-white' :
                          index === 1 ? 'bg-gray-400 text-white' :
                          index === 2 ? 'bg-orange-500 text-white' :
                          'bg-gray-200 text-gray-700'
                        }`}>
                          {index + 1}
                        </div>
                        <span className="font-medium text-gray-800">
                          {player.name || 'Unknown Player'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500" />
                        <span className="font-bold text-gray-700">{player.score}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {gameState === 'finished' && (
                  <Link
                    href={`/quiz/${snarkel?.id || ''}/leaderboard`}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-600 text-white rounded-lg hover:from-purple-600 hover:to-blue-700 transition-all text-sm font-medium"
                  >
                    <BarChart3 className="w-4 h-4" />
                    View Full Leaderboard
                  </Link>
                )}
              </div>
            )}

            {/* Participants List */}
            {showParticipants && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-handwriting font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Participants ({participants.length})
                </h3>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {participants.map((participant) => (
                    <div key={participant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center">
                            <span className="text-white font-bold text-sm">
                              {participant.user.name?.charAt(0) || participant.user.address.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          {participant.isReady && (
                            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border border-white"></div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-800 text-sm">
                              {participant.user.name || `User ${participant.user.address.slice(0, 8)}...`}
                            </span>
                            {participant.isAdmin && (
                              <Crown className="w-3 h-3 text-yellow-500" />
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            {participant.user.address.slice(0, 6)}...{participant.user.address.slice(-4)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {participant.isReady ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <Clock className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Farcaster Celebration Modal */}
      {celebration.type && (
        <FarcasterCelebration
          type={celebration.type}
          score={celebration.score}
          maxScore={celebration.maxScore}
          position={celebration.position}
          onClose={hideCelebration}
        />
      )}
    </div>
  );
} 