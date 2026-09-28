import React from 'react';

interface PhaseTimerProps {
  timeLeft: number;
  maxTime: number;
  phaseName: string;
}

const PhaseTimer: React.FC<PhaseTimerProps> = ({ timeLeft, maxTime, phaseName }) => {
  const percent = (timeLeft / maxTime) * 100;
  const isUrgent = timeLeft < 10;
  const seconds = Math.ceil(timeLeft);
  
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">{phaseName}</span>
        <span className={`text-lg font-mono font-bold ${isUrgent ? 'text-red-400 animate-pulse' : 'text-white'}`}>
          {seconds}s
        </span>
      </div>
      <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-linear ${
            isUrgent ? 'bg-red-500' : percent > 50 ? 'bg-green-500' : 'bg-yellow-500'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};

export default PhaseTimer;
