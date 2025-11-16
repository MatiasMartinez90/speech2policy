"use client";

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { User, Bot, Copy, Check, Download } from 'lucide-react';
import PolicyPreview from './PolicyPreview';
import RiskBadge from './RiskBadge';

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

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const [showFullPolicy, setShowFullPolicy] = useState(false);

  const isUser = message.role === 'user';

  const handleCopyPolicy = async () => {
    if (message.policyJson) {
      await navigator.clipboard.writeText(JSON.stringify(message.policyJson, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadPolicy = () => {
    if (message.policyJson) {
      const blob = new Blob([JSON.stringify(message.policyJson, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `iam-policy-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className={`flex gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isUser ? 'bg-blue-600' : 'bg-gray-700'
      }`}>
        {isUser ? (
          <User className="w-5 h-5 text-white" />
        ) : (
          <Bot className="w-5 h-5 text-white" />
        )}
      </div>

      {/* Message content */}
      <div className={`flex-1 max-w-3xl ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-900'
        }`}>
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown
              components={{
                // Customize code blocks to not use PolicyPreview (that's separate)
                code: ({ node, inline, ...props }) => (
                  inline ? (
                    <code className="bg-gray-200 text-gray-900 px-1 rounded" {...props} />
                  ) : (
                    <pre className="bg-gray-800 text-gray-100 p-3 rounded-lg overflow-x-auto">
                      <code {...props} />
                    </pre>
                  )
                ),
                p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                a: ({ node, ...props }) => (
                  <a className="text-blue-400 hover:underline" {...props} />
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        </div>

        {/* Policy preview (for AI messages only) */}
        {!isUser && message.policyJson && (
          <div className="mt-4 space-y-3">
            {/* Risk analysis */}
            {message.riskAnalysis && (
              <div className="flex items-start gap-3">
                <RiskBadge
                  score={message.riskAnalysis.score}
                  level={message.riskAnalysis.level}
                />
                <div className="flex-1">
                  <p className="text-sm text-gray-700">{message.riskAnalysis.summary}</p>
                  {message.riskAnalysis.warnings.length > 0 && (
                    <details className="mt-2">
                      <summary className="text-sm font-medium text-gray-900 cursor-pointer hover:text-gray-700">
                        View {message.riskAnalysis.warnings.length} warning{message.riskAnalysis.warnings.length > 1 ? 's' : ''}
                      </summary>
                      <ul className="mt-2 space-y-1 text-sm text-gray-600">
                        {message.riskAnalysis.warnings.map((warning, idx) => (
                          <li key={idx} className="pl-4 border-l-2 border-orange-400">
                            <span className="font-medium">{warning.type}:</span> {warning.message}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              </div>
            )}

            {/* Validation errors */}
            {message.validationResult && !message.validationResult.valid && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm font-medium text-red-900 mb-2">Validation Errors:</p>
                <ul className="text-sm text-red-700 space-y-1">
                  {message.validationResult.errors.map((error, idx) => (
                    <li key={idx}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Policy JSON preview */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
                <span className="text-sm font-medium text-gray-700">IAM Policy JSON</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowFullPolicy(!showFullPolicy)}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    {showFullPolicy ? 'Hide' : 'Show'} full policy
                  </button>
                  <button
                    onClick={handleCopyPolicy}
                    className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                    title="Copy policy"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-600" />
                    )}
                  </button>
                  <button
                    onClick={handleDownloadPolicy}
                    className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                    title="Download policy"
                  >
                    <Download className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>

              {showFullPolicy && (
                <PolicyPreview policy={message.policyJson} />
              )}
            </div>
          </div>
        )}

        {/* Timestamp */}
        <p className="text-xs text-gray-500 mt-1 px-2">
          {new Date(message.timestamp).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}
