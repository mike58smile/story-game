import React, { useEffect, useRef } from 'react';
import { ChatMessage } from '../types';

interface GameDisplayProps {
  history: ChatMessage[];
}

const GameDisplay: React.FC<GameDisplayProps> = ({ history }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-8 space-y-12 max-w-2xl mx-auto w-full scroll-smooth">
      {history.map((msg, idx) => (
        <div key={idx} className={`animate-fade-in-up transition-all duration-500`}>
          {/* Text Content */}
          <div className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <span className={`text-xs uppercase tracking-widest ${msg.role === 'user' ? 'text-gray-500' : 'text-emerald-700'}`}>
              {msg.role === 'user' ? 'You' : 'Narrator'}
            </span>
            <p className={`font-mono leading-relaxed text-sm md:text-base p-4 rounded-sm border ${
              msg.role === 'user' 
                ? 'bg-zinc-900 border-zinc-800 text-zinc-300 max-w-[80%]' 
                : 'bg-black border-zinc-700 text-zinc-100 shadow-lg w-full'
            }`}>
              {msg.text}
            </p>
          </div>

          {/* Image Content (Only for model) */}
          {msg.role === 'model' && (
            <div className="mt-6 mb-2">
              <div className="relative w-full aspect-video md:aspect-[2/1] overflow-hidden rounded-sm border border-zinc-800 bg-zinc-950 flex items-center justify-center">
                {msg.imageUrl ? (
                  <img 
                    src={msg.imageUrl} 
                    alt="Scene visualization" 
                    className="w-full h-full object-cover grayscale contrast-125 hover:contrast-100 transition-all duration-700 animate-fade-in" 
                  />
                ) : msg.isImageLoading ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-2 border-emerald-900 border-t-emerald-500 rounded-full animate-spin"></div>
                    <span className="text-xs font-mono text-emerald-900 animate-pulse">Visualizing...</span>
                  </div>
                ) : (
                  <span className="text-zinc-800 text-xs font-mono">No visual data</span>
                )}
                
                {/* Overlay vignette effect */}
                <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.6)_100%)]"></div>
              </div>
            </div>
          )}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
};

export default GameDisplay;