import React from 'react';
import ShowcaseHeader from '../components/showcase/ShowcaseHeader';
import ShowcaseForm from '../components/showcase/ShowcaseForm';

export default function Showcase() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-zinc-800 selection:text-white flex flex-col justify-between">
      {/* Main Content Area */}
      <main className="flex-1">
        <ShowcaseHeader />
        <ShowcaseForm />
      </main>

      {/* Community Footer */}
      <footer className="w-full border-t border-zinc-800/80 bg-zinc-950 py-6 px-4 sm:px-6">
        <div className="w-full max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500">
          <div>
            <span>AIDN × Genesis</span>
            <span className="mx-2 text-zinc-700">•</span>
            <span>Hackers Occupied Pune</span>
          </div>

          <div className="flex items-center gap-4 text-zinc-400">
            <a 
              href="/" 
              className="hover:text-zinc-200 transition-colors"
            >
              aidn.co.in
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
