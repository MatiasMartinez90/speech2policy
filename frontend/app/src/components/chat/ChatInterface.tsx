"use client";

import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, AlertCircle } from 'lucide-react';
import MessageBubble from './MessageBubble';
import InputBar from './InputBar';
import PolicyPreview from './PolicyPreview';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  policyJson?: any;
  riskAnalysis?: {
    score: number;
    level: string;
    warnings: any[];
    summary: string;
  };
  validationResult?: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
  timestamp: string;
}

interface ChatInterfaceProps {
  sessionId?: string;
  onNewSession?: (sessionId: string) => void;
}

export default function ChatInterface({ sessionId, onNewSession }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingMessages, setRemainingMessages] = useState<number>(5);
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(sessionId);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load session messages if sessionId provided
  useEffect(() => {
    if (sessionId) {
      loadSession(sessionId);
    }
  }, [sessionId]);

  const loadSession = async (sid: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/chat/sessions/${sid}`);

      if (!response.ok) {
        throw new Error('Failed to load session');
      }

      const data = await response.json();

      if (data.success) {
        setMessages(data.data.messages || []);
        setCurrentSessionId(sid);
      }
    } catch (err) {
      console.error('Error loading session:', err);
      setError('Failed to load conversation history');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;

    // Add user message immediately (optimistic UI)
    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          sessionId: currentSessionId
        })
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. You have used all your free messages for today.');
        }
        throw new Error('Failed to send message');
      }

      const data = await response.json();

      if (data.success) {
        const { sessionId: newSessionId, aiMessage, usage } = data.data;

        // Update session ID if this is a new session
        if (!currentSessionId && newSessionId) {
          setCurrentSessionId(newSessionId);
          onNewSession?.(newSessionId);
        }

        // Add AI response
        const assistantMessage: Message = {
          id: aiMessage.id,
          role: 'assistant',
          content: aiMessage.content,
          policyJson: aiMessage.policyJson,
          riskAnalysis: aiMessage.riskAnalysis,
          validationResult: aiMessage.validationResult,
          timestamp: aiMessage.timestamp
        };

        setMessages(prev => [...prev, assistantMessage]);

        // Update remaining messages
        if (usage?.remaining !== undefined) {
          setRemainingMessages(usage.remaining);
        }
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError(err.message || 'Failed to send message');

      // Remove optimistic user message on error
      setMessages(prev => prev.filter(m => m.id !== userMessage.id));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header with usage info */}
      <div className="border-b border-gray-200 px-6 py-4 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">IAM Policy Assistant</h2>
          </div>
          <div className="text-sm text-gray-600">
            {remainingMessages > 0 ? (
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                {remainingMessages} messages remaining today
              </span>
            ) : (
              <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full">
                Daily limit reached
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-800">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-800"
          >
            ✕
          </button>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageCircle className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Welcome to Speech2Policy
            </h3>
            <p className="text-gray-600 max-w-md">
              Ask me to create IAM policies in natural language. For example:
            </p>
            <div className="mt-4 space-y-2 text-left">
              <p className="text-sm text-gray-700 bg-gray-50 px-4 py-2 rounded-lg">
                💬 "Create a policy for S3 read-only access to bucket my-data"
              </p>
              <p className="text-sm text-gray-700 bg-gray-50 px-4 py-2 rounded-lg">
                💬 "I need Lambda execution permissions with CloudWatch Logs"
              </p>
              <p className="text-sm text-gray-700 bg-gray-50 px-4 py-2 rounded-lg">
                💬 "Give DynamoDB read/write access but only for table Users"
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6 max-w-4xl mx-auto">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {isLoading && (
              <div className="flex items-center gap-3 text-gray-600">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                <span className="text-sm">AI is thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-gray-200 bg-white">
        <InputBar
          onSendMessage={handleSendMessage}
          disabled={isLoading || remainingMessages === 0}
          placeholder={
            remainingMessages === 0
              ? "Daily limit reached. Upgrade to continue..."
              : "Ask me to create an IAM policy..."
          }
        />
      </div>
    </div>
  );
}
