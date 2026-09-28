import React from 'react';

interface EvalBarProps {
  evaluation: number; // -100 to 100
  height?: number;
}

const EvalBar: React.FC<EvalBarProps> = ({ evaluation, height = 400 }) => {
  // Convert evaluation to percentage (50% = equal)
  const whitePercent = 50 + (evaluation / 2);
  const clampedPercent = Math.max(2, Math.min(98, whitePercent));
  
  const evalText = evaluation > 0 
    ? `+${(evaluation / 10).toFixed(1)}` 
    : evaluation < 0 
      ? (evaluation / 10).toFixed(1)
      : '0.0';

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-xs font-bold text-gray-300">{evalText}</div>
      <div 
        className="relative w-6 rounded overflow-hidden border border-gray-600 shadow-inner"
        style={{ height: `${height}px` }}
      >
        {/* Black section (top) */}
        <div 
          className="absolute top-0 left-0 right-0 bg-gray-800 transition-all duration-500 ease-out"
          style={{ height: `${100 - clampedPercent}%` }}
        />
        {/* White section (bottom) */}
        <div 
          className="absolute bottom-0 left-0 right-0 bg-white transition-all duration-500 ease-out"
          style={{ height: `${clampedPercent}%` }}
        />
        {/* Center line */}
        <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-400 opacity-50" />
        {/* Eval number overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-[10px] font-bold ${clampedPercent > 50 ? 'text-gray-800' : 'text-white'}`}>
            {Math.abs(evaluation / 10).toFixed(1)}
          </span>
        </div>
      </div>
      <div className="flex gap-1 text-[10px]">
        <span className="text-white font-bold">W</span>
        <span className="text-gray-500">|</span>
        <span className="text-gray-400 font-bold">B</span>
      </div>
    </div>
  );
};

export default EvalBar;
