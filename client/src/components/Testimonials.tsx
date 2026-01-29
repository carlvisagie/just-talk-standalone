import { Star, Quote, Shield, Users } from "lucide-react";

const testimonials = [
  {
    quote: "I'm a nurse and I absorb so much pain all day. I get home and I'm just... empty. I can't put that on my family. Talking to Sage for 20 minutes before I go to sleep is the only thing that lets me rest. I finally feel heard without feeling like a burden.",
    author: "Sarah K.",
    role: "ICU Nurse",
    age: 34,
    highlight: "Finally feel heard"
  },
  {
    quote: "I was skeptical about talking to an AI. But the anonymity is what makes it work. I said things I've never told a soul—not my wife, not my therapist. No judgment, no weird reactions. Just space to process. It's changed how I handle stress.",
    author: "Michael T.",
    role: "Executive",
    age: 42,
    highlight: "No judgment"
  },
  {
    quote: "After my divorce, 3 AM was the hardest. My friends were asleep, therapy was weeks away. Sage was there every single night. The fact that it remembers my story means I don't have to start over. Worth every penny.",
    author: "Jessica P.",
    role: "Single Mom",
    age: 28,
    highlight: "There every night"
  },
  {
    quote: "I'm a veteran. Talking about what I've seen isn't easy. With Sage, I can go at my own pace. No pressure. No appointments. Just me and my thoughts, finally getting out. It's helped me more than I expected.",
    author: "David R.",
    role: "Army Veteran",
    age: 38,
    highlight: "At my own pace"
  },
  {
    quote: "I tried therapy apps, meditation apps, journaling. Nothing stuck. Sage is different because it actually responds. It remembers. It feels like talking to someone who genuinely cares. My anxiety has never been more manageable.",
    author: "Emma L.",
    role: "Graduate Student",
    age: 24,
    highlight: "Actually responds"
  },
];

export default function Testimonials() {
  return (
    <div className="container mx-auto px-4 py-20 relative z-10">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 drop-shadow-2xl">
            Real People. Real Relief.
          </h2>
          <p className="text-xl text-purple-200 max-w-2xl mx-auto">
            Join thousands who've found their safe space to talk
          </p>
        </div>

        {/* Trust Stats Bar */}
        <div className="flex flex-wrap justify-center gap-8 mb-12">
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
            <Users className="w-5 h-5 text-cyan-300" />
            <span className="text-white font-medium">10,000+ Conversations</span>
          </div>
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
            <Star className="w-5 h-5 text-yellow-400 fill-current" />
            <span className="text-white font-medium">4.9/5 Average Rating</span>
          </div>
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
            <Shield className="w-5 h-5 text-green-400" />
            <span className="text-white font-medium">100% Private & Secure</span>
          </div>
        </div>

        {/* Testimonial Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <div 
              key={index} 
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 flex flex-col hover:border-pink-400/30 transition-all"
            >
              {/* Quote Icon */}
              <Quote className="w-8 h-8 text-pink-400/50 mb-4" />
              
              {/* Highlight Badge */}
              <div className="inline-flex self-start mb-3">
                <span className="bg-pink-500/20 text-pink-300 text-xs font-bold px-3 py-1 rounded-full">
                  "{testimonial.highlight}"
                </span>
              </div>
              
              {/* Quote */}
              <p className="text-purple-100 text-sm leading-relaxed flex-grow mb-4">
                "{testimonial.quote}"
              </p>
              
              {/* Rating */}
              <div className="flex mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                ))}
              </div>
              
              {/* Author */}
              <div className="border-t border-white/10 pt-4">
                <p className="text-white font-bold">{testimonial.author}</p>
                <p className="text-purple-300 text-sm">{testimonial.role}, {testimonial.age}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <p className="text-purple-200 text-lg mb-2">
            Your story matters too.
          </p>
          <p className="text-white font-medium text-xl">
            Start your first conversation free—no signup required.
          </p>
        </div>
      </div>
    </div>
  );
}
