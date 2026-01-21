"""
NyayGuru AI Pro - Summarization Agent
Summarizes legal documents and extracts key information.
"""

from typing import Dict, Any, List, Optional
import logging
import re

from app.agents.base import BaseAgent, AgentContext
from app.schemas import AgentType

logger = logging.getLogger(__name__)


class SummarizationAgent(BaseAgent):
    """Agent for summarizing legal documents and extracting key information."""
    
    def __init__(self, llm_service=None):
        super().__init__()
        self.agent_type = AgentType.SUMMARY
        self.name = "Summarization"
        self.name_hi = "सारांश"
        self.description = "Summarizes legal documents and extracts key information"
        self.color = "#00bcd4"
        
        self.llm_service = llm_service
    
    async def process(self, context: AgentContext) -> AgentContext:
        """Process and summarize document if available."""
        
        # Ensure LLM service is available
        if not self.llm_service:
            try:
                from app.services.llm_service import get_llm_service
                self.llm_service = await get_llm_service()
            except Exception as e:
                logger.error(f"Failed to initialize LLM service in SummarizationAgent: {e}")
        
        # If there's a document to summarize
        if context.document_summary:
            # Already processed, enhance if possible
            context.document_summary = await self._enhance_summary(context.document_summary)
        
        # Summarize retrieved statutes for quick reference
        if context.statutes:
            context.statute_summaries = self._summarize_statutes(context.statutes)
        
        # Summarize case laws
        if context.case_laws:
            context.case_summaries = self._summarize_cases(context.case_laws)
        
        logger.info("Summarization completed")
        
        return context
    
    async def summarize_document(self, text: str, doc_type: str = "judgment") -> Dict[str, Any]:
        """Summarize a legal document with comprehensive fact extraction."""
        
        summary = {
            "case_summary": [],  # Bullet point summary of the case facts
            "key_arguments": [],
            "verdict": None,
            "cited_sections": [],
            "parties": None,
            "court_name": None,
            "date": None,
            "judges": [],
            "legal_issues": [],
            "ratio_decidendi": None,
            "complainant": None,
            "accused": None,
            "case_type": None
        }
        
        # Extract parties (petitioner v. respondent)
        parties_match = re.search(
            r'([A-Za-z\s\.]+)\s*(?:v\.|vs\.?|versus)\s*([A-Za-z\s\.]+)',
            text[:2000],
            re.IGNORECASE
        )
        if parties_match:
            summary["parties"] = f"{parties_match.group(1).strip()} v. {parties_match.group(2).strip()}"
        
        # Extract complainant/informant
        complainant_patterns = [
            r'(?:complainant|informant|petitioner|plaintiff)[:\s]+([A-Za-z\s\.]+?)(?:\.|,|filed|lodged)',
            r'(?:complaint|FIR)\s+(?:was\s+)?(?:filed|lodged)\s+by\s+([A-Za-z\s\.]+)',
            r'([A-Za-z\s\.]+)\s+(?:filed|lodged)\s+(?:a\s+)?(?:complaint|FIR)',
        ]
        for pattern in complainant_patterns:
            match = re.search(pattern, text[:5000], re.IGNORECASE)
            if match:
                summary["complainant"] = match.group(1).strip()
                break
        
        # Extract accused
        accused_patterns = [
            r'(?:accused|defendant|respondent)[:\s]+([A-Za-z\s\.]+?)(?:\.|,|was|is|has)',
            r'(?:against|accused)\s+(?:one\s+)?([A-Za-z\s\.]+)',
        ]
        for pattern in accused_patterns:
            match = re.search(pattern, text[:5000], re.IGNORECASE)
            if match:
                summary["accused"] = match.group(1).strip()
                break
        
        # Detect case type
        case_type_patterns = [
            (r'criminal\s+(?:appeal|case|matter|revision)', "Criminal"),
            (r'civil\s+(?:appeal|suit|case|revision)', "Civil"),
            (r'writ\s+petition', "Constitutional/Writ"),
            (r'(?:FIR|First Information Report)', "Criminal (FIR-based)"),
            (r'divorce|maintenance|custody|matrimonial', "Family/Matrimonial"),
            (r'property|land|title|possession', "Property"),
            (r'cheque\s+(?:bounce|dishonour)', "Criminal (Cheque Bounce)"),
        ]
        for pattern, case_type in case_type_patterns:
            if re.search(pattern, text[:3000], re.IGNORECASE):
                summary["case_type"] = case_type
                break
        
        # Extract court name
        court_patterns = [
            r'Supreme Court of India',
            r'High Court of [\w\s]+',
            r'[\w\s]+ High Court',
            r'(?:District|Sessions|Civil|Criminal)\s+(?:Court|Judge)',
            r'Judicial Magistrate',
            r'Metropolitan Magistrate'
        ]
        for pattern in court_patterns:
            match = re.search(pattern, text[:3000], re.IGNORECASE)
            if match:
                summary["court_name"] = match.group(0)
                break
        
        # Extract date - look for multiple date formats
        date_patterns = [
            r'(?:dated?|decided on|judgment dated?|order dated?)\s*[:\-]?\s*(\d{1,2}[\-\/\.]\d{1,2}[\-\/\.]\d{4})',
            r'(\d{1,2}[\-\/\.]\d{1,2}[\-\/\.]\d{4})',
            r'(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})',
        ]
        for pattern in date_patterns:
            match = re.search(pattern, text[:3000], re.IGNORECASE)
            if match:
                summary["date"] = match.group(1)
                break
        
        # Extract ALL cited sections more comprehensively
        section_patterns = [
            r'(?:Section|Sec\.|धारा|§)\s*(\d+[A-Za-z]?(?:/\d+)?)\s*(?:of|,|and)?\s*(?:the\s+)?(IPC|BNS|CrPC|BNSS|IT Act|Indian Penal Code|Bhartiya Nyaya Sanhita|Code of Criminal Procedure|Evidence Act|CPC|Motor Vehicles Act)?',
            r'(?:u/s|under section)\s*(\d+[A-Za-z]?(?:/\d+)?)\s*(?:of\s+)?(IPC|BNS|CrPC|BNSS)?',
        ]
        seen = set()
        for pattern in section_patterns:
            citations = re.findall(pattern, text, re.IGNORECASE)
            for section, act in citations:
                act = act.upper() if act else "IPC"
                # Normalize act names
                act_map = {
                    "INDIAN PENAL CODE": "IPC",
                    "BHARTIYA NYAYA SANHITA": "BNS",
                    "CODE OF CRIMINAL PROCEDURE": "CrPC",
                }
                act = act_map.get(act, act)
                key = f"{act}_{section}"
                if key not in seen and len(summary["cited_sections"]) < 15:
                    seen.add(key)
                    summary["cited_sections"].append({"act": act, "section": section})
        
        # Extract judgment patterns for verdict - more comprehensive
        verdict_patterns = [
            r'(?:appeal|petition|application|case)\s+(?:is\s+)?(?:hereby\s+)?(allowed|dismissed|partly allowed|remanded|disposed)',
            r'(?:we|court)\s+(?:hereby\s+)?(?:order|direct|hold|decree)\s+that[^.]+',
            r'conviction\s+(?:under\s+[^.]+)?\s*(?:is\s+)?(upheld|set aside|modified|confirmed)',
            r'accused\s+(?:is|are)\s+(?:hereby\s+)?(acquitted|convicted|discharged)',
            r'sentence[d]?\s+(?:to|for)\s+[^.]+',
            r'(?:suit|claim)\s+(?:is\s+)?(?:hereby\s+)?(decreed|dismissed|allowed)',
        ]
        
        for pattern in verdict_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                # Get more context around the verdict
                start = max(0, match.start() - 50)
                end = min(len(text), match.end() + 100)
                verdict_context = text[start:end].strip()
                # Clean up the verdict
                verdict_context = re.sub(r'\s+', ' ', verdict_context)
                summary["verdict"] = verdict_context[:300]
                break
        
        # Use LLM for comprehensive fact extraction
        if self.llm_service:
            llm_summary = await self._llm_summarize_comprehensive(text, doc_type, summary)
            if llm_summary:
                summary["case_summary"] = llm_summary.get("case_summary", [])
                summary["key_arguments"] = llm_summary.get("key_arguments", [])
                summary["legal_issues"] = llm_summary.get("legal_issues", [])
                if llm_summary.get("verdict"):
                    summary["verdict"] = llm_summary.get("verdict")
                if llm_summary.get("complainant"):
                    summary["complainant"] = llm_summary.get("complainant")
                if llm_summary.get("accused"):
                    summary["accused"] = llm_summary.get("accused")
        else:
            # Fallback: Generate comprehensive basic summary
            summary["key_arguments"] = self._extract_key_sentences(text)
            summary["case_summary"] = self._generate_comprehensive_summary(text, summary)
        
        return summary
    
    async def _llm_summarize_comprehensive(self, text: str, doc_type: str, extracted_info: Dict) -> Optional[Dict]:
        """Use LLM to extract comprehensive case facts."""
        try:
            # Use more of the document text for better coverage
            # Split into chunks if document is very long
            doc_text = text[:15000] if len(text) > 15000 else text
            
            prompt = f"""You are a legal document analyzer. Analyze this legal {doc_type} and extract FACTUAL information.

IMPORTANT: Focus on WHAT ACTUALLY HAPPENED in the case. Extract real facts, not generic statements.

Document Text:
{doc_text}

Extract the following information and respond in JSON format:

{{
    "case_summary": [
        "Provide 4-6 bullet points explaining WHAT HAPPENED in this case:",
        "- Who filed the case/complaint and against whom?",
        "- What was the incident/dispute about? (Be specific - dates, events, amounts)",
        "- What were the main allegations or claims?",
        "- What evidence was presented?",
        "- What did the court decide and why?",
        "- What was the final outcome for each party?"
    ],
    "key_arguments": [
        "What arguments did the complainant/petitioner make?",
        "What arguments did the accused/respondent make?",
        "What did the prosecution/plaintiff prove or fail to prove?"
    ],
    "verdict": "State clearly: Who won? What was ordered? Any punishment/compensation/relief granted?",
    "complainant": "Name of the person who filed the case/complaint/FIR",
    "accused": "Name of the accused/defendant/respondent"
}}

Be SPECIFIC and FACTUAL. Include names, dates, amounts, section numbers mentioned in the document.
If the document contains multiple cases, summarize ALL of them."""

            response = await self.llm_service.generate(prompt)
            
            # Parse JSON response
            import json
            # Try to extract JSON from response
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                parsed = json.loads(json_match.group())
                # Clean up case_summary - remove instruction text if LLM included it
                if parsed.get("case_summary"):
                    cleaned_summary = []
                    for point in parsed["case_summary"]:
                        if not point.startswith("Provide") and not point.startswith("-"):
                            cleaned_summary.append(point)
                        elif point.startswith("- ") and len(point) > 50:
                            cleaned_summary.append(point[2:])  # Remove "- " prefix
                    parsed["case_summary"] = cleaned_summary if cleaned_summary else parsed["case_summary"]
                return parsed
            return json.loads(response)
        except Exception as e:
            logger.error(f"LLM comprehensive summarization failed: {e}")
            return None
    
    def _generate_comprehensive_summary(self, text: str, extracted_info: Dict) -> List[str]:
        """Generate a comprehensive case summary without LLM - focuses on facts."""
        summary_points = []
        
        # Add case type
        if extracted_info.get("case_type"):
            summary_points.append(f"This is a {extracted_info['case_type']} case.")
        
        # Add parties info with roles
        if extracted_info.get("complainant") and extracted_info.get("accused"):
            summary_points.append(f"The complaint was filed by {extracted_info['complainant']} against {extracted_info['accused']}.")
        elif extracted_info.get("parties"):
            summary_points.append(f"The case involves {extracted_info['parties']}.")
        
        # Add court and date info
        court_date = []
        if extracted_info.get("court_name"):
            court_date.append(f"heard in the {extracted_info['court_name']}")
        if extracted_info.get("date"):
            court_date.append(f"decided on {extracted_info['date']}")
        if court_date:
            summary_points.append(f"The matter was {' and '.join(court_date)}.")
        
        # Extract what happened - look for FIR/complaint details
        incident_patterns = [
            (r'(?:it is alleged|allegation is|prosecution case is|case of the prosecution is)\s+that\s+([^.]+\.)', "Allegation"),
            (r'(?:incident|occurrence)\s+(?:took place|happened|occurred)\s+(?:on|at)\s+([^.]+\.)', "Incident"),
            (r'(?:FIR|complaint)\s+(?:was\s+)?(?:registered|filed|lodged)\s+(?:for|regarding|alleging)\s+([^.]+\.)', "Complaint details"),
        ]
        
        for pattern, desc in incident_patterns:
            match = re.search(pattern, text[:8000], re.IGNORECASE)
            if match:
                incident_text = match.group(1).strip()
                if len(incident_text) > 30:
                    summary_points.append(f"{incident_text}")
                    break
        
        # Add cited sections info
        if extracted_info.get("cited_sections"):
            sections = [f"{s['act']} Section {s['section']}" for s in extracted_info['cited_sections'][:5]]
            summary_points.append(f"The case involves charges/provisions under {', '.join(sections)}.")
        
        # Add verdict/outcome
        if extracted_info.get("verdict"):
            verdict = extracted_info['verdict']
            if len(verdict) > 200:
                verdict = verdict[:200] + "..."
            summary_points.append(f"Court's decision: {verdict}")
        
        # If still not enough points, try to extract key facts from text
        if len(summary_points) < 4:
            fact_patterns = [
                r'(?:the\s+)?(?:accused|defendant)\s+(?:was|were)\s+(?:charged|booked)\s+(?:for|with|under)\s+([^.]+)',
                r'(?:evidence|investigation)\s+(?:shows|revealed|established)\s+that\s+([^.]+)',
                r'(?:the\s+)?(?:trial\s+)?court\s+(?:held|found|observed)\s+that\s+([^.]+)',
            ]
            for pattern in fact_patterns:
                match = re.search(pattern, text[:10000], re.IGNORECASE)
                if match and len(summary_points) < 6:
                    fact = match.group(1).strip()
                    if len(fact) > 30 and len(fact) < 300:
                        summary_points.append(fact + ".")
        
        return summary_points if summary_points else ["Document uploaded. Analysis extracted the available legal information."]
    
    async def _enhance_summary(self, summary: Dict) -> Dict:
        """Enhance an existing summary."""
        # Add any additional processing
        return summary
    
    def _summarize_statutes(self, statutes: List[Dict]) -> List[Dict]:
        """Create quick summaries of statutes."""
        summaries = []
        
        for statute in statutes:
            summary = {
                "section": statute.get("section_number"),
                "act": statute.get("act_code"),
                "title": statute.get("title_en"),
                "brief": self._create_brief(statute.get("content_en", "")),
                "punishment": statute.get("punishment_description")
            }
            summaries.append(summary)
        
        return summaries
    
    def _summarize_cases(self, cases: List[Dict]) -> List[Dict]:
        """Create quick summaries of case laws."""
        summaries = []
        
        for case in cases:
            summary = {
                "case_name": case.get("case_name"),
                "court": case.get("court_name"),
                "year": case.get("reporting_year"),
                "brief": case.get("summary_en", "")[:300],
                "key_holdings": case.get("key_holdings", [])[:3],
                "is_landmark": case.get("is_landmark", False)
            }
            summaries.append(summary)
        
        return summaries
    
    def _create_brief(self, content: str, max_length: int = 150) -> str:
        """Create a brief summary of content."""
        if not content:
            return ""
        
        # Get first sentence or truncate
        sentences = re.split(r'[.!?]', content)
        if sentences and len(sentences[0]) <= max_length:
            return sentences[0].strip() + "."
        
        return content[:max_length].strip() + "..."
    
    def _extract_key_sentences(self, text: str, max_sentences: int = 5) -> List[str]:
        """Extract key sentences from text as arguments."""
        # Split into sentences
        sentences = re.split(r'(?<=[.!?])\s+', text)
        
        # Key phrases that indicate important sentences
        key_phrases = [
            "held that", "court observed", "it was held",
            "issue before", "question of law", "appellant contended",
            "respondent submitted", "therefore", "accordingly",
            "we are of the view", "in our opinion"
        ]
        
        key_sentences = []
        for sentence in sentences:
            sentence_lower = sentence.lower()
            if any(phrase in sentence_lower for phrase in key_phrases):
                if len(sentence) > 50 and len(sentence) < 500:
                    key_sentences.append(sentence.strip())
                    if len(key_sentences) >= max_sentences:
                        break
        
        return key_sentences
    

