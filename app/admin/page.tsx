'use client';

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { 
  Trophy, 
  Users, 
  Clock, 
  Star, 
  Edit3, 
  Trash2, 
  Eye, 
  Copy, 
  ExternalLink,
  Plus,
  Gamepad2,
  Sparkles,
  TrendingUp,
  Award,
  Calendar,
  BarChart3,
  Settings,
  DollarSign,
  CheckCircle,
  XCircle,
  Play,
  Pause,
  StopCircle,
  Activity,
  Zap,
  Shield,
  Target,
  Crown
} from 'lucide-react';
import WalletConnectButton from '@/components/WalletConnectButton';
import QuizRewardsModal from '@/components/QuizRewardsModal';
import { sdk } from '@farcaster/miniapp-sdk';

interface Snarkel {
  id: string;
  title: string;
  description: string;
  snarkelCode: string;
  isActive: boolean;
  isPublic: boolean;
  createdAt: string;
  totalQuestions: number;
  basePointsPerQuestion: number;
  speedBonusEnabled: boolean;
  maxSpeedBonus: number;
  spamControlEnabled: boolean;
  entryFee: string;
  entryFeeToken: string;
  entryFeeNetwork: string;
  allowlistCount: number;
  hasRewards: boolean;
  rewardsNetwork?: string; // Add network information for rewards
  rewardsChainId?: number; // Add chain ID for rewards
  autoStartEnabled: boolean;
  scheduledStartTime: string | null;
  creator: {
    id: string;
    address: string;
    name: string;
  };
  stats?: {
    totalParticipants: number;
    totalSubmissions: number;
    averageScore: number;
    totalRewardsDistributed: number;
  };
}

interface QuizSession {
  id: string;
  name: string;
  sessionNumber: number;
  isActive: boolean;
  isWaiting: boolean;
  isStarted: boolean;
  isFinished: boolean;
  currentParticipants: number;
  maxParticipants: number;
  createdAt: string;
  actualStartTime: string | null;
  endTime: string | null;
  scheduledStartTime: string | null;
  snarkel: {
    id: string;
    title: string;
    snarkelCode: string;
  };
  participants: Array<{
    id: string;
    address: string;
    name: string;
    joinedAt: string;
    isReady: boolean;
    isAdmin: boolean;
  }>;
  submissions: Array<{
    id: string;
    score: number;
    totalPoints: number;
    totalQuestions: number;
    timeSpent: number | null;
    averageTimePerQuestion: number | null;
    completedAt: string;
    user: {
      id: string;
      address: string;
      name: string;
    };
  }>;
  rewards: Array<{
    id: string;
    isDistributed: boolean;
    distributedAt: string | null;
    onchainSessionId: string | null;
    network?: string;
    chainId?: number;
    distributions: Array<{
      id: string;
      position: number;
      amount: string;
      txHash: string | null;
      isProcessed: boolean;
      processedAt: string | null;
      user: {
        address: string;
        name: string;
      };
    }>;
  }>;
  stats: {
    totalParticipants: number;
    totalSubmissions: number;
    averageScore: number;
    totalRewardsDistributed: number;
    totalRewardAmount: string;
  };
}

export default function AdminPage() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<'quizzes' | 'sessions'>('quizzes');
  const [mySnarkels, setMySnarkels] = useState<Snarkel[]>([]);
  const [quizSessions, setQuizSessions] = useState<QuizSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSnarkel, setSelectedSnarkel] = useState<Snarkel | null>(null);
  const [selectedSession, setSelectedSession] = useState<QuizSession | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQuizRewardsModal, setShowQuizRewardsModal] = useState(false);

  // Extract onClick handlers into separate functions
  const handleCreateNew = () => {
    window.location.href = '/create';
  };

  const handleTabChange = (tab: 'quizzes' | 'sessions') => {
    setActiveTab(tab);
  };

  const handleRefreshQuizzes = () => {
    fetchMySnarkels();
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  const handleJoinSnarkel = (code: string) => {
    window.open(`/join?code=${code}`, '_blank');
  };

  const handleEditSnarkel = (id: string) => {
    window.open(`/create?edit=${id}`, '_blank');
  };

  const handleSelectSnarkel = (snarkel: Snarkel) => {
    setSelectedSnarkel(snarkel);
  };

  const handleSelectSession = (session: QuizSession) => {
    setSelectedSession(session);
  };

  const handleCloseSnarkelModal = () => {
    setSelectedSnarkel(null);
  };

  const handleCloseSessionModal = () => {
    setSelectedSession(null);
  };

  const handleJoinSelectedSnarkel = (code: string) => {
    window.open(`/join?code=${code}`, '_blank');
  };

  const handleEditSelectedSnarkel = (id: string) => {
    window.open(`/create?edit=${id}`, '_blank');
  };

  const handleTabChangeQuizzes = () => {
    handleTabChange('quizzes');
  };

  const handleTabChangeSessions = () => {
    handleTabChange('sessions');
  };

  const handleCopySnarkelCode = (code: string) => {
    handleCopyCode(code);
  };

  const handleJoinSnarkelCode = (code: string) => {
    handleJoinSnarkel(code);
  };

  const handleEditSnarkelId = (id: string) => {
    handleEditSnarkel(id);
  };

  const handleSelectSnarkelItem = (snarkel: Snarkel) => {
    handleSelectSnarkel(snarkel);
  };

  const handleSelectSessionItem = (session: QuizSession) => {
    handleSelectSession(session);
  };

  const handleJoinSelectedSnarkelCode = (code: string) => {
    handleJoinSelectedSnarkel(code);
  };

  const handleEditSelectedSnarkelId = (id: string) => {
    handleEditSelectedSnarkel(id);
  };

  useEffect(() => {
    if (isConnected && address) {
      fetchMySnarkels();
      fetchQuizSessions();
      sdk.actions.ready();
    } else {
      setLoading(false);
    }
  }, [isConnected, address]);

  const fetchMySnarkels = async () => {
    try {
      setError(null);
      const response = await fetch('/api/snarkel/my-snarkels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userAddress: address }),
      });

      const data = await response.json();
      if (data.success) {
        setMySnarkels(data.snarkels);
      } else {
        setError('Failed to fetch your snarkels');
      }
    } catch (error) {
      console.error('Error fetching my snarkels:', error);
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchQuizSessions = async () => {
    try {
      const response = await fetch('/api/snarkel/quiz-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userAddress: address }),
      });

      const data = await response.json();
      if (data.success) {
        setQuizSessions(data.sessions);
      }
    } catch (error) {
      console.error('Error fetching quiz sessions:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'text-green-600' : 'text-red-600';
  };

  const getStatusText = (isActive: boolean) => {
    return isActive ? 'Active' : 'Inactive';
  };

  const getSessionStatus = (session: QuizSession) => {
    if (session.isFinished) return { text: 'Finished', color: 'text-gray-600' };
    if (session.isStarted) return { text: 'In Progress', color: 'text-blue-600' };
    if (session.isWaiting) return { text: 'Waiting', color: 'text-yellow-600' };
    return { text: 'Scheduled', color: 'text-purple-600' };
  };

  const getRewardStatus = (session: QuizSession) => {
    const distributedRewards = session.rewards.filter(r => r.isDistributed).length;
    const totalRewards = session.rewards.length;
    const network = session.rewards[0]?.network;
    const baseText = `${distributedRewards}/${totalRewards} distributed`;
    return network ? `${baseText} (${network})` : baseText;
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="text-center">
            <div className="mb-8">
              <Gamepad2 className="w-16 h-16 mx-auto text-purple-600 mb-4" />
              <h1 className="text-3xl font-handwriting font-bold text-gray-800 mb-2">
                Snarkel Admin Dashboard
              </h1>
              <p className="text-gray-600">Connect your wallet to manage your snarkels</p>
            </div>
            <WalletConnectButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-handwriting font-bold text-gray-800">
                  Quiz Admin Dashboard
                </h1>
                <p className="text-gray-600 text-sm">
                  Manage your quizzes and sessions
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <WalletConnectButton />
              <button
                onClick={() => setShowQuizRewardsModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all font-handwriting font-medium"
              >
                <Trophy size={16} />
                Add Quiz Rewards
              </button>
              <button
                onClick={handleCreateNew}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all font-handwriting font-medium"
              >
                <Plus size={16} />
                Create New
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={handleTabChangeQuizzes}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-handwriting font-medium transition-all ${
                activeTab === 'quizzes'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Trophy size={16} />
              My Quizzes ({mySnarkels.length})
            </button>
            <button
              onClick={handleTabChangeSessions}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-handwriting font-medium transition-all ${
                activeTab === 'sessions'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Activity size={16} />
              Quiz Sessions ({quizSessions.length})
            </button>
          </div>
        </div>

        {activeTab === 'quizzes' ? (
          // Quizzes Tab Content
          loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your snarkels...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
                <p className="text-red-600 mb-4">{error}</p>
                <button
                  onClick={handleRefreshQuizzes}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : mySnarkels.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-white rounded-xl shadow-lg p-8 max-w-md mx-auto">
                <Gamepad2 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-handwriting font-bold text-gray-800 mb-2">
                  No Snarkels Yet
                </h3>
                <p className="text-gray-600 mb-6">
                  Create your first snarkel to get started!
                </p>
                <button
                  onClick={handleCreateNew}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all font-handwriting font-medium mx-auto"
                >
                  <Plus size={18} />
                  Create Your First Snarkel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Trophy className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Quizzes</p>
                      <p className="text-2xl font-handwriting font-bold text-gray-800">
                        {mySnarkels.length}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Active</p>
                      <p className="text-2xl font-handwriting font-bold text-gray-800">
                        {mySnarkels.filter(s => s.isActive).length}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Questions</p>
                      <p className="text-2xl font-handwriting font-bold text-gray-800">
                        {mySnarkels.reduce((sum, s) => sum + s.totalQuestions, 0)}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <Award className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">With Rewards</p>
                      <p className="text-2xl font-handwriting font-bold text-gray-800">
                        {mySnarkels.filter(s => s.hasRewards).length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quizzes List */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="text-lg font-handwriting font-bold text-gray-800">
                    Your Quizzes
                  </h2>
                </div>
                
                <div className="divide-y divide-gray-100">
                  {mySnarkels.map((snarkel) => (
                    <div key={snarkel.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-handwriting font-bold text-gray-800">
                              {snarkel.title}
                            </h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(snarkel.isActive)}`}>
                              {getStatusText(snarkel.isActive)}
                            </span>
                            {snarkel.hasRewards && (
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                                {snarkel.rewardsNetwork ? `Rewards (${snarkel.rewardsNetwork})` : 'Rewards'}
                              </span>
                            )}
                            {snarkel.entryFeeNetwork && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                {snarkel.entryFeeNetwork}
                              </span>
                            )}
                          </div>
                          
                          <p className="text-gray-600 mb-3">{snarkel.description}</p>
                          
                          <div className="flex items-center gap-6 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar size={14} />
                              {formatDate(snarkel.createdAt)}
                            </div>
                            <div className="flex items-center gap-1">
                              <BarChart3 size={14} />
                              {snarkel.totalQuestions} questions
                            </div>
                            <div className="flex items-center gap-1">
                              <Users size={14} />
                              {snarkel.allowlistCount} allowed
                            </div>
                            <div className="flex items-center gap-1">
                              <Star size={14} />
                              {snarkel.basePointsPerQuestion} pts
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => handleCopySnarkelCode(snarkel.snarkelCode)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm"
                            title="Copy code"
                          >
                            <Copy size={14} />
                            {snarkel.snarkelCode}
                          </button>
                          
                          <button
                            onClick={() => handleJoinSnarkelCode(snarkel.snarkelCode)}
                            className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors"
                            title="View snarkel"
                          >
                            <Eye size={16} />
                          </button>
                          
                          <button
                            onClick={() => handleEditSnarkelId(snarkel.id)}
                            className="p-2 bg-green-100 hover:bg-green-200 text-green-600 rounded-lg transition-colors"
                            title="Edit snarkel"
                          >
                            <Edit3 size={16} />
                          </button>
                          
                          <button
                            onClick={() => handleSelectSnarkelItem(snarkel)}
                            className="p-2 bg-purple-100 hover:bg-purple-200 text-purple-600 rounded-lg transition-colors"
                            title="View details"
                          >
                            <TrendingUp size={16} />
                          </button>
                          
                          <button
                            onClick={() => handleSelectSnarkelItem(snarkel)}
                            className="p-2 bg-orange-100 hover:bg-orange-200 text-orange-600 rounded-lg transition-colors"
                            title="Quiz details"
                          >
                            <Settings size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        ) : (
          // Sessions Tab Content
          <div className="space-y-6">
            {/* Sessions Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Activity className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Sessions</p>
                    <p className="text-2xl font-handwriting font-bold text-gray-800">
                      {quizSessions.length}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Play className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Running</p>
                    <p className="text-2xl font-handwriting font-bold text-gray-800">
                      {quizSessions.filter(s => s.isStarted && !s.isFinished).length}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Participants</p>
                    <p className="text-2xl font-handwriting font-bold text-gray-800">
                      {quizSessions.reduce((sum, s) => sum + s.stats.totalParticipants, 0)}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Rewards Distributed</p>
                    <p className="text-2xl font-handwriting font-bold text-gray-800">
                      {quizSessions.reduce((sum, s) => sum + s.stats.totalRewardsDistributed, 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sessions List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-handwriting font-bold text-gray-800">
                  Quiz Sessions
                </h2>
              </div>
              
              {loading ? (
                <div className="p-6 text-center">
                  <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading sessions...</p>
                </div>
              ) : quizSessions.length === 0 ? (
                <div className="p-6 text-center">
                  <Activity className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-xl font-handwriting font-bold text-gray-800 mb-2">
                    No Sessions Yet
                  </h3>
                  <p className="text-gray-600">
                    Start a quiz session to see it here!
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {quizSessions.map((session) => {
                    const sessionStatus = getSessionStatus(session);
                    const rewardStatus = getRewardStatus(session);
                    
                    return (
                      <div key={session.id} className="p-6 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-handwriting font-bold text-gray-800">
                                {session.snarkel.title} - Session {session.sessionNumber}
                              </h3>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${sessionStatus.color}`}>
                                {sessionStatus.text}
                              </span>
                              <span className="px-2 py-1 rounded-full text-xs font-medium text-gray-600 bg-gray-100">
                                {rewardStatus}
                              </span>
                              {session.rewards[0]?.network && (
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {session.rewards[0].network}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-6 text-sm text-gray-500 mb-3">
                              <div className="flex items-center gap-1">
                                <Calendar size={14} />
                                {formatDate(session.createdAt)}
                              </div>
                              <div className="flex items-center gap-1">
                                <Users size={14} />
                                {session.stats.totalParticipants} participants
                              </div>
                              <div className="flex items-center gap-1">
                                <BarChart3 size={14} />
                                {session.stats.totalSubmissions} submissions
                              </div>
                              <div className="flex items-center gap-1">
                                <Target size={14} />
                                {session.stats.averageScore}% avg score
                              </div>
                              {session.stats.totalRewardsDistributed > 0 && (
                                <div className="flex items-center gap-1">
                                  <DollarSign size={14} />
                                  {session.stats.totalRewardAmount} distributed
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 ml-4">
                            <button
                              onClick={() => handleSelectSessionItem(session)}
                              className="p-2 bg-purple-100 hover:bg-purple-200 text-purple-600 rounded-lg transition-colors"
                              title="View session details"
                            >
                              <Eye size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Snarkel Details Modal */}
      {selectedSnarkel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-handwriting font-bold text-gray-800">
                  {selectedSnarkel.title}
                </h3>
                <button
                  onClick={handleCloseSnarkelModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <span className="text-2xl">&times;</span>
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <h4 className="font-handwriting font-bold text-gray-800 mb-2">Description</h4>
                <p className="text-gray-600">{selectedSnarkel.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-handwriting font-bold text-gray-800 mb-2">Basic Info</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Code:</span>
                      <span className="font-mono">{selectedSnarkel.snarkelCode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Questions:</span>
                      <span>{selectedSnarkel.totalQuestions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Base Points:</span>
                      <span>{selectedSnarkel.basePointsPerQuestion}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Speed Bonus:</span>
                      <span>{selectedSnarkel.speedBonusEnabled ? 'Enabled' : 'Disabled'}</span>
                    </div>
                    {selectedSnarkel.speedBonusEnabled && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Max Bonus:</span>
                        <span>{selectedSnarkel.maxSpeedBonus}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-handwriting font-bold text-gray-800 mb-2">Settings</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={getStatusColor(selectedSnarkel.isActive)}>
                        {getStatusText(selectedSnarkel.isActive)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Visibility:</span>
                      <span>{selectedSnarkel.isPublic ? 'Public' : 'Private'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Spam Control:</span>
                      <span>{selectedSnarkel.spamControlEnabled ? 'Enabled' : 'Disabled'}</span>
                    </div>
                    {selectedSnarkel.spamControlEnabled && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Entry Fee:</span>
                          <span>{selectedSnarkel.entryFee}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Token:</span>
                          <span className="font-mono text-xs">{selectedSnarkel.entryFeeToken}</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Allowlist:</span>
                      <span>{selectedSnarkel.allowlistCount} addresses</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Auto-Start:</span>
                      <span>{selectedSnarkel.autoStartEnabled ? 'Enabled' : 'Disabled'}</span>
                    </div>
                    {selectedSnarkel.autoStartEnabled && selectedSnarkel.scheduledStartTime && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Start Time:</span>
                        <span>{formatDate(selectedSnarkel.scheduledStartTime)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {selectedSnarkel.stats && (
                <div>
                  <h4 className="font-handwriting font-bold text-gray-800 mb-2">Statistics</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Participants:</span>
                      <span>{selectedSnarkel.stats.totalParticipants}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Submissions:</span>
                      <span>{selectedSnarkel.stats.totalSubmissions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Average Score:</span>
                      <span>{selectedSnarkel.stats.averageScore}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Rewards Distributed:</span>
                      <span>{selectedSnarkel.stats.totalRewardsDistributed}</span>
                    </div>
                    {selectedSnarkel.hasRewards && selectedSnarkel.rewardsNetwork && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Rewards Network:</span>
                        <span className="font-medium">{selectedSnarkel.rewardsNetwork}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={() => handleJoinSelectedSnarkelCode(selectedSnarkel.snarkelCode)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <Eye size={16} />
                  View Snarkel
                </button>
                <button
                  onClick={() => handleEditSelectedSnarkelId(selectedSnarkel.id)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  <Edit3 size={16} />
                  Edit
                </button>
                <button
                  onClick={handleCloseSnarkelModal}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Session Details Modal */}
      {selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-handwriting font-bold text-gray-800">
                  {selectedSession.snarkel.title} - Session {selectedSession.sessionNumber}
                </h3>
                <button
                  onClick={handleCloseSessionModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <span className="text-2xl">&times;</span>
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Session Info */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-handwriting font-bold text-gray-800 mb-3">Session Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={getSessionStatus(selectedSession).color}>
                        {getSessionStatus(selectedSession).text}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Created:</span>
                      <span>{formatDate(selectedSession.createdAt)}</span>
                    </div>
                    {selectedSession.actualStartTime && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Started:</span>
                        <span>{formatDate(selectedSession.actualStartTime)}</span>
                      </div>
                    )}
                    {selectedSession.endTime && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Ended:</span>
                        <span>{formatDate(selectedSession.endTime)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Participants:</span>
                      <span>{selectedSession.stats.totalParticipants}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Submissions:</span>
                      <span>{selectedSession.stats.totalSubmissions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avg Score:</span>
                      <span>{selectedSession.stats.averageScore}%</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-handwriting font-bold text-gray-800 mb-3">Reward Status</h4>
                  <div className="space-y-2 text-sm">
                    {selectedSession.rewards.map((reward, index) => (
                      <div key={reward.id} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-gray-600">Reward {index + 1}:</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            reward.isDistributed ? 'text-green-600 bg-green-100' : 'text-yellow-600 bg-yellow-100'
                          }`}>
                            {reward.isDistributed ? 'Distributed' : 'Pending'}
                          </span>
                        </div>
                        {reward.network && (
                          <div className="text-xs text-gray-500">
                            Network: {reward.network}
                          </div>
                        )}
                        {reward.distributedAt && (
                          <div className="text-xs text-gray-500">
                            Distributed: {formatDate(reward.distributedAt)}
                          </div>
                        )}
                        {reward.onchainSessionId && (
                          <div className="text-xs text-gray-500">
                            On-chain ID: {reward.onchainSessionId}
                          </div>
                        )}
                      </div>
                    ))}
                    {selectedSession.rewards.length === 0 && (
                      <div className="text-gray-500 text-sm">No rewards configured</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Participants */}
              {selectedSession.participants.length > 0 && (
                <div>
                  <h4 className="font-handwriting font-bold text-gray-800 mb-3">Participants</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedSession.participants.map((participant) => (
                        <div key={participant.id} className="flex items-center justify-between bg-white p-3 rounded-lg border">
                          <div>
                            <div className="font-medium text-sm">{participant.name || 'Anonymous'}</div>
                            <div className="text-xs text-gray-500 font-mono">{participant.address}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            {participant.isAdmin && (
                              <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                                Admin
                              </span>
                            )}
                            {participant.isReady && (
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                                Ready
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Submissions */}
              {selectedSession.submissions.length > 0 && (
                <div>
                  <h4 className="font-handwriting font-bold text-gray-800 mb-3">Submissions</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="space-y-3">
                      {selectedSession.submissions.map((submission) => (
                        <div key={submission.id} className="bg-white p-4 rounded-lg border">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <div className="font-medium text-sm">{submission.user.name || 'Anonymous'}</div>
                              <div className="text-xs text-gray-500 font-mono">{submission.user.address}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-purple-600">{submission.score}%</div>
                              <div className="text-xs text-gray-500">{submission.totalPoints} points</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>Questions: {submission.totalQuestions}</span>
                            {submission.timeSpent && (
                              <span>Time: {Math.round(submission.timeSpent / 1000)}s</span>
                            )}
                            {submission.averageTimePerQuestion && (
                              <span>Avg: {submission.averageTimePerQuestion.toFixed(1)}s</span>
                            )}
                            <span>Completed: {formatDate(submission.completedAt)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Reward Distributions */}
              {selectedSession.rewards.some(r => r.distributions.length > 0) && (
                <div>
                  <h4 className="font-handwriting font-bold text-gray-800 mb-3">Reward Distributions</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2">Position</th>
                            <th className="text-left py-2">User</th>
                            <th className="text-left py-2">Amount</th>
                            <th className="text-left py-2">Status</th>
                            <th className="text-left py-2">Transaction</th>
                            <th className="text-left py-2">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedSession.rewards.flatMap(reward => 
                            reward.distributions.map(distribution => (
                              <tr key={distribution.id} className="border-b border-gray-100">
                                <td className="py-2">
                                  <span className="flex items-center gap-1">
                                    {distribution.position === 1 && <Crown className="w-4 h-4 text-yellow-500" />}
                                    {distribution.position === 2 && <Award className="w-4 h-4 text-gray-400" />}
                                    {distribution.position === 3 && <Trophy className="w-4 h-4 text-orange-500" />}
                                    <span className="font-medium">{distribution.position}</span>
                                  </span>
                                </td>
                                <td className="py-2">
                                  <div>
                                    <div className="font-medium">{distribution.user.name || 'Anonymous'}</div>
                                    <div className="text-xs text-gray-500 font-mono">{distribution.user.address}</div>
                                  </div>
                                </td>
                                <td className="py-2 font-medium">{distribution.amount}</td>
                                <td className="py-2">
                                  <span className={`px-2 py-1 rounded-full text-xs ${
                                    distribution.isProcessed 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {distribution.isProcessed ? 'Processed' : 'Pending'}
                                  </span>
                                </td>
                                <td className="py-2">
                                  {distribution.txHash ? (
                                    <a 
                                      href={(() => {
                                        const chainId = reward.chainId;
                                        if (chainId === 42220) return `https://celoscan.io/tx/${distribution.txHash}`;
                                        if (chainId === 8453) return `https://basescan.org/tx/${distribution.txHash}`;
                                        return `https://basescan.org/tx/${distribution.txHash}`; // Default to Base
                                      })()}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800 text-xs font-mono"
                                    >
                                      {distribution.txHash.slice(0, 8)}...{distribution.txHash.slice(-6)}
                                    </a>
                                  ) : (
                                    <span className="text-gray-400 text-xs">-</span>
                                  )}
                                </td>
                                <td className="py-2 text-xs text-gray-500">
                                  {distribution.processedAt ? formatDate(distribution.processedAt) : '-'}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={handleCloseSessionModal}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quiz Rewards Modal */}
      <QuizRewardsModal
        isOpen={showQuizRewardsModal}
        onClose={() => setShowQuizRewardsModal(false)}
      />
    </div>
  );
} 