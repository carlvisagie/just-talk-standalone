import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Heart, Send, Loader2, Mic, Volume2 } from "lucide-react";
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

export default function Chat() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedMood, setSelectedMood] = useState<string | undefined>();
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [userName, setUserName] = useState<string | undefined>();
  const [isCollectingName, setIsCollectingName] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [trialMessagesRemaining, setTrialMessagesRemaining] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true; // Keep listening for continuous speech
      recognitionRef.current.interimResults = true; // Show interim results
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.maxAlternatives = 1;

      recognitionRef.current.onresult = (event: any) => {
        // Clear any existing silence timer
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }
        
        // Get the most recent result
        const lastResultIndex = event.results.length - 1;
        const result = event.results[lastResultIndex];
        const transcript = result[0].transcript;
        
        // Update message with transcript
        if (result.isFinal) {
          setMessage(prev => prev + (prev ? ' ' : '') + transcript);
          
          // Start silence timer - if no speech for 3 seconds, auto-send
          silenceTimerRef.current = setTimeout(() => {
            if (recognitionRef.current && isRecording) {
              setIsProcessing(true);
              recognitionRef.current.stop();
              setIsRecording(false);
              // Auto-send the message after silence
              setTimeout(() => {
                const sendButton = document.querySelector('[data-auto-send]') as HTMLButtonElement;
                if (sendButton) {
                  sendButton.click();
                  setIsProcessing(false);
                }
              }, 100);
            }
          }, 3000); // 3 second silence threshold for more natural pauses
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        setIsProcessing(false);
        // If error is 'no-speech', restart recognition
        if (event.error === 'no-speech' && isRecording) {
          setTimeout(() => {
            if (recognitionRef.current && !isRecording) {
              recognitionRef.current.start();
              setIsRecording(true);
            }
          }, 100);
        }
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
        // Clear silence timer
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      };
    }
  }, []);

  // Load messages and name from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("justTalkMessages");
    if (stored) {
      try {
        setMessages(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to load messages:", e);
      }
    }
    
    // Load stored name
    const storedName = localStorage.getItem("just-talk-user-name");
    if (storedName) {
      setUserName(storedName);
    } else {
      // First time user - ask for name
      setIsCollectingName(true);
      setMessages([{
        role: "assistant",
        content: "Hi there! I'm here to listen and support you. What would you like me to call you?",
        timestamp: Date.now()
      }]);
    }
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("justTalkMessages", JSON.stringify(messages));
    }
  }, [messages]);

  // Natural text-to-speech using OpenAI TTS API
  const ttsGenerate = trpc.tts.generateSpeech.useMutation();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const speak = async (text: string) => {
    if (isRecording) return; // Don't speak while user is recording
    
    try {
      setIsSpeaking(true);
      
      // Generate natural speech using OpenAI TTS
      const result = await ttsGenerate.mutateAsync({
        text,
        voice: "nova", // Warm, natural female voice
        speed: 0.95, // Slightly slower for empathy
      });
      
      // Convert base64 to audio and play
      const audioBlob = new Blob(
        [Uint8Array.from(atob(result.audio), c => c.charCodeAt(0))],
        { type: 'audio/mpeg' }
      );
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Clean up previous audio if exists
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }
      
      // Create and play new audio
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.onerror = () => {
        setIsSpeaking(false);
        console.error('[TTS] Audio playback error');
      };
      
      await audio.play();
    } catch (error) {
      console.error('[TTS] Error generating speech:', error);
      setIsSpeaking(false);
      // Fallback to browser TTS if API fails
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.85;
        utterance.onend = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  // Voice recording functions
  const startRecording = () => {
    if (recognitionRef.current && !isRecording) {
      setIsRecording(true);
      setMessage(""); // Clear previous message when starting new recording
      recognitionRef.current.start();
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      // Clear silence timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    }
  };

  // Send message mutation
  const sendMutation = trpc.chat.sendMessage.useMutation({
    onSuccess: (data) => {
      // Store client ID in localStorage for future requests
      if (data.clientId) {
        localStorage.setItem('just-talk-client-id', data.clientId);
      }
      
      // Update trial messages remaining
      if (typeof data.trialMessagesRemaining === 'number') {
        setTrialMessagesRemaining(data.trialMessagesRemaining);
      }
      
      // Add AI response to messages
      const responseText = typeof data.response === 'string' ? data.response : '';
      setMessages(prev => [...prev, {
        role: "assistant",
        content: responseText,
        timestamp: Date.now()
      }]);
      setMessage("");
      setSelectedMood(undefined);
      
      // Speak the response (only if not recording)
      if (!isRecording) {
        speak(responseText);
      }
    },
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!message.trim() || sendMutation.isPending) return;

    // Add user message to local state
    const userMessage: Message = {
      role: "user",
      content: message,
      mood: selectedMood,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMessage]);

    // Check if we're collecting name
    if (isCollectingName && !userName) {
      // This is the user's name
      const name = message.trim();
      setUserName(name);
      localStorage.setItem('just-talk-user-name', name);
      setIsCollectingName(false);
      
      // Welcome message
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `Nice to meet you, ${name}. I'm here whenever you need to talk. How are you feeling today?`,
        timestamp: Date.now()
      }]);
      setMessage("");
      return;
    }
    
    // Get client ID from localStorage (or undefined for new clients)
    const clientId = localStorage.getItem('just-talk-client-id') || undefined;

    // Send to AI with ProfileGuard
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100 dark:from-purple-950 dark:via-pink-950 dark:to-purple-900 flex flex-col">
      {/* Header */}
      <header className="border-b border-purple-200 dark:border-purple-800 bg-white/80 dark:bg-purple-900/50 backdrop-blur-sm">
        <div className="container py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Heart className="w-5 h-5 text-white fill-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg">Just Talk</h1>
            <p className="text-sm text-muted-foreground">24/7 Emotional Support</p>
          </div>
        </div>
      </header>

      {/* Trial Banner */}
      {trialMessagesRemaining !== null && (
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2 px-4 text-center text-sm">
          {trialMessagesRemaining > 0 ? (
            <span>
              <strong>{trialMessagesRemaining}</strong> free messages remaining. 
              <a href="/" className="underline font-semibold ml-1">Upgrade for unlimited</a>
            </span>
          ) : (
            <span>
              Free trial ended. 
              <a href="/" className="underline font-semibold ml-1">Upgrade to continue</a>
            </span>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 container py-6 overflow-y-auto">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Heart className="w-10 h-10 text-white fill-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2 text-purple-600 dark:text-purple-400">
                You're Not Alone
              </h2>
              <p className="text-muted-foreground">
                I'm here to listen without judgment. Tell me what's on your mind.
              </p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                    : "bg-white dark:bg-purple-900/50 border border-purple-200 dark:border-purple-800"
                }`}
              >
                {msg.mood && msg.role === "user" && (
                  <div className="text-xs opacity-80 mb-1">
                    Feeling: {MOOD_OPTIONS.find(m => m.value === msg.mood)?.emoji} {msg.mood}
                  </div>
                )}
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {msg.role === "assistant" ? (
                    <Streamdown>{msg.content}</Streamdown>
                  ) : (
                    <p className="whitespace-pre-wrap m-0">{msg.content}</p>
                  )}
                </div>
              </div>
            </div>
          ))}

          {sendMutation.isPending && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-purple-900/50 border border-purple-200 dark:border-purple-800 rounded-2xl px-4 py-3">
                <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-purple-200 dark:border-purple-800 bg-white/80 dark:bg-purple-900/50 backdrop-blur-sm">
        <div className="container py-4">
          <div className="max-w-3xl mx-auto">
            {/* Mood buttons */}
            <div className="flex gap-2 mb-3 justify-center flex-wrap">
              {MOOD_OPTIONS.map((mood) => (
                <Button
                  key={mood.value}
                  variant={selectedMood === mood.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedMood(mood.value)}
                  className={
                    selectedMood === mood.value
                      ? "bg-gradient-to-r from-purple-500 to-pink-500"
                      : ""
                  }
                  title={mood.label}
                >
                  {mood.emoji}
                </Button>
              ))}
            </div>

            {/* Message input */}
            <div className="flex gap-2">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Share what's on your mind..."
                className="min-h-[60px] resize-none"
                disabled={sendMutation.isPending || isRecording}
              />
              <div className="flex flex-col gap-2">
                {isRecording && (
                  <div className="text-xs text-center text-purple-600 dark:text-purple-400 font-medium animate-pulse">
                    🎤 Listening...
                  </div>
                )}
                {isProcessing && (
                  <div className="text-xs text-center text-purple-600 dark:text-purple-400 font-medium">
                    ⏳ Processing...
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={sendMutation.isPending || isProcessing}
                    className={isRecording ? "bg-red-500 hover:bg-red-600" : "bg-purple-500 hover:bg-purple-600"}
                    size="icon"
                    title={isRecording ? "Stop recording (or wait 3 sec)" : "Start voice input"}
                  >
                    <Mic className={`w-5 h-5 ${isRecording ? 'animate-pulse' : ''}`} />
                  </Button>
                  <Button
                  onClick={handleSend}
                  disabled={!message.trim() || sendMutation.isPending}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  size="icon"
                  data-auto-send
                >
                  {sendMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
