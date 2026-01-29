import { Shield, Lock, Award, CheckCircle } from "lucide-react";

export default function TrustBadges() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
      {/* SSL Secure */}
      <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 px-3 py-1.5 rounded-full">
        <Lock className="w-4 h-4 text-green-400" />
        <span className="text-green-300 text-xs font-medium">256-bit SSL</span>
      </div>

      {/* Privacy First */}
      <div className="flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/30 px-3 py-1.5 rounded-full">
        <Shield className="w-4 h-4 text-cyan-400" />
        <span className="text-cyan-300 text-xs font-medium">HIPAA-Inspired Privacy</span>
      </div>

      {/* Verified */}
      <div className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 px-3 py-1.5 rounded-full">
        <CheckCircle className="w-4 h-4 text-purple-400" />
        <span className="text-purple-300 text-xs font-medium">Verified Secure</span>
      </div>

      {/* Satisfaction */}
      <div className="flex items-center gap-2 bg-pink-500/10 border border-pink-500/30 px-3 py-1.5 rounded-full">
        <Award className="w-4 h-4 text-pink-400" />
        <span className="text-pink-300 text-xs font-medium">Cancel Anytime</span>
      </div>
    </div>
  );
}
