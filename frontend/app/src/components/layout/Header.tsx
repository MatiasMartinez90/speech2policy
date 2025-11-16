"use client";

import React, { useState } from 'react';
import { signOut } from 'aws-amplify/auth';
import { User, LogOut, Settings, History } from 'lucide-react';
import Link from 'next/link';

interface HeaderProps {
  user?: {
    email: string;
    name?: string;
    picture?: string;
  };
}

export default function Header({ user }: HeaderProps) {
  const [showMenu, setShowMenu] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/chat" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">S2P</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Speech2Policy</h1>
              <p className="text-xs text-gray-500">AI-Powered IAM Assistant</p>
            </div>
          </Link>

          {/* User menu */}
          {user && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name || user.email}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                )}
                <div className="text-left hidden md:block">
                  <p className="text-sm font-medium text-gray-900">
                    {user.name || user.email.split('@')[0]}
                  </p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
              </button>

              {/* Dropdown menu */}
              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                    <div className="p-3 border-b border-gray-200">
                      <p className="text-sm font-medium text-gray-900">{user.name || 'User'}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>

                    <div className="p-1">
                      <Link
                        href="/history"
                        className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                        onClick={() => setShowMenu(false)}
                      >
                        <History className="w-4 h-4" />
                        Policy History
                      </Link>

                      <Link
                        href="/settings"
                        className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                        onClick={() => setShowMenu(false)}
                      >
                        <Settings className="w-4 h-4" />
                        Settings
                      </Link>

                      <hr className="my-1 border-gray-200" />

                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
