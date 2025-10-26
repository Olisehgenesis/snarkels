'use client';

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { 
  Trophy, 
  Users, 
  Clock, 
  Star, 
  Eye, 
  Copy, 
  ExternalLink,
  Gamepad2,
  Sparkles,
  TrendingUp,
  Award,
  Calendar,
  BarChart3,
  Wallet,
  Coins,
  CheckCircle,
  XCircle,
  Play,
  Activity,
  Zap,
  Shield,
  Target,
  Crown,
  Gift,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  MapPin,
  Link,
  User,
  X
} from 'lucide-react';
import WalletConnectButton from '@/components/WalletConnectButton';
import { MiniAppHeader } from '@/components/MiniAppHeader';
import { MiniAppContextDisplay } from '@/components/MiniAppContextDisplay';
import { sdk } from '@farcaster/miniapp-sdk';
import FarcasterUserProfile from '@/components/FarcasterUserProfile';
import BottomNavigation from '@/components/BottomNavigation';

interface QuizHistory {
  id: string;
  snarkelCode: string;
  title: string;
  score: number;
  totalPoints: number;
  position: number;
  completedAt: string;
  chainId: number;
  networkName: string;
  rewardAmount?: string;
  rewardToken?: string;
  rewardClaimed: boolean;
  rewardClaimedAt?: string;
  rewardTxHash?: string;
}

interface RewardSummary {
  totalQuizzes: number;
  totalRewards: number;
  claimedRewards: number;
  pendingRewards: number;
  networks: Array<{
    chainId: number;
    name: string;
    count: number;
    totalAmount: string;
  }>;
}

export default function ProfilePage() {
  const { address, isConnected } = useAccount();
  const [quizHistory, setQuizHistory] = useState<QuizHistory[]>([]);
  const [rewardSummary, setRewardSummary] = useState<RewardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<QuizHistory | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'rewards'>('overview');
  const [expandedNetworks, setExpandedNetworks] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (isConnected && address) {
      fetchQuizHistory();
      fetchRewardSummary();
      sdk.actions.ready();
    } else {
      setLoading(false);
    }
  }, [isConnected, address]);

  const fetchQuizHistory = async () => {
    try {
      setError(null);
      const response = await fetch('/api/profile/quiz-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userAddress: address }),
      });

      const data = await response.json();
      if (data.success) {
        setQuizHistory(data.quizzes);
      } else {
        setError('Failed to fetch quiz history');
      }
    } catch (error) {
      console.error('Error fetching quiz history:', error);
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchRewardSummary = async () => {
    try {
      const response = await fetch('/api/profile/reward-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userAddress: address }),
      });

      const data = await response.json();
      if (data.success) {
        setRewardSummary(data.summary);
      }
    } catch (error) {
      console.error('Error fetching reward summary:', error);
    }
  };

  const handleClaimReward = async (quizId: string) => {
    try {
      const response = await fetch('/api/profile/claim-reward', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          quizId,
          userAddress: address 
        }),
      });

      const data = await response.json();
      if (data.success) {
        // Refresh data
        fetchQuizHistory();
        fetchRewardSummary();
      } else {
        setError(data.error || 'Failed to claim reward');
      }
    } catch (error) {
      console.error('Error claiming reward:', error);
      setError('Network error occurred');
    }
  };

  const toggleNetworkExpansion = (chainId: number) => {
    const newExpanded = new Set(expandedNetworks);
    if (newExpanded.has(chainId)) {
      newExpanded.delete(chainId);
    } else {
      newExpanded.add(chainId);
    }
    setExpandedNetworks(newExpanded);
  };

  const getNetworkIcon = (chainId: number) => {
    switch (chainId) {
      case 8453: return '🔵'; // Base
      case 42220: return '🟡'; // Celo
      default: return '🔘';
    }
  };

  const getNetworkName = (chainId: number) => {
    switch (chainId) {
      case 8453: return 'Base';
      case 42220: return 'Celo';
      default: return `Chain ${chainId}`;
    }
  };

  const getPositionIcon = (position: number) => {
    if (position === 1) return <Crown className="w-4 h-4 text-yellow-500" />;
    if (position === 2) return <Award className="w-4 h-4 text-gray-400" />;
    if (position === 3) return <Trophy className="w-4 h-4 text-orange-500" />;
    return <Star className="w-4 h-4 text-blue-500" />;
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="text-center">
            <div className="mb-8">
              <Gamepad2 className="w-16 h-16 mx-auto text-purple-600 mb-4" />
              <h1 className="text-3xl font-handwriting font-bold text-gray-800 mb-2">
                Your Quiz Profile
              </h1>
              <p className="text-gray-600">Connect your wallet to view your quiz history and rewards</p>
            </div>
            <WalletConnectButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Mini App Context Display */}
      <MiniAppContextDisplay />
      
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-handwriting font-bold text-gray-800">
                  Quiz Profile
                </h1>
                <p className="text-gray-600 text-sm">
                  Your quiz history and rewards
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <WalletConnectButton />
            </div>
          </div>
        </div>
      </div>

      {/* Mini App Header */}
      <div className="max-w-6xl mx-auto px-4 pt-4">
        <MiniAppHeader />
      </div>

      {/* Farcaster User Profile - Show when in Farcaster context */}
      <div className="max-w-6xl mx-auto px-4 pt-4">
        <FarcasterUserProfile variant="card" showPfp={true} showEmoji={true} showFid={true} />
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-handwriting font-medium transition-all ${
                activeTab === 'overview'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <BarChart3 size={16} />
              Overview
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-handwriting font-medium transition-all ${
                activeTab === 'history'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Activity size={16} />
              Quiz History ({quizHistory.length})
            </button>
            <button
              onClick={() => setActiveTab('rewards')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-handwriting font-medium transition-all ${
                activeTab === 'rewards'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Trophy size={16} />
              Rewards
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 font-handwriting">Loading your profile...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <span className="font-handwriting text-red-700">{error}</span>
            </div>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && rewardSummary && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Gamepad2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-handwriting">Total Quizzes</p>
                    <p className="text-2xl font-bold text-gray-900">{rewardSummary.totalQuizzes}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-handwriting">Total Rewards</p>
                    <p className="text-2xl font-bold text-gray-900">{rewardSummary.totalRewards}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-handwriting">Claimed</p>
                    <p className="text-2xl font-bold text-gray-900">{rewardSummary.claimedRewards}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Gift className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-handwriting">Pending</p>
                    <p className="text-2xl font-bold text-gray-900">{rewardSummary.pendingRewards}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Network Breakdown */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-handwriting font-bold text-gray-800 flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Rewards by Network
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {rewardSummary.networks.map((network) => (
                    <div key={network.chainId} className="border border-gray-200 rounded-lg">
                      <button
                        onClick={() => toggleNetworkExpansion(network.chainId)}
                        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{getNetworkIcon(network.chainId)}</span>
                          <div className="text-left">
                            <h4 className="font-handwriting font-bold text-gray-900">{network.name}</h4>
                            <p className="text-sm text-gray-600">{network.count} quizzes</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-handwriting font-bold text-gray-900">{network.totalAmount}</p>
                            <p className="text-sm text-gray-600">Total earned</p>
                          </div>
                          {expandedNetworks.has(network.chainId) ? (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </button>
                      
                      {expandedNetworks.has(network.chainId) && (
                        <div className="px-4 pb-4 border-t border-gray-200">
                          <div className="pt-4 space-y-2">
                            {quizHistory
                              .filter(quiz => quiz.chainId === network.chainId)
                              .map(quiz => (
                                <div key={quiz.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                  <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium text-gray-700">{quiz.snarkelCode}</span>
                                    <span className="text-sm text-gray-600">{quiz.title}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium text-gray-900">
                                      {quiz.rewardAmount || '0'} {quiz.rewardToken || 'tokens'}
                                    </span>
                                    {quiz.rewardClaimed ? (
                                      <CheckCircle className="w-4 h-4 text-green-500" />
                                    ) : (
                                      <Gift className="w-4 h-4 text-yellow-500" />
                                    )}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            {quizHistory.length === 0 ? (
              <div className="text-center py-12">
                <Gamepad2 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-handwriting font-medium text-gray-900 mb-2">No quizzes played yet</h3>
                <p className="text-gray-600">Start playing quizzes to build your history!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {quizHistory.map((quiz) => (
                  <div key={quiz.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="p-6">
                      {/* Quiz Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="font-handwriting font-bold text-gray-900 mb-1">{quiz.title}</h3>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span className="font-mono">{quiz.snarkelCode}</span>
                            <button
                              onClick={() => copyToClipboard(quiz.snarkelCode)}
                              className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {getPositionIcon(quiz.position)}
                          <span className="text-sm font-medium text-gray-700">#{quiz.position}</span>
                        </div>
                      </div>

                      {/* Quiz Stats */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <p className="text-2xl font-bold text-blue-600">{quiz.score}</p>
                          <p className="text-xs text-blue-600 font-handwriting">Score</p>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <p className="text-2xl font-bold text-green-600">{quiz.totalPoints}</p>
                          <p className="text-xs text-green-600 font-handwriting">Points</p>
                        </div>
                      </div>

                      {/* Network Info */}
                      <div className="flex items-center gap-2 mb-4 p-2 bg-gray-50 rounded-lg">
                        <span className="text-lg">{getNetworkIcon(quiz.chainId)}</span>
                        <span className="text-sm font-medium text-gray-700">{getNetworkName(quiz.chainId)}</span>
                        <span className="text-xs text-gray-500">• {formatDate(quiz.completedAt)}</span>
                      </div>

                      {/* Rewards Section */}
                      {quiz.rewardAmount && (
                        <div className="border-t border-gray-200 pt-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                Reward: {quiz.rewardAmount} {quiz.rewardToken}
                              </p>
                              <p className="text-xs text-gray-500">
                                {quiz.rewardClaimed ? 'Claimed' : 'Available to claim'}
                              </p>
                            </div>
                            {!quiz.rewardClaimed && (
                              <button
                                onClick={() => handleClaimReward(quiz.id)}
                                className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all font-handwriting font-medium"
                              >
                                Claim
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* View Details Button */}
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <button
                          onClick={() => setSelectedQuiz(quiz)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-handwriting text-sm"
                        >
                          <Eye className="w-4 h-4" />
                          View Details
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Rewards Tab */}
        {activeTab === 'rewards' && (
          <div className="space-y-6">
            {rewardSummary && (
              <>
                {/* Rewards Summary */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-handwriting font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Trophy className="w-5 h-5" />
                    Rewards Overview
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-3xl font-bold text-green-600">{rewardSummary.totalRewards}</p>
                      <p className="text-sm text-green-600 font-handwriting">Total Earned</p>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-3xl font-bold text-blue-600">{rewardSummary.claimedRewards}</p>
                      <p className="text-sm text-blue-600 font-handwriting">Claimed</p>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <p className="text-3xl font-bold text-yellow-600">{rewardSummary.pendingRewards}</p>
                      <p className="text-sm text-yellow-600 font-handwriting">Pending</p>
                    </div>
                  </div>
                </div>

                {/* Claimable Rewards */}
                {quizHistory.filter(q => !q.rewardClaimed && q.rewardAmount).length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="p-6 border-b border-gray-200">
                      <h3 className="text-lg font-handwriting font-bold text-gray-800 flex items-center gap-2">
                        <Gift className="w-5 h-5" />
                        Claimable Rewards
                      </h3>
                    </div>
                    <div className="p-6">
                      <div className="space-y-4">
                        {quizHistory
                          .filter(q => !q.rewardClaimed && q.rewardAmount)
                          .map(quiz => (
                            <div key={quiz.id} className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                                  <Trophy className="w-6 h-6 text-yellow-600" />
                                </div>
                                <div>
                                  <h4 className="font-handwriting font-bold text-gray-900">{quiz.title}</h4>
                                  <div className="flex items-center gap-4 text-sm text-gray-600">
                                    <span>Code: {quiz.snarkelCode}</span>
                                    <span>Position: #{quiz.position}</span>
                                    <span>Score: {quiz.score}/{quiz.totalPoints}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-handwriting font-bold text-gray-900 text-lg">
                                  {quiz.rewardAmount} {quiz.rewardToken}
                                </p>
                                <button
                                  onClick={() => handleClaimReward(quiz.id)}
                                  className="mt-2 px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg hover:from-yellow-600 hover:to-orange-600 transition-all font-handwriting font-medium"
                                >
                                  Claim Reward
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Claimed Rewards History */}
                {quizHistory.filter(q => q.rewardClaimed).length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="p-6 border-b border-gray-200">
                      <h3 className="text-lg font-handwriting font-bold text-gray-800 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5" />
                        Claimed Rewards History
                      </h3>
                    </div>
                    <div className="p-6">
                      <div className="space-y-4">
                        {quizHistory
                          .filter(q => q.rewardClaimed)
                          .map(quiz => (
                            <div key={quiz.id} className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                  <CheckCircle className="w-6 h-6 text-green-600" />
                                </div>
                                <div>
                                  <h4 className="font-handwriting font-bold text-gray-900">{quiz.title}</h4>
                                  <div className="flex items-center gap-4 text-sm text-gray-600">
                                    <span>Code: {quiz.snarkelCode}</span>
                                    <span>Position: #{quiz.position}</span>
                                    <span>Claimed: {quiz.rewardClaimedAt ? formatDate(quiz.rewardClaimedAt) : 'Unknown'}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-handwriting font-bold text-gray-900 text-lg">
                                  {quiz.rewardAmount} {quiz.rewardToken}
                                </p>
                                {quiz.rewardTxHash && (
                                  <a
                                    href={`https://basescan.org/tx/${quiz.rewardTxHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 hover:text-blue-800 font-mono"
                                  >
                                    View Transaction
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Quiz Detail Modal */}
      {selectedQuiz && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Trophy className="w-6 h-6" />
                  <div>
                    <h3 className="font-handwriting text-xl font-bold">Quiz Details</h3>
                    <p className="text-purple-100 text-sm">{selectedQuiz.title}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedQuiz(null)}
                  className="text-white hover:text-purple-200 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Quiz Info */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-handwriting font-bold text-gray-900">Quiz Code</h4>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-gray-700">{selectedQuiz.snarkelCode}</span>
                    <button
                      onClick={() => copyToClipboard(selectedQuiz.snarkelCode)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <h4 className="font-handwriting font-bold text-gray-900">Position</h4>
                  <div className="flex items-center gap-2">
                    {getPositionIcon(selectedQuiz.position)}
                    <span className="font-medium text-gray-700">#{selectedQuiz.position}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <h4 className="font-handwriting font-bold text-gray-900">Score</h4>
                  <span className="font-medium text-gray-700">{selectedQuiz.score}/{selectedQuiz.totalPoints}</span>
                </div>

                <div className="flex items-center justify-between">
                  <h4 className="font-handwriting font-bold text-gray-900">Network</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getNetworkIcon(selectedQuiz.chainId)}</span>
                    <span className="font-medium text-gray-700">{getNetworkName(selectedQuiz.chainId)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <h4 className="font-handwriting font-bold text-gray-900">Completed</h4>
                  <span className="font-medium text-gray-700">{formatDate(selectedQuiz.completedAt)}</span>
                </div>
              </div>

              {/* Rewards Info */}
              {selectedQuiz.rewardAmount && (
                <div className="border-t border-gray-200 pt-6">
                  <h4 className="font-handwriting font-bold text-gray-900 mb-4">Rewards</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h5 className="font-handwriting font-medium text-gray-700">Amount</h5>
                      <span className="font-bold text-gray-900 text-lg">
                        {selectedQuiz.rewardAmount} {selectedQuiz.rewardToken}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <h5 className="font-handwriting font-medium text-gray-700">Status</h5>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        selectedQuiz.rewardClaimed 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {selectedQuiz.rewardClaimed ? 'Claimed' : 'Available to Claim'}
                      </span>
                    </div>

                    {selectedQuiz.rewardClaimed && selectedQuiz.rewardClaimedAt && (
                      <div className="flex items-center justify-between">
                        <h5 className="font-handwriting font-medium text-gray-700">Claimed At</h5>
                        <span className="font-medium text-gray-700">{formatDate(selectedQuiz.rewardClaimedAt)}</span>
                      </div>
                    )}

                    {selectedQuiz.rewardTxHash && (
                      <div className="flex items-center justify-between">
                        <h5 className="font-handwriting font-medium text-gray-700">Transaction</h5>
                        <a
                          href={`https://basescan.org/tx/${selectedQuiz.rewardTxHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 font-mono text-sm"
                        >
                          {selectedQuiz.rewardTxHash.slice(0, 8)}...{selectedQuiz.rewardTxHash.slice(-6)}
                          <ExternalLink className="w-3 h-3 inline ml-1" />
                        </a>
                      </div>
                    )}
                  </div>

                  {!selectedQuiz.rewardClaimed && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <button
                        onClick={() => handleClaimReward(selectedQuiz.id)}
                        className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all font-handwriting font-bold shadow-md"
                      >
                        <Gift className="w-4 h-4 inline mr-2" />
                        Claim Reward
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}
