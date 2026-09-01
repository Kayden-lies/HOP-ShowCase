import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import logoA from '../../assets/Logo_A.png';

export default function ShowcaseHeader() {
  return (
    <header className="w-full pt-8 sm:pt-12 pb-6 sm:pb-8 text-zinc-100">
      {/* Top Brand & Navigation Bar */}
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 mb-8 sm:mb-12 flex items-center justify-between">
        <a
          href="/"
          id="nav-aidn-home-link"
          className="group inline-flex items-center gap-3.5 text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          <img
            src={logoA}
            alt="AIDN Logo"
            className="h-[60px] sm:h-[72px] w-auto object-contain transition-opacity group-hover:opacity-90"
          />
          <div className="flex flex-col text-left">
            <span className="font-semibold text-base tracking-tight text-zinc-100 leading-tight">
              AIDN Pune
            </span>
            <span className="text-xs text-zinc-400 font-mono flex items-center gap-1 mt-0.5">
              <ArrowLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" />
              aidn.co.in
            </span>
          </div>
        </a>

        {/* Official Initiative Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse shrink-0" />
          <span className="text-zinc-400">Initiative:</span>
          <span className="font-semibold text-zinc-100">AIDN × Genesis</span>
        </div>
      </div>

      {/* Hero Content Section */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-3xl mx-auto px-4 sm:px-6"
      >
        <div className="mb-2 text-xs font-mono font-medium uppercase tracking-widest text-zinc-400">
          Hackers Occupied Pune
        </div>

        <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-zinc-100 mb-3">
          Project Showcase Portal
        </h1>

        <p className="text-base sm:text-lg text-zinc-300 font-medium leading-relaxed mb-3">
          Hackathon may be over, but what you built deserves to live beyond the event.
        </p>

        <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-2xl">
          Submit your project details, prototype, documentation, and demo below. The AIDN × Genesis team will review submissions to archive and feature standout projects across our official platform and community channels.
        </p>
      </motion.section>
    </header>
  );
}
