"use client";

import React from 'react';
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';

interface DiffViewerProps {
  oldPolicy: any;
  newPolicy: any;
  title?: string;
}

export default function DiffViewer({ oldPolicy, newPolicy, title }: DiffViewerProps) {
  const oldCode = JSON.stringify(oldPolicy, null, 2);
  const newCode = JSON.stringify(newPolicy, null, 2);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {title && (
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-700">{title}</h3>
        </div>
      )}

      <ReactDiffViewer
        oldValue={oldCode}
        newValue={newCode}
        splitView={true}
        compareMethod={DiffMethod.WORDS}
        leftTitle="Original Policy"
        rightTitle="Updated Policy"
        styles={{
          variables: {
            dark: {
              diffViewerBackground: '#1e1e1e',
              addedBackground: '#044B53',
              addedColor: 'white',
              removedBackground: '#632F34',
              removedColor: 'white',
              wordAddedBackground: '#055d67',
              wordRemovedBackground: '#7d383f',
              addedGutterBackground: '#034148',
              removedGutterBackground: '#632b30',
              gutterBackground: '#2c2c2c',
              gutterBackgroundDark: '#262626',
              highlightBackground: '#2a3f5f',
              highlightGutterBackground: '#2d4566',
            },
          },
          line: {
            padding: '10px 2px',
            fontSize: '13px',
            fontFamily: 'ui-monospace, monospace',
          },
        }}
        useDarkTheme={false}
      />
    </div>
  );
}
