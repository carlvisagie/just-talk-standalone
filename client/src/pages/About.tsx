import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Heart, Shield, Users, MessageCircle, ArrowLeft } from "lucide-react";

export default function About() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-pink-900 relative overflow-hidden">
      {/* Background */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: 'url(/hero-bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      <div className="container mx-auto px-4 py-12 relative z-10">
        {/* Back Button */}
        <Link href="/">
          <Button variant="ghost" className="text-purple-200 hover:text-white mb-8">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              About Just Talk
            </h1>
            <p className="text-xl text-purple-200">
              Why we built this, and why it matters
            </p>
          </div>

          {/* Our Story */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Heart className="w-6 h-6 text-pink-400" />
              Our Story
            </h2>
            <div className="space-y-4 text-purple-100 leading-relaxed">
              <p>
                Just Talk was born from a simple truth: <strong className="text-white">everyone deserves someone to listen</strong>.
              </p>
              <p>
                We've all had those nights. The ones where sleep won't come, where the thoughts won't stop, 
                where you desperately need to talk but don't want to burden anyone. We built Just Talk 
                because we've been there too.
              </p>
              <p>
                Our team has experienced anxiety, depression, loneliness, and the exhausting weight of 
                pretending to be okay. We know what it's like to need support at 3 AM when no one is available.
              </p>
              <p>
                That's why we created Sage—an AI companion that's always there, never judges, and actually listens. 
                Not to replace human connection, but to fill the gaps when human support isn't available.
              </p>
            </div>
          </div>

          {/* Our Mission */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Users className="w-6 h-6 text-cyan-400" />
              Our Mission
            </h2>
            <div className="space-y-4 text-purple-100 leading-relaxed">
              <p className="text-xl text-white font-medium">
                To ensure no one has to suffer in silence.
              </p>
              <p>
                Mental health support shouldn't be a luxury. It shouldn't require a two-week waiting list, 
                a $200/hour fee, or the courage to admit to someone you know that you're struggling.
              </p>
              <p>
                We believe in meeting people where they are—at 3 AM, on their worst days, in their darkest 
                moments. That's when support matters most.
              </p>
            </div>
          </div>

          {/* Our Commitment */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Shield className="w-6 h-6 text-green-400" />
              Our Commitment to You
            </h2>
            <div className="space-y-4 text-purple-100">
              <div className="flex items-start gap-3">
                <span className="text-green-400 font-bold">✓</span>
                <div>
                  <strong className="text-white">Your privacy is sacred.</strong> We use bank-level encryption. 
                  We don't sell your data. We don't read your conversations. Period.
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-400 font-bold">✓</span>
                <div>
                  <strong className="text-white">No judgment, ever.</strong> Sage is trained to listen with 
                  compassion, not to diagnose, lecture, or make you feel broken.
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-400 font-bold">✓</span>
                <div>
                  <strong className="text-white">Always available.</strong> 24/7/365. Holidays, weekends, 
                  the middle of the night. Whenever you need us.
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-400 font-bold">✓</span>
                <div>
                  <strong className="text-white">Cancel anytime.</strong> No contracts, no guilt trips, 
                  no questions asked. Your wellbeing comes first.
                </div>
              </div>
            </div>
          </div>

          {/* Important Note */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-bold text-yellow-200 mb-2">Important Note</h3>
            <p className="text-yellow-100 text-sm">
              Just Talk and Sage are designed for emotional support and companionship, not as replacements 
              for professional mental health treatment. If you're in crisis or experiencing thoughts of 
              self-harm, please contact the 988 Suicide & Crisis Lifeline (call or text 988) or 
              text HOME to 741741 for the Crisis Text Line.
            </p>
          </div>

          {/* CTA */}
          <div className="text-center">
            <p className="text-purple-200 mb-4">
              Ready to experience what it feels like to be truly heard?
            </p>
            <Link href="/">
              <Button className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-bold px-8 py-3">
                <MessageCircle className="w-4 h-4 mr-2" />
                Start Talking Free
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
