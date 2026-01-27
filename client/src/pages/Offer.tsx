import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Heart, Shield, Sparkles, Check } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";

export default function Offer() {
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
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Special Offer Banner */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-yellow-500 text-black px-6 py-2 rounded-full font-bold text-lg mb-4 animate-pulse">
            <Sparkles className="w-5 h-5" />
            LIMITED TIME OFFER
            <Sparkles className="w-5 h-5" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            50% OFF Your First Month
          </h1>
          <p className="text-xl text-purple-200 max-w-2xl mx-auto">
            You deserve someone to talk to. 24/7. No judgment. No waiting.
          </p>
        </div>

        {/* Urgency Timer */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-red-600/80 text-white px-6 py-3 rounded-lg">
            <Clock className="w-5 h-5" />
            <span className="font-semibold">Offer expires soon - Don't miss out!</span>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
          {/* Voice Plan */}
          <Card className="bg-white/10 backdrop-blur-lg border-purple-400/30 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 text-center">
              <span className="text-white/80 line-through text-lg">$12/month</span>
              <div className="text-4xl font-bold text-white">$6/month</div>
              <span className="text-yellow-300 font-semibold">First month only!</span>
            </div>
            <CardContent className="p-6 text-white">
              <h3 className="text-2xl font-bold mb-4">Unlimited Chat</h3>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-400" />
                  Unlimited text conversations
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-400" />
                  Available 24/7, 365 days
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-400" />
                  Remembers your story
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-400" />
                  No judgment, ever
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-400" />
                  Voice messages included
                </li>
              </ul>
              <Button 
                onClick={() => handleUpgrade("voice")}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-6 text-lg font-bold"
              >
                Get 50% Off Now
              </Button>
            </CardContent>
          </Card>

          {/* Phone Plan */}
          <Card className="bg-white/10 backdrop-blur-lg border-yellow-400/50 overflow-hidden relative">
            <div className="absolute top-4 right-4 bg-yellow-500 text-black px-3 py-1 rounded-full text-sm font-bold">
              MOST POPULAR
            </div>
            <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-4 text-center">
              <span className="text-white/80 line-through text-lg">$29/month</span>
              <div className="text-4xl font-bold text-white">$14.50/month</div>
              <span className="text-white font-semibold">First month only!</span>
            </div>
            <CardContent className="p-6 text-white">
              <h3 className="text-2xl font-bold mb-4">Phone + Chat</h3>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-400" />
                  Everything in Chat plan
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-400" />
                  <strong>Call a real phone number</strong>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-400" />
                  Talk out loud when typing isn't enough
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-400" />
                  Perfect for 3am moments
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-400" />
                  Deeper emotional connection
                </li>
              </ul>
              <Button 
                onClick={() => handleUpgrade("phone")}
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black py-6 text-lg font-bold"
              >
                Get 50% Off Now
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Trust Signals */}
        <div className="text-center mb-12">
          <div className="flex flex-wrap justify-center gap-8 text-white/80">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              <span>100% Private & Secure</span>
            </div>
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5" />
              <span>Cancel Anytime</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              <span>Available 24/7</span>
            </div>
          </div>
        </div>

        {/* Testimonial/Social Proof */}
        <div className="max-w-2xl mx-auto text-center">
          <Card className="bg-white/10 backdrop-blur-lg border-purple-400/30 p-6">
            <p className="text-white text-lg italic mb-4">
              "I was skeptical at first, but Just Talk has become my go-to at 3am when my mind won't stop racing. 
              It's like having a friend who's always there, always patient, and never judges."
            </p>
            <p className="text-purple-300">— Someone who finally found peace</p>
          </Card>
        </div>

        {/* Final CTA */}
        <div className="text-center mt-12">
          <p className="text-white/80 mb-4">Still not sure? Try the free tier first.</p>
          <a href="/" className="text-purple-300 hover:text-white underline">
            Go to homepage →
          </a>
        </div>
      </div>
    </div>
  );
}
