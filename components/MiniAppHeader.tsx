'use client';

import React from 'react';
import { useMiniApp } from '@/hooks/useMiniApp';
import { Users, Star, MapPin } from 'lucide-react';

export const MiniAppHeader: React.FC = () => {
  const { isMiniApp, userFid, username, displayName, pfpUrl, isAdded, location } = useMiniApp();

  if (!isMiniApp) {
    return null; // Don't show Mini App header when not in Mini App context
  }

  return (
    <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-lg mb-6 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* User Profile */}
          <div className="flex items-center gap-2">
            {pfpUrl ? (
              <img 
                src={pfpUrl} 
                alt="Profile" 
                className="w-8 h-8 rounded-full border-2 border-white"
              />
            ) : (
              <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            )}
            <div>
              <p className="font-handwriting font-bold text-sm">
                {displayName || username || `FID: ${userFid}`}
              </p>
              {userFid && (
                <p className="text-xs text-blue-100">FID: {userFid}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Mini App Status */}
          {isAdded && (
            <div className="flex items-center gap-1 bg-white bg-opacity-20 px-2 py-1 rounded-full">
              <Star className="w-3 h-3" />
              <span className="text-xs">Added</span>
            </div>
          )}
          
          {/* Location */}
          {location && (
            <div className="flex items-center gap-1 bg-white bg-opacity-20 px-2 py-1 rounded-full">
              <MapPin className="w-3 h-3" />
              <span className="text-xs">
                {typeof location === 'string' ? location : 'Social Feed'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Mini App Welcome Message */}
      <div className="mt-3 pt-3 border-t border-white border-opacity-20">
        <p className="text-sm text-blue-100">
          🎯 Welcome to Snarkels! Create and participate in interactive quizzes with crypto rewards.
        </p>
      </div>
    </div>
  );
};

export default MiniAppHeader;
