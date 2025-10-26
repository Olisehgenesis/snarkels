'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Share2, 
  Copy, 
  CheckCircle, 
  Users, 
  Clock, 
  Gift, 
  Star,
  ArrowRight,
  Home,
  QrCode,
  Download
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { sdk } from '@farcaster/miniapp-sdk';

interface SnarkelData {
  id: string;
  title: string;
  description: string;
  snarkelCode: string;
  totalQuestions: number;
  basePointsPerQuestion: number;
  speedBonusEnabled: boolean;
  maxSpeedBonus: number;
  isPublic: boolean;
  startTime?: string;
  autoStartEnabled: boolean;
  creator: {
    id: string;
    address: string;
    name: string;
  };
}

function ShareSnarkelContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [snarkel, setSnarkel] = useState<SnarkelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  useEffect(() => {
    // Call sdk.actions.ready() to hide Farcaster Mini App splash screen
    const callReady = async () => {
      try {
        await sdk.actions.ready();
        console.log('Farcaster Mini App ready() called successfully on share page');
      } catch (error) {
        console.error('Error calling sdk.actions.ready():', error);
      }
    };
    
    callReady();
    
    const code = searchParams.get('code');
    if (!code) {
      setError('No snarkel code provided');
      setLoading(false);
      return;
    }

    // Set QR code URL
    const joinUrl = `${window.location.origin}/join?code=${code}`;
    setQrCodeUrl(joinUrl);

    // Fetch snarkel data
    fetchSnarkelData(code);
  }, [searchParams]);

  const fetchSnarkelData = async (code: string) => {
    try {
      const response = await fetch('/api/snarkel/info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ snarkelCode: code }),
      });

      const data = await response.json();

      if (data.success) {
        setSnarkel(data.snarkel);
      } else {
        setError(data.error || 'Failed to load snarkel');
      }
    } catch (err) {
      setError('Failed to load snarkel data');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const downloadQRCode = () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = `snarkel-${snarkel?.snarkelCode}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  const handleGoHome = () => {
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen  flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-handwriting">Loading snarkel...</p>
        </div>
      </div>
    );
  }

  if (error || !snarkel) {
    return (
      <div className="min-h-screen  flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Star className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-handwriting font-bold text-gray-800 mb-2">Oops!</h2>
          <p className="text-gray-600 mb-6">{error || 'Snarkel not found'}</p>
          <button
            onClick={handleGoHome}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-300 font-handwriting font-bold flex items-center gap-2 mx-auto"
          >
            <Home className="w-5 h-5" />
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen ">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleGoHome}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors font-handwriting"
            >
              <Home className="w-5 h-5" />
              Back to Home
            </button>
            <h1 className="text-xl font-handwriting font-bold text-gray-800">Share Snarkel</h1>
            <div className="w-20"></div> {/* Spacer */}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Snarkel Info */}
          <div className="space-y-6">
            {/* Snarkel Header */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h1 className="text-3xl font-handwriting font-bold text-gray-800 mb-2">
                    {snarkel.title}
                  </h1>
                  <p className="text-gray-600 leading-relaxed">
                    {snarkel.description}
                  </p>
                </div>
                <div className="ml-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <Star className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>

              {/* Creator Info */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">
                    {snarkel.creator.name?.charAt(0) || 'C'}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">Created by</p>
                  <p className="text-xs text-gray-500">
                    {snarkel.creator.address.slice(0, 6)}...{snarkel.creator.address.slice(-4)}
                  </p>
                </div>
              </div>
            </div>

            {/* Snarkel Details */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-lg font-handwriting font-bold text-gray-800 mb-4">Quiz Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <Users className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{snarkel.totalQuestions}</p>
                    <p className="text-xs text-gray-500">Questions</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <Gift className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{snarkel.basePointsPerQuestion}</p>
                    <p className="text-xs text-gray-500">Base Points</p>
                  </div>
                </div>
                {snarkel.speedBonusEnabled && (
                  <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                    <Clock className="w-5 h-5 text-yellow-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">+{snarkel.maxSpeedBonus}</p>
                      <p className="text-xs text-gray-500">Speed Bonus</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                  <div className="w-5 h-5 rounded-full border-2 border-purple-500 flex items-center justify-center">
                    <span className="text-purple-500 text-xs font-bold">
                      {snarkel.isPublic ? 'P' : 'P'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {snarkel.isPublic ? 'Public' : 'Private'}
                    </p>
                    <p className="text-xs text-gray-500">Access</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Join Code */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-lg font-handwriting font-bold text-gray-800 mb-4">Join Code</h3>
              <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg border border-purple-200">
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-1">Share this code with participants:</p>
                  <p className="text-2xl font-mono font-bold text-purple-700 tracking-wider">
                    {snarkel.snarkelCode}
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(snarkel.snarkelCode)}
                  className="p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200"
                >
                  {copied ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <Copy className="w-5 h-5 text-gray-500" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - QR Code */}
          <div className="space-y-6">
            {/* QR Code Card */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="text-center mb-6">
                <h3 className="text-lg font-handwriting font-bold text-gray-800 mb-2">QR Code</h3>
                <p className="text-sm text-gray-600">Scan to join instantly</p>
              </div>
              
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-white rounded-xl shadow-lg border border-gray-200">
                  <QRCodeCanvas
                    value={qrCodeUrl}
                    size={200}
                    level="H"
                    includeMargin={true}
                    bgColor="#ffffff"
                    fgColor="#000000"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={downloadQRCode}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-300 font-handwriting font-bold flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download QR
                </button>
                <button
                  onClick={() => copyToClipboard(qrCodeUrl)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-300 font-handwriting font-bold flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy Link
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-lg font-handwriting font-bold text-gray-800 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => router.push(`/join?code=${snarkel.snarkelCode}`)}
                  className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-300 font-handwriting font-bold flex items-center justify-center gap-2"
                >
                  <ArrowRight className="w-4 h-4" />
                  Join Quiz Now
                </button>
                <button
                  onClick={() => {
                    const shareData = {
                      title: `Join my Snarkel: ${snarkel.title}`,
                      text: `Join my quiz session! Code: ${snarkel.snarkelCode}`,
                      url: qrCodeUrl
                    };
                    if (navigator.share) {
                      navigator.share(shareData);
                    } else {
                      copyToClipboard(`${shareData.title}\n${shareData.text}\n${shareData.url}`);
                    }
                  }}
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-300 font-handwriting font-bold flex items-center justify-center gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  Share Quiz
                </button>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-200">
              <h3 className="text-lg font-handwriting font-bold text-gray-800 mb-3">💡 Tips</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                  Share the QR code for instant mobile access
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></span>
                  Use the join code for desktop participants
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></span>
                  Participants can join anytime during the session
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .font-handwriting {
          /* Font is now handled globally with mobile optimization */
        }
      `}</style>
    </div>
  );
}

export default function ShareSnarkelPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ShareSnarkelContent />
    </Suspense>
  );
} 