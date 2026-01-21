"""
NyayGuru AI Pro - Response Synthesis Agent
Generates final comprehensive legal responses.
"""

from typing import Dict, Any, List, Optional
import logging
import re

from app.agents.base import BaseAgent, AgentContext
from app.schemas import AgentType

logger = logging.getLogger(__name__)


# Response templates
DISCLAIMER_EN = "\n\n⚖️ *Disclaimer: This information is for educational purposes only and does not constitute legal advice. Please consult a qualified legal professional for specific legal matters.*"

DISCLAIMER_HI = "\n\n⚖️ *अस्वीकरण: यह जानकारी केवल शैक्षिक उद्देश्यों के लिए है और कानूनी सलाह नहीं है। विशिष्ट कानूनी मामलों के लिए कृपया किसी योग्य कानूनी पेशेवर से परामर्श करें।*"


class ResponseSynthesisAgent(BaseAgent):
    """Agent for synthesizing final comprehensive responses."""
    
    def __init__(self, llm_service=None):
        super().__init__()
        self.agent_type = AgentType.RESPONSE
        self.name = "Response Synthesis"
        self.name_hi = "प्रतिक्रिया संश्लेषण"
        self.description = "Generates comprehensive legal responses"
        self.color = "#9c27b0"
        
        self.llm_service = llm_service
    
    async def process(self, context: AgentContext) -> AgentContext:
        """Synthesize final response from all gathered information."""
        
        # Ensure LLM service is available
        if not self.llm_service:
            try:
                from app.services.llm_service import get_llm_service
                self.llm_service = await get_llm_service()
            except Exception as e:
                logger.error(f"Failed to initialize LLM service in ResponseSynthesisAgent: {e}")
        
        # Build response based on available data
        if self.llm_service and self.llm_service.provider:
            response = await self._generate_llm_response(context)
        else:
            response = self._generate_template_response(context)
        
        # Use primary response (in detected language) as the main content
        context.response = response.get("primary", response.get("en", ""))
        context.response_hi = response.get("hi", "")
        
        logger.info(f"Response synthesis completed in language: {response.get('detected_language', 'en')}")
        
        return context
    
    async def _generate_llm_response(self, context: AgentContext) -> Dict[str, str]:
        """Generate response using LLM and SystemPromptBuilder with strict domain guardrails."""
        try:
            from app.services.system_prompt import get_system_prompt
            from app.services.retriever_service import QueryClassifier
            
            print(f"\n[RESPONSE_AGENT] _generate_llm_response called")
            print(f"[RESPONSE_AGENT]   Query: {context.query[:80]}...")
            print(f"[RESPONSE_AGENT]   Statutes count: {len(context.statutes)}")
            print(f"[RESPONSE_AGENT]   LLM provider: {self.llm_service.provider if self.llm_service else 'None'}")
            
            # 1. Use centralized relevance guardrail from context (set by Query Agent with BM25)
            is_relevant = context.is_relevant
            rejection_message = context.rejection_message or ""
            
            print(f"[RESPONSE_AGENT]   is_relevant from context: {is_relevant}")
            print(f"[RESPONSE_AGENT]   specified_domain: {context.specified_domain}")
            logger.info(f"[RESPONSE AGENT] is_relevant from context: {is_relevant}")
            logger.info(f"[RESPONSE AGENT] rejection_message from context: {rejection_message[:50] if rejection_message else 'None'}")
            
            # If still considered relevant but a domain mismatch was flagged by keywords/fallback
            # This is a double check to ensure absolute reliability
            if is_relevant and context.specified_domain and context.specified_domain != "all":
                from app.services.retriever_service import QueryClassifier
                keyword_check = QueryClassifier.is_query_relevant_to_domain(context.query, context.specified_domain)
                print(f"[RESPONSE_AGENT]   Keyword relevance check: {keyword_check}")
                logger.info(f"[RESPONSE AGENT] Keyword relevance check for '{context.specified_domain}': {keyword_check}")
                
                if not keyword_check:
                     # Final LLM verify if keywords also fail
                     print(f"[RESPONSE_AGENT]   Running LLM verification...")
                     logger.info(f"[RESPONSE AGENT] Running LLM verification for domain relevance...")
                     is_relevant = await self._verify_relevance_with_llm(context.query, context.specified_domain)
                     print(f"[RESPONSE_AGENT]   LLM verification result: {is_relevant}")
                     logger.info(f"[RESPONSE AGENT] LLM verification result: {is_relevant}")
                     if not is_relevant:
                         rejection_message = f"⚠️ I couldn't find a strong connection between your query and **{context.specified_domain}** law."
            
            # 2. Build the System Prompt with Context
            docs = []
            for s in context.statutes:
                docs.append({
                    "content": s.get("content_en", s.get("content", "")),
                    "filename": s.get("filename") or s.get("act_code") or "Statute",
                    "category": s.get("domain", s.get("category", ""))
                })
            
            print(f"[RESPONSE_AGENT]   Building system prompt with {len(docs)} documents")
            if docs:
                for i, d in enumerate(docs[:3]):
                    print(f"[RESPONSE_AGENT]     Doc {i+1}: {d.get('filename', 'unknown')[:30]} | {d.get('category', 'N/A')} | content length: {len(d.get('content', ''))}")
            
            system_prompt = get_system_prompt(
                user_query=context.query,
                documents=docs,
                sql_results=context.ipc_bns_mappings,
                fallback_message=rejection_message,
                selected_category=context.specified_domain
            )
            
            print(f"[RESPONSE_AGENT]   System prompt length: {len(system_prompt)} chars")
            
            # 3. Handle strict rejection
            if not is_relevant and rejection_message:
                logger.warning(f"Domain mismatch detected. Query: {context.query}, Domain: {context.specified_domain}. Rejecting.")
                
                # If Hindi/Hinglish detected, translate rejection
                if context.detected_language == "hi":
                    rejection_message_hi = await self._translate_to_hindi(rejection_message)
                else:
                    rejection_message_hi = rejection_message # Fallback
                
                return {
                    "en": rejection_message,
                    "hi": rejection_message_hi,
                    "primary": rejection_message_hi if context.detected_language == "hi" else rejection_message,
                    "detected_language": context.detected_language or "en"
                }

            # 4. Generate response
            response_language = context.detected_language or "en"
            
            # We use a single prompt now that handles language mirroring
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": context.query}
            ]
            
            primary_response = await self.llm_service.generate_chat(messages)
            
            # Generate Hindi translation if not already in Hindi
            secondary_response = ""
            if response_language != "hi":
                translate_prompt = f"Translate this legal response to Hindi, maintaining professional legal terminology:\n\n{primary_response}"
                secondary_response = await self.llm_service.generate(translate_prompt)
            else:
                secondary_response = primary_response
            
            # 5. Extract takeaways and update context citations
            parsed_citations = self._parse_takeaways(primary_response)
            for c_info in parsed_citations:
               # Clean the takeaway text
               takeaway = self._clean_legal_text(c_info['takeaway'])
               
               # Find matching citation in context and add takeaway
               for existing_c in context.citations:
                   # Match by source name or section number
                   match_source = c_info['source'].lower() in existing_c.get('title', '').lower()
                   match_section = c_info['section'] in existing_c.get('title', '')
                   
                   if match_source and match_section:
                       existing_c['takeaway'] = takeaway
                       # Also clean the existing excerpt if it's messy
                       if existing_c.get('excerpt'):
                           existing_c['excerpt'] = self._clean_legal_text(existing_c['excerpt'])
                       break
            
            # Clean all context excerpts regardless of takeaway match
            for c in context.citations:
                if c.get('excerpt'):
                    c['excerpt'] = self._clean_legal_text(c['excerpt'])
            
            return {
                "en": primary_response if response_language == "en" else await self.llm_service.generate(f"Translate this to English:\n\n{primary_response}"),
                "hi": secondary_response,
                "primary": primary_response,
                "detected_language": response_language
            }
        except Exception as e:
            logger.error(f"LLM response generation failed: {e}")
            return self._generate_template_response(context)
    
    def _build_llm_context(self, context: AgentContext) -> str:
        """Build context string for LLM."""
        parts = []
        
        # Add statutes
        if context.statutes:
            parts.append("## Relevant Statutes:")
            for statute in context.statutes[:5]:
                parts.append(f"- {statute.get('act_code')} Section {statute.get('section_number')}: {statute.get('title_en')}")
                parts.append(f"  Content: {statute.get('content_en', '')[:300]}...")
        
        # Add IPC-BNS mappings
        if context.ipc_bns_mappings:
            parts.append("\n## IPC to BNS Mappings:")
            for mapping in context.ipc_bns_mappings:
                parts.append(f"- IPC {mapping.get('ipc_section')} → BNS {mapping.get('bns_section')}")
                if mapping.get('changes'):
                    for change in mapping['changes']:
                        parts.append(f"  • {change.get('description')}")
        
        # Add case laws
        if context.case_laws:
            parts.append("\n## Relevant Case Laws:")
            for case in context.case_laws[:3]:
                landmark = " (LANDMARK)" if case.get('is_landmark') else ""
                parts.append(f"- {case.get('case_name')}{landmark}")
                if case.get('summary_en'):
                    parts.append(f"  Summary: {case['summary_en'][:200]}...")
        
        # Add regulatory notes
        if hasattr(context, 'regulatory_notes') and context.regulatory_notes:
            parts.append(f"\n## Jurisdiction: {context.regulatory_notes.get('domain', 'N/A')}")
        
        return "\n".join(parts)
    
    def _generate_template_response(self, context: AgentContext) -> Dict[str, str]:
        """Generate response using templates (fallback when LLM is unavailable)."""
        
        response_parts_en = []
        response_parts_hi = []
        
        # Header
        response_parts_en.append(f"## 📋 Legal Information for: \"{context.query}\"\n\n")
        response_parts_hi.append(f"## 📋 कानूनी जानकारी: \"{context.query}\"\n\n")
        
        # Note about LLM unavailability
        response_parts_en.append("*Note: AI-powered analysis is temporarily unavailable. Showing relevant legal documents found.*\n\n")
        response_parts_hi.append("*नोट: AI-संचालित विश्लेषण अस्थायी रूप से अनुपलब्ध है। संबंधित कानूनी दस्तावेज़ दिखाए जा रहे हैं।*\n\n")
        
        # Statutes/Documents section
        if context.statutes:
            response_parts_en.append("## 📜 Relevant Legal Provisions\n\n")
            response_parts_hi.append("## 📜 संबंधित कानूनी प्रावधान\n\n")
            
            for i, statute in enumerate(context.statutes[:5], 1):
                # Handle both database statutes and vector store documents
                act = statute.get("act_code", "")
                section = statute.get("section_number", "")
                title = statute.get("title_en", "")
                filename = statute.get("filename", "")
                source = statute.get("source", "")
                domain = statute.get("domain", statute.get("category", ""))
                
                # Get content from either content_en or content field
                content = statute.get("content_en") or statute.get("content", "")
                
                # Clean and truncate content for readability
                if content:
                    # Remove excessive whitespace and clean up
                    content = re.sub(r'\s+', ' ', content).strip()
                    # Limit to ~500 chars for template display
                    if len(content) > 500:
                        content = content[:500] + "..."
                
                # Build header based on available info
                if act and section:
                    header = f"**{i}. {act} Section {section}**"
                    if title:
                        header += f" - {title}"
                elif filename:
                    # Extract readable name from filename
                    readable_name = filename.replace('_', ' ').replace('.pdf', '')
                    header = f"**{i}. {readable_name}**"
                else:
                    header = f"**{i}. Legal Provision**"
                
                if domain:
                    header += f" [{domain}]"
                
                response_parts_en.append(f"{header}\n")
                response_parts_en.append(f"> {content}\n\n")
                
                # Hindi version - use same header format
                content_hi = statute.get("content_hi") or content
                if content_hi and len(content_hi) > 500:
                    content_hi = content_hi[:500] + "..."
                response_parts_hi.append(f"{header}\n")
                response_parts_hi.append(f"> {content_hi}\n\n")
                
                # Punishment info
                if statute.get("punishment_description"):
                    response_parts_en.append(f"**Punishment:** {statute['punishment_description']}\n")
                    response_parts_hi.append(f"**सजा:** {statute['punishment_description']}\n")
        
        # IPC-BNS Comparison
        if context.ipc_bns_mappings:
            response_parts_en.append("\n## ⚖️ IPC to BNS Transition\n")
            response_parts_hi.append("\n## ⚖️ IPC से BNS में परिवर्तन\n")
            
            for mapping in context.ipc_bns_mappings[:2]:
                ipc = mapping.get("ipc_section", "")
                bns = mapping.get("bns_section", "")
                
                response_parts_en.append(f"**IPC Section {ipc} → BNS Section {bns}**\n")
                response_parts_hi.append(f"**IPC धारा {ipc} → BNS धारा {bns}**\n")
                
                changes = mapping.get("changes", [])
                if changes:
                    response_parts_en.append("Key Changes:\n")
                    response_parts_hi.append("मुख्य बदलाव:\n")
                    for change in changes:
                        response_parts_en.append(f"- {change.get('description', '')}\n")
                        response_parts_hi.append(f"- {change.get('description', '')}\n")
                
                punishment = mapping.get("punishment_change")
                if punishment:
                    old = punishment.get("old", "")
                    new = punishment.get("new", "")
                    response_parts_en.append(f"\nPunishment Change: {old} → {new}\n")
                    response_parts_hi.append(f"\nसजा में परिवर्तन: {old} → {new}\n")
        
        # Case Laws
        if context.case_laws:
            response_parts_en.append("\n## 🏛️ Relevant Case Laws\n")
            response_parts_hi.append("\n## 🏛️ संबंधित मामले\n")
            
            for case in context.case_laws[:3]:
                name = case.get("case_name", "")
                court = case.get("court_name", "")
                year = case.get("reporting_year", "")
                summary = case.get("summary_en", "")
                landmark = " ⭐ LANDMARK" if case.get("is_landmark") else ""
                
                response_parts_en.append(f"### {name}{landmark}\n")
                response_parts_en.append(f"*{court}, {year}*\n")
                response_parts_en.append(f"{summary}\n")
                
                name_hi = case.get("case_name_hi", name)
                summary_hi = case.get("summary_hi", summary)
                landmark_hi = " ⭐ ऐतिहासिक" if case.get("is_landmark") else ""
                
                response_parts_hi.append(f"### {name_hi}{landmark_hi}\n")
                response_parts_hi.append(f"*{court}, {year}*\n")
                response_parts_hi.append(f"{summary_hi}\n")
                
                # Key holdings
                holdings = case.get("key_holdings", [])
                if holdings:
                    response_parts_en.append("**Key Holdings:**\n")
                    response_parts_hi.append("**मुख्य निर्णय:**\n")
                    for holding in holdings[:3]:
                        response_parts_en.append(f"- {holding}\n")
                        response_parts_hi.append(f"- {holding}\n")
        
        # Regulatory Notes
        if hasattr(context, 'regulatory_notes') and context.regulatory_notes:
            notes = context.regulatory_notes
            
            response_parts_en.append("\n## 📋 Regulatory Information\n")
            response_parts_hi.append("\n## 📋 नियामक जानकारी\n")
            
            if notes.get("applicable_acts"):
                response_parts_en.append(f"**Applicable Laws:** {', '.join(notes['applicable_acts'][:5])}\n")
                response_parts_hi.append(f"**लागू कानून:** {', '.join(notes['applicable_acts'][:5])}\n")
            
            if notes.get("key_authorities"):
                response_parts_en.append(f"**Key Authorities:** {', '.join(notes['key_authorities'][:4])}\n")
                response_parts_hi.append(f"**मुख्य प्राधिकरण:** {', '.join(notes['key_authorities'][:4])}\n")
        
        # Citations reference
        if context.citations:
            response_parts_en.append("\n## 📚 Sources & Citations\n")
            response_parts_hi.append("\n## 📚 स्रोत और उद्धरण\n")
            
            for i, citation in enumerate(context.citations[:5], 1):
                response_parts_en.append(f"[{i}] {citation.get('title', '')} - [{citation.get('source_name', '')}]({citation.get('url', '')})\n")
                response_parts_hi.append(f"[{i}] {citation.get('title_hi') or citation.get('title', '')} - [{citation.get('source_name', '')}]({citation.get('url', '')})\n")
        
        # Join all parts
        response_en = "".join(response_parts_en) + DISCLAIMER_EN
        response_hi = "".join(response_parts_hi) + DISCLAIMER_HI
        
        return {
            "en": response_en,
            "hi": response_hi
        }
    
    async def _verify_relevance_with_llm(self, query: str, domain: str) -> bool:
        """Reliable Method: Verify query relevance to domain using LLM."""
        if not self.llm_service:
            return False
            
        prompt = f"""Task: Determine if the following legal query is relevant to the "{domain}" domain of Indian law.
Relevant topics for "{domain}" include:
- Traffic: Vehicle rules, accidents, fines, licenses, road safety.
- Criminal: Murder, theft, crimes, FIR, bail, prison.
- IT_Cyber: Hacking, data privacy, online fraud.
- Civil_Family: Divorce, marriage, inheritance, property disputes.
- Corporate: Companies, tax, business contracts.
- Constitutional: Rights, Supreme Court, Articles.

Query: "{query}"

Is this query relevant to the "{domain}" domain? 
Answer with ONLY "YES" or "NO". Keep it simple.
"""
        try:
            response = await self.llm_service.generate(prompt, max_tokens=10, temperature=0.1)
            result = response.strip().upper()
            logger.info(f"Reliable LLM Check for '{domain}': {result}")
            return "YES" in result
        except Exception as e:
            logger.error(f"Reliable check failed: {e}")
            return False

    async def _translate_to_hindi(self, text: str) -> str:
        """Translate text to Hindi using LLM or fallback."""
        if self.llm_service:
            try:
                prompt = f"Translate to Hindi, maintaining legal terminology:\n\n{text}"
                return await self.llm_service.generate(prompt)
            except:
                pass
        return text  # Return English as fallback

    def _parse_takeaways(self, response_text: str) -> List[Dict[str, str]]:
        """Parse structured citation blocks to extract takeaways with robust regex."""
        results = []
        # Split by the citation header
        blocks = re.split(r'📌 \*\*(?:Citation|Hawaala|उद्धरण):\*\*', response_text)
        
        for block in blocks[1:]:
            try:
                # More flexible regex to handle markdown variations like "- **Source:**" or "Source:"
                source_match = re.search(r'(?:- \*\*)?Source:\s*\*\*(.*?)(?:\*\*|\n)', block, re.IGNORECASE)
                if not source_match:
                    source_match = re.search(r'Source:\s*(.*?)(?:\n|$)', block, re.IGNORECASE)
                
                section_match = re.search(r'(?:- \*\*)?Section:\s*\*\*(.*?)(?:\*\*|\n)', block, re.IGNORECASE)
                if not section_match:
                    section_match = re.search(r'Section:\s*(.*?)(?:\n|$)', block, re.IGNORECASE)
                
                # Takeaway regex - handle English, Hindi, and common labels
                takeaway_patterns = [
                    r'(?:- \*\*)?Takeaway:\s*\*\*(.*?)(?:\*\*|\n|$)',
                    r'(?:- \*\*)?Takeaway:\s*(.*?)(?:\n|$)',
                    r'(?:- \*\*)?निष्कर्ष:\s*\*\*(.*?)(?:\*\*|\n|$)',
                    r'(?:- \*\*)?निष्कर्ष:\s*(.*?)(?:\n|$)',
                    r'Takeaway:\s*(.*?)(?:\n\n|\n$)'
                ]
                
                takeaway = ""
                for pattern in takeaway_patterns:
                    match = re.search(pattern, block, re.IGNORECASE | re.DOTALL)
                    if match:
                        takeaway = match.group(1).strip()
                        break
                
                if source_match and section_match and takeaway:
                    results.append({
                        "source": source_match.group(1).strip(),
                        "section": section_match.group(1).strip(),
                        "takeaway": takeaway
                    })
            except Exception as e:
                logger.warning(f"Failed to parse citation block: {e}")
                
        return results

    def _clean_legal_text(self, text: str) -> str:
        """Clean messy legal text from PDF extractions - fixes OCR and amendment noise."""
        if not text:
            return ""
        
        # Step 0: Remove legislative amendment annotations (not useful for users)
        amendment_patterns = [
            r'\d+\.\s*Subs\.?\s*by\s*(Act\s*)?\d+\s*of\s*\d{4},?\s*s\.?\s*\d+[^.]*\.?',
            r'\d+\.\s*Ins\.?\s*by\s*(Act\s*)?\d+\s*of\s*\d{4}[^.]*\.?',
            r'\d+\.\s*Omitted\s*by\s*(Act\s*)?\d+\s*of\s*\d{4}[^.]*\.?',
            r'\(w\.?e\.?f\.?\s*\d{1,2}-\d{1,2}-\d{4}\)',
            r'\[w\.?e\.?f\.?\s*\d{1,2}-\d{1,2}-\d{4}\]',
            r'w\.?e\.?f\.?\s*\d{1,2}-\d{1,2}-\d{4}',
            r'\d+\[',
            r'\]\d+',
            r'\|\|',
            r'ibid\.,?\s*for\s*[-—]',
            r'for\s*[-—]\s*the\s+',
        ]
        
        for pattern in amendment_patterns:
            text = re.sub(pattern, ' ', text, flags=re.IGNORECASE)
        
        # Step 1: Fix OCR broken words
        ocr_fixes = [
            (r'\bo\s*therw\s*ise\b', 'otherwise'),
            (r'\bpun\s*ish\s*able\b', 'punishable'),
            (r'\bpun\s*ish\s*ment\b', 'punishment'),
            (r'\bimpr\s*ison\s*ment\b', 'imprisonment'),
            (r'\boff\s*ence\b', 'offence'),
            (r'\bcom\s*mits?\b', r'commit'),
            (r'\bterr\s*or\s*ism\b', 'terrorism'),
            (r'\belec\s*tron\s*ic\b', 'electronic'),
            (r'\bsec\s*tion\b', 'section'),
            (r'\bSec\s*tion\b', 'Section'),
            (r'\bwho\s*ever\b', 'whoever'),
            (r'\bgov\s*ern\s*ment\b', 'government'),
            (r'\bpro\s*vi\s*sion\b', 'provision'),
            (r'\bcrim\s*in\s*al\b', 'criminal'),
            (r'\bego\s*vernance\b', 'e-governance'),
            (r'\begovernance\b', 'e-governance'),
            (r'\becommerce\b', 'e-commerce'),
            (r'\babet\s*ment\b', 'abetment'),
            (r'\bencry\s*ption\b', 'encryption'),
            (r'f\s+or\b', 'for'),
            (r'\bf\s+orm\b', 'form'),
        ]
        
        for pattern, replacement in ocr_fixes:
            text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
        
        # Step 2: Fix punctuation and spacing
        text = re.sub(r'([,;:])([a-zA-Z])', r'\1 \2', text)
        text = re.sub(r'([a-zA-Z])(\()', r'\1 \2', text)
        text = re.sub(r'(\))([a-zA-Z])', r'\1 \2', text)
        text = re.sub(r'\.–', '. ', text)
        text = re.sub(r'–', ' - ', text)
        
        # Step 3: Fix multiple spaces
        text = re.sub(r'\s+', ' ', text).strip()
        
        # Step 4: Remove incomplete sentences at start
        if text and (text[0].islower() or text.startswith('of ') or text.startswith('for ')):
            match = re.search(r'[.]\s*([A-Z][a-z])', text)
            if match:
                text = text[match.start()+2:]
        
        return text
