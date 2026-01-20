"""
NyayaShastra - System Prompt Templates
Enforces Hinglish-aware persona and visual citation format.
"""

from typing import List, Dict, Any, Optional
import re


# =============================================================================
# LANGUAGE DETECTION
# =============================================================================

class LanguageDetector:
    """Detects input language/script for response mirroring."""
    
    # Hindi/Devanagari Unicode range
    DEVANAGARI_PATTERN = re.compile(r'[\u0900-\u097F]')
    
    # Common Hinglish patterns (Hindi words in Latin script) that DON'T overlap with common English words
    HINGLISH_WORDS = [
        "kya", "kaise", "kaun", "kab", "kahan", "kyun", "kyu",
        "ka", "ki", "ko", "se", "par", "aur", "ya", "lekin", "agar", "toh", "bhi",
        "saza", "kanoon", "adhikaar", "nyay", "nyaya", "adalat",
        "vakil", "mukadma", "faisla", "dand", "apradh",
        "hain", "hoon", "tha", "thi", "the", "ho", "hoga", "karein",
        "batao", "bataiye", "bataye", "samjhao", "samjhaiye",
        "karo", "kariye", "dijiye", "chahiye", "sakta",
        "nahi", "nahin", "mat", "sirf", "keval", "bahut", "bohot",
        "accha", "theek", "sahi", "galat", "zaruri"
    ]
    
    @classmethod
    def detect(cls, text: str) -> str:
        """
        Detect language: 'hindi', 'hinglish', or 'english'
        """
        # Check for Devanagari script for pure Hindi detection
        if cls.DEVANAGARI_PATTERN.search(text):
            return "hindi"
            
        # Check for Hinglish words using word boundaries
        text_lower = text.lower()
        hinglish_count = 0
        for word in cls.HINGLISH_WORDS:
            # Use regex to find whole word matches only
            if re.search(rf'\b{word}\b', text_lower):
                hinglish_count += 1
        
        # If we find at least 2 distinct Hinglish words, return hinglish
        if hinglish_count >= 2:
            return "hinglish"
        
        return "english"


# =============================================================================
# CITATION FORMATTER
# =============================================================================

def format_citations(documents: List[Dict[str, Any]]) -> str:
    """
    Format documents into citation blocks for the LLM to use.
    """
    if not documents:
        return ""
    
    citations = []
    for i, doc in enumerate(documents, 1):
        content = doc.get("content", "")[:500]  # Limit snippet length
        filename = doc.get("filename", "Unknown Source")
        category = doc.get("category", "")
        
        citation = f"""
📄 **Source {i}:** {filename}
📁 **Category:** {category}
📝 **Content:**
\"\"\"{content}...\"\"\"
"""
        citations.append(citation)
    
    return "\n".join(citations)


def format_sql_results(results: List[Dict[str, Any]]) -> str:
    """
    Format SQL results (IPC-BNS mappings) for the LLM.
    """
    if not results:
        return ""
    
    formatted = []
    for r in results:
        block = f"""
📊 **Legal Mapping:**
- **IPC Section:** {r.get('ipc_section', 'N/A')}
- **BNS Section:** {r.get('bns_section', 'N/A')}
- **Topic:** {r.get('topic', 'N/A')}
- **Description:** {r.get('description', 'N/A')}
- **Changes:** {r.get('change_note', 'No significant changes')}
- **Old Penalty:** {r.get('penalty_old', 'N/A')}
- **New Penalty:** {r.get('penalty_new', 'N/A')}
"""
        formatted.append(block)
    
    return "\n".join(formatted)


# =============================================================================
# SYSTEM PROMPTS
# =============================================================================

SYSTEM_PROMPT_ENGLISH = """You are **NyayaShastra AI** ⚖️, an authoritative yet accessible legal assistant specializing in Indian law.

## Your Persona
- **Tone:** Professional, knowledgeable, yet easy to understand
- **Expertise:** Indian Penal Code (IPC), Bharatiya Nyaya Sanhita (BNS), Motor Vehicles Act, IT Act, and other Indian laws
- **Language:** STRICTLY respond in ENGLISH. Even if the topic is Indian law, do not use Hinglish or Hindi words in your explanation unless citing a specific Hindi act name.

## CRITICAL RULES

### 1. Citation Rules (MANDATORY)
Every factual legal claim MUST include a citation in this exact format:

```
📌 **Citation:**
- **Source:** [Act Name / Document Name]
- **Section:** [Section Number]
- **Quote:** "[Exact text from the document]"
```

⚠️ **NEVER invent citations.** If the exact text isn't in the provided documents, say: "Based on general legal principles..." and DO NOT cite a specific section.

### 2. IPC-BNS Comparisons
When comparing IPC and BNS sections:
- Use ONLY the structured data provided
- Highlight key differences clearly
- Include old and new penalties if available
- Format as a comparison table when appropriate

### 3. Domain Guardrails
- If a fallback message is provided, include it prominently at the start
- If the query is irrelevant to the selected domain, respectfully suggest the correct domain
- Never guess or hallucinate information not in the provided context

### 4. Response Structure
1. **Direct Answer** - Address the query immediately
2. **Legal Explanation** - Provide context and details
3. **Citations** - Include all relevant citations
4. **Practical Guidance** - What should the person do next?
5. **Disclaimer** - "This is for informational purposes only. Consult a qualified lawyer for specific advice."

## Current Context
{context}
"""

SYSTEM_PROMPT_HINGLISH = """Aap **NyayaShastra AI** ⚖️ hain, ek expert Indian law assistant jo asaan Hindi-English mix mein samjhata hai.

## Aapka Style
- **Tone:** Professional lekin friendly aur samajhne mein aasan
- **Expertise:** IPC, BNS, Motor Vehicles Act, IT Act, aur dusre Indian laws
- **Language:** Aapko HINGLISH (Mix of Hindi and English) mein hi jawab dena hai.

## ZAROORI RULES

### 1. Citation Rules (BAHUT IMPORTANT)
Har legal fact ke saath citation dena ZAROORI hai, is format mein:

```
📌 **Hawaala (Citation):**
- **Source:** [Act ka Naam / Document ka Naam]
- **Section:** [Section Number]
- **Quote:** "[Document se exact text]"
```

⚠️ **KABHI BHI fake citation mat do.** Agar exact text nahi hai documents mein, toh bolo: "General legal principles ke hisaab se..." aur specific section cite mat karo.

### 2. IPC-BNS Comparisons
Jab IPC aur BNS compare karna ho:
- Sirf structured data use karo jo diya gaya hai
- Key differences clearly highlight karo
- Old aur new penalties include karo agar available hain
- Table format use karo comparison ke liye

### 3. Domain Guardrails
- Agar fallback message diya gaya hai, usse prominently include karo
- Agar query selected domain se related nahi hai, respectfully sahi domain suggest karo
- Kabhi bhi guess ya hallucinate mat karo jo context mein nahi hai

### 4. Response Structure
1. **Seedha Jawab** - Pehle question ka direct answer do
2. **Legal Explanation** - Context aur details do
3. **Citations** - Saare relevant citations include karo
4. **Practical Guidance** - Aage kya karna chahiye?
5. **Disclaimer** - "Yeh sirf information ke liye hai. Specific advice ke liye qualified vakil se baat karein."

## Current Context
{context}
"""

SYSTEM_PROMPT_HINDI = """आप **न्यायशास्त्र AI** ⚖️ हैं, एक विशेषज्ञ भारतीय कानून सहायक।

## आपकी शैली
- **टोन:** पेशेवर लेकिन समझने में आसान
- **विशेषज्ञता:** IPC, BNS, मोटर वाहन अधिनियम, IT अधिनियम, और अन्य भारतीय कानून
- **भाषा:** आपको केवल हिंदी (Devanagari) में उत्तर देना है।

## महत्वपूर्ण नियम

### 1. उद्धरण नियम (अनिवार्य)
प्रत्येक कानूनी तथ्य के साथ उद्धरण देना आवश्यक है:

```
📌 **उद्धरण:**
- **स्रोत:** [अधिनियम का नाम]
- **धारा:** [धारा संख्या]
- **पाठ:** "[दस्तावेज़ से सटीक पाठ]"
```

⚠️ **कभी भी नकली उद्धरण न दें।**

### 2. प्रतिक्रिया संरचना
1. **सीधा उत्तर**
2. **कानूनी व्याख्या**
3. **उद्धरण**
4. **व्यावहारिक मार्गदर्शन**
5. **अस्वीकरण**

## वर्तमान संदर्भ
{context}
"""


# =============================================================================
# PROMPT BUILDER
# =============================================================================

class SystemPromptBuilder:
    """Builds system prompts based on query context and language."""
    
    @staticmethod
    def build(
        user_query: str,
        documents: List[Dict[str, Any]] = None,
        sql_results: List[Dict[str, Any]] = None,
        fallback_message: str = "",
        selected_category: str = None
    ) -> str:
        """
        Build complete system prompt with context.
        
        Args:
            user_query: The user's question
            documents: Retrieved document chunks
            sql_results: IPC-BNS mapping results
            fallback_message: Any guardrail warning message
            selected_category: User-selected domain filter
        """
        # Detect language
        language = LanguageDetector.detect(user_query)
        
        # Select appropriate base prompt
        if language == "hindi":
            base_prompt = SYSTEM_PROMPT_HINDI
        elif language == "hinglish":
            base_prompt = SYSTEM_PROMPT_HINGLISH
        else:
            base_prompt = SYSTEM_PROMPT_ENGLISH
        
        # Build context section
        context_parts = []
        
        # Add fallback/warning message
        if fallback_message:
            context_parts.append(f"⚠️ **IMPORTANT NOTICE:**\n{fallback_message}\n")
        
        # Add selected domain
        if selected_category:
            context_parts.append(f"📁 **Selected Domain:** {selected_category}\n")
        
        # Add SQL results (for IPC-BNS comparisons)
        if sql_results:
            context_parts.append("## Structured Legal Data (IPC-BNS Mappings)")
            context_parts.append(format_sql_results(sql_results))
        
        # Add document citations
        if documents:
            context_parts.append("## Retrieved Legal Documents")
            context_parts.append(format_citations(documents))
        
        # If no context provided
        if not context_parts:
            context_parts.append("No specific documents available. Answer based on general legal knowledge with appropriate disclaimers.")
        
        # Combine context
        full_context = "\n".join(context_parts)
        
        # Build final prompt
        return base_prompt.format(context=full_context)
    
    @staticmethod
    def build_user_message(query: str) -> str:
        """Format user query with any additional instructions."""
        return f"""**User Query:** {query}

Please provide a comprehensive answer following all the citation and formatting rules. Remember:
- Include proper citations for all legal facts
- Use the exact format specified
- If information is not in the provided documents, clearly state it's based on general knowledge
- End with a disclaimer"""


# =============================================================================
# CONVENIENCE FUNCTION
# =============================================================================

def get_system_prompt(
    user_query: str,
    documents: List[Dict[str, Any]] = None,
    sql_results: List[Dict[str, Any]] = None,
    fallback_message: str = "",
    selected_category: str = None
) -> str:
    """Convenience function to build system prompt."""
    return SystemPromptBuilder.build(
        user_query=user_query,
        documents=documents,
        sql_results=sql_results,
        fallback_message=fallback_message,
        selected_category=selected_category
    )


# =============================================================================
# TESTING
# =============================================================================

if __name__ == "__main__":
    print("\n" + "="*60)
    print("🎭 Testing Language Detection")
    print("="*60)
    
    test_queries = [
        ("What is the punishment for murder?", "english"),
        ("Murder ki saza kya hai?", "hinglish"),
        ("हत्या की सजा क्या है?", "hindi"),
        ("IPC 302 aur BNS 103 mein kya difference hai?", "hinglish"),
    ]
    
    for query, expected in test_queries:
        detected = LanguageDetector.detect(query)
        status = "✅" if detected == expected else "❌"
        print(f"{status} '{query[:40]}...' → {detected} (expected: {expected})")
    
    print("\n" + "="*60)
    print("📝 Testing Prompt Generation")
    print("="*60)
    
    prompt = get_system_prompt(
        user_query="Murder ki saza kya hai?",
        documents=[{
            "content": "Section 302 of IPC deals with punishment for murder...",
            "filename": "IPC.pdf",
            "category": "Criminal"
        }],
        fallback_message="",
        selected_category="Criminal"
    )
    
    print(prompt[:500] + "...")
