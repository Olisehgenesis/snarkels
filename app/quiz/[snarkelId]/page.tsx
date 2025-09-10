'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { 
  Trophy, 
  Users, 
  Clock, 
  Target, 
  Play, 
  BarChart3,
  ArrowLeft,
  Star,
  Calendar,
  Gamepad2,
  Home
} from 'lucide-react';
import Link from 'next/link';
import WalletConnectButton from '@/components/WalletConnectButton';
import FarcasterUserProfile from '@/components/FarcasterUserProfile';
import BottomNavigation from '@/components/BottomNavigation';

interface Quiz {
  id: string;
  title: string;
  description?: string;
  snarkelCode: string;
  maxQuestions?: number;
  basePointsPerQuestion?: number;
  speedBonusEnabled?: boolean;
  maxSpeedBonus?: number;
  rewardsEnabled?: boolean;
  isCompleted?: boolean;
  completedAt?: string;
  createdAt: string;
  creator: {
    id: string;
    name?: string;
    address: string;
  };
}

interface Room {
  id: string;
  name: string;
  currentParticipants: number;
  maxParticipants: number;
  isActive: boolean;
  isWaiting: boolean;
  isStarted: boolean;
  isFinished: boolean;
  sessionNumber: number;
  createdAt: string;
}

export default function QuizPage() {
  const params = useParams();
  const router = useRouter();
  const { address, isConnected } = useAccount();
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const snarkelId = params.snarkelId as string;

  useEffect(() => {
    if (snarkelId) {
      fetchQuizData();
    }
  }, [snarkelId]);

  const fetchQuizData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch quiz info and rooms
      const response = await fetch(`/api/quiz/${snarkelId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch quiz data');
      }

      const data = await response.json();
      
      if (data.success) {
        setQuiz(data.quiz || null);
        setRooms(data.rooms || []);
      } else {
        setError(data.error || 'Failed to fetch quiz data');
      }
    } catch (err) {
      console.error('Error fetching quiz data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActiveRooms = () => {
    return rooms.filter(room => room.isActive && !room.isFinished);
  };

  const getCompletedRooms = () => {
    return rooms.filter(room => room.isFinished);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quiz...</p>
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
            Error Loading Quiz
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={fetchQuizData}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-handwriting font-bold text-gray-800 mb-2">
            Quiz Not Found
          </h2>
          <p className="text-gray-600">The quiz you're looking for doesn't exist.</p>
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
              <Link
                href="/"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2 text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Back to Home</span>
              </Link>
              <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-handwriting font-bold text-gray-800">
                  {quiz.title}
                </h1>
                <p className="text-gray-600 text-sm">
                  Quiz Code: #{quiz.snarkelCode}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              {quiz.isCompleted && (
                <Link
                  href={`/quiz/${snarkelId}/leaderboard`}
                  className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-600 text-white rounded-lg hover:from-purple-600 hover:to-blue-700 transition-all font-medium text-sm sm:text-base"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span className="hidden sm:inline">View Leaderboard</span>
                  <span className="sm:hidden">Leaderboard</span>
                </Link>
              )}
              <Link
                href="/"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 hover:text-gray-800"
                title="Go to Home"
              >
                <Home className="w-5 h-5" />
              </Link>
              <WalletConnectButton />
            </div>
          </div>
        </div>
      </div>

      {/* Quiz Info */}
      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Farcaster User Profile - Show when in Farcaster context */}
            <FarcasterUserProfile variant="inline" showPfp={true} showEmoji={true} />

            {/* Quiz Details */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-handwriting font-bold text-gray-800 mb-4">
                Quiz Information
              </h2>
              <div className="space-y-4">
                {quiz.description && (
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-2">Description</h3>
                    <p className="text-gray-600 text-sm sm:text-base">{quiz.description}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Target className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Questions</p>
                      <p className="font-semibold text-sm sm:text-base">{quiz.maxQuestions || 'N/A'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Star className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Base Points</p>
                      <p className="font-semibold text-sm sm:text-base">{quiz.basePointsPerQuestion || 'N/A'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Speed Bonus</p>
                      <p className="font-semibold text-sm sm:text-base">
                        {quiz.speedBonusEnabled ? `+${quiz.maxSpeedBonus}` : 'Disabled'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Rewards</p>
                      <p className="font-semibold text-sm sm:text-base">
                        {quiz.rewardsEnabled ? 'Enabled' : 'Disabled'}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs sm:text-sm text-gray-500">
                    <span>Created by {quiz.creator.name || `${quiz.creator.address.slice(0, 6)}...${quiz.creator.address.slice(-4)}`}</span>
                    <span>{formatDate(quiz.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Rooms */}
            {getActiveRooms().length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-handwriting font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Play className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                  Active Sessions
                </h2>
                <div className="space-y-3">
                  {getActiveRooms().map((room) => (
                    <div key={room.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h3 className="font-semibold text-gray-800 text-sm sm:text-base">
                          Session #{room.sessionNumber}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600">
                          {room.currentParticipants}/{room.maxParticipants} participants
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          room.isWaiting ? 'bg-yellow-100 text-yellow-800' :
                          room.isStarted ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {room.isWaiting ? 'Waiting' :
                           room.isStarted ? 'In Progress' :
                           'Active'}
                        </span>
                        {isConnected && (
                          <Link
                            href={`/quiz/${snarkelId}/room/${room.id}`}
                            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all text-sm font-medium"
                          >
                            Join
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Completed Sessions */}
            {getCompletedRooms().length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-handwriting font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Completed Sessions
                </h2>
                <div className="space-y-3">
                  {getCompletedRooms().slice(0, 5).map((room) => (
                    <div key={room.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h3 className="font-semibold text-gray-800">
                          Session #{room.sessionNumber}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Completed {formatDate(room.createdAt)}
                        </p>
                      </div>
                      <Link
                        href={`/quiz/${snarkelId}/leaderboard`}
                        className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-600 text-white rounded-lg hover:from-purple-600 hover:to-blue-700 transition-all text-sm font-medium"
                      >
                        View Results
                      </Link>
                    </div>
                  ))}
                  {getCompletedRooms().length > 5 && (
                    <div className="text-center pt-2">
                      <Link
                        href={`/quiz/${snarkelId}/leaderboard`}
                        className="text-purple-600 hover:text-purple-700 font-medium"
                      >
                        View all {getCompletedRooms().length} completed sessions →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-handwriting font-bold text-gray-800 mb-4">
                Quick Actions
              </h3>
              <div className="space-y-3">
                {quiz.isCompleted ? (
                  <Link
                    href={`/quiz/${snarkelId}/leaderboard`}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-lg hover:from-yellow-500 hover:to-orange-600 transition-all font-medium"
                  >
                    <Trophy className="w-5 h-5" />
                    View Final Results
                  </Link>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <Gamepad2 className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p>Quiz is still active</p>
                  </div>
                )}
                
                {isConnected && getActiveRooms().length > 0 && (
                  <Link
                    href={`/quiz/${snarkelId}/room/${getActiveRooms()[0].id}`}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all font-medium"
                  >
                    <Play className="w-5 h-5" />
                    Join Active Session
                  </Link>
                )}
              </div>
            </div>

            {/* Quiz Stats */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-handwriting font-bold text-gray-800 mb-4">
                Quiz Statistics
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Sessions:</span>
                  <span className="font-bold">{rooms.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Active Sessions:</span>
                  <span className="font-bold text-green-600">{getActiveRooms().length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Completed:</span>
                  <span className="font-bold text-blue-600">{getCompletedRooms().length}</span>
                </div>
                {quiz.isCompleted && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Completed:</span>
                    <span className="font-bold text-purple-600">
                      {quiz.completedAt ? formatDate(quiz.completedAt) : 'Recently'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}
