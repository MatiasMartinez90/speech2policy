"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, getCurrentUser, type User } from '@/lib/auth';
import ChatInterface from '@/components/chat/ChatInterface';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';

export default function ChatPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>();

  useEffect(() => {
    checkAuthAndLoadUser();
  }, []);

  const checkAuthAndLoadUser = async () => {
    try {
      const authenticated = await isAuthenticated();

      if (!authenticated) {
        router.push('/');
        return;
      }

      const userData = await getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Error loading user:', error);
      router.push('/');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setCurrentSessionId(undefined);
  };

  const handleSelectSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
  };

  const handleNewSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Header user={user} />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          currentSessionId={currentSessionId}
          onNewChat={handleNewChat}
          onSelectSession={handleSelectSession}
        />

        <main className="flex-1 overflow-hidden">
          <ChatInterface
            sessionId={currentSessionId}
            onNewSession={handleNewSession}
          />
        </main>
      </div>
    </div>
  );
}
