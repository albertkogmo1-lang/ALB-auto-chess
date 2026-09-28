import React from 'react';
import { Commander, Color } from '../game/types';

interface CommanderPanelProps {
  commanders: Commander[];
  color: Color;
  selectedCommander: Commander | null;
  onSelect?: (commander: Commander) => void;
  disabled?: boolean;
  isDrafting?: boolean;
}

const CommanderPanel: React.FC<CommanderPanelProps> = ({
  commanders,
  color,
  selectedCommander,
  onSelect,
  disabled = false,
  isDrafting = false,
}) => {
  const borderColor = color === 'w' ? 'border-blue-400' : 'border-red-400';
  const bgColor = color === 'w' ? 'bg-blue-900/30' : 'bg-red-900/30';
  const labelColor = color === 'w' ? 'text-blue-300' : 'text-red-300';

  return (
    <div className={`${bgColor} rounded-lg p-3 border ${borderColor}`}>
      <div className={`text-sm font-bold ${labelColor} mb-2 uppercase tracking-wider`}>
        {color === 'w' ? '⬜ White' : '⬛ Black'} Commanders
      </div>
      <div className="space-y-2">
        {commanders.map((cmd) => {
          const isSelected = selectedCommander?.id === cmd.id;
          const isUsed = cmd.used;
          
          return (
            <div
              key={cmd.id}
              onClick={() => {
                if (!isUsed && !disabled && isDrafting && onSelect) {
                  onSelect(cmd);
                }
              }}
              className={`
                p-2 rounded-lg border transition-all duration-200
                ${isUsed ? 'opacity-40 border-gray-600 bg-gray-800/50' : ''}
                ${isSelected ? 'border-yellow-400 bg-yellow-900/30 ring-2 ring-yellow-400/50 scale-105' : ''}
                ${!isUsed && isDrafting && !disabled ? 'cursor-pointer hover:border-yellow-400 hover:bg-gray-700/50' : ''}
                ${!isDrafting && !isSelected ? 'border-gray-600 bg-gray-800/30' : ''}
              `}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{cmd.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-bold truncate ${isUsed ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
                    {cmd.name}
                  </div>
                  <div className="text-[10px] text-gray-400">{cmd.title}</div>
                </div>
                {isSelected && (
                  <span className="text-yellow-400 text-xs font-bold">PICKED</span>
                )}
                {isUsed && !isSelected && (
                  <span className="text-gray-500 text-xs">USED</span>
                )}
              </div>
              {!isDrafting && (
                <div className="text-[10px] text-gray-500 mt-1 italic">{cmd.description}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CommanderPanel;
