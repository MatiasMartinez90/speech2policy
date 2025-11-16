"use client";

import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Edit2, Save, X } from 'lucide-react';

interface PolicyPreviewProps {
  policy: any;
  onPolicyUpdate?: (updatedPolicy: any) => void;
  editable?: boolean;
}

export default function PolicyPreview({ policy, onPolicyUpdate, editable = true }: PolicyPreviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedPolicy, setEditedPolicy] = useState<string>(
    JSON.stringify(policy, null, 2)
  );
  const [error, setError] = useState<string | null>(null);

  const handleEdit = () => {
    setIsEditing(true);
    setEditedPolicy(JSON.stringify(policy, null, 2));
    setError(null);
  };

  const handleSave = () => {
    try {
      const parsed = JSON.parse(editedPolicy);
      onPolicyUpdate?.(parsed);
      setIsEditing(false);
      setError(null);
    } catch (err) {
      setError('Invalid JSON syntax');
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedPolicy(JSON.stringify(policy, null, 2));
    setError(null);
  };

  if (isEditing) {
    return (
      <div className="relative">
        <textarea
          value={editedPolicy}
          onChange={(e) => setEditedPolicy(e.target.value)}
          className="w-full h-96 p-4 font-mono text-sm bg-gray-900 text-gray-100 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          spellCheck={false}
        />

        {error && (
          <div className="mt-2 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative group">
      {editable && (
        <button
          onClick={handleEdit}
          className="absolute top-3 right-3 p-2 bg-gray-800 bg-opacity-0 group-hover:bg-opacity-100 text-gray-400 hover:text-white rounded transition-all opacity-0 group-hover:opacity-100"
          title="Edit policy"
        >
          <Edit2 className="w-4 h-4" />
        </button>
      )}

      <SyntaxHighlighter
        language="json"
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          borderRadius: '0 0 0.5rem 0.5rem',
          maxHeight: '600px',
          fontSize: '0.875rem',
        }}
        showLineNumbers
      >
        {JSON.stringify(policy, null, 2)}
      </SyntaxHighlighter>
    </div>
  );
}
