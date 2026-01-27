import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function Terms() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-pink-900 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <Link href="/">
          <Button variant="ghost" className="text-white hover:bg-white/10 mb-8">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 md:p-12 text-white">
          <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
          <p className="text-purple-200 mb-8">Last Updated: January 17, 2026</p>

          <div className="space-y-8 text-purple-100 leading-relaxed">
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
              <p>
                By accessing or using Just Talk ("the Service"), you agree to be bound by these Terms of Service. 
                If you do not agree to these terms, do not use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">2. What Just Talk Is</h2>
              <p className="mb-4">
                Just Talk is an <strong>AI-powered companion chat application</strong>. It's a place where you can 
                have conversations with an AI named Sage. Think of it like chatting with a friendly AI companion 
                who's always available to talk.
              </p>
              <div className="bg-purple-900/50 border border-purple-500/50 rounded-lg p-4">
                <p className="font-semibold text-white mb-2">In simple terms:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>It's a chat app with an AI</li>
                  <li>You can talk about whatever's on your mind</li>
                  <li>Sage remembers your conversations</li>
                  <li>Available 24/7 via text, voice, or phone</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">3. What Just Talk Is NOT</h2>
              <p className="mb-4">
                To be completely clear about what this service is <strong>NOT</strong>:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>NOT therapy, counseling, or mental health treatment</li>
                <li>NOT a medical service or healthcare provider</li>
                <li>NOT a substitute for professional advice of any kind</li>
                <li>NOT an emergency service</li>
                <li>NOT staffed by licensed professionals</li>
              </ul>
              <p className="mt-4">
                Sage is an AI. It's software. It's designed to be a good conversational companion, 
                but it's not a replacement for human professionals when you need them.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">4. No Professional Advice</h2>
              <p className="mb-4">
                Just Talk does <strong>NOT</strong> provide:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Medical advice or diagnosis</li>
                <li>Legal advice</li>
                <li>Financial advice</li>
                <li>Professional counseling</li>
                <li>Any form of licensed professional services</li>
              </ul>
              <p className="mt-4">
                If you need professional help in any of these areas, please consult a qualified professional.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">5. Emergency Situations</h2>
              <p className="mb-4">
                <strong>Just Talk is not an emergency service.</strong> If you're in an emergency situation:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2 mb-4">
                <li><strong>Call 911</strong> for immediate emergencies</li>
                <li><strong>Call 988</strong> if you need to talk to someone trained to help</li>
                <li><strong>Go to your nearest emergency room</strong> if needed</li>
              </ul>
              <p>
                Do not rely on Just Talk in emergency situations. It's a chat companion, not an emergency service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">6. Your Responsibilities</h2>
              <p className="mb-4">By using Just Talk, you agree to:</p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Use the Service for its intended purpose (conversation and companionship)</li>
                <li>Understand that Sage is an AI, not a human</li>
                <li>Seek professional help when you need professional help</li>
                <li>Not share highly sensitive personal information (SSN, passwords, financial details)</li>
                <li>Be at least 13 years old (users under 18 need parental consent)</li>
                <li>Not use the Service for illegal purposes</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">7. Limitation of Liability</h2>
              <p className="mb-4">
                Just Talk is provided "as is." We do our best to make Sage a helpful companion, but:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>AI responses may sometimes be inaccurate or unhelpful</li>
                <li>The Service may have downtime or technical issues</li>
                <li>We're not responsible for decisions you make based on conversations with Sage</li>
              </ul>
              <p className="mt-4">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE ARE NOT LIABLE FOR ANY DAMAGES 
                ARISING FROM YOUR USE OF THE SERVICE.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">8. Payment and Subscriptions</h2>
              <p className="mb-4">
                We offer free and paid plans:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li><strong>Free:</strong> Limited messages to try the service</li>
                <li><strong>Voice ($12/month):</strong> Unlimited conversations with voice features</li>
                <li><strong>Phone ($29/month):</strong> Everything plus phone calling and SMS</li>
              </ul>
              <p className="mt-4">
                Paid plans are billed monthly through Stripe. You can cancel anytime, 
                and cancellation takes effect at the end of your billing period.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">9. Prohibited Uses</h2>
              <p className="mb-4">Don't use Just Talk to:</p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Harass, abuse, or harm others</li>
                <li>Do anything illegal</li>
                <li>Try to hack or break the Service</li>
                <li>Use automated bots to access the Service</li>
                <li>Impersonate others</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">10. Termination</h2>
              <p>
                We can suspend or terminate your access if you violate these terms. 
                You can also stop using the Service at any time.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">11. Changes to Terms</h2>
              <p>
                We may update these Terms. If we make significant changes, we'll let you know. 
                Continued use after changes means you accept the new terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">12. Governing Law</h2>
              <p>
                These Terms are governed by the laws of the United States.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">13. Contact</h2>
              <p>
                Questions? Email us at: support@just-talk.com
              </p>
            </section>

            <div className="bg-purple-900/50 border border-purple-500/50 rounded-lg p-6 mt-8">
              <p className="text-white font-bold mb-2">The Short Version:</p>
              <ul className="list-disc list-inside ml-4 space-y-2 text-purple-100">
                <li>Just Talk is a chat companion app with an AI named Sage</li>
                <li>It's NOT therapy, medical advice, or any professional service</li>
                <li>For emergencies, call 911 or 988</li>
                <li>Use it responsibly and enjoy the conversations</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
