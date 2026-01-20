import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import {
  Send,
  Mic,
  MicOff,
  Sparkles,
  Scale,
  History,
  MessageSquare,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Volume2,
  Trash2,
  Filter,
  ChevronDown,
  Upload,
  FileCheck,
  Eye,
  Download,
} from "lucide-react";
import { jsPDF } from "jspdf";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { useChatHistory } from "@/hooks/useApi";
import { CitationViewer } from "./CitationViewer";
import { ConsultLawyerButton } from "./ConsultLawyerButton";

// Domain options for regulatory filtering
const LEGAL_DOMAINS = [
  { id: "all", label: "All Domains", labelHi: "सभी डोमेन", icon: "⚖️" },
  {
    id: "criminal",
    label: "Criminal Law",
    labelHi: "आपराधिक कानून",
    icon: "🔴",
  },
  { id: "civil", label: "Civil Law", labelHi: "नागरिक कानून", icon: "📜" },
  {
    id: "corporate",
    label: "Corporate Law",
    labelHi: "कॉर्पोरेट कानून",
    icon: "🏢",
  },
  {
    id: "it_cyber",
    label: "IT & Cyber Law",
    labelHi: "IT और साइबर कानून",
    icon: "💻",
  },
  {
    id: "financial",
    label: "Financial Law",
    labelHi: "वित्तीय कानून",
    icon: "💰",
  },
  { id: "labour", label: "Labour Law", labelHi: "श्रम कानून", icon: "👷" },
  {
    id: "environmental",
    label: "Environmental Law",
    labelHi: "पर्यावरण कानून",
    icon: "🌳",
  },
  { id: "family", label: "Family Law", labelHi: "पारिवारिक कानून", icon: "👨‍👩‍👧" },
  {
    id: "property",
    label: "Property Law",
    labelHi: "संपत्ति कानून",
    icon: "🏠",
  },
  {
    id: "constitutional",
    label: "Constitutional Law",
    labelHi: "संवैधानिक कानून",
    icon: "📕",
  },
];

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  contentHindi?: string;
  citations?: Citation[];
  statutes?: Statute[];
  timestamp: Date;
}

interface Citation {
  id: string;
  source: string;
  url: string;
  title: string;
  excerpt?: string;
}

interface Statute {
  id: string;
  section: string;
  act: string;
  content: string;
}

interface UploadedDocument {
  id: string;
  filename: string;
  status: "uploading" | "processing" | "ready" | "error";
  progress?: number;
}

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (message: string, domain?: string) => void;
  isProcessing: boolean;
  language: "en" | "hi";
  selectedDomain?: string;
  onLoadSession?: (sessionId: string) => void;
  onNewChat?: () => void;
}

// Speech Recognition Types
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: { error: string }) => void;
  onend: () => void;
  onstart: () => void;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export const ChatInterface = ({
  messages,
  onSendMessage,
  isProcessing,
  language,
  selectedDomain: propDomain,
  onLoadSession,
  onNewChat,
}: ChatInterfaceProps) => {
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [selectedDomain, setSelectedDomain] = useState(propDomain || "all");
  const [showDomainDropdown, setShowDomainDropdown] = useState(false);
  const [showCitationViewer, setShowCitationViewer] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(
    null,
  );
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocument[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const domainDropdownRef = useRef<HTMLDivElement>(null);

  // Fetch real chat history from backend
  const {
    sessions: chatHistory,
    loading: historyLoading,
    deleteSession,
  } = useChatHistory();

  // Handle document upload for citation verification
  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const docId = `doc_${Date.now()}`;

    setIsUploading(true);
    setUploadedDocs((prev) => [
      ...prev,
      {
        id: docId,
        filename: file.name,
        status: "uploading",
        progress: 0,
      },
    ]);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        "http://localhost:8000/api/documents/upload",
        {
          method: "POST",
          body: formData,
        },
      );

      if (response.ok) {
        const data = await response.json();
        setUploadedDocs((prev) =>
          prev.map((doc) =>
            doc.id === docId
              ? {
                ...doc,
                id: data.documentId || docId,
                status: "ready",
                progress: 100,
              }
              : doc,
          ),
        );
      } else {
        setUploadedDocs((prev) =>
          prev.map((doc) =>
            doc.id === docId ? { ...doc, status: "error" } : doc,
          ),
        );
      }
    } catch (error) {
      console.error("Upload failed:", error);
      setUploadedDocs((prev) =>
        prev.map((doc) =>
          doc.id === docId ? { ...doc, status: "error" } : doc,
        ),
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        domainDropdownRef.current &&
        !domainDropdownRef.current.contains(event.target as Node)
      ) {
        setShowDomainDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Check for speech recognition support
  useEffect(() => {
    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      setSpeechSupported(true);
      recognitionRef.current = new SpeechRecognitionAPI();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = language === "hi" ? "hi-IN" : "en-IN";

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = "";
        let interimText = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimText += transcript;
          }
        }

        if (finalTranscript) {
          setInput((prev) => prev + " " + finalTranscript.trim());
          setInterimTranscript("");
        } else {
          setInterimTranscript(interimText);
        }
      };

      recognitionRef.current.onerror = (event: { error: string }) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        setInterimTranscript("");
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        setInterimTranscript("");
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [language]);

  // Update language when it changes
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = language === "hi" ? "hi-IN" : "en-IN";
    }
  }, [language]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = () => {
    if (input.trim() && !isProcessing) {
      onSendMessage(
        input.trim(),
        selectedDomain === "all" ? undefined : selectedDomain,
      );
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const toggleVoiceInput = useCallback(() => {
    if (!speechSupported || !recognitionRef.current) {
      alert(
        language === "en"
          ? "Voice input is not supported in your browser. Please use Chrome or Edge."
          : "आपके ब्राउज़र में वॉइस इनपुट समर्थित नहीं है। कृपया Chrome या Edge का उपयोग करें।",
      );
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error("Failed to start speech recognition:", err);
      }
    }
  }, [speechSupported, isListening, language]);

  const placeholderText =
    language === "en"
      ? "Ask about IPC, BNS, or any Indian law..."
      : "IPC, BNS, या किसी भी भारतीय कानून के बारे में पूछें...";

  return (
    <div className="flex h-full">
      {/* Chat History Sidebar */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-r border-border bg-card/50 backdrop-blur-sm overflow-hidden"
          >
            <div className="p-4 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  <h3 className="font-serif font-bold text-lg text-foreground">
                    {language === "en" ? "Chat History" : "चैट इतिहास"}
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowHistory(false)}
                  className="h-8 w-8 rounded-full hover:bg-primary/10"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* New Chat Button */}
              <Button
                className="w-full mb-4 gap-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl"
                variant="ghost"
                onClick={() => onNewChat?.()}
              >
                <Plus className="h-4 w-4" />
                {language === "en" ? "New Chat" : "नई चैट"}
              </Button>

              {/* Chat Sessions List */}
              <div className="flex-1 overflow-y-auto space-y-2">
                {historyLoading ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
                    <p className="text-xs text-muted-foreground">
                      {language === "en"
                        ? "Loading history..."
                        : "इतिहास लोड हो रहा है..."}
                    </p>
                  </div>
                ) : chatHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <MessageSquare className="h-8 w-8 text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {language === "en"
                        ? "No chat history yet"
                        : "अभी तक कोई चैट इतिहास नहीं"}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {language === "en"
                        ? "Start a conversation to see it here"
                        : "यहाँ देखने के लिए बातचीत शुरू करें"}
                    </p>
                  </div>
                ) : (
                  chatHistory.map((session) => (
                    <motion.div
                      key={session.id}
                      whileHover={{ x: 4 }}
                      className="w-full p-3 rounded-xl text-left bg-background/50 hover:bg-primary/5 border border-transparent hover:border-primary/20 transition-all group relative"
                    >
                      <button
                        className="w-full text-left"
                        onClick={() => onLoadSession?.(session.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-primary/10 mt-0.5">
                            <MessageSquare className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-foreground truncate group-hover:text-primary transition-colors">
                              {session.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-muted-foreground">
                                {session.date}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                •
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {session.messageCount} messages
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                      {/* Delete Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSession(session.id);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-all"
                        title={
                          language === "en" ? "Delete session" : "सत्र हटाएं"
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Toggle History Button - Enhanced for Visibility */}
        <AnimatePresence>
          {!showHistory && (
            <motion.button
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              whileHover={{ x: 4 }}
              onClick={() => setShowHistory(true)}
              className={`absolute left-0 top-[35%] z-40 flex flex-col items-center gap-3 px-2.5 py-8 bg-card/90 backdrop-blur-2xl border border-l-0 border-border rounded-r-2xl shadow-[12px_0_30px_rgba(0,0,0,0.08)] hover:shadow-primary/15 hover:bg-primary/[0.02] transition-all duration-300 group`}
              title={language === "en" ? "History" : "इतिहास"}
            >
              <History className="h-6 w-6 text-muted-foreground group-hover:text-primary group-hover:scale-110 transition-all duration-500" />
              <span className="rotate-180 [writing-mode:vertical-lr] text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/50 group-hover:text-primary transition-all duration-300">
                {language === "en" ? "HISTORY" : "इतिहास"}
              </span>
              <div className="mt-2 text-muted-foreground/40 group-hover:text-primary transition-colors">
                <ChevronRight className="h-5 w-5 group-hover:translate-x-0.5 transition-transform" />
              </div>

              {/* Subtle indicator dot if history has items */}
              {chatHistory.length > 0 && (
                <div className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full animate-bounce shadow-[0_0_8px_rgba(var(--primary),0.6)]" />
              )}
            </motion.button>
          )}
        </AnimatePresence>

        {/* Export Chat Button */}
        {messages.length > 0 && (
          <div className="absolute top-4 right-4 z-40">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 bg-background/50 backdrop-blur-sm border-primary/20 hover:bg-primary/10 hover:text-primary transition-all shadow-sm"
              onClick={() => {
                const doc = new jsPDF();
                const pageWidth = doc.internal.pageSize.getWidth();
                const pageHeight = doc.internal.pageSize.getHeight();
                let yPos = 20;

                // Title
                doc.setFontSize(20);
                doc.setTextColor(44, 62, 80);
                doc.text("NYAYASHASTRA Legal Chat Export", 20, yPos);
                yPos += 10;

                // Metadata
                doc.setFontSize(10);
                doc.setTextColor(100, 100, 100);
                doc.text(`Date: ${new Date().toLocaleString()}`, 20, yPos);
                yPos += 20;

                // Content
                messages.forEach((msg) => {
                  // Check for page break
                  if (yPos > pageHeight - 40) {
                    doc.addPage();
                    yPos = 20;
                  }

                  // Role Header
                  doc.setFontSize(12);
                  doc.setFont("helvetica", "bold");
                  if (msg.role === "assistant") {
                    doc.setTextColor(0, 51, 102); // Dark Blue for AI
                    doc.text("NYAYASHASTRA AI", 20, yPos);
                  } else {
                    doc.setTextColor(44, 62, 80); // Dark Gray for User
                    doc.text("USER", 20, yPos);
                  }
                  yPos += 7;

                  // Message Body
                  doc.setFontSize(11);
                  doc.setFont("helvetica", "normal");
                  doc.setTextColor(0, 0, 0);

                  // Process text to fit width
                  const content =
                    msg.role === "assistant" &&
                      language === "hi" &&
                      msg.contentHindi
                      ? msg.contentHindi
                      : msg.content;
                  const splitText = doc.splitTextToSize(
                    content,
                    pageWidth - 40,
                  );

                  // Check if text block needs page break
                  if (yPos + splitText.length * 7 > pageHeight - 20) {
                    doc.addPage();
                    yPos = 20;
                  }

                  doc.text(splitText, 20, yPos);
                  yPos += splitText.length * 7 + 10;
                });

                doc.save("nyayashastra-chat-export.pdf");
              }}
            >
              <Download className="h-4 w-4" />
              {language === "en" ? "Export PDF" : "PDF निर्यात करें"}
            </Button>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6">
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center h-full text-center"
            >
              <div className="w-24 h-24 mb-6 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <Scale className="h-12 w-12 text-primary" />
              </div>
              <h2 className="text-2xl font-serif font-bold text-foreground mb-2">
                {language === "en"
                  ? "Welcome to NYAYASHASTRA"
                  : "न्यायशास्त्र में आपका स्वागत है"}
              </h2>
              <p className="text-muted-foreground max-w-md">
                {language === "en"
                  ? "Ask any question about Indian law, IPC, BNS, or legal procedures. I'm here to assist you with accurate legal information."
                  : "भारतीय कानून, IPC, BNS, या कानूनी प्रक्रियाओं के बारे में कोई भी प्रश्न पूछें। मैं सटीक कानूनी जानकारी के साथ आपकी सहायता के लिए यहाँ हूँ।"}
              </p>

              {/* Quick Start Suggestions */}
              <div className="mt-8 flex flex-wrap gap-3 justify-center max-w-2xl">
                {[
                  language === "en"
                    ? "What is IPC Section 302?"
                    : "IPC धारा 302 क्या है?",
                  language === "en"
                    ? "Explain BNS vs IPC"
                    : "BNS बनाम IPC समझाएं",
                  language === "en"
                    ? "How to file an FIR?"
                    : "FIR कैसे दर्ज करें?",
                ].map((suggestion, idx) => (
                  <motion.button
                    key={idx}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onSendMessage(suggestion)}
                    className="px-4 py-2 rounded-full bg-primary/5 border border-primary/20 text-sm text-foreground hover:bg-primary/10 hover:border-primary/30 transition-all"
                  >
                    {suggestion}
                  </motion.button>
                ))}
              </div>

              {/* Consult a Lawyer CTA */}
              <div className="mt-8">
                <ConsultLawyerButton language={language} variant="banner" />
              </div>
            </motion.div>
          )}

          <AnimatePresence mode="popLayout">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] md:max-w-[75%] relative group ${message.role === "user"
                      ? "bg-primary/10 border border-primary/20 rounded-2xl rounded-br-md px-5 py-4"
                      : "bg-card/80 backdrop-blur-sm border border-border rounded-2xl rounded-bl-md px-6 py-5 shadow-lg"
                    }`}
                >
                  {/* Message Header */}
                  {message.role === "assistant" && (
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/50">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                        <Scale className="h-3 w-3 text-white" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-primary">
                        {language === "en"
                          ? "NYAYASHASTRA AI"
                          : "न्यायशास्त्र AI"}
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {new Date(message.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  )}

                  {/* Message Content */}
                  <div
                    className={`text-sm leading-relaxed ${language === "hi" ? "text-hindi" : ""} ${message.role === "user" ? "text-foreground" : "text-foreground/90"}`}
                  >
                    {message.role === "assistant" ? (
                      <ReactMarkdown
                        components={{
                          h1: ({ children }) => (
                            <h1 className="text-xl font-bold mt-4 mb-2 text-foreground">
                              {children}
                            </h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className="text-lg font-bold mt-4 mb-2 text-foreground">
                              {children}
                            </h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className="text-base font-semibold mt-3 mb-1.5 text-foreground">
                              {children}
                            </h3>
                          ),
                          h4: ({ children }) => (
                            <h4 className="text-sm font-semibold mt-2 mb-1 text-foreground">
                              {children}
                            </h4>
                          ),
                          p: ({ children }) => (
                            <p className="mb-3 leading-relaxed">{children}</p>
                          ),
                          strong: ({ children }) => (
                            <strong className="font-bold text-foreground">
                              {children}
                            </strong>
                          ),
                          em: ({ children }) => (
                            <em className="italic text-foreground/80">
                              {children}
                            </em>
                          ),
                          ul: ({ children }) => (
                            <ul className="list-disc list-inside mb-3 space-y-1 ml-2">
                              {children}
                            </ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="list-decimal list-inside mb-3 space-y-1 ml-2">
                              {children}
                            </ol>
                          ),
                          li: ({ children }) => (
                            <li className="leading-relaxed">{children}</li>
                          ),
                          blockquote: ({ children }) => (
                            <blockquote className="border-l-4 border-primary/50 pl-4 py-1 my-3 italic bg-muted/30 rounded-r-lg">
                              {children}
                            </blockquote>
                          ),
                          code: ({ children }) => (
                            <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">
                              {children}
                            </code>
                          ),
                          hr: () => <hr className="my-4 border-border/50" />,
                        }}
                      >
                        {language === "hi" && message.contentHindi
                          ? message.contentHindi
                          : message.content}
                      </ReactMarkdown>
                    ) : (
                      <span className="whitespace-pre-wrap">
                        {language === "hi" && message.contentHindi
                          ? message.contentHindi
                          : message.content}
                      </span>
                    )}
                  </div>

                  {/* Citations with Interactive Viewer */}
                  {message.citations && message.citations.length > 0 ? (
                    <div className="mt-4 pt-3 border-t border-border/40">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-muted-foreground font-medium">
                          {language === "en"
                            ? "📚 Sources & Citations"
                            : "📚 स्रोत और उद्धरण"}
                        </p>
                        <span className="text-[10px] px-2 py-0.5 bg-green-500/10 text-green-600 rounded-full flex items-center gap-1">
                          <FileCheck className="h-3 w-3" />
                          {language === "en"
                            ? "Verified Sources"
                            : "सत्यापित स्रोत"}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {message.citations.map((citation) => (
                          <button
                            key={citation.id}
                            onClick={() => {
                              setSelectedCitation(citation);
                              setShowCitationViewer(true);
                            }}
                            className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/20 text-xs text-foreground hover:bg-primary/10 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10 transition-all"
                          >
                            <Scale className="h-3 w-3 text-primary" />
                            <span className="truncate max-w-[180px]">
                              {citation.title}
                            </span>
                            <Eye className="h-3 w-3 text-primary/50 group-hover:text-primary transition-colors" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    message.role === "assistant" && (
                      <div className="mt-4 pt-3 border-t border-border/40">
                        <p className="text-xs text-muted-foreground italic">
                          {language === "en"
                            ? "No citations available for this response"
                            : "इस प्रतिक्रिया के लिए कोई उद्धरण उपलब्ध नहीं है"}
                        </p>
                      </div>
                    )
                  )}

                  {/* User message timestamp */}
                  {message.role === "user" && (
                    <div className="text-xs text-muted-foreground mt-2 text-right">
                      {new Date(message.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Processing Indicator */}
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="bg-card/80 backdrop-blur-sm border border-border rounded-2xl rounded-bl-md px-6 py-4 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-foreground">
                      {language === "en"
                        ? "Analyzing your legal query..."
                        : "आपके कानूनी प्रश्न का विश्लेषण..."}
                    </span>
                    <div className="flex gap-1 mt-1">
                      <span
                        className="h-2 w-2 rounded-full bg-primary animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      />
                      <span
                        className="h-2 w-2 rounded-full bg-primary animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      />
                      <span
                        className="h-2 w-2 rounded-full bg-primary animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-border p-4 md:p-6 bg-gradient-to-t from-background to-background/80 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto">
            {/* Voice Recording Indicator */}
            <AnimatePresence>
              {isListening && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="mb-3 flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20"
                >
                  <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-sm text-red-600 dark:text-red-400 font-medium">
                    {language === "en"
                      ? "Listening... Speak now"
                      : "सुन रहे हैं... अब बोलें"}
                  </span>
                  {interimTranscript && (
                    <span className="text-sm text-muted-foreground italic ml-2">
                      "{interimTranscript}"
                    </span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl blur opacity-50" />
              <div className="relative bg-card/80 backdrop-blur-md border border-border rounded-2xl shadow-xl flex items-end">
                {/* Domain Selector Button */}
                <div className="relative z-20" ref={domainDropdownRef}>
                  <Button
                    onClick={() => setShowDomainDropdown(!showDomainDropdown)}
                    variant="ghost"
                    size="sm"
                    className="h-10 ml-3 mb-2.5 gap-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-all bg-muted/30"
                    title={
                      language === "en"
                        ? "Filter by domain"
                        : "डोमेन द्वारा फ़िल्टर करें"
                    }
                  >
                    <span className="text-xl">
                      {LEGAL_DOMAINS.find((d) => d.id === selectedDomain)
                        ?.icon || "⚖️"}
                    </span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 opacity-50 transition-transform duration-300 ${showDomainDropdown ? "rotate-180" : ""}`}
                    />
                  </Button>

                  {/* Domain Dropdown Menu */}
                  <AnimatePresence>
                    {showDomainDropdown && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: -4 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        className="absolute bottom-full left-0 mb-3 w-64 bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl z-50 overflow-hidden"
                      >
                        <div className="p-3 border-b border-border bg-muted/20">
                          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-primary/70 px-1">
                            {language === "en"
                              ? "Legal Framework"
                              : "कानूनी ढांचा"}
                          </p>
                        </div>
                        <div className="p-1.5 max-h-[320px] overflow-y-auto custom-scrollbar">
                          {LEGAL_DOMAINS.map((domain) => (
                            <button
                              key={domain.id}
                              onClick={() => {
                                setSelectedDomain(domain.id);
                                setShowDomainDropdown(false);
                              }}
                              className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm transition-all duration-200 ${selectedDomain === domain.id
                                  ? "bg-primary/15 text-primary font-bold shadow-sm"
                                  : "hover:bg-primary/5 text-foreground/80 hover:text-primary"
                                }`}
                            >
                              <span className="text-xl filter drop-shadow-sm">
                                {domain.icon}
                              </span>
                              <span className="flex-1 text-left">
                                {language === "en"
                                  ? domain.label
                                  : domain.labelHi}
                              </span>
                              {selectedDomain === domain.id && (
                                <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
                              )}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* File Upload Button - Next to Domain Selector */}
                <div className="relative z-20">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".pdf,.doc,.docx,.txt"
                    className="hidden"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="ghost"
                    size="sm"
                    disabled={isUploading}
                    className={`h-10 mb-2.5 gap-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-all bg-muted/30 ${isUploading ? "animate-pulse" : ""}`}
                    title={
                      language === "en"
                        ? "Upload document for verification"
                        : "सत्यापन के लिए दस्तावेज़ अपलोड करें"
                    }
                  >
                    <Upload
                      className={`h-4 w-4 ${isUploading ? "animate-bounce" : ""}`}
                    />
                    {uploadedDocs.length > 0 && (
                      <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                        {
                          uploadedDocs.filter((d) => d.status === "ready")
                            .length
                        }
                      </span>
                    )}
                  </Button>

                  {/* Upload Status Indicator */}
                  <AnimatePresence>
                    {uploadedDocs.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        className="absolute bottom-full left-0 mb-2 w-56 bg-card/95 backdrop-blur-xl border border-border rounded-xl shadow-lg z-50 p-2"
                      >
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">
                          {language === "en"
                            ? "Uploaded Documents"
                            : "अपलोड किए गए दस्तावेज़"}
                        </p>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {uploadedDocs.map((doc) => (
                            <div
                              key={doc.id}
                              className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-muted/30 text-xs"
                            >
                              <FileCheck
                                className={`h-3 w-3 ${doc.status === "ready" ? "text-green-500" : doc.status === "error" ? "text-red-500" : "text-yellow-500 animate-pulse"}`}
                              />
                              <span className="truncate flex-1">
                                {doc.filename}
                              </span>
                              <button
                                onClick={() =>
                                  setUploadedDocs((prev) =>
                                    prev.filter((d) => d.id !== doc.id),
                                  )
                                }
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isListening
                      ? language === "en"
                        ? "Listening..."
                        : "सुन रहे हैं..."
                      : placeholderText
                  }
                  className={`flex-1 min-h-[60px] max-h-[200px] resize-none text-base border-0 bg-transparent focus:ring-0 focus-visible:ring-0 px-4 py-4 pr-24 ${language === "hi" ? "text-hindi" : ""
                    }`}
                  disabled={isProcessing}
                />

                <div className="absolute right-2 bottom-2 flex items-center gap-1">
                  {/* Voice Input Button */}
                  <Button
                    onClick={toggleVoiceInput}
                    variant="ghost"
                    size="icon"
                    disabled={isProcessing}
                    className={`h-10 w-10 rounded-full transition-all ${isListening
                        ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                        : "hover:bg-primary/10 text-muted-foreground hover:text-primary"
                      }`}
                    title={
                      language === "en"
                        ? isListening
                          ? "Stop recording"
                          : "Start voice input"
                        : isListening
                          ? "रिकॉर्डिंग बंद करें"
                          : "वॉइस इनपुट शुरू करें"
                    }
                  >
                    {isListening ? (
                      <MicOff className="h-5 w-5" />
                    ) : (
                      <Mic className="h-5 w-5" />
                    )}
                  </Button>

                  {/* Send Button */}
                  <Button
                    onClick={handleSubmit}
                    disabled={!input.trim() || isProcessing}
                    size="icon"
                    className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Helper Text */}
            <div className="flex items-center justify-between gap-4 mt-3">
              <p className="text-xs text-muted-foreground text-center flex-1">
                {speechSupported ? (
                  <>
                    <Volume2 className="h-3 w-3 inline mr-1" />
                    {language === "en"
                      ? "Press the mic button to speak your query"
                      : "अपना प्रश्न बोलने के लिए माइक बटन दबाएं"}
                  </>
                ) : language === "en" ? (
                  "Type your legal query or press Enter to send"
                ) : (
                  "अपना कानूनी प्रश्न टाइप करें या भेजने के लिए Enter दबाएं"
                )}
              </p>
              <ConsultLawyerButton language={language} variant="compact" />
            </div>
          </div>
        </div>
      </div>

      {/* Citation Viewer Modal */}
      <CitationViewer
        isOpen={showCitationViewer}
        onClose={() => {
          setShowCitationViewer(false);
          setSelectedCitation(null);
        }}
        citation={selectedCitation}
        language={language}
      />
    </div>
  );
};
