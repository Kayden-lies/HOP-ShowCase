import React from 'react';
import { Github, ExternalLink, Video, FileText, Users, Code2 } from 'lucide-react';

export interface ProjectCardProps {
  projectName: string;
  teamName: string;
  description: string;
  organization?: string;
  techStack?: string;
  demoUrl?: string;
  repositoryUrl?: string;
  documentationUrl?: string;
  videoUrl?: string;
  highlighted?: boolean;
}

export default function ProjectCard({
  projectName,
  teamName,
  description,
  organization,
  techStack,
  demoUrl,
  repositoryUrl,
  documentationUrl,
  videoUrl,
  highlighted = false,
}: ProjectCardProps) {
  // Parse tech stack tags if comma-separated
  const tags = techStack
    ? techStack
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
    : [];

  return (
    <article
      className={`group relative rounded-2xl transition-all duration-200 overflow-hidden flex flex-col justify-between ${
        highlighted
          ? 'bg-zinc-900/90 border border-blue-500/50 shadow-xl shadow-blue-950/30'
          : 'bg-zinc-900/60 hover:bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700'
      } p-6`}
    >
      <div>
        {/* Card Header Info */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 text-xs text-blue-400 font-mono">
            <Users className="w-3.5 h-3.5" />
            <span className="font-semibold">{teamName}</span>
          </div>
          {organization && (
            <span className="text-[10px] font-mono text-zinc-500 bg-zinc-950 border border-zinc-800/80 px-2 py-0.5 rounded truncate max-w-[150px]">
              {organization}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-zinc-100 group-hover:text-blue-400 transition-colors tracking-tight mb-2">
          {projectName}
        </h3>

        {/* Description */}
        <p className="text-sm text-zinc-400 leading-relaxed line-clamp-3 mb-4">
          {description}
        </p>

        {/* Tech Stack Pills */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-6">
            {tags.slice(0, 4).map((tag, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-zinc-950 text-zinc-300 border border-zinc-800"
              >
                <Code2 className="w-2.5 h-2.5 text-zinc-500" />
                {tag}
              </span>
            ))}
            {tags.length > 4 && (
              <span className="text-[11px] font-mono px-1.5 py-0.5 rounded-md bg-zinc-950 text-zinc-500 border border-zinc-800">
                +{tags.length - 4}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Action Links */}
      <div className="flex items-center gap-2 pt-4 border-t border-zinc-800/70">
        {repositoryUrl && (
          <a
            href={repositoryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-800 px-3 py-1.5 rounded-lg border border-zinc-700/60 transition-colors"
          >
            <Github className="w-3.5 h-3.5" />
            <span>Code</span>
          </a>
        )}

        {demoUrl && (
          <a
            href={demoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-950/60 hover:bg-blue-950 px-3 py-1.5 rounded-lg border border-blue-800/60 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Demo</span>
          </a>
        )}

        {videoUrl && (
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800/50 hover:bg-zinc-800 px-2.5 py-1.5 rounded-lg transition-colors"
            title="Video Walkthrough"
          >
            <Video className="w-3.5 h-3.5" />
          </a>
        )}

        {documentationUrl && (
          <a
            href={documentationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800/50 hover:bg-zinc-800 px-2.5 py-1.5 rounded-lg transition-colors"
            title="Documentation"
          >
            <FileText className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </article>
  );
}
