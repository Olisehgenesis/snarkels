'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Play, 
  Users, 
  Plus, 
  Star, 
  Clock,
  Trophy,
  ArrowLeft,
  Search
} from 'lucide-react';
import WalletConnectButton from '@/components/WalletConnectButton';
import { useAccount } from 'wagmi';
import { sdk } from '@farcaster/miniapp-sdk';
import FarcasterUserProfile from '@/components/FarcasterUserProfile';
import BottomNavigation from '@/components/BottomNavigation';

interface Snarkel {
  id: number;
  title: string;
  description: string;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  formattedParticipants: string;
  duration: string;
  reward?: {
    amount: string;
    symbol: string;
    name: string;
  };
  snarkelCode: string;
  totalQuestions: number;
  totalParticipants: number;
  isActive: boolean;
  startTime?: string;
  rewardsEnabled: boolean;
  basePointsPerQuestion: number;
  speedBonusEnabled: boolean;
  maxSpeedBonus: number;
  priority: number;
}

const FeaturedSnarkelCard = ({ snarkel }: { snarkel: Snarkel }) => {
  const difficultyColors = {
    Easy: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    Medium: 'text-amber-600 bg-amber-50 border-amber-200', 
    Hard: 'text-red-600 bg-red-50 border-red-200'
  };

  return (
    <div className="group bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 hover:border-blue-300 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      {/* Gradient border on hover */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      
      <div className="relative z-10">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors duration-300">
                {snarkel.title}
              </h3>
              <p className="text-sm text-gray-600 line-clamp-2">
                {snarkel.description}
              </p>
            </div>
            
            <div className="flex flex-col items-end gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 border border-blue-200 shadow-sm">
                {snarkel.category}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold border shadow-sm ${difficultyColors[snarkel.difficulty]}`}>
                {snarkel.difficulty}
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 py-3 border-t border-gray-100">
            <div className="text-center group-hover:scale-105 transition-transform duration-300">
              <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:bg-blue-100 transition-colors duration-300">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-sm font-semibold text-gray-900">{snarkel.formattedParticipants}</p>
              <p className="text-xs text-gray-500">Players</p>
            </div>
            <div className="text-center group-hover:scale-105 transition-transform duration-300">
              <div className="w-8 h-8 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:bg-purple-100 transition-colors duration-300">
                <Clock className="w-4 h-4 text-purple-600" />
              </div>
              <p className="text-sm font-semibold text-gray-900">{snarkel.duration}</p>
              <p className="text-xs text-gray-500">Duration</p>
            </div>
            <div className="text-center group-hover:scale-105 transition-transform duration-300">
              <div className="w-8 h-8 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:bg-amber-100 transition-colors duration-300">
                <Trophy className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-sm font-semibold text-gray-900">
                {snarkel.reward ? `${snarkel.reward.amount} ${snarkel.reward.symbol}` : 'Free'}
              </p>
              <p className="text-xs text-gray-500">Reward</p>
            </div>
          </div>
          
          <Link
            href={`/join?snarkelCode=${snarkel.snarkelCode}`}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-4 py-3 rounded-xl font-semibold text-center transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <Play className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
            Join Snarkel
          </Link>
        </div>
      </div>
    </div>
  );
};

export default function FeaturedPage() {
  const { isConnected } = useAccount();
  const [featuredSnarkels, setFeaturedSnarkels] = useState<Snarkel[]>([]);
  const [loadingSnarkels, setLoadingSnarkels] = useState(true);
  const [snarkelError, setSnarkelError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const callReady = async () => {
      try {
        await sdk.actions.ready();
      } catch (error) {
        console.error('Error calling sdk.actions.ready():', error);
      }
    };
    
    callReady();
    
    const fetchFeaturedSnarkels = async () => {
      try {
        setLoadingSnarkels(true);
        setSnarkelError(null);
        const response = await fetch('/api/snarkel/featured?limit=50');
        
        if (response.ok) {
          const data = await response.json();
          setFeaturedSnarkels(data.featuredSnarkels || []);
        } else {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.message || 'Failed to fetch featured Snarkels';
          setSnarkelError(errorMessage);
          setFeaturedSnarkels([]);
        }
      } catch (error) {
        console.error('Error fetching featured Snarkels:', error);
        setSnarkelError('Network error. Please check your connection and try again.');
        setFeaturedSnarkels([]);
      } finally {
        setLoadingSnarkels(false);
      }
    };

    fetchFeaturedSnarkels();
  }, []);

  const retryFetch = () => {
    setSnarkelError(null);
    setLoadingSnarkels(true);
    const fetchFeaturedSnarkels = async () => {
      try {
        const response = await fetch('/api/snarkel/featured?limit=50');
        
        if (response.ok) {
          const data = await response.json();
          setFeaturedSnarkels(data.featuredSnarkels || []);
        } else {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.message || 'Failed to fetch featured Snarkels';
          setSnarkelError(errorMessage);
        }
      } catch (error) {
        setSnarkelError('Network error. Please check your connection and try again.');
      } finally {
        setLoadingSnarkels(false);
      }
    };
    
    fetchFeaturedSnarkels();
  };

  const filteredSnarkels = featuredSnarkels.filter(snarkel => {
    return snarkel.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
           snarkel.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
           (snarkel.category && snarkel.category.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Simple Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/10 to-purple-600/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-400/10 to-pink-600/10 rounded-full blur-3xl"></div>
      </div>

      {/* Back Button Only */}
      <div className="relative z-20 pt-6 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 p-3 bg-white/80 backdrop-blur-sm hover:bg-white rounded-xl transition-all duration-300 text-gray-700 hover:text-gray-900 shadow-lg hover:shadow-xl border border-white/30 hover:border-blue-200"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back</span>
        </Link>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-2xl flex items-center justify-center shadow-xl">
              <Star className="w-8 h-8 text-white drop-shadow-lg" />
            </div>
            <div className="text-left">
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Featured Snarkels
              </h1>
              <p className="text-gray-600 text-lg">Discover amazing challenges</p>
            </div>
          </div>
        </div>

        {/* Farcaster User Profile */}
        <div className="mb-8">
          <FarcasterUserProfile variant="inline" showPfp={true} showEmoji={true} />
        </div>

        {/* Simple Search */}
        <div className="mb-8">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search Snarkels..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 shadow-lg"
            />
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6 text-center">
          <p className="text-gray-600">
            Showing <span className="font-semibold text-gray-900">{filteredSnarkels.length}</span> of{' '}
            <span className="font-semibold text-gray-900">{featuredSnarkels.length}</span> Snarkels
          </p>
        </div>

        {/* Snarkels Grid */}
        {loadingSnarkels ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white/90 backdrop-blur-sm shadow-xl rounded-2xl p-6 animate-pulse border border-gray-200">
                <div className="h-4 bg-gray-200 rounded mb-4"></div>
                <div className="h-3 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded mb-4 w-3/4"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : snarkelError ? (
          <div className="text-center py-12">
            <div className="bg-amber-50/90 backdrop-blur-sm border border-amber-200 rounded-2xl p-8 max-w-md mx-auto shadow-xl">
              <p className="text-lg text-amber-800 mb-4">{snarkelError}</p>
              <button 
                onClick={retryFetch}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : filteredSnarkels.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-blue-50/90 backdrop-blur-sm border border-blue-200 rounded-2xl p-8 max-w-md mx-auto shadow-xl">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Search className="w-8 h-8 text-white" />
              </div>
              <p className="text-lg text-blue-800 mb-2">No Snarkels found</p>
              <p className="text-blue-600 mb-4">Try adjusting your search</p>
              <button
                onClick={() => setSearchTerm('')}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                Clear Search
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSnarkels.map((snarkel) => (
              <FeaturedSnarkelCard key={snarkel.id} snarkel={snarkel} />
            ))}
          </div>
        )}

        {/* Simple CTA */}
        <div className="text-center mt-16">
          <div className="bg-gradient-to-r from-blue-50/90 to-purple-50/90 backdrop-blur-sm rounded-2xl p-8 border border-blue-200 shadow-xl">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Create your own Snarkel
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Share your knowledge and create engaging challenges for the community.
            </p>
            <Link
              href="/create"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <Plus className="w-4 h-4" />
              Create Snarkel
            </Link>
          </div>
        </div>
      </div>
      
      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}
