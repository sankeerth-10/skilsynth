import React from 'react';

export function Logo({ className = "w-8 h-8", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M50 95 L15 75 L15 35 L50 55 L85 35 L85 75 Z" fill="#000" />
      <path d="M15 35 L50 15 L85 35 L50 55 Z" fill="#0F0F0F" />
      <path d="M15 75 L50 95 L50 65 L15 45 Z" fill="#FBBF24" />
      <path d="M15 35 L50 55 L50 65 L15 45 Z" fill="#EF4444" />
      <path d="M85 75 L50 95 L50 65 L85 45 Z" fill="#059669" />
      <path d="M85 35 L50 55 L50 65 L85 45 Z" fill="#10B981" />
      <path d="M15 35 L28 27 L50 40 L37 47 Z" fill="#0284C7" />
      <path d="M85 35 L72 27 L50 40 L63 47 Z" fill="#0284C7" />
      <path d="M50 40 L28 27 L50 15 L72 27 Z" fill="#38BDF8" />
      <circle cx="50" cy="22" r="14" fill="#3B82F6" />
      <g transform="translate(0, -6)">
        <path d="M50 52 L42 57 L50 62 L58 57 Z" fill="#FBBF24" />
        <path d="M42 57 L42 66 L50 71 L50 62 Z" fill="#EF4444" />
        <path d="M58 57 L58 66 L50 71 L50 62 Z" fill="#F59E0B" />
      </g>
    </svg>
  );
}
