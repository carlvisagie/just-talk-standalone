import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Heart, Send, Loader2, MessageCircle, X } from "lucide-react";
import { Streamdown } from "streamdown";

const MOOD_OPTIONS = [
  { emoji: "😊", label: "Happy", value: "happy" },
  { emoji: "😔", label: "Sad", value: "sad" },
  { emoji: "😰", label: "Anxious", value: "anxious" },
  { emoji: "😤", label: "Frustrated", value: "frustrated" },
  { emoji: "😌", label: "Calm", value: "calm" },
];

type Message = {
  role: "user" | "assistant";
  content: string;
  mood?: string;
  timestamp: number;
};

type EmbeddedChatProps = {
  /** Whether to show the chat expanded by default */
  defaultExpanded?: boolean;
  /** Callback when user sends first message (for analytics) */
  onFirstMessage?: () => void;
  /** Maximum height of the chat container */
  maxHeight?: string;
};

export default function EmbeddedChat({ 
  defaultExpanded = false,
  onFirstMessage,
  maxHeight = "400px"
}: EmbeddedChatProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedMood, setSelectedMood] = useState<string | undefined>();
  const [userName, setUserName] = useState<string | undefined>();
  const [isCollectingName, setIsCollectingName] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load messages and name from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("justTalkMessages");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setMessages(parsed);
        setHasStarted(parsed.length > 0);
      } catch (e) {
        console.error("Failed to load messages:", e);
      }
    }
    
    const storedName = localStorage.getItem("just-talk-user-name");
    if (storedName) {
      setUserName(storedName);
    }
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("justTalkMessages", JSON.stringify(messages));
    }
  }, [messages]);

  // Focus input when modal opens
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isExpanded]);

  // Prevent body scroll when modal is open - Enhanced for iOS Safari
  useEffect(() => {
    if (isExpanded) {
      // Store current scroll position
      const scrollY = window.scrollY;
      
      // Apply styles to prevent background scrolling on iOS
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
      
      return () => {
        // Restore scroll position when modal closes
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.width = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isExpanded]);

  // Send message mutation
  const sendMutation = trpc.chat.sendMessage.useMutation({
    onSuccess: (data) => {
      if (data.clientId) {
        localStorage.setItem('just-talk-client-id', data.clientId);
      }
      
      const responseText = typeof data.response === 'string' ? data.response : '';
      setMessages(prev => [...prev, {
        role: "assistant",
        content: responseText,
        timestamp: Date.now()
      }]);
      setMessage("");
      setSelectedMood(undefined);
    },
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!message.trim() || sendMutation.isPending) return;
    
    // Track first message
    if (!hasStarted) {
      setHasStarted(true);
      onFirstMessage?.();
    }

    const userMessage: Message = {
      role: "user",
      content: message,
      mood: selectedMood,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMessage]);

    // Check if we're collecting name
    if (isCollectingName && !userName) {
      const name = message.trim();
      setUserName(name);
      localStorage.setItem('just-talk-user-name', name);
      setIsCollectingName(false);
      
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `Nice to meet you, ${name}. I'm here whenever you need to talk. What's on your mind tonight?`,
        timestamp: Date.now()
      }]);
      setMessage("");
      return;
    }
    
    const clientId = localStorage.getItem('just-talk-client-id') || undefined;
    sendMutation.mutate({
      message,
      clientId,
      mood: selectedMood,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleStartChat = () => {
    setIsExpanded(true);
    if (!userName) {
      setIsCollectingName(true);
      setMessages([{
        role: "assistant",
        content: "Hi there. I'm here to listen, no judgment. What should I call you?",
        timestamp: Date.now()
      }]);
    }
  };

  const handleClose = () => {
    setIsExpanded(false);
  };

  // CTA Button - always visible
  const CTAButton = (
    <button
      onClick={handleStartChat}
      className="w-full group relative overflow-hidden bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 hover:from-purple-700 hover:via-pink-600 hover:to-purple-700 text-white px-8 py-6 rounded-2xl text-xl font-bold shadow-2xl hover:shadow-purple-500/50 transition-all transform hover:scale-[1.02] border-2 border-white/20"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      <div className="flex items-center justify-center gap-3">
        <MessageCircle className="w-7 h-7" />
        <span>Start Chatting Free</span>
      </div>
      <p className="text-sm font-normal mt-2 text-purple-100">
        No signup required. Just talk.
      </p>
    </button>
  );

  return (
    <>
      {/* CTA Button */}
      <div className="w-full">
        {CTAButton}
      </div>

      {/* Modal Overlay - Rendered via Portal for proper z-index stacking */}
      {isExpanded && createPortal(
        <div 
          className="fixed inset-0 flex items-center justify-center"
          style={{ 
            zIndex: 9999,
            isolation: 'isolate',
            transform: 'translateZ(0)',
            WebkitTransform: 'translateZ(0)',
          }}
          onClick={handleClose}
        >
          {/* Backdrop - Solid background to fully cover page content */}
          <div 
            className="absolute inset-0 bg-black/80"
            style={{
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
            }}
          />
          
          {/* Modal Content */}
          <div 
            className="relative w-[calc(100%-2rem)] max-w-lg max-h-[80vh] flex flex-col bg-gradient-to-br from-purple-900 via-purple-800 to-pink-900 rounded-3xl overflow-hidden shadow-2xl border-2 border-white/20 animate-in fade-in zoom-in-95 duration-200 mx-auto my-auto"
            style={{
              transform: 'translateZ(0)',
              WebkitTransform: 'translateZ(0)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Chat Header */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-500 px-5 py-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <Heart className="w-6 h-6 text-white fill-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">Just Talk</h3>
                  <p className="text-sm text-purple-100">24/7 Support • Free</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="text-white hover:bg-white/20 rounded-full w-10 h-10"
              >
                <X className="w-6 h-6" />
              </Button>
            </div>

            {/* Messages Area */}
            <div 
              className="flex-1 overflow-y-auto p-5 space-y-4 min-h-[300px]"
              style={{ 
                maxHeight: "50vh",
                WebkitOverflowScrolling: 'touch',
              }}
            >
              {messages.length === 0 && !isCollectingName && (
                <div className="text-center py-10">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Heart className="w-10 h-10 text-white fill-white" />
                  </div>
                  <h4 className="text-xl font-bold text-white mb-2">You're not alone</h4>
                  <p className="text-purple-200">
                    Start typing whenever you're ready.
                  </p>
                </div>
              )}
              
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      msg.role === "user"
                        ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                        : "bg-white/10 border border-white/20 text-white"
                    }`}
                  >
                    {msg.mood && msg.role === "user" && (
                      <div className="text-xs opacity-80 mb-1">
                        {MOOD_OPTIONS.find(m => m.value === msg.mood)?.emoji}
                      </div>
                    )}
                    <div className="text-sm leading-relaxed break-words overflow-wrap-anywhere">
                      {msg.role === "assistant" ? (
                        <Streamdown>{msg.content}</Streamdown>
                      ) : (
                        <p className="whitespace-pre-wrap m-0 break-words">{msg.content}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {sendMutation.isPending && (
                <div className="flex justify-start">
                  <div className="bg-white/10 border border-white/20 rounded-2xl px-4 py-3">
                    <Loader2 className="w-5 h-5 animate-spin text-purple-300" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-white/10 bg-purple-900/80 p-4 flex-shrink-0">
              {/* Mood buttons */}
              <div className="flex gap-2 mb-3 justify-center">
                {MOOD_OPTIONS.map((mood) => (
                  <button
                    key={mood.value}
                    onClick={() => setSelectedMood(mood.value)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all ${
                      selectedMood === mood.value
                        ? "bg-purple-500 scale-110 ring-2 ring-white/50"
                        : "bg-white/10 hover:bg-white/20"
                    }`}
                    title={mood.label}
                  >
                    {mood.emoji}
                  </button>
                ))}
              </div>
              
              {/* Message input */}
              <div className="flex gap-3">
                <Textarea
                  ref={inputRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="What's on your mind..."
                  className="min-h-[56px] max-h-[120px] resize-none bg-white/10 border-white/20 text-white placeholder:text-purple-300 text-base rounded-xl"
                  disabled={sendMutation.isPending}
                />
                <Button
                  onClick={handleSend}
                  disabled={!message.trim() || sendMutation.isPending}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 h-14 w-14 rounded-xl"
                  size="icon"
                >
                  {sendMutation.isPending ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <Send className="w-6 h-6" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
