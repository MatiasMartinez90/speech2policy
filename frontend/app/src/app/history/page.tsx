"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, getCurrentUser, type User } from '@/lib/auth';
import { apiClient } from '@/lib/api';
import Header from '@/components/layout/Header';
import PolicyPreview from '@/components/chat/PolicyPreview';
import RiskBadge from '@/components/chat/RiskBadge';
import { Calendar, Download, Trash2 } from 'lucide-react';

interface Policy {
  policyId: string;
  userId: string;
  sessionId: string;
  policyJson: any;
  riskScore: number;
  createdAt: string;
}

export default function HistoryPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    try {
      const authenticated = await isAuthenticated();

      if (!authenticated) {
        router.push('/');
        return;
      }

      const userData = await getCurrentUser();
      setUser(userData);

      await loadPolicies();
    } catch (error) {
      console.error('Error loading data:', error);
      router.push('/');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPolicies = async () => {
    try {
      const response: any = await apiClient.getPolicyHistory(50);

      if (response.success) {
        // Parse policyJson if it's a string
        const parsedPolicies = response.data.policies.map((p: any) => ({
          ...p,
          policyJson: typeof p.policyJson === 'string' ? JSON.parse(p.policyJson) : p.policyJson,
        }));

        setPolicies(parsedPolicies);
      }
    } catch (error) {
      console.error('Error loading policies:', error);
    }
  };

  const handleDownloadPolicy = (policy: Policy) => {
    const blob = new Blob([JSON.stringify(policy.policyJson, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `iam-policy-${policy.policyId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getRiskLevel = (score: number): string => {
    if (score === 0) return 'SAFE';
    if (score < 20) return 'LOW';
    if (score < 40) return 'MEDIUM';
    if (score < 70) return 'HIGH';
    return 'CRITICAL';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header user={user} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Policy History</h1>
          <p className="text-gray-600">View and download all your generated IAM policies</p>
        </div>

        {policies.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-gray-600">No policies generated yet</p>
            <button
              onClick={() => router.push('/chat')}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Start Creating Policies
            </button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Policies list */}
            <div className="space-y-4">
              {policies.map((policy) => (
                <div
                  key={policy.policyId}
                  className={`bg-white rounded-lg border p-6 cursor-pointer transition-all hover:shadow-md ${
                    selectedPolicy?.policyId === policy.policyId
                      ? 'border-blue-500 ring-2 ring-blue-200'
                      : 'border-gray-200'
                  }`}
                  onClick={() => setSelectedPolicy(policy)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <RiskBadge score={policy.riskScore} level={getRiskLevel(policy.riskScore)} />
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadPolicy(policy);
                        }}
                        className="p-2 hover:bg-gray-100 rounded transition-colors"
                        title="Download policy"
                      >
                        <Download className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      {new Date(policy.createdAt).toLocaleString()}
                    </div>

                    {policy.policyJson?.Statement && (
                      <p className="text-sm text-gray-700">
                        {policy.policyJson.Statement.length} statement
                        {policy.policyJson.Statement.length > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Policy preview */}
            <div className="lg:sticky lg:top-8 lg:h-fit">
              {selectedPolicy ? (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-lg font-semibold text-gray-900">Policy Details</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Created {new Date(selectedPolicy.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="p-6">
                    <div className="mb-4">
                      <RiskBadge
                        score={selectedPolicy.riskScore}
                        level={getRiskLevel(selectedPolicy.riskScore)}
                        showScore={true}
                      />
                    </div>

                    <PolicyPreview policy={selectedPolicy.policyJson} editable={false} />
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                  <p className="text-gray-600">Select a policy to view details</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
