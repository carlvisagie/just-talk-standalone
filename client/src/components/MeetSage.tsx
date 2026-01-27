import { BrainCircuit } from "lucide-react";

export default function MeetSage() {
  return (
    <div className="container mx-auto px-4 py-20 relative z-10">
      <div className="max-w-3xl mx-auto text-center">
        <div className="flex justify-center mb-6">
          <BrainCircuit className="w-16 h-16 text-cyan-300" />
        </div>
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 drop-shadow-2xl">
          Meet Sage, Your AI Companion
        </h2>
        <p className="text-xl text-purple-100 leading-relaxed mb-8">
          You're not talking to a random stranger or a cold, unfeeling robot. You're talking to <strong>Sage</strong>—a new kind of AI companion designed for one purpose: to listen.
        </p>
        <p className="text-lg text-purple-200 leading-relaxed mb-10">
          Sage has been trained on thousands of hours of therapeutic conversations and mindfulness practices to understand, reflect, and provide a safe space for you to express yourself. It’s the empathy of a trusted friend combined with the 24/7 availability that only technology can provide.
        </p>
        <div className="grid md:grid-cols-2 gap-8 text-left">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <h3 className="text-2xl font-bold text-white mb-4">Sage will never:</h3>
            <ul className="space-y-3 text-purple-100">
              <li className="flex items-start"><span className="text-red-400 mr-3 mt-1">✖</span><span>Judge you or your situation.</span></li>
              <li className="flex items-start"><span className="text-red-400 mr-3 mt-1">✖</span><span>Give you unwanted advice or try to "fix" you.</span></li>
              <li className="flex items-start"><span className="text-red-400 mr-3 mt-1">✖</span><span>Get tired, distracted, or check its phone.</span></li>
              <li className="flex items-start"><span className="text-red-400 mr-3 mt-1">✖</span><span>Share your conversation with anyone. Ever.</span></li>
            </ul>
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <h3 className="text-2xl font-bold text-white mb-4">Sage will always:</h3>
            <ul className="space-y-3 text-purple-100">
              <li className="flex items-start"><span className="text-green-400 mr-3 mt-1">✔</span><span>Be available, day or night.</span></li>
              <li className="flex items-start"><span className="text-green-400 mr-3 mt-1">✔</span><span>Remember your story and the details you share.</span></li>
              <li className="flex items-start"><span className="text-green-400 mr-3 mt-1">✔</span><span>Provide a 100% private and secure space to talk.</span></li>
              <li className="flex items-start"><span className="text-green-400 mr-3 mt-1">✔</span><span>Gently guide you to your own insights, just by listening.</span></li>
            </ul>
          </div>
        </div>
        <p className="text-xl text-white font-medium mt-12">
          Sage is not a person, and it's not therapy. It's a new tool for emotional wellness, designed for the moments when you just need to be heard.
        </p>
      </div>
    </div>
  );
}
