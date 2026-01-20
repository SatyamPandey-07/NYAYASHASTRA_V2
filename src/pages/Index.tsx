import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/Header";
import { ChatInterface } from "@/components/ChatInterface";
import { AuthenticatedDashboard } from "@/components/AuthenticatedDashboard";
import { DomainSelection } from "@/components/DomainSelection";
import { useChat } from "@/hooks/useApi";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  contentHindi?: string;
  citations?: Array<{
    id: string;
    source: string;
    url: string;
    title: string;
    excerpt?: string;
  }>;
  statutes?: Array<{
    id: string;
    section: string;
    act: string;
    content: string;
  }>;
  timestamp: Date;
}

const Index = () => {
  const [viewState, setViewState] = useState<"dashboard" | "domain-select" | "chat">("dashboard");
  const [selectedDomain, setSelectedDomain] = useState<string>("all");
  const [language, setLanguage] = useState<"en" | "hi">("en");
  const [useBackendAPI, setUseBackendAPI] = useState(false);

  // Try to use the API hook, fallback to local state if backend not available
  const {
    messages: apiMessages,
    isProcessing,
    activeAgent,
    completedAgents,
    processingAgents,
    currentStatutes,
    currentCitations,
    currentMappings,
    error: apiError,
    sendMessage: sendApiMessage,
    loadSession: loadApiSession,
    clearMessages: clearApiMessages,
  } = useChat({ language, useStreaming: false });

  // Local state for fallback mode
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [localIsProcessing, setLocalIsProcessing] = useState(false);
  const [localActiveAgent, setLocalActiveAgent] = useState<string | null>(null);
  const [localCompletedAgents, setLocalCompletedAgents] = useState<string[]>(
    [],
  );
  const [localProcessingAgents, setLocalProcessingAgents] = useState<string[]>(
    [],
  );

  // Check if backend is available
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch("http://localhost:8000/health");
        if (response.ok) {
          setUseBackendAPI(true);
          console.log("✅ Backend connected");
        }
      } catch {
        console.log("⚠️ Backend not available, using demo mode");
        setUseBackendAPI(false);
      }
    };
    checkBackend();
  }, []);

  const simulateAgentProcessing = useCallback(() => {
    const agents = [
      "query",
      "statute",
      "case",
      "regulatory",
      "citation",
      "summary",
      "response",
    ];
    let currentIndex = 0;

    setLocalCompletedAgents([]);
    setLocalProcessingAgents([]);

    const processNextAgent = () => {
      if (currentIndex < agents.length) {
        const agent = agents[currentIndex];
        setLocalActiveAgent(agent);
        setLocalProcessingAgents([agent]);

        setTimeout(
          () => {
            setLocalCompletedAgents((prev) => [...prev, agent]);
            setLocalProcessingAgents([]);
            currentIndex++;
            processNextAgent();
          },
          400 + Math.random() * 400,
        );
      } else {
        setLocalActiveAgent(null);
        setLocalIsProcessing(false);
      }
    };

    processNextAgent();
  }, []);

  const handleSendMessage = useCallback(
    async (content: string, domain?: string) => {
      setViewState("chat");
      const domainToUse = domain || selectedDomain;
      if (useBackendAPI) {
        try {
          await sendApiMessage(content, domainToUse);
        } catch (err) {
          console.error("API Error:", err);
          // Fallback to local mode
          handleLocalMessage(content);
        }
      } else {
        handleLocalMessage(content);
      }
    },
    [useBackendAPI, sendApiMessage, selectedDomain],
  );

  const handleLocalMessage = useCallback(
    (content: string) => {
      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content,
        timestamp: new Date(),
      };

      setLocalMessages((prev) => [...prev, userMessage]);
      setLocalIsProcessing(true);
      simulateAgentProcessing();

      // Simulate AI response after agents complete
      setTimeout(() => {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: generateSampleResponse(content, "en"),
          contentHindi: generateSampleResponse(content, "hi"),
          citations: [
            {
              id: "1",
              source: "indiankanoon",
              url: "https://indiankanoon.org/doc/1560742/",
              title: "Indian Penal Code - Section 302: Punishment for murder",
              excerpt:
                "Whoever commits murder shall be punished with death, or imprisonment for life, and shall also be liable to fine.",
            },
            {
              id: "2",
              source: "indiankanoon",
              url: "https://indiankanoon.org/search/?formInput=section%20103%20BNS",
              title:
                "Bharatiya Nyaya Sanhita - Section 103: Punishment for murder",
              excerpt:
                "Whoever commits murder shall be punished with death or imprisonment for life, and shall also be liable to fine.",
            },
          ],
          timestamp: new Date(),
        };
        setLocalMessages((prev) => [...prev, assistantMessage]);
      }, 3500);
    },
    [simulateAgentProcessing],
  );

  const handleStartChat = (query?: string) => {
    if (query) {
      handleSendMessage(query);
    }
  };

  // Determine which state to use
  const messages = useBackendAPI ? apiMessages : localMessages;
  const processing = useBackendAPI ? isProcessing : localIsProcessing;
  const currentActiveAgent = useBackendAPI ? activeAgent : localActiveAgent;
  const currentCompletedAgents = useBackendAPI
    ? completedAgents
    : localCompletedAgents;
  const currentProcessingAgents = useBackendAPI
    ? processingAgents
    : localProcessingAgents;


  // Map API messages to component format
  const formattedMessages = messages.map((msg) => {
    console.log("Message full object:", msg); // Debug logging
    console.log("Message citations:", msg.citations); // Debug logging
    return {
      id: msg.id,
      role: msg.role,
      content: msg.content,
      contentHindi: msg.contentHindi,
      citations: msg.citations?.map((c: any) => ({
        id: c.id || String(Math.random()),
        source: c.source || "indiankanoon",
        url: c.url || "",
        title: c.title || "Legal Citation",
        excerpt: c.excerpt, // Include the legal text excerpt
      })),
      timestamp: msg.timestamp,
    };
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header
        language={language}
        onLanguageChange={setLanguage}
        onLogoClick={() => setViewState("dashboard")}
      />

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          {viewState === "dashboard" && (
            <AuthenticatedDashboard
              language={language}
              onStartChat={(msg) => {
                if (msg) {
                  handleSendMessage(msg);
                } else {
                  if (useBackendAPI) clearApiMessages();
                  else setLocalMessages([]);
                  // Show domain selection instead of going directly to chat
                  setViewState("domain-select");
                }
              }}
              onLoadSession={async (sessionId) => {
                setViewState("chat");
                if (useBackendAPI) {
                  const data = await loadApiSession(sessionId);
                  if (data?.domain) {
                    setSelectedDomain(data.domain);
                  }
                }
              }}
            />
          )}
          
          {viewState === "domain-select" && (
            <DomainSelection
              language={language}
              onSelectDomain={(domain) => {
                setSelectedDomain(domain);
                setViewState("chat");
              }}
              onBack={() => setViewState("dashboard")}
            />
          )}
          
          {viewState === "chat" && (
            <ChatInterface
              messages={formattedMessages}
              onSendMessage={(content, domain) => {
                if (domain) setSelectedDomain(domain);
                handleSendMessage(content, domain || selectedDomain);
              }}
              isProcessing={processing}
              language={language}
              selectedDomain={selectedDomain}
              onLoadSession={async (sessionId) => {
                if (useBackendAPI) {
                  const data = await loadApiSession(sessionId);
                  if (data?.domain) {
                    setSelectedDomain(data.domain);
                  }
                }
              }}
              onNewChat={() => {
                if (useBackendAPI) clearApiMessages();
                else setLocalMessages([]);
                // Go to domain selection for new chat
                setViewState("domain-select");
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// Sample response generator (for demo mode)
function generateSampleResponse(query: string, lang: string): string {
  const isHindi = lang === "hi";
  const queryLower = query.toLowerCase();

  if (
    queryLower.includes("murder") ||
    queryLower.includes("302") ||
    queryLower.includes("हत्या")
  ) {
    return isHindi
      ? `**IPC धारा 302 - हत्या के लिए सजा**

भारतीय दंड संहिता की धारा 302 के तहत हत्या की सजा:

"जो कोई हत्या करेगा, उसे मृत्युदंड या आजीवन कारावास की सजा दी जाएगी, और वह जुर्माने का भी भागी होगा।"

**संबंधित BNS धारा 103:**
भारतीय न्याय संहिता, 2023 के तहत, समकक्ष प्रावधान धारा 103 है।

**मुख्य बिंदु:**
1. हत्या को IPC की धारा 300 (BNS धारा 101) के तहत परिभाषित किया गया है
2. सजा या तो मृत्युदंड या आजीवन कारावास हो सकती है
3. मुख्य सजा के अतिरिक्त जुर्माना भी लगाया जा सकता है

**ऐतिहासिक निर्णय:**
*बचन सिंह बनाम पंजाब राज्य* (1980) में सर्वोच्च न्यायालय ने "दुर्लभतम में दुर्लभ" सिद्धांत स्थापित किया।

⚖️ *यह जानकारी शैक्षिक उद्देश्यों के लिए है। विशिष्ट कानूनी सलाह के लिए कृपया किसी योग्य कानूनी पेशेवर से परामर्श करें।*`
      : `**IPC Section 302 - Punishment for Murder**

The punishment for murder under Section 302 of the Indian Penal Code provides:

"Whoever commits murder shall be punished with death, or imprisonment for life, and shall also be liable to fine."

**Corresponding BNS Section 103:**
Under the Bhartiya Nyaya Sanhita, 2023, the equivalent provision is Section 103, which maintains similar punishment provisions.

**Key Points:**
1. Murder is defined under Section 300 IPC (Section 101 BNS)
2. The punishment can be either death penalty or life imprisonment
3. Fine may also be imposed in addition to the main punishment
4. Courts have discretion in choosing between death and life imprisonment

**Landmark Case Law:**
The Supreme Court in *Bachan Singh v. State of Punjab* (1980) established the "rarest of rare" doctrine for imposing death penalty.

⚖️ *This information is for educational purposes. Please consult a qualified legal professional for specific legal advice.*`;
  }

  if (
    queryLower.includes("theft") ||
    queryLower.includes("चोरी") ||
    queryLower.includes("379")
  ) {
    return isHindi
      ? `**IPC धारा 379 - चोरी के लिए सजा**

"जो कोई चोरी करेगा उसे तीन वर्ष तक के कारावास, या जुर्माना, या दोनों से दंडित किया जाएगा।"

**BNS समकक्ष: धारा 303**
भारतीय न्याय संहिता में चोरी का प्रावधान समान रखा गया है।

⚖️ *अस्वीकरण: यह जानकारी केवल शैक्षिक उद्देश्यों के लिए है।*`
      : `**IPC Section 379 - Punishment for Theft**

"Whoever commits theft shall be punished with imprisonment of either description for a term which may extend to three years, or with fine, or with both."

**BNS Equivalent: Section 303**
The Bhartiya Nyaya Sanhita maintains similar provisions for theft.

**Key Elements of Theft (Section 378 IPC / Section 302 BNS):**
1. Dishonest intention to take property
2. Property must be movable
3. Taking must be without the consent of the owner
4. Moving of property out of possession

⚖️ *Disclaimer: This information is for educational purposes only.*`;
  }

  // Default response
  return isHindi
    ? `आपके कानूनी प्रश्न के लिए धन्यवाद: "${query}"

IPC, BNS और संबंधित केस कानून सहित भारतीय कानून डेटाबेस के विश्लेषण के आधार पर:

**कानूनी ढांचा:**
आपका प्रश्न भारतीय कानून के संबंधित वैधानिक प्रावधानों के अंतर्गत आता है।

**मुख्य विचार:**
1. लागू अधिनियम और धाराएं
2. प्रासंगिक सर्वोच्च न्यायालय और उच्च न्यायालय के मिसाल
3. भारतीय न्याय संहिता, 2023 के तहत हाल के संशोधन

⚖️ *अस्वीकरण: यह प्रतिक्रिया केवल सूचनात्मक उद्देश्यों के लिए है और कानूनी सलाह नहीं है।*`
    : `Thank you for your legal query regarding: "${query}"

Based on analysis of Indian law databases including IPC, BNS, and relevant case law:

**Legal Framework:**
Your query falls under the relevant statutory provisions of Indian law. The applicable laws and their interpretations depend on the specific facts and circumstances of your situation.

**Key Considerations:**
1. The applicable statute(s) and section(s)
2. Relevant Supreme Court and High Court precedents
3. Recent amendments under Bhartiya Nyaya Sanhita, 2023

**Recommendation:**
For a detailed legal opinion tailored to your specific situation, I recommend consulting with a qualified legal professional who can review all relevant documents and facts.

📚 *Sources: Indian Penal Code, Bhartiya Nyaya Sanhita, Supreme Court of India database*

⚖️ *Disclaimer: This response is for informational purposes only and does not constitute legal advice.*`;
}

export default Index;
