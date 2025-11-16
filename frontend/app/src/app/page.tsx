"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Shield, Zap, Check, ArrowRight } from 'lucide-react';
import { isAuthenticated, signInWithGoogle } from '@/lib/auth';

export default function LandingPage() {
  const router = useRouter();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const authenticated = await isAuthenticated();
      if (authenticated) {
        router.push('/chat');
      }
    } catch (error) {
      console.error('Error checking auth:', error);
    } finally {
      setCheckingAuth(false);
    }
  };

  const handleSignIn = async () => {
    try {
      setIsAuthenticating(true);
      await signInWithGoogle();
    } catch (error) {
      console.error('Error signing in:', error);
      setIsAuthenticating(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">S2P</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Speech2Policy</h1>
                <p className="text-xs text-gray-500">AI-Powered IAM Assistant</p>
              </div>
            </div>

            <button
              onClick={handleSignIn}
              disabled={isAuthenticating}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
            >
              {isAuthenticating ? 'Signing in...' : 'Sign In'}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            Powered by Claude 3.5 Sonnet
          </div>

          <h1 className="text-6xl font-bold text-gray-900 mb-6">
            Stop Writing IAM Policies.<br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Just Talk.
            </span>
          </h1>

          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Convert natural language to secure AWS IAM policies using AI. Get instant risk analysis, validation, and best practice recommendations.
          </p>

          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handleSignIn}
              disabled={isAuthenticating}
              className="flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg hover:shadow-xl font-semibold text-lg"
            >
              {isAuthenticating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  Signing in...
                </>
              ) : (
                <>
                  Get Started Free
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            <a
              href="#features"
              className="px-8 py-4 bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:border-gray-300 transition-all font-semibold text-lg"
            >
              Learn More
            </a>
          </div>

          <p className="text-sm text-gray-500 mt-4">
            Free tier: 5 messages per day • No credit card required
          </p>
        </div>

        {/* Demo Screenshot Placeholder */}
        <div className="mt-16 bg-white rounded-2xl shadow-2xl p-8 border border-gray-200">
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-12 text-center">
            <MessageCircle className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Chat Interface Preview</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-20">
        <h2 className="text-4xl font-bold text-center text-gray-900 mb-16">
          Why Speech2Policy?
        </h2>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, idx) => (
            <div key={idx} className="bg-white rounded-xl p-8 border border-gray-200 hover:shadow-lg transition-shadow">
              <div className={`w-12 h-12 ${feature.color} rounded-lg flex items-center justify-center mb-4`}>
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-center text-white">
          <h2 className="text-4xl font-bold mb-4">Ready to Simplify IAM?</h2>
          <p className="text-xl opacity-90 mb-8">
            Join developers who are already using Speech2Policy
          </p>
          <button
            onClick={handleSignIn}
            disabled={isAuthenticating}
            className="px-8 py-4 bg-white text-blue-600 rounded-xl hover:bg-gray-100 disabled:opacity-50 transition-colors font-semibold text-lg shadow-lg"
          >
            Start Creating Policies Now
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-gray-600 text-sm">
          <p>&copy; 2024 Speech2Policy. Built with AWS Bedrock & Terraform.</p>
        </div>
      </footer>
    </div>
  );
}

const features = [
  {
    icon: <MessageCircle className="w-6 h-6 text-blue-600" />,
    color: 'bg-blue-100',
    title: 'Natural Language',
    description: 'Just describe what you need in plain English. AI converts it to perfect IAM JSON.',
  },
  {
    icon: <Shield className="w-6 h-6 text-green-600" />,
    color: 'bg-green-100',
    title: 'Risk Analysis',
    description: 'Automatic security scoring (0-100) with warnings for dangerous permissions.',
  },
  {
    icon: <Zap className="w-6 h-6 text-purple-600" />,
    color: 'bg-purple-100',
    title: 'Instant Results',
    description: 'Get validated policies in seconds. Edit, compare, and download with one click.',
  },
  {
    icon: <Check className="w-6 h-6 text-orange-600" />,
    color: 'bg-orange-100',
    title: 'Least Privilege',
    description: 'AI follows security best practices automatically. No wildcards unless necessary.',
  },
  {
    icon: <MessageCircle className="w-6 h-6 text-pink-600" />,
    color: 'bg-pink-100',
    title: 'Conversational',
    description: 'AI asks clarifying questions when needed. Iterative refinement supported.',
  },
  {
    icon: <Shield className="w-6 h-6 text-indigo-600" />,
    color: 'bg-indigo-100',
    title: 'Validation',
    description: 'Syntax checking, ARN format validation, and action verification built-in.',
  },
];
