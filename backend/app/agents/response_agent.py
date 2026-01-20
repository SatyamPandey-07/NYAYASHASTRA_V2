"""
NyayGuru AI Pro - Response Synthesis Agent
Generates final comprehensive legal responses.
"""

from typing import Dict, Any, List, Optional
import logging

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
            
            # 1. Use centralized relevance guardrail from context (set by Query Agent with BM25)
            is_relevant = context.is_relevant
            rejection_message = context.rejection_message or ""
            
            # If still considered relevant but a domain mismatch was flagged by keywords/fallback
            # This is a double check to ensure absolute reliability
            if is_relevant and context.specified_domain and context.specified_domain != "all":
                from app.services.retriever_service import QueryClassifier
                if not QueryClassifier.is_query_relevant_to_domain(context.query, context.specified_domain):
                     # Final LLM verify if keywords also fail
                     is_relevant = await self._verify_relevance_with_llm(context.query, context.specified_domain)
                     if not is_relevant:
                         rejection_message = f"⚠️ I couldn't find a strong connection between your query and **{context.specified_domain}** law."
            
            # 2. Build the System Prompt with Context
            docs = []
            for s in context.statutes:
                docs.append({
                    "content": s.get("content_en", ""),
                    "filename": s.get("filename") or s.get("act_code") or "Statute",
                    "category": s.get("domain", "")
                })
            
            system_prompt = get_system_prompt(
                user_query=context.query,
                documents=docs,
                sql_results=context.ipc_bns_mappings,
                fallback_message=rejection_message,
                selected_category=context.specified_domain
            )
            
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
        """Generate response using templates (fallback)."""
        
        response_parts_en = []
        response_parts_hi = []
        
        # Header
        response_parts_en.append(f"**Legal Analysis for: \"{context.query}\"**\n")
        response_parts_hi.append(f"**कानूनी विश्लेषण: \"{context.query}\"**\n")
        
        # Statutes section
        if context.statutes:
            response_parts_en.append("## 📜 Applicable Legal Provisions\n")
            response_parts_hi.append("## 📜 लागू कानूनी प्रावधान\n")
            
            for statute in context.statutes[:3]:
                act = statute.get("act_code", "")
                section = statute.get("section_number", "")
                title = statute.get("title_en", "")
                content = statute.get("content_en", "")
                
                response_parts_en.append(f"### {act} Section {section} - {title}\n")
                response_parts_en.append(f"{content}\n")
                
                title_hi = statute.get("title_hi", title)
                content_hi = statute.get("content_hi", content)
                response_parts_hi.append(f"### {act} धारा {section} - {title_hi}\n")
                response_parts_hi.append(f"{content_hi}\n")
                
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
