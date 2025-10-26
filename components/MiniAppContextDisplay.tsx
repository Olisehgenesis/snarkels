'use client';

import React from 'react';
import { useMiniApp } from '@/hooks/useMiniApp';
import { Share2, Star, Users, MapPin } from 'lucide-react';

export const MiniAppContextDisplay: React.FC = () => {
  const { isMiniApp, userFid, username, displayName, pfpUrl, isAdded, location } = useMiniApp();

  if (!isMiniApp) {
    return null; // Don't show when not in Mini App context
  }

  return (
    <div className="fixed top-4 left-4 z-50">
      <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-gray-200">
        <div className="flex items-center gap-2">
          {/* Mini App Indicator */}
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          <span className="text-xs font-medium text-gray-700">Mini App</span>
        </div>
        
        {/* Social Context Info */}
        <div className="mt-2 space-y-1">
          {userFid && (
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <Users className="w-3 h-3" />
              <span>FID: {userFid}</span>
            </div>
          )}
          
          {location && (
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <MapPin className="w-3 h-3" />
              <span>{typeof location === 'string' ? location : 'Social Feed'}</span>
            </div>
          )}
          
          {isAdded && (
            <div className="flex items-center gap-1 text-xs text-green-600">
              <Star className="w-3 h-3" />
              <span>Added to Favorites</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MiniAppContextDisplay;
