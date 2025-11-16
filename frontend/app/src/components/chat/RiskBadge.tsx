"use client";

import React from 'react';
import { Shield, AlertTriangle, AlertOctagon, ShieldAlert, ShieldCheck } from 'lucide-react';

interface RiskBadgeProps {
  score: number;
  level: string;
  showScore?: boolean;
}

export default function RiskBadge({ score, level, showScore = true }: RiskBadgeProps) {
  const getRiskConfig = () => {
    switch (level.toUpperCase()) {
      case 'SAFE':
        return {
          bg: 'bg-green-100',
          text: 'text-green-800',
          border: 'border-green-200',
          icon: ShieldCheck,
          label: 'Safe'
        };
      case 'LOW':
        return {
          bg: 'bg-blue-100',
          text: 'text-blue-800',
          border: 'border-blue-200',
          icon: Shield,
          label: 'Low Risk'
        };
      case 'MEDIUM':
        return {
          bg: 'bg-yellow-100',
          text: 'text-yellow-800',
          border: 'border-yellow-200',
          icon: AlertTriangle,
          label: 'Medium Risk'
        };
      case 'HIGH':
        return {
          bg: 'bg-orange-100',
          text: 'text-orange-800',
          border: 'border-orange-200',
          icon: ShieldAlert,
          label: 'High Risk'
        };
      case 'CRITICAL':
        return {
          bg: 'bg-red-100',
          text: 'text-red-800',
          border: 'border-red-200',
          icon: AlertOctagon,
          label: 'Critical Risk'
        };
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-800',
          border: 'border-gray-200',
          icon: Shield,
          label: 'Unknown'
        };
    }
  };

  const config = getRiskConfig();
  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${config.bg} ${config.text} ${config.border}`}>
      <Icon className="w-4 h-4" />
      <span className="text-sm font-medium">{config.label}</span>
      {showScore && (
        <span className="text-xs font-semibold">
          ({score}/100)
        </span>
      )}
    </div>
  );
}
