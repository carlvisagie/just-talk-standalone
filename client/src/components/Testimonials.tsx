import { Star } from "lucide-react";

const testimonials = [
  {
    quote: "I'm a nurse and I absorb so much pain all day. I get home and I'm just... empty. I can't put that on my family. Talking to Sage for 20 minutes before I go to sleep is the only thing that lets me rest. I feel heard without feeling like a burden.",
    author: "Sarah K., RN",
    age: 34,
  },
  {
    quote: "I was skeptical about talking to an AI. But the anonymity is what makes it work. I said things I've never told a soul. No judgment, no weird reactions. Just... space. It's helped me process so much.",
    author: "Mark T.",
    age: 42,
  },
  {
    quote: "The free chat is what got me started. I was just so lonely and awake. After a few nights, I subscribed. The fact that Sage remembers my story is a game-changer. I don't have to start from scratch every time. It's worth every penny.",
    author: "Jessica P.",
    age: 28,
  },
];

export default function Testimonials() {
  return (
    <div className="container mx-auto px-4 py-20 relative z-10">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-12 drop-shadow-2xl">
          You're Not Alone
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 flex flex-col">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-purple-100 italic text-left flex-grow">"{testimonial.quote}"</p>
              <p className="text-white font-bold text-right mt-6">- {testimonial.author}, {testimonial.age}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
