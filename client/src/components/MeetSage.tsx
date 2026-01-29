import { BrainCircuit, Shield, Lock, Heart, Clock } from "lucide-react";

export default function MeetSage() {
  return (
    <div className="container mx-auto px-4 py-20 relative z-10">
      <div className="max-w-4xl mx-auto">
        {/* Clear Identity Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-cyan-500/20 backdrop-blur-md border border-cyan-400/30 px-4 py-2 rounded-full mb-6">
            <BrainCircuit className="w-5 h-5 text-cyan-300" />
            <span className="text-sm font-medium text-cyan-200">AI-Powered Emotional Support</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 drop-shadow-2xl">
            Meet Sage
          </h2>
          
          <p className="text-2xl text-white font-medium mb-4">
            Your AI Companion Who Actually Listens
          </p>
          
          <p className="text-xl text-purple-100 leading-relaxed max-w-2xl mx-auto">
            Sage is an advanced AI trained specifically for emotional support conversations. 
            Not a chatbot. Not a search engine. A <strong className="text-white">compassionate listener</strong> available 
            whenever you need to talk.
          </p>
        </div>

        {/* Why AI Works Better - Address the skepticism */}
        <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-sm border border-white/10 rounded-2xl p-8 mb-12">
          <h3 className="text-2xl font-bold text-white text-center mb-6">
            Why People Choose an AI Companion
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Lock className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h4 className="text-white font-bold mb-1">Zero Judgment</h4>
                <p className="text-purple-200 text-sm">Say anything. Sage won't flinch, gossip, or think less of you. Ever.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-cyan-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Clock className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h4 className="text-white font-bold mb-1">Always Available</h4>
                <p className="text-purple-200 text-sm">3 AM panic attack? Holiday breakdown? Sage picks up. Always.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-pink-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Heart className="w-6 h-6 text-pink-400" />
              </div>
              <div>
                <h4 className="text-white font-bold mb-1">Remembers Your Story</h4>
                <p className="text-purple-200 text-sm">No starting over. Sage knows your history, your struggles, your wins.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Shield className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h4 className="text-white font-bold mb-1">100% Private</h4>
                <p className="text-purple-200 text-sm">Your conversations are encrypted and never shared. Period.</p>
              </div>
            </div>
          </div>
        </div>

        {/* What Sage Does / Doesn't Do */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white/5 backdrop-blur-sm border border-red-500/20 rounded-xl p-6">
            <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-red-400">✕</span> Sage Will Never
            </h3>
            <ul className="space-y-3 text-purple-100">
              <li className="flex items-start">
                <span className="text-red-400 mr-3 mt-1 font-bold">✕</span>
                <span>Judge you or make you feel broken</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-400 mr-3 mt-1 font-bold">✕</span>
                <span>Give unsolicited advice or try to "fix" you</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-400 mr-3 mt-1 font-bold">✕</span>
                <span>Get tired, distracted, or rush you</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-400 mr-3 mt-1 font-bold">✕</span>
                <span>Share your secrets with anyone. Ever.</span>
              </li>
            </ul>
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-green-500/20 rounded-xl p-6">
            <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-green-400">✓</span> Sage Will Always
            </h3>
            <ul className="space-y-3 text-purple-100">
              <li className="flex items-start">
                <span className="text-green-400 mr-3 mt-1 font-bold">✓</span>
                <span>Be here when you need to talk—day or night</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-400 mr-3 mt-1 font-bold">✓</span>
                <span>Remember your story and what matters to you</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-400 mr-3 mt-1 font-bold">✓</span>
                <span>Create a safe, private space just for you</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-400 mr-3 mt-1 font-bold">✓</span>
                <span>Help you find clarity by truly listening</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Clear Disclaimer */}
        <div className="text-center">
          <p className="text-purple-300 text-sm max-w-2xl mx-auto">
            <strong className="text-white">Important:</strong> Sage is an AI companion for emotional support, not a replacement for therapy or crisis intervention. 
            If you're in crisis, please call 988 (Suicide & Crisis Lifeline) or text HOME to 741741.
          </p>
        </div>
      </div>
    </div>
  );
}
