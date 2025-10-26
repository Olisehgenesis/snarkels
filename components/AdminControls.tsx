import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { 
  Crown, 
  Settings, 
  Play, 
  MessageSquare, 
  Users, 
  Clock, 
  Ban, 
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Pause,
  SkipForward,
  Volume2,
  Eye,
  UserX,
  Timer,
  Zap,
  Share2,
  Trophy
} from 'lucide-react';
import QuizRewards from './QuizRewards';

interface AdminControlsProps {
  socket: Socket | null;
  room: any;
  snarkel: any;
  participants: any[];
  isAdmin: boolean;
  onClose: () => void;
}

export default function AdminControls({ 
  socket, 
  room, 
  snarkel, 
  participants, 
  isAdmin, 
  onClose 
}: AdminControlsProps) {
  const [adminMessage, setAdminMessage] = useState('');
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [countdownTime, setCountdownTime] = useState(10);
  const [showCountdownModal, setShowCountdownModal] = useState(false);
  const [roomSettings, setRoomSettings] = useState({
    maxParticipants: room?.maxParticipants || 50,
    minParticipants: room?.minParticipants || 1,
    countdownDuration: room?.countdownDuration || 10
  });
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showParticipantModal, setShowParticipantModal] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<any>(null);
  const [systemStats, setSystemStats] = useState({
    connectedSockets: 0,
    averageResponseTime: 0,
    totalMessages: 0
  });
  const [showRewardsModal, setShowRewardsModal] = useState(false);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('systemStats', (stats) => {
      setSystemStats(stats);
    });

    socket.on('messageDelivered', (data) => {
      console.log('Message delivered to participants:', data);
    });

    socket.on('participantUpdated', (participant) => {
      console.log('Participant updated:', participant);
    });

    return () => {
      socket.off('systemStats');
      socket.off('messageDelivered');
      socket.off('participantUpdated');
    };
  }, [socket]);

  // Request system stats periodically
  useEffect(() => {
    if (!socket || !isAdmin) return;
    
    const interval = setInterval(() => {
      socket.emit('requestSystemStats');
    }, 5000);

    return () => clearInterval(interval);
  }, [socket, isAdmin]);

  if (!isAdmin) {
    return (
      <div className="text-center p-8">
        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h3 className="font-handwriting text-2xl font-bold text-red-600 mb-2">
          Access Denied
        </h3>
        <p className="font-handwriting text-gray-600">
          You don't have admin privileges for this room.
        </p>
      </div>
    );
  }

  const startGame = () => {
    if (participants.length < room.minParticipants) {
      alert(`Need at least ${room.minParticipants} participants to start the quiz.`);
      return;
    }
    setShowCountdownModal(true);
  };

  const confirmStartGame = () => {
    if (socket && isAdmin) {
      socket.emit('startGame', { 
        countdownTime,
        roomId: room.id 
      });
      setShowCountdownModal(false);
    }
  };

  const pauseGame = () => {
    if (socket && isAdmin) {
      socket.emit('pauseGame', { roomId: room.id });
    }
  };

  const resumeGame = () => {
    if (socket && isAdmin) {
      socket.emit('resumeGame', { roomId: room.id });
    }
  };

  const skipQuestion = () => {
    if (socket && isAdmin && window.confirm('Skip to next question?')) {
      socket.emit('skipQuestion', { roomId: room.id });
    }
  };

  const endGame = () => {
    if (socket && isAdmin && window.confirm('End the quiz? This cannot be undone.')) {
      socket.emit('endGame', { roomId: room.id });
    }
  };

  const sendMessage = () => {
    if (socket && isAdmin && adminMessage.trim()) {
      socket.emit('sendAdminMessage', { 
        message: adminMessage.trim(),
        roomId: room.id,
        timestamp: new Date().toISOString()
      });
      setAdminMessage('');
      setShowMessageModal(false);
    }
  };

    const broadcastNotification = (type: 'info' | 'warning' | 'success', message: string) => {
    if (socket && isAdmin) {
      socket.emit('broadcastNotification', { 
        type,
        message,
        roomId: room.id,
        timestamp: new Date().toISOString()
      });
    }
  };

  const shareSnarkel = () => {
    const shareUrl = `${window.location.origin}/share?code=${snarkel?.snarkelCode}`;
    if (navigator.share) {
      navigator.share({
        title: `Join my Snarkel: ${snarkel?.title}`,
        text: `Join my quiz session! Code: ${snarkel?.snarkelCode}`,
        url: shareUrl
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareUrl);
      alert('Share link copied to clipboard!');
    }
  };

  const kickParticipant = (participantId: string) => {
    if (socket && isAdmin && window.confirm('Remove this participant from the room?')) {
      socket.emit('kickParticipant', {
        participantId,
        roomId: room.id
      });
    }
  };

  const makeParticipantAdmin = (participantId: string) => {
    if (socket && isAdmin && window.confirm('Make this participant an admin?')) {
      socket.emit('promoteToAdmin', {
        participantId,
        roomId: room.id
      });
    }
  };

  const updateRoomSettings = () => {
    if (socket && isAdmin) {
      socket.emit('updateRoomSettings', {
        roomId: room.id,
        settings: roomSettings
      });
      setShowSettingsModal(false);
    }
  };

  const readyParticipants = participants.filter(p => p.isReady).length;
  const totalParticipants = participants.length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-6xl w-full mx-4 max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Crown className="w-8 h-8 text-yellow-500" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            </div>
            <div>
              <h2 className="font-handwriting text-3xl font-bold" style={{ color: '#476520' }}>
                Admin Dashboard
              </h2>
              <p className="font-handwriting text-sm text-gray-600">
                Full control over your Snarkel session
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-handwriting text-gray-600">System Status</div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-handwriting font-bold text-green-600">Online</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <XCircle className="w-6 h-6 text-gray-500" />
            </button>
          </div>
        </div>

        {/* System Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border-l-4 border-blue-400">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span className="font-handwriting text-sm text-gray-600">Connected</span>
            </div>
            <div className="font-handwriting text-2xl font-bold text-blue-700">
              {systemStats.connectedSockets}
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border-l-4 border-green-400">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-handwriting text-sm text-gray-600">Ready</span>
            </div>
            <div className="font-handwriting text-2xl font-bold text-green-700">
              {readyParticipants}/{totalParticipants}
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-4 border-l-4 border-yellow-400">
            <div className="flex items-center gap-2 mb-2">
              <Timer className="w-5 h-5 text-yellow-600" />
              <span className="font-handwriting text-sm text-gray-600">Avg Response</span>
            </div>
            <div className="font-handwriting text-2xl font-bold text-yellow-700">
              {systemStats.averageResponseTime}ms
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border-l-4 border-purple-400">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-5 h-5 text-purple-600" />
              <span className="font-handwriting text-sm text-gray-600">Messages</span>
            </div>
            <div className="font-handwriting text-2xl font-bold text-purple-700">
              {systemStats.totalMessages}
            </div>
          </div>
        </div>

        {/* Room & Quiz Info */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border-l-4 border-blue-400">
            <h3 className="font-handwriting text-xl font-bold mb-3 flex items-center gap-2" style={{ color: '#476520' }}>
              <Settings className="w-5 h-5" />
              Room Settings
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-handwriting text-gray-600">Name:</span>
                <span className="font-handwriting font-bold">{room.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-handwriting text-gray-600">Participants:</span>
                <span className="font-handwriting font-bold">{room.currentParticipants}/{room.maxParticipants}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-handwriting text-gray-600">Min Required:</span>
                <span className="font-handwriting font-bold">{room.minParticipants}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-handwriting text-gray-600">Status:</span>
                <span className={`font-handwriting font-bold ${
                  room.isWaiting ? 'text-yellow-600' : 
                  room.isStarted ? 'text-green-600' : 
                  room.isFinished ? 'text-gray-600' : 'text-blue-600'
                }`}>
                  {room.isWaiting ? 'Waiting' : 
                   room.isStarted ? 'In Progress' : 
                   room.isFinished ? 'Finished' : 'Ready'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border-l-4 border-green-400">
            <h3 className="font-handwriting text-xl font-bold mb-3 flex items-center gap-2" style={{ color: '#476520' }}>
              <Zap className="w-5 h-5" />
              Quiz Details
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-handwriting text-gray-600">Title:</span>
                <span className="font-handwriting font-bold">{snarkel.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-handwriting text-gray-600">Questions:</span>
                <span className="font-handwriting font-bold">{snarkel.totalQuestions}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-handwriting text-gray-600">Base Points:</span>
                <span className="font-handwriting font-bold">{snarkel.basePointsPerQuestion}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-handwriting text-gray-600">Speed Bonus:</span>
                <span className="font-handwriting font-bold">
                  {snarkel.speedBonusEnabled ? `+${snarkel.maxSpeedBonus}` : 'Disabled'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Game Controls */}
        <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-6 border-l-4 border-red-400 mb-6">
          <h3 className="font-handwriting text-xl font-bold mb-4 flex items-center gap-2" style={{ color: '#476520' }}>
            <Play className="w-5 h-5" />
            Game Controls
          </h3>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
            {!room.isStarted && (
              <button
                onClick={startGame}
                disabled={participants.length < room.minParticipants}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-400 hover:to-emerald-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-handwriting font-bold"
              >
                <Play className="w-5 h-5" />
                Start Quiz
              </button>
            )}
            
            {room.isStarted && (
              <>
                <button
                  onClick={pauseGame}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg hover:from-yellow-400 hover:to-orange-400 transition-all duration-300 font-handwriting font-bold"
                >
                  <Pause className="w-5 h-5" />
                  Pause
                </button>
                
                <button
                  onClick={resumeGame}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-400 hover:to-cyan-400 transition-all duration-300 font-handwriting font-bold"
                >
                  <Play className="w-5 h-5" />
                  Resume
                </button>
                
                <button
                  onClick={skipQuestion}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg hover:from-purple-400 hover:to-indigo-400 transition-all duration-300 font-handwriting font-bold"
                >
                  <SkipForward className="w-5 h-5" />
                  Skip Q
                </button>
              </>
            )}
            
            <button
              onClick={endGame}
              disabled={!room.isStarted}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-400 hover:to-red-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-handwriting font-bold"
            >
              <XCircle className="w-5 h-5" />
              End Quiz
            </button>
          </div>
        </div>

        {/* Communication Controls */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border-l-4 border-purple-400 mb-6">
          <h3 className="font-handwriting text-xl font-bold mb-4 flex items-center gap-2" style={{ color: '#476520' }}>
            <Volume2 className="w-5 h-5" />
            Communication
          </h3>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-3">
            <button
              onClick={() => setShowMessageModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-400 hover:to-purple-500 transition-all duration-300 font-handwriting font-bold"
            >
              <MessageSquare className="w-5 h-5" />
              Send Message
            </button>
            
            <button
              onClick={() => broadcastNotification('info', 'Quiz starting soon! Get ready!')}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:from-cyan-400 hover:to-blue-400 transition-all duration-300 font-handwriting font-bold"
            >
              <AlertTriangle className="w-5 h-5" />
              Alert All
            </button>
            
            <button
              onClick={() => broadcastNotification('success', 'Great job everyone!')}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-400 hover:to-emerald-400 transition-all duration-300 font-handwriting font-bold"
            >
              <CheckCircle className="w-5 h-5" />
              Encourage
            </button>

            <button
              onClick={shareSnarkel}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-400 hover:to-pink-400 transition-all duration-300 font-handwriting font-bold"
            >
              <Share2 className="w-5 h-5" />
              Share Quiz
            </button>

            <button
              onClick={() => setShowSettingsModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg hover:from-gray-400 hover:to-gray-500 transition-all duration-300 font-handwriting font-bold"
            >
              <Settings className="w-5 h-5" />
              Settings
            </button>

            <button
              onClick={() => setShowRewardsModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg hover:from-yellow-400 hover:to-orange-400 transition-all duration-300 font-handwriting font-bold"
            >
              <Trophy className="w-5 h-5" />
              Rewards
            </button>
          </div>
        </div>

        {/* Participants Management */}
        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-6 border-l-4 border-yellow-400">
          <h3 className="font-handwriting text-xl font-bold mb-4 flex items-center gap-2" style={{ color: '#476520' }}>
            <Users className="w-5 h-5" />
            Participants ({participants.length})
          </h3>
          <div className="grid gap-3 max-h-60 overflow-y-auto">
            {participants.map((participant) => (
              <div key={participant.id} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center">
                      <span className="text-white font-bold">
                        {participant.user.name?.charAt(0) || participant.user.address.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    {participant.isReady && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white">
                        <CheckCircle className="w-full h-full text-white" />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-handwriting font-bold text-sm">
                        {participant.user.name || `User ${participant.user.address.slice(0, 8)}...`}
                      </span>
                      {participant.isAdmin && (
                        <Crown className="w-4 h-4 text-yellow-500" />
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {participant.user.address.slice(0, 6)}...{participant.user.address.slice(-4)}
                    </div>
                    <div className="text-xs text-gray-400">
                      Joined {new Date(participant.joinedAt).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {participant.isReady ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <Clock className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  
                  {!participant.isAdmin && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => makeParticipantAdmin(participant.id)}
                        className="p-1 hover:bg-yellow-100 rounded text-yellow-600 transition-colors"
                        title="Make Admin"
                      >
                        <Crown className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={() => kickParticipant(participant.id)}
                        className="p-1 hover:bg-red-100 rounded text-red-600 transition-colors"
                        title="Remove Participant"
                      >
                        <UserX className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  
                  <button
                    onClick={() => {
                      setSelectedParticipant(participant);
                      setShowParticipantModal(true);
                    }}
                    className="p-1 hover:bg-blue-100 rounded text-blue-600 transition-colors"
                    title="View Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Start Game Modal */}
        {showCountdownModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
              <h3 className="font-handwriting text-2xl font-bold mb-4 text-center" style={{ color: '#476520' }}>
                Start Quiz Countdown
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block font-handwriting text-sm font-medium text-gray-700 mb-2">
                    Countdown Duration
                  </label>
                  
                  {/* Quick preset buttons */}
                  <div className="flex gap-2 mb-3">
                    {[10, 30, 60].map((time) => (
                      <button
                        key={time}
                        onClick={() => setCountdownTime(time)}
                        className={`px-3 py-1 rounded-lg text-sm font-handwriting transition-colors ${
                          countdownTime === time
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                        }`}
                      >
                        {time}s
                      </button>
                    ))}
                  </div>
                  
                  {/* Custom input */}
                  <input
                    type="number"
                    value={countdownTime}
                    onChange={(e) => setCountdownTime(parseInt(e.target.value) || 10)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="5"
                    max="300"
                    placeholder="Custom time in seconds"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Choose a preset or enter custom time. Late joiners get 30s grace period.
                  </p>
                </div>
                
                <div className="bg-blue-50 rounded-lg p-3">
                  <h4 className="font-handwriting font-bold text-sm text-blue-800 mb-2">Ready Check:</h4>
                  <div className="text-sm text-blue-700">
                    {readyParticipants} of {totalParticipants} participants ready
                  </div>
                  {readyParticipants < totalParticipants && (
                    <div className="text-xs text-blue-600 mt-1">
                      Consider waiting for more participants to be ready
                    </div>
                  )}
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={confirmStartGame}
                    className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-handwriting font-bold"
                  >
                    Start Quiz Now
                  </button>
                  <button
                    onClick={() => setShowCountdownModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-handwriting font-bold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Send Message Modal */}
        {showMessageModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
              <h3 className="font-handwriting text-2xl font-bold mb-4 text-center" style={{ color: '#476520' }}>
                Send Message to All Participants
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block font-handwriting text-sm font-medium text-gray-700 mb-2">
                    Message
                  </label>
                  <textarea
                    value={adminMessage}
                    onChange={(e) => setAdminMessage(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-24 resize-none font-handwriting"
                    placeholder="Enter your message for all participants..."
                    maxLength={500}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {adminMessage.length}/500 characters
                  </div>
                </div>
                
                <div className="bg-yellow-50 rounded-lg p-3">
                  <h4 className="font-handwriting font-bold text-sm text-yellow-800 mb-1">Quick Messages:</h4>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Get ready, quiz starts soon!",
                      "Great job everyone!",
                      "Take your time to think",
                      "Last chance to join!"
                    ].map((msg, i) => (
                      <button
                        key={i}
                        onClick={() => setAdminMessage(msg)}
                        className="text-xs px-2 py-1 bg-yellow-200 hover:bg-yellow-300 rounded font-handwriting transition-colors"
                      >
                        {msg}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={sendMessage}
                    disabled={!adminMessage.trim()}
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-handwriting font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Send Message
                  </button>
                  <button
                    onClick={() => setShowMessageModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-handwriting font-bold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Room Settings Modal */}
        {showSettingsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
              <h3 className="font-handwriting text-2xl font-bold mb-4 text-center" style={{ color: '#476520' }}>
                Room Settings
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block font-handwriting text-sm font-medium text-gray-700 mb-2">
                    Maximum Participants
                  </label>
                  <input
                    type="number"
                    value={roomSettings.maxParticipants}
                    onChange={(e) => setRoomSettings({...roomSettings, maxParticipants: parseInt(e.target.value) || 50})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="1"
                    max="200"
                  />
                </div>
                
                <div>
                  <label className="block font-handwriting text-sm font-medium text-gray-700 mb-2">
                    Minimum Participants to Start
                  </label>
                  <input
                    type="number"
                    value={roomSettings.minParticipants}
                    onChange={(e) => setRoomSettings({...roomSettings, minParticipants: parseInt(e.target.value) || 1})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="1"
                    max={roomSettings.maxParticipants}
                  />
                </div>
                
                <div>
                  <label className="block font-handwriting text-sm font-medium text-gray-700 mb-2">
                    Default Countdown Duration (seconds)
                  </label>
                  <input
                    type="number"
                    value={roomSettings.countdownDuration}
                    onChange={(e) => setRoomSettings({...roomSettings, countdownDuration: parseInt(e.target.value) || 10})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="3"
                    max="60"
                  />
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={updateRoomSettings}
                    className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-handwriting font-bold"
                  >
                    Update Settings
                  </button>
                  <button
                    onClick={() => setShowSettingsModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-handwriting font-bold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Participant Details Modal */}
        {showParticipantModal && selectedParticipant && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
              <h3 className="font-handwriting text-2xl font-bold mb-4 text-center" style={{ color: '#476520' }}>
                Participant Details
              </h3>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center mx-auto mb-3">
                    <span className="text-white font-bold text-xl">
                      {selectedParticipant.user.name?.charAt(0) || selectedParticipant.user.address.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <h4 className="font-handwriting text-xl font-bold">
                    {selectedParticipant.user.name || `User ${selectedParticipant.user.address.slice(0, 8)}...`}
                  </h4>
                  <p className="text-sm text-gray-600 font-mono">
                    {selectedParticipant.user.address}
                  </p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="font-handwriting text-gray-600">Status:</span>
                    <span className={`font-handwriting font-bold ${selectedParticipant.isReady ? 'text-green-600' : 'text-yellow-600'}`}>
                      {selectedParticipant.isReady ? 'Ready' : 'Not Ready'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-handwriting text-gray-600">Role:</span>
                    <span className="font-handwriting font-bold">
                      {selectedParticipant.isAdmin ? 'Admin' : 'Participant'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-handwriting text-gray-600">Joined:</span>
                    <span className="font-handwriting font-bold">
                      {new Date(selectedParticipant.joinedAt).toLocaleString()}
                    </span>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowParticipantModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-handwriting font-bold"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quiz Rewards Modal */}
        {showRewardsModal && (
          <QuizRewards
            sessionId={room?.sessionNumber || 1}
            isAdmin={isAdmin}
            onClose={() => setShowRewardsModal(false)}
          />
        )}
      </div>
    </div>
  );
} 