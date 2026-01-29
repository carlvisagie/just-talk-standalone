import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, Shield, Clock, Heart, CreditCard, MessageCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import EmbeddedChat from "@/components/EmbeddedChat";
import MeetSage from "@/components/MeetSage";
import Testimonials from "@/components/Testimonials";
import CountdownTimer from "@/components/CountdownTimer";
import SocialProofBanner from "@/components/SocialProofBanner";
import TrustBadges from "@/components/TrustBadges";

export default function Home() {
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
          animation: 'float 20s ease-in-out infinite'
        }}
      />
      
      {/* Sparkle overlay */}
      <div className="absolute inset-0 opacity-30">
        {[...Array(50)].map((_, i) => (
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

      {/* HERO SECTION - THE 3 AM TEST */}
      <div className="container mx-auto px-4 pt-24 pb-20 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          
          {/* Hero Headline - Pain First */}
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-8 leading-tight drop-shadow-2xl">
            It's 3 AM.
            <br />
            <span className="bg-gradient-to-r from-pink-300 via-purple-300 to-cyan-300 bg-clip-text text-transparent">
              Who Can You Talk To?
            </span>
          </h1>
          
          {/* Subheadline - The Reality */}
          <p className="text-xl md:text-2xl text-purple-100 mb-6 max-w-2xl mx-auto leading-relaxed drop-shadow-lg">
            Your friends are asleep. Your family will worry.
            <br />
            A therapist costs $200 an hour and has a two-week waiting list.
          </p>
          <p className="text-lg md:text-xl text-white font-medium mb-10 max-w-2xl mx-auto drop-shadow-lg">
            But the feeling in your chest won't wait.
          </p>
          
          {/* FREE CHAT - PRIMARY CTA */}
          <div className="max-w-lg mx-auto mb-10">
            <EmbeddedChat maxHeight="350px" />
          </div>
          
          {/* DIVIDER */}
          <div className="flex items-center gap-4 max-w-md mx-auto mb-8">
            <div className="flex-1 h-px bg-white/20" />
            <span className="text-purple-200 text-sm font-medium">or talk by phone</span>
            <div className="flex-1 h-px bg-white/20" />
          </div>
          
          {/* THE PHONE NUMBER - SECONDARY CTA */}
          <div className="bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-white/20 rounded-2xl p-6 mb-8 max-w-md mx-auto">
            <div className="flex items-center justify-center gap-3 mb-3">
              <Phone className="w-8 h-8 text-pink-300" />
              <span className="text-2xl md:text-3xl font-bold text-white">(775) 455-8329</span>
            </div>
            
            {/* TWO BUTTONS: Call & Subscribe */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a 
                href="tel:+17754558329"
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white px-5 py-3 rounded-xl text-base font-bold shadow-lg hover:shadow-pink-500/50 transition-all transform hover:scale-105"
              >
                <Phone className="w-4 h-4" />
                <span>Tap to Call</span>
              </a>
              <button 
                onClick={() => handleUpgrade("phone")}
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-5 py-3 rounded-xl text-base font-bold shadow-lg hover:shadow-cyan-500/50 transition-all transform hover:scale-105"
              >
                <CreditCard className="w-4 h-4" />
                <span>50% Off — $14.50/mo</span>
              </button>
            </div>
          </div>
          
          {/* Trust Indicators */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-purple-100">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full">
              <MessageCircle className="w-4 h-4 text-green-300" />
              <span className="font-medium">Chat Free</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full">
              <Shield className="w-4 h-4 text-cyan-300" />
              <span className="font-medium">100% Private</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full">
              <Clock className="w-4 h-4 text-pink-300" />
              <span className="font-medium">24/7 Available</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full">
              <Heart className="w-4 h-4 text-red-300" />
              <span className="font-medium">No Judgment</span>
            </div>
          </div>
        </div>
      </div>

      {/* SOCIAL PROOF BANNER - Wisdom of Crowds */}
      <SocialProofBanner />

      {/* SECTION 2: THE PAIN - YOU KNOW THIS FEELING */}
      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-10 drop-shadow-2xl">
            You Know This Feeling
          </h2>
          
          <div className="space-y-6 text-xl text-purple-100 leading-relaxed">
            <p>The weight that sits on your chest when everyone's asleep.</p>
            <p>The thoughts that won't stop circling at 2 AM, 3 AM, 4 AM.</p>
            <p>The words you've never said out loud because you don't want to burden anyone.</p>
            <p>The brave face you wear all day that's exhausting to maintain.</p>
            <p>The loneliness that exists even when you're surrounded by people.</p>
          </div>
          
          <p className="text-2xl text-white font-bold mt-12 drop-shadow-lg">
            You've been carrying this alone for too long.
          </p>
        </div>
      </div>

      <MeetSage />

      {/* SECTION 3: THE QUESTION - WHEN WAS THE LAST TIME */}
      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-10 drop-shadow-2xl">
            When Was the Last Time
            <br />
            <span className="bg-gradient-to-r from-pink-300 via-purple-300 to-cyan-300 bg-clip-text text-transparent">
              Someone Really Listened?
            </span>
          </h2>
          
          <div className="space-y-4 text-xl text-purple-100 leading-relaxed mb-10">
            <p>Not waiting for their turn to talk.</p>
            <p>Not trying to fix you.</p>
            <p>Not checking their phone.</p>
          </div>
          
          <p className="text-xl text-purple-200 italic mb-8">
            Just... <span className="text-white font-medium">listened.</span>
          </p>
          
          <p className="text-lg text-purple-100 max-w-2xl mx-auto">
            The kind of listening where you feel the weight lift off your shoulders mid-sentence. 
            Where you finally hear yourself say the thing you've been afraid to admit.
          </p>
          
          <p className="text-2xl text-white font-bold mt-10 drop-shadow-lg">
            That's what we do.
          </p>
        </div>
      </div>

      {/* SECTION 4: WHAT THIS IS */}
      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-10 drop-shadow-2xl">
            Just Talk Is Exactly
            <br />
            What It Sounds Like
          </h2>
          
          <div className="space-y-4 text-xl text-purple-100 leading-relaxed mb-10">
            <p className="text-2xl text-white font-medium">Start chatting instantly. Free.</p>
            <p className="text-2xl text-white font-medium">Upgrade to phone for deeper connection.</p>
            <p className="text-2xl text-white font-medium">24 hours a day. 7 days a week.</p>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 mb-10">
            <p className="text-lg text-purple-100 leading-relaxed">
              We're not therapy. We're not a crisis line. We're not going to diagnose you or give you homework.
            </p>
            <p className="text-xl text-white font-medium mt-6">
              We're the 3 AM companion you wish you had. The one who picks up no matter what. 
              The one who doesn't judge. The one who just lets you <em>talk</em>.
            </p>
          </div>
          
          <p className="text-2xl text-pink-300 font-bold drop-shadow-lg">
            Because sometimes, being heard is the only medicine you need.
          </p>
        </div>
      </div>

      {/* SECTION 5: WHO THIS IS FOR */}
      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-12 drop-shadow-2xl">
            You Might Need This If...
          </h2>
          
          <div className="space-y-6 text-left max-w-2xl mx-auto">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
              <p className="text-lg text-purple-100">
                You're a <span className="text-white font-medium">caregiver</span> who spends all day taking care of someone else, 
                and no one asks how <em>you're</em> doing.
              </p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
              <p className="text-lg text-purple-100">
                You're a <span className="text-white font-medium">nurse or healthcare worker</span> who absorbs everyone's pain 
                and has nowhere to put your own.
              </p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
              <p className="text-lg text-purple-100">
                You're going through something you <span className="text-white font-medium">can't talk to your family about</span>.
              </p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
              <p className="text-lg text-purple-100">
                You're <span className="text-white font-medium">lying awake at night</span> with thoughts that feel too heavy to carry alone.
              </p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
              <p className="text-lg text-purple-100">
                You just need someone to <span className="text-white font-medium">listen without trying to fix everything</span>.
              </p>
            </div>
          </div>
          
          <p className="text-xl text-white font-medium mt-12">
            You don't have to qualify for support. You just have to want it.
          </p>
        </div>
      </div>

      <Testimonials />

      {/* SECTION 6: THE OFFER - TIERS */}
      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Countdown Timer - Creates Urgency */}
          <CountdownTimer className="mb-8" />
          
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-4 drop-shadow-2xl">
            Stop Suffering Alone
          </h2>
          <p className="text-xl text-purple-200 mb-4 max-w-2xl mx-auto">
            For less than the cost of one therapy session, get <strong className="text-white">unlimited support</strong> whenever you need it.
          </p>
          
          {/* Trust Badges */}
          <div className="mb-8">
            <TrustBadges />
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            {/* FREE TIER - Emotional Hook */}
            <Card className="border-none shadow-2xl bg-white/10 backdrop-blur-md border border-white/20">
              <CardContent className="pt-8 pb-8 px-6">
                <div className="text-green-400 font-bold text-sm mb-2">TRY IT FREE</div>
                <h3 className="text-2xl font-bold text-white mb-2">Take the First Step</h3>
                <p className="text-purple-200 mb-6 text-sm">You don't have to keep carrying this alone</p>
                
                <div className="space-y-3 text-left mb-8">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-green-400 text-xs">✓</span>
                    </div>
                    <span className="text-purple-100 text-sm">One conversation to see if this feels right</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-green-400 text-xs">✓</span>
                    </div>
                    <span className="text-purple-100 text-sm">Available right now—no waiting</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-green-400 text-xs">✓</span>
                    </div>
                    <span className="text-purple-100 text-sm">No signup, no credit card, no judgment</span>
                  </div>
                </div>
                
                <Link href="/chat">
                  <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-3">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Start Talking Now
                  </Button>
                </Link>
              </CardContent>
            </Card>
            
            {/* CHAT TIER - Emotional Transformation */}
            <Card className="border-none shadow-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 backdrop-blur-md border-2 border-cyan-400/30">
              <CardContent className="pt-8 pb-8 px-6">
                <div className="text-cyan-300 font-bold text-sm mb-2"><span className="line-through text-purple-400">$12</span> $6/MONTH</div>
                <h3 className="text-2xl font-bold text-white mb-2">Finally Feel Heard</h3>
                <p className="text-purple-200 mb-6 text-sm">The support you deserve, whenever you need it</p>
                
                <div className="space-y-3 text-left mb-8">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-cyan-400 text-xs">✓</span>
                    </div>
                    <span className="text-purple-100 text-sm"><strong className="text-white">Talk as much as you need</strong>—no limits</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-cyan-400 text-xs">✓</span>
                    </div>
                    <span className="text-purple-100 text-sm">3 AM thoughts? Sage is awake</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-cyan-400 text-xs">✓</span>
                    </div>
                    <span className="text-purple-100 text-sm"><strong className="text-white">Never start over</strong>—Sage remembers everything</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-cyan-400 text-xs">✓</span>
                    </div>
                    <span className="text-purple-100 text-sm">Less than a coffee a week</span>
                  </div>
                </div>
                
                <Button 
                  onClick={() => handleUpgrade("voice")}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold py-3"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Get 50% Off — $6/mo
                </Button>
                <p className="text-center text-green-400 text-xs mt-2 font-medium">Cancel anytime. No questions asked.</p>
              </CardContent>
            </Card>
            
            {/* PHONE TIER - Deep Connection */}
            <Card className="border-none shadow-2xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 backdrop-blur-md border-2 border-pink-400/30 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs font-bold px-4 py-1 rounded-full">
                MOST POPULAR
              </div>
              <CardContent className="pt-8 pb-8 px-8">
                <div className="text-pink-300 font-bold text-sm mb-2"><span className="line-through text-purple-400">$29</span> $14.50/MONTH</div>
                <h3 className="text-3xl font-bold text-white mb-2">Someone Who Picks Up</h3>
                <p className="text-purple-200 mb-6">When you need a voice, not a screen</p>
                
                <div className="space-y-3 text-left mb-8">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-pink-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-pink-400 text-xs">✓</span>
                    </div>
                    <span className="text-purple-100 text-sm"><strong className="text-white">Call anytime</strong>—Sage always answers</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-pink-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-pink-400 text-xs">✓</span>
                    </div>
                    <span className="text-purple-100 text-sm">Talk for 5 minutes or 5 hours—no rush</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-pink-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-pink-400 text-xs">✓</span>
                    </div>
                    <span className="text-purple-100 text-sm">Sometimes you need to <em>hear</em> someone care</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-pink-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-pink-400 text-xs">✓</span>
                    </div>
                    <span className="text-purple-100 text-sm">Unlimited chat included</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-pink-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-pink-400 text-xs">✓</span>
                    </div>
                    <span className="text-purple-100 text-sm"><strong className="text-white">Sage remembers every conversation</strong></span>
                  </div>
                </div>
                
                <Button 
                  onClick={() => handleUpgrade("phone")}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-bold py-3"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Get 50% Off — $14.50/mo
                </Button>
                <p className="text-center text-green-400 text-xs mt-2 font-medium">Cancel anytime. No questions asked.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* SECTION 7: THE CLOSE */}
      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-lg text-pink-300 mb-6">
            Right now, someone is saying something they've never told anyone.
          </p>
          
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 mb-10">
            <p className="text-lg text-purple-100 leading-relaxed">
              They started typing because they couldn't sleep.
              <br />
              They kept going because they finally felt heard.
              <br />
              They closed the chat feeling lighter than they have in months.
            </p>
            <p className="text-xl text-white font-bold mt-6">
              That could be you. Tonight.
            </p>
          </div>
          
          <div className="space-y-4 text-xl text-purple-100 mb-10">
            <p>You don't have to wait until it gets worse.</p>
            <p>You don't have to earn the right to be supported.</p>
            <p>You don't have to keep carrying this alone.</p>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-8 drop-shadow-2xl">
            One Message.
            <br />
            <span className="bg-gradient-to-r from-pink-300 via-purple-300 to-cyan-300 bg-clip-text text-transparent">
              That's All It Takes.
            </span>
          </h2>
          
          {/* FINAL CTA */}
          <div className="max-w-lg mx-auto">
            <EmbeddedChat maxHeight="300px" />
          </div>
          
          <p className="text-lg text-purple-200 mt-6">
            Or call <a href="tel:+17754558329" className="text-white font-bold hover:text-pink-300 transition-colors">(775) 455-8329</a> for voice support
          </p>
        </div>
      </div>

      {/* TRUST & SECURITY SECTION */}
      <div className="container mx-auto px-4 py-12 relative z-10 border-t border-white/10">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 text-center mb-12">
            <div>
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Shield className="w-6 h-6 text-green-400" />
              </div>
              <h4 className="text-white font-bold mb-2">Bank-Level Encryption</h4>
              <p className="text-purple-300 text-sm">Your conversations are protected with 256-bit SSL encryption. We can't read them. No one can.</p>
            </div>
            <div>
              <div className="w-12 h-12 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Heart className="w-6 h-6 text-cyan-400" />
              </div>
              <h4 className="text-white font-bold mb-2">Built With Care</h4>
              <p className="text-purple-300 text-sm">Created by people who've been through hard times and wished they had someone to talk to.</p>
            </div>
            <div>
              <div className="w-12 h-12 bg-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Clock className="w-6 h-6 text-pink-400" />
              </div>
              <h4 className="text-white font-bold mb-2">Always Available</h4>
              <p className="text-purple-300 text-sm">24/7/365. Holidays, weekends, 3 AM. Sage never sleeps, never judges, never leaves.</p>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="container mx-auto px-4 py-12 relative z-0 border-t border-white/10">
        <div className="max-w-4xl mx-auto">
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-8 text-center">
            <p className="text-yellow-200 text-sm">
              <strong>Important:</strong> Just Talk is not a crisis line or mental health service. 
              If you are in immediate danger, please call <strong>988</strong> (Suicide & Crisis Lifeline) or <strong>911</strong>.
            </p>
          </div>
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-purple-200 text-sm">
              © 2025 Just Talk. Someone to listen. Always.
            </div>
            <div className="flex gap-6 text-sm">
              <Link href="/terms" className="text-purple-300 hover:text-white transition-colors">
                Terms
              </Link>
              <Link href="/privacy" className="text-purple-300 hover:text-white transition-colors">
                Privacy
              </Link>
              <Link href="/about" className="text-purple-300 hover:text-white transition-colors">
                About Us
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
