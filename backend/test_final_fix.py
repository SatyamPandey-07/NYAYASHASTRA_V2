
import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(__file__).parent))

async def test_traffic_pedestrian():
    from app.services.bm25_service import get_domain_classifier
    classifier = await get_domain_classifier()
    
    query = "What is the punishment for hitting a pedestrian and killing them?"
    selected_domain = "Traffic"
    
    predicted, confidence, all_scores = await classifier.classify(query)
    
    selected_score = all_scores.get(selected_domain, 0)
    top_score = confidence
    
    is_match = (predicted == selected_domain)
    is_close = (selected_score > (top_score * 0.5) and selected_score > 0.1)
    is_strong = (selected_score > 0.2)
    
    is_allowed = (is_match or is_close or is_strong)
    
    print(f"Query: {query}")
    print(f"Selected: {selected_domain}")
    print(f"Predicted: {predicted} (Score: {top_score:.2f})")
    print(f"Selected Score: {selected_score:.2f}")
    print(f"Is Match: {is_match}")
    print(f"Is Close: {is_close}")
    print(f"Is Strong: {is_strong}")
    print(f"VERDICT: {'ALLOWED' if is_allowed else 'REJECTED'}")

if __name__ == "__main__":
    asyncio.run(test_traffic_pedestrian())
