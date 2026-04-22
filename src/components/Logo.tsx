import React from 'react';
import { Car } from 'lucide-react';
import { cn } from '../lib/utils';

interface LogoProps {
  className?: string;
  iconSize?: number;
  textSize?: string;
  showIcon?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ 
  className, 
  iconSize = 32, 
  textSize = "text-2xl",
  showIcon = true 
}) => {
  return (
    <div className={cn("flex items-center gap-3 group select-none", className)}>
      {showIcon && (
        <div className="relative">
          <div className="absolute -inset-1 bg-indigo-500/20 rounded-xl blur-sm group-hover:bg-indigo-500/30 transition-all" />
          <div className="relative w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 group-hover:rotate-3 transition-all">
            <Car className="text-white" size={iconSize} />
          </div>
        </div>
      )}
      <div className="flex flex-col -space-y-1">
        <span className={cn(
          "font-display font-black tracking-tight text-gray-900 leading-none",
          textSize
        )}>
          Carpool<span className="text-indigo-600">Connect</span>
        </span>
        <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-[0.2em] ml-0.5 opacity-80">
          Viaja Inteligente
        </span>
      </div>
    </div>
  );
};
