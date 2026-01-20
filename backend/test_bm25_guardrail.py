
import asyncio
import sys
import os
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(__file__).parent))

async def test_guardrail():
    print("Testing BM25 Domain Guardrail...")
    from app.services.bm25_service import get_domain_classifier
    from app.schemas import LegalDomain
    
    classifier = await get_domain_classifier()
    
    test_cases = [
        {
            "query": "what are the grounds for divorce in hindu marriage laws?",
            "selected": LegalDomain.TRAFFIC.value,
            "expected_rejection": True
        },
        {
            "query": "how to challenge a traffic challan for red light jumping",
            "selected": LegalDomain.TRAFFIC.value,
            "expected_rejection": False
        },
        {
            "query": "bail for section 302 murder case",
            "selected": LegalDomain.TRAFFIC.value,
            "expected_rejection": True
        }
    ]
    
    for case in test_cases:
        query = case["query"]
        selected = case["selected"]
        
        predicted, confidence, all_scores = await classifier.classify(query)
        
        is_relevant = not (predicted != selected and confidence > 0.25)
        
        status = "REJECTED" if not is_relevant else "ALLOWED"
        print(f"\nQuery: {query}")
        print(f"Selected Domain: {selected}")
        print(f"Predicted Domain: {predicted} (Confidence: {confidence:.2f})")
        print(f"Guardrail Action: {status}")
        
        if is_relevant == case["expected_rejection"]:
             print("❌ Guardrail failed to match expectation!")
        else:
             print("✅ Guardrail worked as expected.")

if __name__ == "__main__":
    asyncio.run(test_guardrail())
