'use client';

import React from 'react';
import Link from 'next/link';
import { Home, Plus, Gamepad2, Trophy, Sparkles, TrendingUp } from 'lucide-react';
import WalletConnectButton from './WalletConnectButton';

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-blue-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Navigation */}
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-slate-500 rounded-lg flex items-center justify-center">
                <Sparkles size={20} className="text-white" />
              </div>
              <span className="font-handwriting text-xl font-bold text-blue-900">
                Snarkels
              </span>
            </Link>
            
            <nav className="hidden md:flex items-center space-x-6">
              <Link 
                href="/" 
                className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 transition-colors duration-200"
              >
                <Home size={16} />
                <span className="font-handwriting">Home</span>
              </Link>
              <Link 
                href="/create" 
                className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 transition-colors duration-200"
              >
                <Plus size={16} />
                <span className="font-handwriting">Create</span>
              </Link>
              <Link 
                href="/join" 
                className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 transition-colors duration-200"
              >
                <Gamepad2 size={16} />
                <span className="font-handwriting">Join</span>
              </Link>
              <Link 
                href="/profile" 
                className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 transition-colors duration-200"
              >
                <Trophy size={16} />
                <span className="font-handwriting">Profile</span>
              </Link>
              <Link 
                href="/admin" 
                className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 transition-colors duration-200"
              >
                <TrendingUp size={16} />
                <span className="font-handwriting">Admin</span>
              </Link>
            </nav>
          </div>

          {/* Wallet Connect Button */}
          <div className="flex items-center space-x-4">
            <WalletConnectButton />
          </div>
        </div>
      </div>
    </header>
  );
} 