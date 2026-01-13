import React, { useState, useEffect, useRef } from 'react';
import { TEXTS, Language } from '../types';
import { soundSystem } from '../services/sound';

interface TerminalInputProps {
  charLimit: number;
  onSubmit: (text: string) => void;
  disabled: boolean;
  language: Language;
  timerDuration: number | null;
}

const TerminalInput: React.FC<TerminalInputProps> = ({ charLimit, onSubmit, disabled, language, timerDuration }) => {
  const [input, setInput] = useState('');
  const [shake, setShake] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<number | null>(null);
  const t = TEXTS[language];

  // Handle Timer Duration changes
  useEffect(() => {
    if (timerDuration !== null && !disabled) {
      setTimeLeft(timerDuration);
    } else {
      setTimeLeft(null);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [timerDuration, disabled]);

  // Timer Tick Logic
  useEffect(() => {
    if (timeLeft !== null && timeLeft > 0 && !disabled) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft(prev => {
          if (prev === null || prev <= 0) return 0;
          return prev - 0.1; // Tick every 100ms for smooth bar
        });
      }, 100);
    } else if (timeLeft !== null && timeLeft <= 0 && !disabled) {
      // Time expired
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      // Force submit with visual cue
      setShake(true);
      setTimeout(() => setShake(false), 300);
      onSubmit(input.trim());
      setInput('');
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timeLeft, disabled, input, onSubmit]);

  useEffect(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [disabled]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.length <= charLimit) {
      setInput(val);
    } else {
      setShake(true);
      setTimeout(() => setShake(false), 300);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && input.trim() && !disabled) {
      soundSystem.playSubmit();
      onSubmit(input.trim());
      setInput('');
    }
  };

  const handleWait = () => {
    if (!disabled) {
      soundSystem.playSubmit();
      onSubmit("...");
      setInput('');
    }
  };

  const remaining = charLimit - input.length;
  const isCritical = remaining < 5;
  const isTimerActive = timeLeft !== null;

  return (
    <div className="w-full max-w-2xl mx-auto mt-6 relative z-10">
      <div className={`relative transition-all duration-200 ${disabled ? 'opacity-50 grayscale' : 'opacity-100'}`}>
        {/* Timer Bar */}
        {isTimerActive && timeLeft !== null && timerDuration && (
          <div className="absolute -top-10 left-0 right-0 h-1 bg-gray-800 overflow-hidden">
            <div 
              className="h-full bg-red-600 transition-all duration-100 ease-linear animate-pulse"
              style={{ width: `${(timeLeft / timerDuration) * 100}%` }}
            />
            <div className="absolute top-2 right-0 text-red-500 text-xs font-mono font-bold">
               {timeLeft.toFixed(1)}s
            </div>
            <div className="absolute top-2 left-0 text-red-500 text-xs font-mono font-bold animate-pulse">
               WARNING: {t.timerActive}
            </div>
          </div>
        )}

        {!isTimerActive && (
          <div className="absolute -top-6 left-0 text-xs font-mono tracking-widest text-gray-500 uppercase">
            {t.voiceCapacity}
          </div>
        )}
        
        <div className={`relative flex items-center border-b-2 ${
            isTimerActive ? 'border-red-600' : isCritical ? 'border-red-500' : 'border-gray-600'
          } bg-black/50 backdrop-blur-sm pb-2 pt-2 px-2 transition-colors duration-300`}>
          
          <span className={`mr-2 font-mono text-lg ${isTimerActive ? 'text-red-500 animate-pulse' : 'text-gray-400'}`}>{'>'}</span>
          
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className={`w-full bg-transparent border-none outline-none font-mono text-lg text-white placeholder-gray-700 ${shake ? 'animate-pulse' : ''}`}
            placeholder={disabled ? t.processing : isTimerActive ? "HURRY..." : t.placeholder}
            autoComplete="off"
            autoFocus
          />
          
          <div className={`ml-4 font-mono text-sm font-bold ${
            remaining === 0 ? 'text-red-500' : isCritical ? 'text-yellow-500' : 'text-gray-400'
          }`}>
            {input.length}/{charLimit}
          </div>
        </div>
        
        <div className="mt-1 flex justify-between items-start text-xs text-gray-600 font-mono">
          <div className="flex flex-col gap-1">
             <span>{t.actionRequired}</span>
             {/* Observe Button */}
             <button 
                onClick={handleWait}
                disabled={disabled || isTimerActive}
                className={`text-left text-xs font-mono mt-1 ${
                  disabled || isTimerActive 
                    ? 'text-gray-700 cursor-not-allowed' 
                    : 'text-gray-400 hover:text-emerald-500 underline decoration-gray-700 hover:decoration-emerald-500 underline-offset-4 transition-colors'
                }`}
             >
                [{t.waitButton}]
             </button>
          </div>

          <span className={`${isCritical || isTimerActive ? 'animate-pulse text-red-500' : ''}`}>
            {isTimerActive ? t.timerActive : remaining === 0 ? t.capacityReached : t.systemStable}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TerminalInput;