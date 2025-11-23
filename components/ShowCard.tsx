
import React from 'react';
import { Show } from '../types';

interface ShowCardProps {
  data: Show;
  isActive: boolean;
  onClick: () => void;
}

export const ShowCard: React.FC<ShowCardProps> = ({ data, isActive, onClick }) => {
  
  // Calculate total duration from segments
  const totalDuration = data.segments.reduce((acc, seg) => acc + seg.duration, 0);

  return (
    <div 
      onClick={onClick}
      className={`
        group relative flex flex-col p-4 rounded-3xl transition-all duration-300 cursor-pointer
        border border-white/5 hover:border-white/10
        ${isActive ? 'bg-white/10 shadow-[0_0_30px_rgba(255,255,255,0.05)]' : 'bg-[#121212]/60 hover:bg-[#1A1A1A]'}
      `}
    >
      {/* Cover Image Container */}
      <div className="relative aspect-square rounded-2xl overflow-hidden mb-4 bg-gray-900">
        <img 
          src={data.coverUrl} 
          alt={data.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        
        {/* Hover Overlay */}
        <div className={`
          absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center transition-opacity duration-300
          ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
        `}>
           <span className="px-4 py-2 bg-white text-black rounded-full font-bold text-sm transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
             Listen Now
           </span>
        </div>
      </div>

      {/* Metadata */}
      <div className="flex flex-col gap-1">
        <h3 className="text-white font-bold text-lg leading-tight group-hover:text-cyan-50 transition-colors line-clamp-1">
          {data.title}
        </h3>
        
        <div className="text-sm mt-1 mb-3 flex items-center gap-2">
          <span className="text-gray-400 truncate max-w-[150px]">{data.hosts}</span>
          <span className="text-gray-600">•</span>
          <span className="text-gray-500">{Math.ceil(totalDuration / 60)} min</span>
        </div>

        {/* Footer Date */}
        <div className="mt-auto pt-3 border-t border-white/5 flex justify-between items-center text-xs text-gray-500 font-mono">
          <span>{data.date}</span>
          <span className="bg-white/10 px-1.5 py-0.5 rounded">{data.segments.length} segs</span>
        </div>
      </div>
      
      {/* Active Border Glow */}
      {isActive && (
        <div className="absolute inset-0 rounded-3xl border border-white/20 pointer-events-none"></div>
      )}
    </div>
  );
};
