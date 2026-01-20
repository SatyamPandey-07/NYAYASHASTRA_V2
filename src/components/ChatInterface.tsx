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
  Copy,
  Check,
  Share2,
} from "lucide-react";
import { jsPDF } from "jspdf";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { useChatHistory } from "@/hooks/useApi";
import { CitationViewer } from "./CitationViewer";
import { ConsultLawyerButton } from "./ConsultLawyerButton";

// Domain options for regulatory filtering - matches data folder structure
const LEGAL_DOMAINS = [
  { id: "all", label: "All Domains", labelHi: "सभी डोमेन", icon: "⚖️" },
  {
    id: "Criminal",
    label: "Criminal Law",
    labelHi: "आपराधिक कानून",
    icon: "🔴",
  },
  {
    id: "Civil_Family",
    label: "Civil & Family Law",
    labelHi: "सिविल और पारिवारिक कानून",
    icon: "👨‍👩‍👧",
  },
  {
    id: "Corporate",
    label: "Corporate & Tax Law",
    labelHi: "कॉर्पोरेट और कर कानून",
    icon: "🏢",
  },
  {
    id: "Consitutional",
    label: "Constitutional Law",
    labelHi: "संवैधानिक कानून",
    icon: "📕",
  },
  {
    id: "IT_Cyber",
    label: "IT & Cyber Law",
    labelHi: "IT और साइबर कानून",
    icon: "💻",
  },
  {
    id: "Environment",
    label: "Environmental Law",
    labelHi: "पर्यावरण कानून",
    icon: "🌳",
  },
  {
    id: "Property",
    label: "Property Law",
    labelHi: "संपत्ति कानून",
    icon: "🏠",
  },
  {
    id: "Traffic",
    label: "Traffic Law",
    labelHi: "यातायात कानून",
    icon: "🚗",
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
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const domainDropdownRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync selected domain with props
  useEffect(() => {
    if (propDomain && propDomain !== selectedDomain) {
      setSelectedDomain(propDomain);
    }
  }, [propDomain]);
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
    const localDocId = `doc_${Date.now()}`;

    setIsUploading(true);
    setUploadedDocs((prev) => [
      ...prev,
      {
        id: localDocId,
        filename: file.name,
        status: "uploading",
        progress: 10,
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
        const serverDocId = data.document_id || localDocId;
        
        // Update with server document ID
        setUploadedDocs((prev) =>
          prev.map((doc) =>
            doc.id === localDocId
              ? {
                ...doc,
                id: serverDocId,
                status: "processing",
                progress: 30,
              }
              : doc,
          ),
        );
        
        // Start polling for status updates
        pollDocumentStatus(serverDocId, localDocId);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setUploadedDocs((prev) =>
          prev.map((doc) =>
            doc.id === localDocId ? { ...doc, status: "error", error: errorData.detail || "Upload failed" } : doc,
          ),
        );
      }
    } catch (error) {
      console.error("Upload failed:", error);
      setUploadedDocs((prev) =>
        prev.map((doc) =>
          doc.id === localDocId ? { ...doc, status: "error", error: "Network error" } : doc,
        ),
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };
  
  // Poll document processing status
  const pollDocumentStatus = async (docId: string, localId: string) => {
    const maxAttempts = 30; // Max 60 seconds
    let attempts = 0;
    
    const poll = async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/documents/status/${docId}`);
        if (!response.ok) {
          throw new Error("Failed to get status");
        }
        
        const status = await response.json();
        
        setUploadedDocs((prev) =>
          prev.map((doc) =>
            doc.id === docId
              ? {
                ...doc,
                status: status.status,
                progress: status.progress || 0,
                summary: status.summary,
              }
              : doc,
          ),
        );
        
        // Continue polling if not done
        if (status.status !== "completed" && status.status !== "error" && attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 2000);
        }
      } catch (error) {
        console.error("Status poll error:", error);
        setUploadedDocs((prev) =>
          prev.map((doc) =>
            doc.id === docId ? { ...doc, status: "error" } : doc,
          ),
        );
      }
    };
    
    // Start polling after a brief delay
    setTimeout(poll, 1500);
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

  // Clean legal text for export (mirrors backend _clean_legal_text)
  const cleanLegalText = (text: string): string => {
    if (!text) return "";
    
    let cleaned = text;
    
    // Step 1: Fix punctuation spacing
    cleaned = cleaned.replace(/([,;:])([a-zA-Z])/g, "$1 $2");
    
    // Step 2: Add space before/after parentheses
    cleaned = cleaned.replace(/([a-zA-Z])\(/g, "$1 (");
    cleaned = cleaned.replace(/\)([a-zA-Z])/g, ") $1");
    
    // Step 3: Fix common concatenated words
    const fixes: [RegExp, string][] = [
      [/ofsection/gi, "of section"],
      [/underthis/gi, "under this"],
      [/withorwithout/gi, "with or without"],
      [/sixmonthsormore/gi, "six months or more"],
      [/aswellas/gi, "as well as"],
      [/meansathing/gi, "means a thing"],
      [/meansa/gi, "means a "],
      [/theword/gi, "the word"],
      [/thesame/gi, "the same"],
      [/speciallaw/gi, "special law"],
      [/locallaw/gi, "local law"],
      [/undersuchlaw/gi, "under such law"],
      [/orunder/gi, "or under"],
      [/andthe/gi, "and the"],
      [/shallhave/gi, "shall have"],
      [/meaningwhen/gi, "meaning when"],
      [/actpunishable/gi, "act punishable"],
      [/ispunishable/gi, "is punishable"],
      [/imprisonmentfor/gi, "imprisonment for"],
      [/atermofsix/gi, "a term of six"],
      [/monthsormore/gi, "months or more"],
      [/withoutfine/gi, "without fine"],
      [/denotesas/gi, "denotes as"],
      [/wellasa/gi, "well as a"],
      [/asingle/gi, "a single"],
      [/thingpunishable/gi, "thing punishable"],
      [/lawwith/gi, "law with"],
      [/lawor/gi, "law or"],
      [/lawis/gi, "law is"],
      [/lawunder/gi, "law under"],
      [/fora/gi, "for a"],
      [/asa/gi, "as a"],
      [/aswell/gi, "as well"],
      [/wellasa/gi, "well as a"],
      [/underany/gi, "under any"],
      [/whenthe/gi, "when the"],
      [/ofthe/gi, "of the"],
      [/inthe/gi, "in the"],
      [/tothe/gi, "to the"],
      [/suchlaw/gi, "such law"],
      [/anylaw/gi, "any law"],
      [/offencemeans/gi, "offence means"],
      [/sectionand/gi, "section and"],
      [/sectionor/gi, "section or"],
      [/sectionof/gi, "section of"],
      [/omissionsasa/gi, "omissions as a"],
      [/omissionsas/gi, "omissions as"],
      [/seriesof/gi, "series of"],
      [/termof/gi, "term of"],
      [/monthsor/gi, "months or"],
      [/yearsor/gi, "years or"],
      [/whetherbyhimself/gi, "whether by himself"],
      [/orasamember/gi, "or as a member"],
      [/anybodyof/gi, "any body of"],
      [/incorporatedornot/gi, "incorporated or not"],
      [/anycompanyor/gi, "any company or"],
      [/associationor/gi, "association or"],
      [/bodyofpersons/gi, "body of persons"],
      [/classofthe/gi, "class of the"],
      [/publicor/gi, "public or"],
      [/anycommunity/gi, "any community"],
      [/publicservant/gi, "public servant"],
      [/fallingunder/gi, "falling under"],
      [/anyofthe/gi, "any of the"],
      [/descriptions/gi, "descriptions"],
      [/everycommissioned/gi, "every commissioned"],
      [/officerinthe/gi, "officer in the"],
      [/everyJudge/gi, "every Judge"],
      [/anyperson/gi, "any person"],
      [/empoweredby/gi, "empowered by"],
      [/lawtodischarge/gi, "law to discharge"],
      [/adjudicatoryfunctions/gi, "adjudicatory functions"],
      [/everyofficerof/gi, "every officer of"],
      [/Courtincluding/gi, "Court including"],
      [/aliquidator/gi, "a liquidator"],
      [/receiveror/gi, "receiver or"],
      [/commissioner/gi, "commissioner"],
      [/whoseduty/gi, "whose duty"],
      [/itis/gi, "it is"],
      [/assuch/gi, "as such"],
      [/committingdacoity/gi, "committing dacoity"],
      [/shallbepunished/gi, "shall be punished"],
      [/withimprisonment/gi, "with imprisonment"],
      [/forlife/gi, "for life"],
      [/rigorousimprisonment/gi, "rigorous imprisonment"],
      [/mayextendto/gi, "may extend to"],
      [/shallalsobeliable/gi, "shall also be liable"],
      [/tofine/gi, "to fine"],
      [/notbeless/gi, "not be less"],
      [/thanseven/gi, "than seven"],
    ];
    
    for (const [pattern, replacement] of fixes) {
      cleaned = cleaned.replace(pattern, replacement);
    }
    
    // Step 4: Add space between lowercase-uppercase (CamelCase)
    cleaned = cleaned.replace(/([a-z])([A-Z])/g, "$1 $2");
    
    // Step 5: Add space between closing quote and letter
    cleaned = cleaned.replace(/(["'])([a-zA-Z])/g, "$1 $2");
    
    // Step 6: Fix multiple spaces
    cleaned = cleaned.replace(/\s+/g, " ").trim();
    
    return cleaned;
  };

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
                          <div className="p-2 rounded-lg bg-primary/10 mt-0.5 w-9 h-9 flex items-center justify-center text-sm">
                            {LEGAL_DOMAINS.find(d => d.id === session.domain)?.icon || "💬"}
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

                  {/* Copy, Share, Download Actions for Assistant Messages */}
                  {message.role === "assistant" && (
                    <div className="mt-4 pt-3 border-t border-border/40 flex items-center gap-2 flex-wrap">
                      {/* Copy Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-3 text-xs gap-1.5 hover:bg-primary/10"
                        onClick={async () => {
                          const rawText = language === "hi" && message.contentHindi
                            ? message.contentHindi
                            : message.content;
                          const textToCopy = cleanLegalText(rawText);
                          await navigator.clipboard.writeText(textToCopy);
                          setCopiedMessageId(message.id);
                          setTimeout(() => setCopiedMessageId(null), 2000);
                        }}
                      >
                        {copiedMessageId === message.id ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-green-500" />
                            <span className="text-green-600">
                              {language === "en" ? "Copied!" : "कॉपी हो गया!"}
                            </span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            {language === "en" ? "Copy" : "कॉपी करें"}
                          </>
                        )}
                      </Button>

                      {/* WhatsApp Share Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-3 text-xs gap-1.5 hover:bg-green-500/10 text-green-600"
                        onClick={() => {
                          const rawText = language === "hi" && message.contentHindi
                            ? message.contentHindi
                            : message.content;
                          
                          // Format for WhatsApp with bullets and paragraphs
                          const formatForWhatsApp = (text: string): string => {
                            // Clean the text first
                            let cleaned = cleanLegalText(text);
                            
                            // Remove markdown
                            cleaned = cleaned
                              .replace(/\*\*/g, "")
                              .replace(/\*/g, "")
                              .replace(/#{1,6}\s*/g, "");
                            
                            // Split into sections
                            const sections = cleaned.split(/\n\n+/);
                            let formatted = "";
                            
                            sections.forEach((section, idx) => {
                              const trimmed = section.trim();
                              if (!trimmed) return;
                              
                              // Check if header
                              const isHeader = /^(Legal Analysis|Applicable|Regulatory|Sources|Disclaimer|Section|IPC|BNS|Key|Important)/i.test(trimmed);
                              
                              if (isHeader) {
                                // WhatsApp bold for headers
                                const headerLine = trimmed.split("\n")[0].substring(0, 80);
                                formatted += `\n*${headerLine}*\n\n`;
                                
                                // Get remaining content
                                const content = trimmed.substring(headerLine.length).trim();
                                if (content) {
                                  const sentences = content.split(/(?<=[.;])\s+/).filter(s => s.trim().length > 5);
                                  sentences.forEach(s => {
                                    formatted += `• ${s.trim()}\n`;
                                  });
                                  formatted += "\n";
                                }
                              } else {
                                // Regular section - make bullets
                                const sentences = trimmed.split(/(?<=[.;])\s+/).filter(s => s.trim().length > 5);
                                if (sentences.length > 1) {
                                  sentences.forEach(s => {
                                    formatted += `• ${s.trim()}\n`;
                                  });
                                } else if (sentences.length === 1) {
                                  formatted += `${sentences[0].trim()}\n`;
                                }
                                formatted += "\n";
                              }
                            });
                            
                            return formatted.trim();
                          };
                          
                          const formattedText = formatForWhatsApp(rawText);
                          
                          // Truncate for WhatsApp (increased limit to include more content)
                          const truncated = formattedText.length > 3500
                            ? formattedText.substring(0, 3500) + "\n\n_...Read more on NyayaShastra_"
                            : formattedText;
                          
                          const shareText = encodeURIComponent(
                            `📜 *NYAYASHASTRA*\n_AI Legal Analysis_\n${"━".repeat(20)}\n\n${truncated}\n\n${"━".repeat(20)}\n🔗 _Powered by NyayaShastra AI_`
                          );
                          window.open(`https://wa.me/?text=${shareText}`, "_blank");
                        }}
                      >
                        <Share2 className="h-3.5 w-3.5" />
                        WhatsApp
                      </Button>

                      {/* Download PDF Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-3 text-xs gap-1.5 hover:bg-primary/10"
                        onClick={() => {
                          try {
                            const rawContent = language === "hi" && message.contentHindi
                              ? message.contentHindi
                              : message.content;
                            
                            // Deep clean function for PDF - very aggressive
                            const deepCleanForPDF = (text: string): string => {
                              let cleaned = text;
                              
                              // Fix all punctuation spacing
                              cleaned = cleaned.replace(/([,;:])([a-zA-Z])/g, "$1 $2");
                              cleaned = cleaned.replace(/([a-zA-Z])(\()/g, "$1 (");
                              cleaned = cleaned.replace(/(\))([a-zA-Z])/g, ") $1");
                              
                              // Aggressive word separation - add space before common words
                              const commonWords = [
                                "the", "and", "or", "of", "to", "in", "for", "with", "under", "by",
                                "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
                                "shall", "may", "can", "will", "would", "should", "could", "must",
                                "any", "all", "such", "this", "that", "which", "who", "whom",
                                "section", "Section", "sub-section", "clause", "Act", "Code",
                                "offence", "offense", "person", "public", "court", "law", "punishment",
                                "imprisonment", "fine", "years", "months", "days", "term",
                                "means", "includes", "whether", "wherever", "whenever", "without"
                              ];
                              
                              commonWords.forEach(word => {
                                // Add space before if preceded by lowercase
                                const regex = new RegExp(`([a-z])${word}`, "g");
                                cleaned = cleaned.replace(regex, `$1 ${word}`);
                              });
                              
                              // Fix lowercase followed by uppercase
                              cleaned = cleaned.replace(/([a-z])([A-Z])/g, "$1 $2");
                              
                              // Fix quotes
                              cleaned = cleaned.replace(/"([a-zA-Z])/g, '" $1');
                              cleaned = cleaned.replace(/([a-zA-Z])"/g, '$1 "');
                              
                              // Remove emojis
                              cleaned = cleaned.replace(/[\u{1F300}-\u{1F9FF}]/gu, "");
                              
                              // Fix multiple spaces
                              cleaned = cleaned.replace(/\s+/g, " ");
                              
                              return cleaned.trim();
                            };
                            
                            // Apply deep cleaning
                            const cleanedContent = deepCleanForPDF(cleanLegalText(rawContent));
                            
                            const doc = new jsPDF();
                            const pageWidth = doc.internal.pageSize.getWidth();
                            const pageHeight = doc.internal.pageSize.getHeight();
                            const margin = 20;
                            const maxWidth = pageWidth - margin * 2;
                            const lineHeight = 6; // Increased line height
                            let currentPage = 1;
                            
                            // Helper to add page header
                            const addHeader = () => {
                              doc.setFillColor(201, 162, 39);
                              doc.rect(0, 0, pageWidth, 12, "F");
                              doc.setTextColor(255, 255, 255);
                              doc.setFontSize(9);
                              doc.setFont("helvetica", "bold");
                              doc.text("NYAYASHASTRA - Legal Analysis Report", margin, 8);
                              doc.setTextColor(0, 0, 0);
                            };
                            
                            // Helper to add page footer
                            const addFooter = () => {
                              doc.setFontSize(8);
                              doc.setTextColor(128, 128, 128);
                              doc.text(`Page ${currentPage}`, pageWidth / 2, pageHeight - 8, { align: "center" });
                            };
                            
                            // Add first page
                            addHeader();
                            
                            let y = 25;
                            
                            // Title
                            doc.setTextColor(0, 0, 0);
                            doc.setFontSize(14);
                            doc.setFont("helvetica", "bold");
                            doc.text("Legal Analysis Report", margin, y);
                            y += 8;
                            
                            // Date
                            doc.setFontSize(9);
                            doc.setFont("helvetica", "normal");
                            doc.setTextColor(100, 100, 100);
                            doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, margin, y);
                            y += 5;
                            
                            // Divider
                            doc.setDrawColor(201, 162, 39);
                            doc.setLineWidth(0.5);
                            doc.line(margin, y, pageWidth - margin, y);
                            y += 10;
                            
                            // Content processing - convert to bullets and paragraphs
                            doc.setTextColor(0, 0, 0);
                            doc.setFontSize(10);
                            doc.setFont("helvetica", "normal");
                            
                            // Helper to check page break
                            const checkPageBreak = (neededSpace: number = 20) => {
                              if (y > pageHeight - neededSpace) {
                                addFooter();
                                doc.addPage();
                                currentPage++;
                                addHeader();
                                y = 20;
                                doc.setFont("helvetica", "normal");
                                doc.setFontSize(10);
                                doc.setTextColor(0, 0, 0);
                              }
                            };
                            
                            // Clean and structure content
                            let processedContent = cleanedContent
                              .replace(/\*\*/g, "")
                              .replace(/\*/g, "")
                              .replace(/#{1,6}\s*/g, "")
                              .replace(/\n{3,}/g, "\n\n");
                            
                            // Split content into logical sections
                            const sections = processedContent.split(/\n\n+/);
                            
                            sections.forEach((section, sIdx) => {
                              const trimmedSection = section.trim();
                              if (!trimmedSection) return;
                              
                              // Add section spacing
                              if (sIdx > 0) {
                                y += 6;
                              }
                              
                              checkPageBreak(30);
                              
                              // Check if this is a header/title
                              const isHeader = /^(Legal Analysis|Applicable|Regulatory|Sources|Disclaimer|Section|IPC|BNS|Key|Important)/i.test(trimmedSection) ||
                                              /^[A-Z][A-Za-z\s]{5,}:/.test(trimmedSection);
                              
                              if (isHeader) {
                                // Print as section header
                                doc.setFillColor(245, 240, 230);
                                doc.rect(margin - 2, y - 4, maxWidth + 4, 8, "F");
                                doc.setFont("helvetica", "bold");
                                doc.setFontSize(10);
                                doc.setTextColor(50, 50, 50);
                                
                                const headerText = trimmedSection.split("\n")[0].substring(0, 80);
                                doc.text(headerText, margin, y);
                                y += 10;
                                
                                doc.setFont("helvetica", "normal");
                                doc.setFontSize(10);
                                doc.setTextColor(0, 0, 0);
                                
                                // Process remaining content as bullets
                                const headerContent = trimmedSection.substring(headerText.length).trim();
                                if (headerContent) {
                                  const sentences = headerContent
                                    .split(/(?<=[.;])\s+/)
                                    .filter(s => s.trim().length > 10);
                                  
                                  sentences.forEach((sentence) => {
                                    checkPageBreak();
                                    const cleanSentence = sentence.trim();
                                    if (!cleanSentence) return;
                                    
                                    // Print as bullet
                                    doc.text("•", margin + 2, y);
                                    const bulletLines = doc.splitTextToSize(cleanSentence, maxWidth - 10);
                                    bulletLines.forEach((bLine: string, bIdx: number) => {
                                      checkPageBreak();
                                      doc.text(bLine, margin + 8, y);
                                      y += lineHeight;
                                    });
                                  });
                                }
                              } else {
                                // Regular section - split into sentences and make bullets
                                const sentences = trimmedSection
                                  .split(/(?<=[.;:])\s+/)
                                  .filter(s => s.trim().length > 5);
                                
                                if (sentences.length === 1 && sentences[0].length < 100) {
                                  // Short single sentence - print as paragraph
                                  const paraLines = doc.splitTextToSize(sentences[0], maxWidth);
                                  paraLines.forEach((pLine: string) => {
                                    checkPageBreak();
                                    doc.text(pLine, margin, y);
                                    y += lineHeight;
                                  });
                                } else {
                                  // Multiple sentences - print as bullet list
                                  sentences.forEach((sentence) => {
                                    const cleanSentence = sentence.trim();
                                    if (!cleanSentence || cleanSentence.length < 5) return;
                                    
                                    checkPageBreak();
                                    
                                    // Print bullet point
                                    doc.text("•", margin + 2, y);
                                    const bulletLines = doc.splitTextToSize(cleanSentence, maxWidth - 10);
                                    bulletLines.forEach((bLine: string, bIdx: number) => {
                                      checkPageBreak();
                                      doc.text(bLine, margin + 8, y);
                                      y += lineHeight;
                                    });
                                    
                                    // Small gap between bullets
                                    y += 1;
                                  });
                                }
                              }
                            });
                            
                            // Final footer
                            addFooter();
                            
                            // Disclaimer on last page
                            doc.setFontSize(7);
                            doc.setTextColor(100, 100, 100);
                            doc.text(
                              "Disclaimer: This is for informational purposes only and does not constitute legal advice.",
                              pageWidth / 2,
                              pageHeight - 3,
                              { align: "center" }
                            );
                            
                            doc.save(`nyayashastra-legal-analysis-${Date.now()}.pdf`);
                          } catch (err) {
                            console.error("PDF generation error:", err);
                          }
                        }}
                      >
                        <Download className="h-3.5 w-3.5" />
                        {language === "en" ? "PDF" : "PDF डाउनलोड"}
                      </Button>
                    </div>
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
