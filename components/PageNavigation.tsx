import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Home } from 'lucide-react';

interface PageNavigationProps {
  backUrl?: string;
  backLabel?: string;
  title?: string;
  showHome?: boolean;
  className?: string;
}

export default function PageNavigation({ 
  backUrl, 
  backLabel = 'Back', 
  title,
  showHome = true,
  className = ''
}: PageNavigationProps) {
  return (
    <div className={`bg-white shadow-sm border-b ${className}`}>
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {backUrl && (
              <Link
                href={backUrl}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2 text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline">{backLabel}</span>
              </Link>
            )}
            
            {title && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <Home className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-handwriting font-bold text-gray-800">
                  {title}
                </h1>
              </div>
            )}
          </div>
          
          {showHome && (
            <Link
              href="/"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 hover:text-gray-800"
              title="Go to Home"
            >
              <Home className="w-5 h-5" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
