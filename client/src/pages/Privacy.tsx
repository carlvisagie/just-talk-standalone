import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function Privacy() {
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
          <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-purple-200 mb-8">Last Updated: January 17, 2026</p>

          <div className="space-y-8 text-purple-100 leading-relaxed">
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">1. What We Collect</h2>
              
              <h3 className="text-xl font-semibold text-white mb-3 mt-4">Your Conversations</h3>
              <p className="mb-4">When you chat with Sage, we store:</p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Messages you send</li>
                <li>Sage's responses</li>
                <li>When conversations happened</li>
                <li>Voice recordings (if you use voice features)</li>
              </ul>
              <p className="mt-4 text-purple-200">
                <strong>Why?</strong> So Sage can remember you and your conversations. That's the whole point - 
                a companion that actually remembers who you are.
              </p>

              <h3 className="text-xl font-semibold text-white mb-3 mt-4">Account Info</h3>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Email address (for paid plans)</li>
                <li>Phone number (if you use phone features)</li>
                <li>Payment info (handled by Stripe - we don't see your card number)</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mb-3 mt-4">Technical Stuff</h3>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>IP address</li>
                <li>Browser/device info</li>
                <li>How you use the app</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">2. How We Use Your Data</h2>
              <p className="mb-4">We use your information to:</p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li><strong>Make the app work:</strong> Generate AI responses, remember your conversations</li>
                <li><strong>Process payments:</strong> If you're on a paid plan</li>
                <li><strong>Improve the service:</strong> Make Sage better at conversations</li>
                <li><strong>Keep things running:</strong> Fix bugs, prevent abuse</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">3. Who We Share Data With</h2>
              <p className="mb-4">We do NOT sell your data. We share it only with:</p>
              
              <h3 className="text-xl font-semibold text-white mb-3 mt-4">Service Providers</h3>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li><strong>OpenAI:</strong> Your messages go to OpenAI to generate Sage's responses</li>
                <li><strong>Stripe:</strong> Handles payments securely</li>
                <li><strong>Twilio:</strong> Powers phone calls and SMS</li>
                <li><strong>Render:</strong> Hosts the application</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mb-3 mt-4">Legal Requirements</h3>
              <p className="mb-2">We may share data if required by law:</p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Court orders or subpoenas</li>
                <li>To protect safety in serious situations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">4. How Long We Keep Data</h2>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li><strong>Conversations:</strong> Kept so Sage can remember you (that's the feature!)</li>
                <li><strong>Account info:</strong> While your account is active</li>
                <li><strong>Payment records:</strong> 7 years (legal requirement)</li>
              </ul>
              <p className="mt-4">
                Want your data deleted? Email us at support@just-talk.com
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">5. Security</h2>
              <p className="mb-4">We protect your data with:</p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Encryption in transit (HTTPS)</li>
                <li>Encrypted database storage</li>
                <li>Access controls</li>
              </ul>
              <p className="mt-4">
                That said, no system is 100% secure. We do our best, but can't guarantee perfect security.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">6. This Is Not a Healthcare App</h2>
              <p className="bg-purple-900/50 border border-purple-500/50 rounded-lg p-4">
                Just Talk is a <strong>companion chat app</strong>, not a healthcare service. 
                We are NOT HIPAA compliant because we're not a healthcare provider. 
                Don't share medical records or sensitive health information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">7. Age Requirements</h2>
              <p className="mb-4">
                You must be at least 13 to use Just Talk. If you're under 18, you need parental consent.
              </p>
              <p>
                We don't knowingly collect data from kids under 13. If we find out we have, we'll delete it.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">8. Your Rights</h2>
              <p className="mb-4">You can:</p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Ask what data we have about you</li>
                <li>Request correction of wrong info</li>
                <li>Request deletion of your data</li>
                <li>Export your conversation history</li>
              </ul>
              <p className="mt-4">
                Email support@just-talk.com to exercise these rights.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">9. International Users</h2>
              <p>
                Just Talk operates from the United States. If you're outside the US, 
                your data will be transferred to and stored in the US.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">10. Cookies</h2>
              <p className="mb-4">We use cookies for:</p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Keeping you logged in</li>
                <li>Understanding how people use the app</li>
              </ul>
              <p className="mt-4">
                You can disable cookies in your browser, but some features might not work properly.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">11. Changes</h2>
              <p>
                We might update this policy. If we make big changes, we'll let you know.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">12. Contact</h2>
              <p>
                Privacy questions? Email: support@just-talk.com
              </p>
            </section>

            <div className="bg-purple-900/50 border border-purple-500/50 rounded-lg p-6 mt-8">
              <p className="text-white font-bold mb-2">The Short Version:</p>
              <ul className="list-disc list-inside ml-4 space-y-2 text-purple-100">
                <li>We store your conversations so Sage can remember you</li>
                <li>We share data with OpenAI to power the AI</li>
                <li>We don't sell your data</li>
                <li>This is a chat app, not a healthcare service</li>
                <li>You can request deletion of your data anytime</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
