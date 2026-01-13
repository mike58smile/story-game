import React from 'react';
import { Language, TEXTS } from '../types';

interface StatusPanelProps {
  inventory: string[];
  characters: string[];
  language: Language;
}

const StatusPanel: React.FC<StatusPanelProps> = ({ inventory, characters, language }) => {
  const t = TEXTS[language];
  
  if (inventory.length === 0 && characters.length === 0) return null;

  return (
    <div className="hidden lg:block fixed left-8 top-32 w-64 space-y-8 animate-fade-in">
      {inventory.length > 0 && (
        <div>
          <h3 className="text-xs font-mono tracking-widest text-emerald-700 mb-2 border-b border-emerald-900/30 pb-1">
            {t.inventory}
          </h3>
          <ul className="space-y-1">
            {inventory.map((item, idx) => (
              <li key={idx} className="text-sm font-mono text-gray-400 hover:text-white transition-colors">
                - {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {characters.length > 0 && (
        <div>
          <h3 className="text-xs font-mono tracking-widest text-purple-700 mb-2 border-b border-purple-900/30 pb-1">
            {t.characters}
          </h3>
          <ul className="space-y-1">
            {characters.map((char, idx) => (
              <li key={idx} className="text-sm font-mono text-gray-400 hover:text-white transition-colors">
                - {char}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default StatusPanel;
