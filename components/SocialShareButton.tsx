'use client';

import React, { useState } from 'react';
import { useMiniApp } from '@/hooks/useMiniApp';
import { Share2, Copy, CheckCircle } from 'lucide-react';

interface SocialShareButtonProps {
  snarkelCode?: string;
  title?: string;
  className?: string;
}

export const SocialShareButton: React.FC<SocialShareButtonProps> = ({ 
  snarkelCode, 
  title = 'Check out this quiz!',
  className = ''
}) => {
  const { isMiniApp, userFid } = useMiniApp();
  const [copied, setCopied] = useState(false);

  const shareText = snarkelCode 
    ? `${title} 🎯\n\nJoin the quiz: ${snarkelCode}\n\nCreated with Snarkels - Interactive Quiz Rewards on Base! 🚀`
    : `${title} 🎯\n\nJoin Snarkels - Interactive Quiz Rewards on Base! 🚀`;

  const shareUrl = snarkelCode 
    ? `https://snarkels.lol/join/${snarkelCode}`
    : 'https://snarkels.lol';

  const handleShare = async () => {
    if (navigator.share && isMiniApp) {
      try {
        await navigator.share({
          title: 'Snarkels Quiz',
          text: shareText,
          url: shareUrl,
        });
      } catch (error) {
        console.log('Share cancelled or failed');
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <button
      onClick={handleShare}
      className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all transform hover:scale-105 font-handwriting font-bold shadow-md ${className}`}
    >
      {copied ? (
        <>
          <CheckCircle className="w-4 h-4" />
          Copied!
        </>
      ) : (
        <>
          <Share2 className="w-4 h-4" />
          {isMiniApp ? 'Share Quiz' : 'Share'}
        </>
      )}
    </button>
  );
};

export default SocialShareButton;
