"use client";

import React, { useEffect, useState } from 'react';
import { MessageSquare, Plus, Trash2, Clock } from 'lucide-react';
import Link from 'next/link';

interface ChatSession {
  sessionId: string;
  title: string;
  lastMessage: string;
  messageCount: number;
  timestamp: string;
  updatedAt?: string;
}

interface SidebarProps {
  currentSessionId?: string;
  onNewChat?: () => void;
  onSelectSession?: (sessionId: string) => void;
}

export default function Sidebar({ currentSessionId, onNewChat, onSelectSession }: SidebarProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/chat/sessions');

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSessions(data.data.sessions || []);
        }
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this conversation?')) {
      return;
    }

    try {
      const response = await fetch(`/api/chat/sessions/${sessionId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setSessions(prev => prev.filter(s => s.sessionId !== sessionId));

        // If deleted session was current, trigger new chat
        if (sessionId === currentSessionId) {
          onNewChat?.();
        }
      }
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  if (isCollapsed) {
    return (
      <button
        onClick={() => setIsCollapsed(false)}
        className="fixed left-4 top-4 z-50 p-2 bg-white border border-gray-200 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
      >
        <MessageSquare className="w-5 h-5 text-gray-700" />
      </button>
    );
  }

  return (
    <div className="w-80 h-full bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            ✕
          </button>
        </div>

        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
      </div>

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <MessageSquare className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-sm text-gray-600">No conversations yet</p>
            <p className="text-xs text-gray-500 mt-1">Start a new chat to begin</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {sessions.map((session) => (
              <button
                key={session.sessionId}
                onClick={() => onSelectSession?.(session.sessionId)}
                className={`w-full text-left p-3 rounded-lg transition-colors group ${
                  session.sessionId === currentSessionId
                    ? 'bg-blue-50 border border-blue-200'
                    : 'hover:bg-gray-50 border border-transparent'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {session.title}
                    </h3>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {session.lastMessage}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(session.updatedAt || session.timestamp)}
                      </span>
                      <span className="text-xs text-gray-400">
                        • {session.messageCount} messages
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleDeleteSession(session.sessionId, e)}
                    className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-100 rounded transition-all"
                    title="Delete conversation"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <Link
          href="/history"
          className="block text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          View All Policies →
        </Link>
      </div>
    </div>
  );
}
