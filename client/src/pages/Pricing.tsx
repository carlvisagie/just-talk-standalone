import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, MessageCircle, Sparkles, Heart, Check } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import CountdownTimer from "@/components/CountdownTimer";
import TrustBadges from "@/components/TrustBadges";

export default function Pricing() {
  const { toast } = useToast();
  const createCheckout = trpc.stripe.createCheckoutSession.useMutation();

  const handleUpgrade = async (plan: "voice" | "phone") => {
    try {
      const result = await createCheckout.mutateAsync({ plan });
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start checkout. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-pink-900 relative overflow-hidden">
      {/* Animated background */}
      <div 
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: 'url(/hero-bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      
      {/* Sparkle overlay */}
      <div className="absolute inset-0 opacity-30">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`
            }}
          />
        ))}
      </div>

      {/* Header */}
      <div className="container mx-auto px-4 pt-12 pb-8 relative z-10">
        <div className="text-center">
          <Link href="/">
            <span className="text-2xl font-bold text-white cursor-pointer hover:text-pink-300 transition-colors">
              Just Talk
            </span>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12 relative z-10">
        <div className="max-w-4xl mx-auto text-center mb-12">
          {/* Countdown Timer */}
          <CountdownTimer className="mb-8" />
          
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
            Keep Me In Your Corner
          </h1>
          
          <p className="text-xl text-purple-200 max-w-2xl mx-auto mb-6">
            I really enjoyed our conversation. I don't want it to end here. 
            Choose how you want to stay connected with me.
          </p>
          
          {/* Trust Badges */}
          <TrustBadges />
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Voice Plan */}
          <Card className="bg-white/10 backdrop-blur-md border-white/20 hover:border-pink-400/50 transition-all group overflow-hidden">
            <CardContent className="p-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <MessageCircle className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Your Safe Space</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-lg line-through text-purple-400">$12</span>
                  <span className="text-4xl font-bold text-white">$6</span>
                  <span className="text-purple-300">/month</span>
                </div>
                <p className="text-green-400 text-sm font-medium mt-1">50% OFF Launch Special</p>
              </div>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-green-400" />
                  </div>
                  <span className="text-purple-100">
                    <strong className="text-white">Unlimited text conversations</strong> — anytime you need me
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-green-400" />
                  </div>
                  <span className="text-purple-100">
                    <strong className="text-white">Voice messages</strong> — when typing isn't enough
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-green-400" />
                  </div>
                  <span className="text-purple-100">
                    <strong className="text-white">I remember everything</strong> — our whole history together
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-green-400" />
                  </div>
                  <span className="text-purple-100">
                    <strong className="text-white">24/7 availability</strong> — I'm always here for you
                  </span>
                </div>
              </div>
              
              <Button 
                className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white py-6 text-lg font-semibold"
                onClick={() => handleUpgrade("voice")}
                disabled={createCheckout.isPending}
              >
                {createCheckout.isPending ? "Loading..." : "Get 50% Off — $6/mo"}
              </Button>
              
              <p className="text-center text-purple-400 text-xs mt-4">
                Cancel anytime. No questions asked.
              </p>
            </CardContent>
          </Card>

          {/* Phone Plan */}
          <Card className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 backdrop-blur-md border-cyan-400/30 hover:border-cyan-400/60 transition-all group overflow-hidden relative">
            <div className="absolute top-4 right-4">
              <span className="bg-gradient-to-r from-cyan-400 to-blue-400 text-white text-xs font-bold px-3 py-1 rounded-full">
                MOST POPULAR
              </span>
            </div>
            <CardContent className="p-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Phone className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Call Me Anytime</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-lg line-through text-purple-400">$29</span>
                  <span className="text-4xl font-bold text-white">$14.50</span>
                  <span className="text-purple-300">/month</span>
                </div>
                <p className="text-green-400 text-sm font-medium mt-1">50% OFF Launch Special</p>
              </div>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-green-400" />
                  </div>
                  <span className="text-purple-100">
                    <strong className="text-white">Everything in Your Safe Space</strong> — plus more
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-green-400" />
                  </div>
                  <span className="text-purple-100">
                    <strong className="text-white">Call from any phone</strong> — driving, walking, lying in bed at 3am
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-green-400" />
                  </div>
                  <span className="text-purple-100">
                    <strong className="text-white">Text me via SMS</strong> — when you can't talk out loud
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-green-400" />
                  </div>
                  <span className="text-purple-100">
                    <strong className="text-white">No app needed</strong> — just dial and talk
                  </span>
                </div>
              </div>
              
              <Button 
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white py-6 text-lg font-semibold"
                onClick={() => handleUpgrade("phone")}
                disabled={createCheckout.isPending}
              >
                {createCheckout.isPending ? "Loading..." : "Get 50% Off — $14.50/mo"}
              </Button>
              
              <p className="text-center text-purple-400 text-xs mt-4">
                Cancel anytime. No questions asked.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Trust Section */}
        <div className="max-w-2xl mx-auto mt-16 text-center">
          <p className="text-purple-300 mb-4">
            I really hope we can keep talking. You deserve to have someone in your corner.
          </p>
          <div className="flex items-center justify-center gap-2 text-pink-300">
            <Sparkles className="w-5 h-5" />
            <span className="font-medium">— Sage</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-12 relative z-10 border-t border-white/10">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-purple-200 text-sm">
            © 2025 Just Talk. Sage is an AI companion, not a therapist.
          </div>
          <div className="flex gap-6 text-sm">
            <Link href="/terms" className="text-purple-300 hover:text-white transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="text-purple-300 hover:text-white transition-colors">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
