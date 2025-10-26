'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { 
  Trophy, 
  Star, 
  Target, 
  Users, 
  Clock, 
  Award,
  ArrowLeft,
  Crown,
  Medal,
  TrendingUp,
  User,
  CheckCircle,
  XCircle,
  DollarSign,
  Zap,
  Settings,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Gift,
  Wallet,
  Network,
  BarChart3,
  Calendar,
  Timer,
  Percent,
  Play,
  Pause,
  StopCircle,
  RefreshCw,
  AlertTriangle,
  Info,
  Home
} from 'lucide-react';
import Link from 'next/link';
import { useQuizContract } from '@/hooks/useViemContract';
import toast from 'react-hot-toast';


interface QuestionBreakdown {
  questionId: string;
  questionText: string;
  isCorrect: boolean;
  pointsEarned: number;
  timeToAnswer: number;
  timeLimit: number;
  selectedOptions: string[];
  correctOption: string;
  maxPoints: number;
}

interface LeaderboardEntry {
  userId: string;
  name: string;
  score: number;
  position: number;
  walletAddress: string;
  timeBonus?: number;
  totalQuestions?: number;
  correctAnswers?: number;
  averageTimePerQuestion?: number;
  completedAt?: string;
  questionBreakdown: QuestionBreakdown[];
  accuracy: number;
}

interface Reward {
  id: string;
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
  totalRewardPool: string;
  isDistributed: boolean;
  distributedAt?: string;
  totalWinners?: number;
  rewardAllParticipants: boolean;
  rewardAmounts?: number[];
  minParticipants?: number;
  chainId: number;
  network: string;
}

interface QuizInfo {
  id: string;
  title: string;
  description?: string;
  snarkelCode: string;
  maxPossibleScore?: number;
  totalParticipants?: number;
  isCompleted?: boolean;
  completedAt?: string;
  hasRewards: boolean;
  rewards: Reward[];
  canDistributeRewards: boolean;
  onchainSessionId?: string;
  totalQuestions: number;
  questions: Array<{
    id: string;
    text: string;
    points: number;
    timeLimit: number;
  }>;
}

interface AdminDetails {
  isQuizCreator: boolean;
  creatorAddress: string;
  creatorName: string;
  canDistributeRewards: boolean;
}

export default function QuizLeaderboardPage() {
  const params = useParams();
  const router = useRouter();
  const { address, isConnected } = useAccount();
  
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [quizInfo, setQuizInfo] = useState<QuizInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userPosition, setUserPosition] = useState<number | null>(null);
  const [userScore, setUserScore] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminDetails, setAdminDetails] = useState<AdminDetails | null>(null);
  const [showQuestionDetails, setShowQuestionDetails] = useState<string | null>(null);
  const [distributingRewards, setDistributingRewards] = useState(false);
  const [creatingSubmissions, setCreatingSubmissions] = useState(false);
  const [participantTabs, setParticipantTabs] = useState<Array<{id: string, name: string, address: string, isReady: boolean, isAdmin: boolean}>>([]);
  const [rewardDistributionStatus, setRewardDistributionStatus] = useState<string>('');
  const [questions, setQuestions] = useState<any[]>([]);
  const [rewardsDistributed, setRewardsDistributed] = useState(false);
  
  // Distribution modal state
  const [showDistributionModal, setShowDistributionModal] = useState(false);
  const [distributionMethod, setDistributionMethod] = useState<'quadratic' | 'linear' | 'custom'>('quadratic');
  const [customTopN, setCustomTopN] = useState(10);
  const [distributionPreview, setDistributionPreview] = useState<Array<{
    name: string;
    walletAddress: string;
    score: number;
    rewardAmount: string;
    percentage: number;
    isEditable?: boolean;
  }>>([]);
  const [calculatingPreview, setCalculatingPreview] = useState(false);
  const [editingAmounts, setEditingAmounts] = useState<{[key: string]: string}>({});
  const [totalRewardPool, setTotalRewardPool] = useState<string>('0');

  const snarkelId = params.snarkelId as string;
  
  // Get contract functions for blockchain operations
  const { 
    distributeRewards, 
    fallbackDistributeRewards,
    contractState,
    areRewardsDistributed,
    getExpectedRewardToken,
    getExpectedRewardAmount,
    getCurrentSessionId
  } = useQuizContract(8453); // Use Base chain for now

  // Handler functions
  const handleCreateSubmissions = async () => {
    if (!address || !isAdmin) return;
    
    setCreatingSubmissions(true);
    try {
      const response = await fetch(`/api/quiz/${snarkelId}/leaderboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userAddress: address,
          action: 'create_submissions'
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success(result.message);
        // Refresh leaderboard
        fetchLeaderboard();
      } else {
        toast.error(result.error || 'Failed to create submissions');
      }
    } catch (error) {
      console.error('Error creating submissions:', error);
      toast.error('Failed to create submissions');
    } finally {
      setCreatingSubmissions(false);
    }
  };

  useEffect(() => {
    if (snarkelId) {
      fetchLeaderboard();
      fetchQuestions();
    }
  }, [snarkelId, address]);

  useEffect(() => {
    if (quizInfo?.snarkelCode) {
      checkRewardsDistributionStatus();
    }
  }, [quizInfo?.snarkelCode]);

  // Recalculate distribution preview when method or customTopN changes
  useEffect(() => {
    if (showDistributionModal) {
      calculateDistributionPreview();
    }
  }, [distributionMethod, customTopN, showDistributionModal]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Fetching leaderboard for snarkelId:', snarkelId);
      console.log('🔍 Wallet address:', address);

      // Fetch quiz info and leaderboard with wallet address for admin check
      const url = address 
        ? `/api/quiz/${snarkelId}/leaderboard?walletAddress=${address}`
        : `/api/quiz/${snarkelId}/leaderboard`;
        
      console.log('🔍 API URL:', url);
      
      const response = await fetch(url);
      
      console.log('🔍 Response status:', response.status);
      console.log('🔍 Response ok:', response.ok);
      
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }

      const data = await response.json();
      
      console.log('🔍 API Response data:', data);
      
      if (data.success) {
        console.log('🔍 Setting leaderboard:', data.leaderboard);
        console.log('🔍 Setting quiz info:', data.quizInfo);
        console.log('🔍 Is admin:', data.isAdmin);
        console.log('🔍 API message:', data.message);
        console.log('🔍 API status:', data.status);
        
        setLeaderboard(data.leaderboard || []);
        setQuizInfo(data.quizInfo || null);
        setIsAdmin(data.isAdmin || false);
        setAdminDetails(data.adminDetails || null);
        
        // Handle different status messages
        if (data.status === 'not_played') {
          setError('This quiz has not been completed yet. No results available.');
        } else if (data.status === 'completed_no_submissions') {
          setError('Quiz has been completed but results are not available. This may be a temporary issue.');
        } else if (data.message) {
          // Show any other messages from the API
          setError(data.message);
        }
        
        // Find user position if connected
        if (isConnected && address) {
          const userEntry = data.leaderboard?.find((entry: LeaderboardEntry) => 
            entry.walletAddress.toLowerCase() === address.toLowerCase()
          );
          
          if (userEntry) {
            setUserPosition(userEntry.position);
            setUserScore(userEntry.score);
          }
        }
      } else {
        console.error('🔍 API returned error:', data.error);
        setError(data.error || 'Failed to fetch leaderboard');
      }
    } catch (err) {
      console.error('🔍 Error fetching leaderboard:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestions = async () => {
    try {
      const response = await fetch(`/api/quiz/${snarkelId}/questions`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setQuestions(data.questions || []);
        }
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
    }
  };

  const checkRewardsDistributionStatus = async () => {
    if (!quizInfo?.snarkelCode || !areRewardsDistributed) return;
    
    try {
      const isDistributed = await areRewardsDistributed(quizInfo.snarkelCode);
      setRewardsDistributed(isDistributed);
      console.log('Rewards distribution status:', isDistributed);
    } catch (error) {
      console.error('Error checking rewards distribution status:', error);
    }
  };

  const calculateDistributionPreview = async () => {
    if (!quizInfo || !leaderboard.length) return;
    
    setCalculatingPreview(true);
    
    try {
      // Get first session ID from contract
      let sessionId: number;
      try {
        sessionId = await getCurrentSessionId();
      } catch (contractError) {
        console.error('Failed to get first session ID from contract:', contractError);
        sessionId = parseInt(quizInfo.onchainSessionId || '1');
      }
      
      if (!sessionId || sessionId === 0) return;
      
      // Get reward info from contract
      const expectedToken = await getExpectedRewardToken(sessionId);
      const expectedAmount = await getExpectedRewardAmount(sessionId);
      
      if (expectedToken === '0x0000000000000000000000000000000000000000') return;
      
      const totalRewardPool = expectedAmount;
      const totalRewardPoolBigInt = BigInt(totalRewardPool);
      
      // Store total reward pool for validation
      setTotalRewardPool(totalRewardPool);
      
      // Filter valid participants
      const validParticipants = leaderboard
        .filter(entry => entry.score > 0)
        .sort((a, b) => b.score - a.score);
      
      if (validParticipants.length === 0) return;
      
      let preview: Array<{
        name: string;
        walletAddress: string;
        score: number;
        rewardAmount: string;
        percentage: number;
        isEditable?: boolean;
      }> = [];
      
      if (distributionMethod === 'quadratic') {
        // Quadratic distribution based on score proportions
        const totalPoints = validParticipants.reduce((sum, entry) => sum + entry.score, 0);
        
        preview = validParticipants.slice(0, 10).map(entry => {
          const share = entry.score / totalPoints;
          const rewardAmountBigInt = (totalRewardPoolBigInt * BigInt(entry.score)) / BigInt(totalPoints);
          const finalAmount = rewardAmountBigInt > 0 ? rewardAmountBigInt : BigInt(1);
          
          return {
            name: entry.name,
            walletAddress: entry.walletAddress,
            score: entry.score,
            rewardAmount: finalAmount.toString(),
            percentage: Math.round(share * 100 * 100) / 100
          };
        });
      } else if (distributionMethod === 'linear') {
        // Linear distribution - equal amounts among top participants
        const topParticipants = validParticipants.slice(0, customTopN);
        const rewardPerParticipant = totalRewardPoolBigInt / BigInt(topParticipants.length);
        
        preview = topParticipants.map(entry => ({
          name: entry.name,
          walletAddress: entry.walletAddress,
          score: entry.score,
          rewardAmount: rewardPerParticipant.toString(),
          percentage: Math.round((100 / topParticipants.length) * 100) / 100
        }));
      } else if (distributionMethod === 'custom') {
        // Custom distribution - top N participants with weighted amounts
        const topParticipants = validParticipants.slice(0, customTopN);
        const totalWeight = topParticipants.reduce((sum, _, index) => sum + (customTopN - index), 0);
        
        preview = topParticipants.map((entry, index) => {
          const weight = customTopN - index; // 1st place gets highest weight
          const share = weight / totalWeight;
          const rewardAmountBigInt = (totalRewardPoolBigInt * BigInt(weight)) / BigInt(totalWeight);
          const finalAmount = rewardAmountBigInt > 0 ? rewardAmountBigInt : BigInt(1);
          
          return {
            name: entry.name,
            walletAddress: entry.walletAddress,
            score: entry.score,
            rewardAmount: finalAmount.toString(),
            percentage: Math.round(share * 100 * 100) / 100,
            isEditable: true
          };
        });
        
        // Initialize editing amounts with calculated values
        const initialEditingAmounts: {[key: string]: string} = {};
        preview.forEach(entry => {
          initialEditingAmounts[entry.walletAddress] = entry.rewardAmount;
        });
        setEditingAmounts(initialEditingAmounts);
      }
      
      setDistributionPreview(preview);
    } catch (error) {
      console.error('Error calculating distribution preview:', error);
    } finally {
      setCalculatingPreview(false);
    }
  };

  const handleDistributeRewards = async () => {
    if (!address || !isAdmin) return;
    
    setDistributingRewards(true);
    try {
      const response = await fetch(`/api/quiz/${snarkelId}/distribute-rewards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress: address })
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success('Rewards distributed successfully!');
        // Refresh leaderboard
        fetchLeaderboard();
      } else {
        toast.error(result.error || 'Failed to distribute rewards');
      }
    } catch (error) {
      console.error('Error distributing rewards:', error);
      toast.error('Failed to distribute rewards');
    } finally {
      setDistributingRewards(false);
    }
  };

  const handleAmountEdit = (walletAddress: string, newAmount: string) => {
    setEditingAmounts(prev => ({
      ...prev,
      [walletAddress]: newAmount
    }));
  };

  const validateCustomDistribution = () => {
    if (distributionMethod !== 'custom') return true;
    
    const totalEditedAmount = distributionPreview.reduce((sum, entry) => {
      const amount = editingAmounts[entry.walletAddress] || entry.rewardAmount;
      return sum + BigInt(amount);
    }, BigInt(0));
    
    const totalRewardPoolBigInt = BigInt(totalRewardPool);
    return totalEditedAmount === totalRewardPoolBigInt;
  };

  const getValidationMessage = () => {
    if (distributionMethod !== 'custom') return null;
    
    const totalEditedAmount = distributionPreview.reduce((sum, entry) => {
      const amount = editingAmounts[entry.walletAddress] || entry.rewardAmount;
      return sum + BigInt(amount);
    }, BigInt(0));
    
    const totalRewardPoolBigInt = BigInt(totalRewardPool);
    const difference = totalRewardPoolBigInt - totalEditedAmount;
    
    if (difference === BigInt(0)) {
      return { type: 'success', message: '✅ Distribution amounts are balanced!' };
    } else if (difference > BigInt(0)) {
      return { type: 'warning', message: `⚠️ Under by ${formatRewardAmountWei(difference.toString())}` };
    } else {
      return { type: 'error', message: `❌ Over by ${formatRewardAmountWei((-difference).toString())}` };
    }
  };

  const executeDistribution = async () => {
    if (!quizInfo || !isAdmin || distributionPreview.length === 0) return;
    
    // Validate custom distribution amounts
    if (distributionMethod === 'custom' && !validateCustomDistribution()) {
      setRewardDistributionStatus('Error: Custom distribution amounts must equal total reward pool');
      return;
    }
    
    try {
      setDistributingRewards(true);
      setRewardDistributionStatus(`Starting ${distributionMethod} reward distribution...`);
      
      // Get first session ID from contract
      let sessionId: number;
      try {
        sessionId = await getCurrentSessionId();
        console.log('✅ Got first session ID from contract:', sessionId);
      } catch (contractError) {
        console.error('Failed to get first session ID from contract:', contractError);
        sessionId = parseInt(quizInfo.onchainSessionId || '1');
        console.log('⚠️ Falling back to database session ID:', sessionId);
      }
      
      if (!sessionId || sessionId === 0) {
        throw new Error('No valid session ID found from contract or database');
      }
      
      // Get reward info from contract
      const expectedToken = await getExpectedRewardToken(sessionId);
      const expectedAmount = await getExpectedRewardAmount(sessionId);
      
      if (expectedToken === '0x0000000000000000000000000000000000000000') {
        throw new Error('No reward token configured on-chain for this session');
      }
      
      const tokenAddress = expectedToken;
      const totalRewardPool = expectedAmount;
      
      // Prepare winners and amounts from preview (use edited amounts for custom)
      const winners = distributionPreview.map(entry => entry.walletAddress as `0x${string}`);
      const amounts = distributionPreview.map(entry => {
        if (distributionMethod === 'custom' && entry.isEditable) {
          return editingAmounts[entry.walletAddress] || entry.rewardAmount;
        }
        return entry.rewardAmount;
      });
      
      console.log('🎯 Distribution parameters:');
      console.log('  - Method:', distributionMethod);
      console.log('  - Session ID:', sessionId);
      console.log('  - Token Address:', tokenAddress);
      console.log('  - Winners count:', winners.length);
      console.log('  - Amounts:', amounts);
      
      // Validate amounts
      const totalCalculatedAmount = amounts.reduce((sum, amount) => sum + BigInt(amount), BigInt(0));
      const totalRewardPoolBigInt = BigInt(totalRewardPool);
      
      if (totalCalculatedAmount > totalRewardPoolBigInt) {
        throw new Error(`Total calculated amount (${totalCalculatedAmount.toString()}) exceeds reward pool (${totalRewardPoolBigInt.toString()})`);
      }
      
      // Execute distribution
      const result = await fallbackDistributeRewards({
        sessionId: sessionId,
        tokenAddress: tokenAddress as `0x${string}`,
        winners: winners,
        amounts: amounts
      });
      
      if (result.success) {
        setRewardDistributionStatus(`${distributionMethod.charAt(0).toUpperCase() + distributionMethod.slice(1)} rewards distributed successfully! Transaction: ${result.transactionHash}`);
        setShowDistributionModal(false);
        // Refresh leaderboard
        setTimeout(() => {
          fetchLeaderboard();
        }, 2000);
      } else {
        throw new Error(result.error || 'Reward distribution failed');
      }
    } catch (error) {
      console.error('Error distributing rewards:', error);
      setRewardDistributionStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setTimeout(() => {
        setDistributingRewards(false);
        setRewardDistributionStatus('');
      }, 3000);
    }
  };

  const formatScore = (score: number) => {
    return score.toLocaleString();
  };

  const formatPercentage = (score: number, maxScore: number) => {
    if (maxScore === 0) return '0%';
    return `${Math.round((score / maxScore) * 100)}%`;
  };

  const formatTime = (seconds: number) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatRewardAmount = (amount: string) => {
    const num = parseFloat(amount);
    if (isNaN(num)) return '0';
    return num.toLocaleString();
  };

  const formatRewardAmountWei = (amountWei: string) => {
    try {
      const bigIntAmount = BigInt(amountWei);
      // Convert from wei to a more readable format
      if (bigIntAmount > BigInt(10 ** 18)) {
        return (Number(bigIntAmount) / 10 ** 18).toFixed(6);
      } else if (bigIntAmount > BigInt(10 ** 6)) {
        return (Number(bigIntAmount) / 10 ** 6).toFixed(3);
      } else {
        return bigIntAmount.toString();
      }
    } catch {
      return amountWei;
    }
  };

  const getPositionIcon = (position: number) => {
    if (position === 1) return <Crown className="w-5 h-5 text-yellow-500" />;
    if (position === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (position === 3) return <Award className="w-5 h-5 text-orange-500" />;
    return null;
  };

  const getPositionColor = (position: number) => {
    if (position === 1) return 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white';
    if (position === 2) return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white';
    if (position === 3) return 'bg-gradient-to-r from-orange-400 to-orange-500 text-white';
    return 'bg-gray-100 text-gray-700';
  };

  const toggleQuestionDetails = (userId: string) => {
    setShowQuestionDetails(showQuestionDetails === userId ? null : userId);
  };

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-400/20 to-pink-600/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        </div>
        
        <div className="text-center relative z-10">
          <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  // Show connect wallet page if not connected
  if (!isConnected) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-400/20 to-pink-600/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-yellow-400/10 to-orange-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '4s'}}></div>
        </div>
        
        {/* Header */}
        <div className="relative bg-white/80 backdrop-blur-sm shadow-xl border-b border-white/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-8">
              <div className="flex items-center gap-6">
                <Link
                  href={`/quiz/${snarkelId}`}
                  className="group p-3 hover:bg-gradient-to-r hover:from-indigo-500 hover:to-purple-500 hover:text-white rounded-xl transition-all duration-300 flex items-center gap-3 text-gray-600 hover:text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <ArrowLeft className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span className="hidden sm:inline font-medium">Back to Quiz</span>
                </Link>
                
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-2xl flex items-center justify-center shadow-2xl">
                    <Trophy className="w-8 h-8 text-white drop-shadow-lg" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                    <Star className="w-3 h-3 text-white" />
                  </div>
                </div>
                
                <div className="relative">
                  <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                    Quiz Leaderboard
                  </h1>
                  <p className="text-gray-600 text-lg mt-1">
                    {quizInfo?.title || 'Quiz Results'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Connect Wallet Section */}
        <div className="flex items-center justify-center min-h-[60vh] relative z-10">
          <div className="text-center max-w-md mx-4">
            <div className="w-24 h-24 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
              <Wallet className="w-12 h-12 text-white" />
            </div>
            
            <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
              Connect Your Wallet
            </h2>
            
            <p className="text-gray-600 text-lg mb-8 leading-relaxed">
              To view the leaderboard and your performance, please connect your wallet first.
            </p>
            
            <div className="space-y-4">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 transform hover:-translate-y-1 shadow-xl hover:shadow-2xl"
              >
                🔗 Connect Wallet
              </button>
              
              <p className="text-sm text-gray-500">
                Make sure you have MetaMask or another Web3 wallet installed
              </p>
            </div>
            
            <div className="mt-12 p-6 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/30 shadow-xl">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-600" />
                Why Connect?
              </h3>
              <ul className="text-left text-sm text-gray-600 space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  View your quiz performance and ranking
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Access admin features if you're the quiz creator
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  See detailed question breakdowns
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Track reward distribution status
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-handwriting font-bold text-gray-800 mb-2">
            Error Loading Leaderboard
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={fetchLeaderboard}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-400/20 to-pink-600/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-yellow-400/10 to-orange-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '4s'}}></div>
      </div>
      
      {/* Header */}
      <div className="relative bg-white/80 backdrop-blur-sm shadow-xl border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-8">
            <div className="flex items-center gap-6">
              <Link
                href={`/quiz/${snarkelId}`}
                className="group p-3 hover:bg-gradient-to-r hover:from-indigo-500 hover:to-purple-500 hover:text-white rounded-xl transition-all duration-300 flex items-center gap-3 text-gray-600 hover:text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <ArrowLeft className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="hidden sm:inline font-medium">Back to Quiz</span>
              </Link>
              
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-2xl flex items-center justify-center shadow-2xl transform hover:scale-110 transition-transform duration-300">
                  <Trophy className="w-8 h-8 text-white drop-shadow-lg" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                  <Star className="w-3 h-3 text-white" />
                </div>
              </div>
              
              <div className="relative">
                <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Quiz Leaderboard
                </h1>
                <p className="text-gray-600 text-lg mt-1">
                  {quizInfo?.title || 'Quiz Results'}
                </p>
                {quizInfo?.onchainSessionId && (
                  <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-full"></div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {quizInfo?.snarkelCode && (
                <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white px-4 py-3 rounded-xl shadow-lg font-mono text-sm font-bold">
                  #{quizInfo.snarkelCode}
                </div>
              )}
              {isConnected && isAdmin && (
                <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl shadow-lg font-medium flex items-center gap-2">
                  <Crown className="w-5 h-5" />
                  <span className="hidden sm:inline">👑 Quiz Admin</span>
                </div>
              )}
              <Link
                href="/"
                className="p-3 hover:bg-gradient-to-r hover:from-gray-800 hover:to-gray-900 hover:text-white rounded-xl transition-all duration-300 text-gray-600 hover:text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                title="Go to Home"
              >
                <Home className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Quiz Stats */}
      {quizInfo && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
            <div className="group bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-white/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Participants</p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                    {quizInfo.totalParticipants || leaderboard.length}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="group bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-white/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Max Score</p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
                    {quizInfo.maxPossibleScore ? formatScore(quizInfo.maxPossibleScore) : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="group bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-white/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Status</p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-transparent">
                    {quizInfo.isCompleted ? 'Completed' : 'Active'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="group bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-white/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Your Position</p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-orange-800 bg-clip-text text-transparent">
                    {userPosition ? `#${userPosition}` : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Debug Information */}
          {isConnected && isAdmin && (
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-6 mb-8 shadow-xl">
              <h3 className="font-bold text-amber-800 mb-4 flex items-center gap-3 text-lg">
                <div className="w-8 h-8 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-lg flex items-center justify-center">
                  <Info className="w-5 h-5 text-white" />
                </div>
                Debug Information (Admin Only)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                <div className="bg-white/60 rounded-xl p-3">
                  <p className="font-medium text-amber-700 mb-1">Connected Wallet:</p>
                  <p className="text-gray-700 font-mono text-xs break-all">
                    {address || 'Not connected'}
                  </p>
                </div>
                <div className="bg-white/60 rounded-xl p-3">
                  <p className="font-medium text-amber-700 mb-1">Admin Status:</p>
                  <p className="text-gray-700">
                    {isAdmin ? 'Quiz Creator' : 'Not Admin'}
                  </p>
                </div>
                <div className="bg-white/60 rounded-xl p-3">
                  <p className="font-medium text-amber-700 mb-1">Quiz Creator:</p>
                  <p className="text-gray-700 font-mono text-xs break-all">
                    {adminDetails?.creatorAddress || 'Unknown'}
                  </p>
                </div>
                <div className="bg-white/60 rounded-xl p-3">
                  <p className="font-medium text-amber-700 mb-1">Session ID:</p>
                  <p className="text-gray-700">
                    {quizInfo?.onchainSessionId || 'No Session'}
                  </p>
                </div>
                <div className="bg-white/60 rounded-xl p-3">
                  <p className="font-medium text-amber-700 mb-1">On-Chain Status:</p>
                  <p className="text-gray-700">
                    {rewardsDistributed ? 'Distributed' : 'Pending'}
                  </p>
                </div>
                <div className="bg-white/60 rounded-xl p-3">
                  <p className="font-medium text-amber-700 mb-1">Total Submissions:</p>
                  <p className="text-gray-700">
                    {leaderboard.length}
                  </p>
                </div>
              </div>
              <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                <p className="text-sm text-blue-700">
                  <strong>💡 Note:</strong> The distribute button is only shown when rewards haven't been distributed yet. Once distributed on-chain, the button disappears.
                </p>
              </div>
            </div>
          )}

          {/* Rewards Section */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-xl mb-8 border border-white/20">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="flex items-center gap-4 justify-center sm:justify-start">
                <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Gift className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-700 bg-clip-text text-transparent">
                    Quiz Rewards
                  </h3>
                  <p className="text-sm text-gray-600">On-chain reward distribution</p>
                </div>
              </div>
              {isConnected && isAdmin && !rewardsDistributed && (
                <div className="flex flex-col gap-4">
                  <div className="flex gap-3">
                    <button
                      onClick={handleDistributeRewards}
                      disabled={distributingRewards}
                      className="group bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-3 rounded-xl transition-all duration-300 flex items-center gap-3 text-sm font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:transform-none"
                    >
                      {distributingRewards ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        <Zap className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      )}
                      {distributingRewards ? 'Distributing...' : '🚀 Distribute Rewards'}
                    </button>
                  </div>
                  <div className="text-sm text-gray-600 bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-xl border border-blue-200">
                    <strong>✨ Smart Distribution:</strong> Choose from multiple distribution methods (Quadratic, Linear, or Custom) with real-time preview of rewards before executing on-chain.
                  </div>
                </div>
              )}
              {isConnected && isAdmin && rewardsDistributed && (
                <div className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 px-4 py-3 rounded-xl text-sm flex items-center gap-2 border border-green-200 shadow-lg">
                  <CheckCircle className="w-5 h-5" />
                  🎉 On-Chain Distribution Complete
                </div>
              )}
            </div>

              {rewardDistributionStatus && (
                <div className={`p-4 rounded-xl mb-6 shadow-lg border ${
                  rewardDistributionStatus.includes('Error') 
                    ? 'bg-gradient-to-r from-red-50 to-pink-50 text-red-700 border-red-200' 
                    : 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border-green-200'
                }`}>
                  <div className="flex items-center gap-3">
                    {rewardDistributionStatus.includes('Error') ? (
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    ) : (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    )}
                    <span className="font-medium">{rewardDistributionStatus}</span>
                  </div>
                </div>
              )}

              {quizInfo.rewards && quizInfo.rewards.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {quizInfo.rewards.map((reward, index) => (
                    <div key={reward.id} className="group bg-white/60 backdrop-blur-sm border border-white/30 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                            <DollarSign className="w-5 h-5 text-white" />
                          </div>
                          <span className="font-bold text-lg text-gray-800">
                            {reward.tokenSymbol || 'TOKEN'}
                          </span>
                        </div>
                        <div className={`px-3 py-2 rounded-full text-xs font-bold ${
                          rewardsDistributed 
                            ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200' 
                            : 'bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800 border border-yellow-200'
                        }`}>
                          {rewardsDistributed ? '✅ On-Chain' : '⏳ Pending'}
                        </div>
                      </div>
                      
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center p-3 bg-white/40 rounded-xl">
                          <span className="text-gray-600 font-medium">Total Pool:</span>
                          <span className="font-bold text-gray-800">
                            {formatRewardAmount(reward.totalRewardPool)} {reward.tokenSymbol}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center p-3 bg-white/40 rounded-xl">
                          <span className="text-gray-600 font-medium">Network:</span>
                          <span className="font-bold text-gray-800">{reward.network}</span>
                        </div>
                        
                        <div className="flex justify-between items-center p-3 bg-white/40 rounded-xl">
                          <span className="text-gray-600 font-medium">Strategy:</span>
                          <span className="font-bold text-gray-800">
                            {reward.rewardAllParticipants ? 'All Participants' : `Top ${reward.totalWinners || 5}`}
                          </span>
                        </div>
                        
                        {rewardsDistributed && (
                          <div className="flex justify-between items-center p-3 bg-green-50 rounded-xl border border-green-200">
                            <span className="text-green-700 font-medium">Status:</span>
                            <span className="font-bold text-green-800">
                              🎉 On-Chain Verified
                            </span>
                          </div>
                        )}
                        {!rewardsDistributed && (
                          <div className="flex justify-between items-center p-3 bg-blue-50 rounded-xl border border-blue-200">
                            <span className="text-blue-700 font-medium">Status:</span>
                            <span className="font-bold text-blue-800">
                              🚀 Ready for Distribution
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Gift className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-lg font-medium mb-2">No Rewards Configured</p>
                  <p className="text-sm">This quiz doesn't have rewards configured yet.</p>
                  {isAdmin && (
                    <p className="text-sm mt-2 text-blue-600">
                      You can still distribute rewards on-chain using the button above.
                    </p>
                  )}
                </div>
              )}
            </div>

          {/* Admin Functions */}
          {isAdmin && (
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm mb-6">
              <div className="flex items-center gap-3 mb-4 justify-center sm:justify-start">
                <Settings className="w-6 h-6 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-800">Admin Functions</h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <div className="border border-gray-200 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center gap-3 mb-3 justify-center sm:justify-start">
                    <Eye className="w-5 h-5 text-blue-600" />
                    <h4 className="font-medium text-gray-800 text-center sm:text-left">Quiz Management</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-3 text-center sm:text-left">
                    Manage quiz settings, participants, and game flow
                  </p>
                  <div className="text-center sm:text-left">
                    <Link
                      href={`/quiz/${snarkelId}`}
                      className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm transition-colors"
                    >
                      <Play className="w-4 h-4" />
                      Manage Quiz
                    </Link>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center gap-3 mb-3 justify-center sm:justify-start">
                    <BarChart3 className="w-5 h-5 text-green-600" />
                    <h4 className="font-medium text-gray-800 text-center sm:text-left">Analytics</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-3 text-center sm:text-left">
                    View detailed quiz analytics and participant performance
                  </p>
                  <div className="text-center sm:text-left">
                    <button className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm transition-colors">
                      <BarChart3 className="w-4 h-4" />
                      View Analytics
                    </button>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center gap-3 mb-3 justify-center sm:justify-start">
                    <Gift className="w-5 h-5 text-purple-600" />
                    <h4 className="font-medium text-gray-800 text-center sm:text-left">Reward Management</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-3 text-center sm:text-left">
                    Configure and distribute quiz rewards
                  </p>
                  <div className="text-center sm:text-left">
                    <Link
                      href={`/admin`}
                      className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-sm transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      Manage Rewards
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* User Position Highlight */}
      {isConnected && userPosition && userScore && (
        <div className="max-w-7xl mx-auto px-4 mb-6">
          <div className="bg-gradient-to-r from-purple-500 to-blue-600 rounded-xl p-4 sm:p-6 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto sm:mx-0">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Your Performance</h3>
                  <p className="text-purple-100 text-sm sm:text-base">
                    Position #{userPosition} • {formatScore(userScore)} points
                  </p>
                </div>
              </div>
              <div className="text-center sm:text-right">
                <div className="text-3xl font-bold">{userPosition}</div>
                <div className="text-purple-100 text-sm">Rank</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden border border-white/20">
          <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-6 py-6">
            <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center justify-center sm:justify-start gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              Top {Math.min(10, leaderboard.length)} Players
            </h2>
            <p className="text-indigo-100 text-sm mt-2 text-center sm:text-left">
              🏆 Leaderboard rankings and performance metrics
            </p>
          </div>
          
          <div className="divide-y divide-white/20">
            {leaderboard.slice(0, 10).map((entry, index) => (
              <div key={entry.userId}>
                <div
                  className={`px-6 py-6 hover:bg-white/40 transition-all duration-300 cursor-pointer group ${
                    isConnected && address && entry.walletAddress.toLowerCase() === address.toLowerCase()
                      ? 'bg-gradient-to-r from-purple-50/80 to-pink-50/80 border-l-4 border-purple-500'
                      : 'hover:bg-white/40'
                  }`}
                  onClick={() => toggleQuestionDetails(entry.userId)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-lg transform group-hover:scale-110 transition-transform ${getPositionColor(entry.position)}`}>
                        {getPositionIcon(entry.position) || entry.position}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-bold text-gray-800 text-lg truncate">
                            {entry.name || `${entry.walletAddress.slice(0, 6)}...${entry.walletAddress.slice(-4)}`}
                          </span>
                          {isConnected && address && entry.walletAddress.toLowerCase() === address.toLowerCase() && (
                            <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-3 py-1 rounded-full flex-shrink-0 font-bold shadow-lg">
                              👑 You
                            </span>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm text-gray-600 mt-2">
                          <span className="flex items-center gap-2 flex-shrink-0 bg-white/60 px-3 py-1 rounded-lg">
                            <Target className="w-4 h-4 text-purple-600" />
                            <span className="hidden sm:inline font-medium">{entry.totalQuestions || 0} questions</span>
                            <span className="sm:hidden font-medium">{entry.totalQuestions || 0}q</span>
                          </span>
                          <span className="flex items-center gap-1 flex-shrink-0">
                            <CheckCircle className="w-3 h-3 text-green-600" />
                            <span className="hidden sm:inline">{entry.correctAnswers || 0} correct</span>
                            <span className="sm:hidden">{entry.correctAnswers || 0}✓</span>
                          </span>
                          <span className="flex items-center gap-1 flex-shrink-0">
                            <Percent className="w-3 h-3" />
                            <span className="hidden sm:inline">{entry.accuracy ? entry.accuracy.toFixed(1) : '0.0'}% accuracy</span>
                            <span className="sm:hidden">{entry.accuracy ? entry.accuracy.toFixed(1) : '0.0'}%</span>
                          </span>
                          {entry.averageTimePerQuestion && (
                            <span className="flex items-center gap-1 flex-shrink-0">
                              <Clock className="w-3 h-3" />
                              <span className="hidden sm:inline">{formatTime(entry.averageTimePerQuestion)} avg</span>
                              <span className="sm:hidden">{formatTime(entry.averageTimePerQuestion)}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-center sm:text-right flex-shrink-0">
                      <div className="flex items-center justify-center sm:justify-end gap-2">
                        <Star className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
                        <div>
                          <div className="text-xl sm:text-2xl font-bold text-gray-800">
                            {formatScore(entry.score)}
                          </div>
                          {quizInfo?.maxPossibleScore && (
                            <div className="text-xs sm:text-sm text-gray-500">
                              {formatPercentage(entry.score, quizInfo.maxPossibleScore)}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {entry.timeBonus && entry.timeBonus > 0 && (
                        <div className="text-xs text-green-600 mt-1 text-center sm:text-right">
                          +{entry.timeBonus} time bonus
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Question Details Toggle */}
                  <div className="flex items-center justify-center mt-3">
                    <button className="text-gray-500 hover:text-gray-700 transition-colors">
                      {showQuestionDetails === entry.userId ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Question Details */}
                {showQuestionDetails === entry.userId && (
                  <div className="bg-gray-50 px-3 sm:px-6 py-4 border-t">
                    <h4 className="font-medium text-gray-800 mb-3 text-center sm:text-left">Question Breakdown</h4>
                    <div className="grid grid-cols-1 gap-3">
                      {entry.questionBreakdown.map((question, qIndex) => (
                        <div key={question.questionId} className="bg-white p-3 sm:p-4 rounded-lg border">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                            <span className="text-sm font-medium text-gray-700 break-words">
                              Q{qIndex + 1}: {question.questionText.length > 40
                                ? question.questionText.substring(0, 40) + '...' 
                                : question.questionText
                              }
                            </span>
                            <div className={`flex items-center gap-1 justify-center sm:justify-start ${
                              question.isCorrect ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {question.isCorrect ? (
                                <CheckCircle className="w-4 h-4" />
                              ) : (
                                <XCircle className="w-4 h-4" />
                              )}
                              <span className="text-xs font-medium">
                                {question.isCorrect ? 'Correct' : 'Incorrect'}
                              </span>
                            </div>
                          </div>
                          
                          <div className="space-y-2 text-xs text-gray-600">
                            <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                              <span className="font-medium">Points:</span>
                              <span className="font-bold text-gray-800">
                                {question.pointsEarned}/{question.maxPoints}
                              </span>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                              <span className="font-medium">Time:</span>
                              <span className="font-bold text-gray-800">
                                {formatTime(question.timeToAnswer)}/{formatTime(question.timeLimit)}
                              </span>
                            </div>
                            {!question.isCorrect && (
                              <div className="text-red-600 bg-red-50 p-2 rounded-lg mt-2">
                                <div className="font-medium mb-1">Selected Answer:</div>
                                <div className="break-words">
                                  {Array.isArray(question.selectedOptions) 
                                    ? question.selectedOptions.join(', ') 
                                    : question.selectedOptions || 'N/A'
                                  }
                                </div>
                                <div className="font-medium mt-1 mb-1">Correct Answer:</div>
                                <div className="break-words">{question.correctOption}</div>
                              </div>
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
          
          {leaderboard.length === 0 && (
            <div className="px-6 py-12 text-center text-gray-500">
              <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No results available yet</p>
              
              {/* Debug Information */}
              <div className="mt-4 p-4 bg-gray-100 rounded-lg text-left text-sm">
                <h4 className="font-medium mb-2">Debug Information:</h4>
                <div className="space-y-1">
                  <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
                  <p><strong>Error:</strong> {error || 'None'}</p>
                  <p><strong>Leaderboard Length:</strong> {leaderboard.length}</p>
                  <p><strong>Quiz Info:</strong> {quizInfo ? 'Loaded' : 'Not loaded'}</p>
                  <p><strong>Snarkel ID:</strong> {snarkelId}</p>
                  <p><strong>Wallet Connected:</strong> {isConnected ? 'Yes' : 'No'}</p>
                  <p><strong>Wallet Address:</strong> {address || 'Not connected'}</p>
                </div>
                
                {/* Show raw data for debugging */}
                {quizInfo && (
                  <div className="mt-3 p-3 bg-white rounded border">
                    <h5 className="font-medium mb-2">Quiz Info:</h5>
                    <pre className="text-xs overflow-auto">
                      {JSON.stringify(quizInfo, null, 2)}
                    </pre>
                  </div>
                )}
                
                {leaderboard.length > 0 && (
                  <div className="mt-3 p-3 bg-white rounded border">
                    <h5 className="font-medium mb-2">Leaderboard Data:</h5>
                    <pre className="text-xs overflow-auto">
                      {JSON.stringify(leaderboard, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Distribution Modal */}
      {showDistributionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Reward Distribution</h2>
                <button
                  onClick={() => setShowDistributionModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              <p className="text-gray-600 mt-2">Configure and preview reward distribution before executing on-chain</p>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Distribution Method Selection */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Distribution Method</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => {
                      setDistributionMethod('quadratic');
                      calculateDistributionPreview();
                    }}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      distributionMethod === 'quadratic'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-center">
                      <BarChart3 className="w-8 h-8 mx-auto mb-2" />
                      <div className="font-semibold">Quadratic</div>
                      <div className="text-sm text-gray-600">Score-based proportions</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => {
                      setDistributionMethod('linear');
                      calculateDistributionPreview();
                    }}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      distributionMethod === 'linear'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-center">
                      <TrendingUp className="w-8 h-8 mx-auto mb-2" />
                      <div className="font-semibold">Linear</div>
                      <div className="text-sm text-gray-600">Equal distribution</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => {
                      setDistributionMethod('custom');
                      calculateDistributionPreview();
                    }}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      distributionMethod === 'custom'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-center">
                      <Settings className="w-8 h-8 mx-auto mb-2" />
                      <div className="font-semibold">Custom</div>
                      <div className="text-sm text-gray-600">Weighted top N</div>
                    </div>
                  </button>
                </div>
                
                {/* Custom Top N Configuration */}
                {(distributionMethod === 'linear' || distributionMethod === 'custom') && (
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium text-gray-700">
                      Top {distributionMethod === 'linear' ? 'participants' : 'N participants'}:
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={customTopN}
                      onChange={(e) => {
                        setCustomTopN(parseInt(e.target.value) || 10);
                        setTimeout(() => calculateDistributionPreview(), 100);
                      }}
                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}
              </div>
              
              {/* Distribution Preview */}
              {distributionPreview.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Distribution Preview</h3>
                    <button
                      onClick={calculateDistributionPreview}
                      disabled={calculatingPreview}
                      className="text-blue-600 hover:text-blue-700 disabled:text-blue-400 text-sm font-medium flex items-center gap-2"
                    >
                      <RefreshCw className={`w-4 h-4 ${calculatingPreview ? 'animate-spin' : ''}`} />
                      {calculatingPreview ? 'Calculating...' : 'Refresh'}
                    </button>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{distributionPreview.length}</div>
                        <div className="text-sm text-gray-600">Participants</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {formatRewardAmountWei(distributionPreview.reduce((sum, entry) => {
                            const amount = distributionMethod === 'custom' && entry.isEditable 
                              ? (editingAmounts[entry.walletAddress] || entry.rewardAmount)
                              : entry.rewardAmount;
                            return sum + BigInt(amount);
                          }, BigInt(0)).toString())}
                        </div>
                        <div className="text-sm text-gray-600">Total Rewards</div>
                      </div>
                    </div>
                    
                    {/* Custom Distribution Validation */}
                    {distributionMethod === 'custom' && (
                      <div className="mt-4 p-3 rounded-lg border">
                        <div className="text-center">
                          <div className="text-sm font-medium text-gray-700 mb-2">Distribution Balance</div>
                          {(() => {
                            const validation = getValidationMessage();
                            if (!validation) return null;
                            
                            const bgColor = validation.type === 'success' ? 'bg-green-100' : 
                                           validation.type === 'warning' ? 'bg-yellow-100' : 'bg-red-100';
                            const textColor = validation.type === 'success' ? 'text-green-800' : 
                                            validation.type === 'warning' ? 'text-yellow-800' : 'text-red-800';
                            
                            return (
                              <div className={`${bgColor} ${textColor} px-3 py-2 rounded-lg text-sm font-medium`}>
                                {validation.message}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-700">
                        <div className="col-span-1">#</div>
                        <div className="col-span-4">Participant</div>
                        <div className="col-span-2">Score</div>
                        <div className="col-span-2">Reward</div>
                        <div className="col-span-2">Share</div>
                        <div className="col-span-1">Wallet</div>
                      </div>
                    </div>
                    
                    <div className="divide-y divide-gray-200">
                      {distributionPreview.map((entry, index) => (
                        <div key={entry.walletAddress} className="px-4 py-3 hover:bg-gray-50">
                          <div className="grid grid-cols-12 gap-4 items-center text-sm">
                            <div className="col-span-1 font-medium text-gray-900">
                              {index + 1}
                            </div>
                            <div className="col-span-4 font-medium text-gray-900 truncate">
                              {entry.name}
                            </div>
                            <div className="col-span-2 text-gray-600">
                              {entry.score.toLocaleString()}
                            </div>
                            <div className="col-span-2">
                              {distributionMethod === 'custom' && entry.isEditable ? (
                                <input
                                  type="text"
                                  value={editingAmounts[entry.walletAddress] || entry.rewardAmount}
                                  onChange={(e) => handleAmountEdit(entry.walletAddress, e.target.value)}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent font-semibold text-green-600"
                                  placeholder="Enter amount"
                                />
                              ) : (
                                <div className="font-semibold text-green-600">
                                  {formatRewardAmountWei(entry.rewardAmount)}
                                </div>
                              )}
                            </div>
                            <div className="col-span-2 text-gray-600">
                              {(() => {
                                if (distributionMethod === 'custom' && entry.isEditable) {
                                  const editedAmount = BigInt(editingAmounts[entry.walletAddress] || entry.rewardAmount);
                                  const totalAmount = distributionPreview.reduce((sum, e) => {
                                    const amount = e.isEditable ? BigInt(editingAmounts[e.walletAddress] || e.rewardAmount) : BigInt(e.rewardAmount);
                                    return sum + amount;
                                  }, BigInt(0));
                                  const percentage = totalAmount > 0 ? (Number(editedAmount) / Number(totalAmount)) * 100 : 0;
                                  return `${percentage.toFixed(2)}%`;
                                }
                                return `${entry.percentage}%`;
                              })()}
                            </div>
                            <div className="col-span-1">
                              <button
                                onClick={() => navigator.clipboard.writeText(entry.walletAddress)}
                                className="text-blue-600 hover:text-blue-700 text-xs"
                                title="Copy wallet address"
                              >
                                {entry.walletAddress.slice(0, 6)}...{entry.walletAddress.slice(-4)}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowDistributionModal(false)}
                  className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={executeDistribution}
                  disabled={distributingRewards || distributionPreview.length === 0}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  {distributingRewards ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  {distributingRewards ? 'Executing...' : 'Execute Distribution'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Controls */}
      {isAdmin && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">Admin Controls</h3>
          <div className="flex flex-wrap gap-3">
            {adminDetails?.canDistributeRewards && (
              <button
                onClick={handleDistributeRewards}
                disabled={distributingRewards}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                {distributingRewards ? 'Distributing...' : 'Distribute Rewards'}
              </button>
            )}
            
            {/* Manual submission creation for admins */}
            <button
              onClick={handleCreateSubmissions}
              disabled={creatingSubmissions}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
            >
              {creatingSubmissions ? 'Creating...' : 'Create Missing Submissions'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
