import { useState, useEffect } from "react";
import { Users, MessageCircle, Star, TrendingUp } from "lucide-react";

export default function SocialProofBanner() {
  const [activeUsers, setActiveUsers] = useState(47);
  const [recentSignups, setRecentSignups] = useState(12);

  // Simulate real-time activity (in production, this would be real data)
  useEffect(() => {
    const interval = setInterval(() => {
      // Fluctuate active users between 35-65
      setActiveUsers(prev => {
        const change = Math.random() > 0.5 ? 1 : -1;
        const newValue = prev + change;
        return Math.max(35, Math.min(65, newValue));
      });
      
      // Occasionally bump signups
      if (Math.random() > 0.9) {
        setRecentSignups(prev => prev + 1);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-gradient-to-r from-green-500/10 via-cyan-500/10 to-green-500/10 backdrop-blur-sm border-y border-white/10 py-4">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12 text-sm">
          {/* Active Now */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <div className="absolute inset-0 w-2 h-2 bg-green-400 rounded-full animate-ping" />
            </div>
            <span className="text-green-300 font-medium">
              <strong className="text-white">{activeUsers}</strong> people talking right now
            </span>
          </div>

          {/* Total Conversations */}
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-cyan-400" />
            <span className="text-purple-200">
              <strong className="text-white">50,000+</strong> conversations held
            </span>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-2">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3 h-3 text-yellow-400 fill-current" />
              ))}
            </div>
            <span className="text-purple-200">
              <strong className="text-white">4.9/5</strong> from users
            </span>
          </div>

          {/* Recent Signups */}
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-pink-400" />
            <span className="text-purple-200">
              <strong className="text-white">{recentSignups}</strong> joined today
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
