import { useEffect, useState, useRef } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: number;
  suffix?: string;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  accentColor: string;
  delay?: number;
  onClick?: () => void;
}

export function StatsCard({
  title,
  value,
  suffix = '',
  change,
  changeLabel = '较上周',
  icon,
  accentColor,
  delay = 0,
  onClick
}: StatsCardProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const duration = 1000;
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  const getTrendIcon = () => {
    if (change === undefined) return null;
    if (change > 0) return <TrendingUp className="w-3 h-3" />;
    if (change < 0) return <TrendingDown className="w-3 h-3" />;
    return <Minus className="w-3 h-3" />;
  };

  const getTrendColor = () => {
    if (change === undefined) return '';
    if (change > 0) return 'text-green-400';
    if (change < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  return (
    <Card 
      ref={cardRef}
      className={cn(
        "relative bg-card border-border p-5 overflow-hidden hover-lift cursor-pointer",
        "transition-all duration-500",
        "opacity-100 translate-y-0"
      )}
      onClick={onClick}
    >
      {/* 顶部强调条 */}
      <div 
        className="absolute top-0 left-0 right-0 h-1"
        style={{ backgroundColor: accentColor }}
      />
      
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-white">
              {displayValue.toLocaleString()}
            </span>
            {suffix && (
              <span className="text-lg text-muted-foreground">{suffix}</span>
            )}
          </div>
          
          {change !== undefined && (
            <div className={cn("flex items-center gap-1 mt-2 text-xs", getTrendColor())}>
              {getTrendIcon()}
              <span>{Math.abs(change)}%</span>
              <span className="text-muted-foreground ml-1">{changeLabel}</span>
            </div>
          )}
        </div>
        
        <div 
          className="p-3 rounded-lg"
          style={{ backgroundColor: `${accentColor}20` }}
        >
          <div style={{ color: accentColor }}>{icon}</div>
        </div>
      </div>
    </Card>
  );
}
