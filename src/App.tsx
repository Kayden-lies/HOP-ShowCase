/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { MatrixSettings } from './types';
import { CubeMatrixCanvas } from './components/CubeMatrixCanvas';

const SETTINGS: MatrixSettings = {
  gridCols: 244, // 144 + 50 on left + 50 on right
  gridRows: 200, // 80 + 60 on top + 60 on bottom
  cubeSize: 0.165,
  cubeGap: 0.009,
};

export default function App() {
  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#030407] select-none">
      <div className="absolute top-4 right-4 z-20">
        <a
          href="./showcase/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-xs font-mono text-zinc-200 transition-colors backdrop-blur-md shadow-md"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          <span>Project Showcase Portal</span>
          <span className="text-zinc-500">→</span>
        </a>
      </div>
      <CubeMatrixCanvas settings={SETTINGS} />
    </main>
  );
}
