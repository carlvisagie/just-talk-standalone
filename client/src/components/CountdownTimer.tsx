import { useState, useEffect } from "react";
import { Clock, Zap } from "lucide-react";

interface CountdownTimerProps {
  endDate?: Date;
  className?: string;
}

export default function CountdownTimer({ 
  endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default: 7 days from now
  className = "" 
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = endDate.getTime() - Date.now();
      
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [endDate]);

  const TimeBlock = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-2 min-w-[60px]">
        <span className="text-2xl md:text-3xl font-bold text-white tabular-nums">
          {value.toString().padStart(2, '0')}
        </span>
      </div>
      <span className="text-xs text-purple-300 mt-1 uppercase tracking-wide">{label}</span>
    </div>
  );

  return (
    <div className={`text-center ${className}`}>
      {/* Urgency Header */}
      <div className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500/30 to-red-500/30 backdrop-blur-md border border-orange-400/40 px-4 py-2 rounded-full mb-4 animate-pulse">
        <Zap className="w-4 h-4 text-orange-300" />
        <span className="text-orange-200 font-bold text-sm">LAUNCH SPECIAL ENDS SOON</span>
        <Zap className="w-4 h-4 text-orange-300" />
      </div>
      
      {/* Timer Display */}
      <div className="flex items-center justify-center gap-2 md:gap-4">
        <TimeBlock value={timeLeft.days} label="Days" />
        <span className="text-2xl text-white/50 font-bold">:</span>
        <TimeBlock value={timeLeft.hours} label="Hours" />
        <span className="text-2xl text-white/50 font-bold">:</span>
        <TimeBlock value={timeLeft.minutes} label="Mins" />
        <span className="text-2xl text-white/50 font-bold hidden md:block">:</span>
        <div className="hidden md:block">
          <TimeBlock value={timeLeft.seconds} label="Secs" />
        </div>
      </div>
      
      {/* Scarcity Message */}
      <p className="text-orange-200 text-sm mt-4 font-medium">
        🔥 <strong>50% off first month</strong> — Only available during launch
      </p>
    </div>
  );
}
