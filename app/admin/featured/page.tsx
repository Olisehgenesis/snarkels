'use client';

import React, { useState, useEffect } from 'react';
import { Star, Crown, Users, Trophy, Edit3, Trash2, Plus, CheckCircle, XCircle } from 'lucide-react';
import { useAccount } from 'wagmi';

interface FeaturedQuiz {
  id: string;
  title: string;
  description: string;
  snarkelCode: string;
  creator: {
    address: string;
    name: string;
  };
  isFeatured: boolean;
  featuredContent?: {
    priority: number;
    isActive: boolean;
  };
  _count: {
    questions: number;
    submissions: number;
  };
}

export default function FeaturedQuizzesAdminPage() {
  const { address, isConnected } = useAccount();
  const [featuredQuizzes, setFeaturedQuizzes] = useState<FeaturedQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (isConnected && address) {
      fetchFeaturedQuizzes();
    }
  }, [isConnected, address]);

  const fetchFeaturedQuizzes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/featured-quizzes');
      const data = await response.json();
      
      if (response.ok) {
        setFeaturedQuizzes(data.quizzes);
      } else {
        setError(data.error || 'Failed to fetch featured quizzes');
      }
    } catch (error) {
      console.error('Error fetching featured quizzes:', error);
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const toggleFeatured = async (quizId: string, isFeatured: boolean, priority: number = 1) => {
    try {
      setUpdating(quizId);
      const response = await fetch('/api/admin/featured-quizzes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quizId,
          isFeatured,
          priority
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        // Update local state
        setFeaturedQuizzes(prev => 
          prev.map(quiz => 
            quiz.id === quizId 
              ? { 
                  ...quiz, 
                  isFeatured, 
                  featuredContent: isFeatured 
                    ? { priority, isActive: true }
                    : undefined
                }
              : quiz
          )
        );
      } else {
        setError(data.error || 'Failed to update featured status');
      }
    } catch (error) {
      console.error('Error updating featured status:', error);
      setError('Network error occurred');
    } finally {
      setUpdating(null);
    }
  };

  const updatePriority = async (quizId: string, priority: number) => {
    try {
      setUpdating(quizId);
      const response = await fetch('/api/admin/featured-quizzes/priority', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quizId,
          priority
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        // Update local state
        setFeaturedQuizzes(prev => 
          prev.map(quiz => 
            quiz.id === quizId 
              ? { 
                  ...quiz, 
                  featuredContent: quiz.featuredContent 
                    ? { ...quiz.featuredContent, priority }
                    : { priority, isActive: true }
                }
              : quiz
          )
        );
      } else {
        setError(data.error || 'Failed to update priority');
      }
    } catch (error) {
      console.error('Error updating priority:', error);
      setError('Network error occurred');
    } finally {
      setUpdating(null);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen  p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <Crown className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
            <h1 className="font-handwriting text-4xl mb-4" style={{ color: '#476520' }}>
              Featured Quizzes Admin
            </h1>
            <p className="text-lg" style={{ color: '#655947' }}>
              Please connect your wallet to access the admin panel
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen  p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Crown className="w-12 h-12 text-yellow-500" />
            <h1 className="font-handwriting text-4xl" style={{ color: '#476520' }}>
              Featured Quizzes Admin
            </h1>
          </div>
          <p className="text-lg" style={{ color: '#655947' }}>
            Manage which quizzes appear on the homepage
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" />
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
            <p className="mt-4" style={{ color: '#655947' }}>Loading featured quizzes...</p>
          </div>
        ) : (
          /* Quiz List */
          <div className="grid gap-6">
            {featuredQuizzes.map((quiz) => (
              <div key={quiz.id} className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-100 hover:border-yellow-300 transition-all duration-300">
                <div className="flex items-start justify-between">
                  {/* Quiz Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="font-handwriting text-xl font-bold" style={{ color: '#476520' }}>
                        {quiz.title}
                      </h3>
                      {quiz.isFeatured && (
                        <div className="flex items-center gap-1 bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">
                          <Star className="w-3 h-3" />
                          <span>Featured</span>
                        </div>
                      )}
                    </div>
                    
                    <p className="text-sm mb-4" style={{ color: '#655947' }}>
                      {quiz.description}
                    </p>
                    
                    <div className="flex items-center gap-6 text-sm" style={{ color: '#655947' }}>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{quiz._count.submissions} participants</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Trophy className="w-4 h-4" />
                        <span>{quiz._count.questions} questions</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>Code: {quiz.snarkelCode}</span>
                      </div>
                    </div>
                    
                    <div className="mt-2 text-xs" style={{ color: '#655947' }}>
                      Created by: {quiz.creator.name || `${quiz.creator.address.slice(0, 8)}...`}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 ml-4">
                    {/* Priority Input */}
                    {quiz.isFeatured && (
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-medium" style={{ color: '#476520' }}>
                          Priority:
                        </label>
                        <input
                          type="number"
                          value={quiz.featuredContent?.priority || 1}
                          onChange={(e) => updatePriority(quiz.id, parseInt(e.target.value) || 1)}
                          className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                          min="1"
                          max="10"
                          disabled={updating === quiz.id}
                        />
                      </div>
                    )}

                    {/* Featured Toggle */}
                    <button
                      onClick={() => toggleFeatured(quiz.id, !quiz.isFeatured)}
                      disabled={updating === quiz.id}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                        quiz.isFeatured
                          ? 'bg-red-500 text-white hover:bg-red-600'
                          : 'bg-green-500 text-white hover:bg-green-600'
                      }`}
                    >
                      {updating === quiz.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : quiz.isFeatured ? (
                        <>
                          <XCircle className="w-4 h-4" />
                          Remove Featured
                        </>
                      ) : (
                        <>
                          <Star className="w-4 h-4" />
                          Make Featured
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {featuredQuizzes.length === 0 && (
              <div className="text-center py-12">
                <Star className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="font-handwriting text-2xl mb-2" style={{ color: '#476520' }}>
                  No Quizzes Found
                </h3>
                <p style={{ color: '#655947' }}>
                  No quizzes are currently marked as featured.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
