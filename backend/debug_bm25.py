
import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(__file__).parent))

async def debug_query():
    from app.services.bm25_service import get_domain_classifier
    classifier = await get_domain_classifier()
    
    query = "What is the punishment for hitting a pedestrian and killing them?"
    predicted_domain, confidence, all_scores = await classifier.classify(query)
    
    print(f"Query: {query}")
    print(f"Predicted Domain: {predicted_domain}")
    print(f"Confidence: {confidence:.4f}")
    print("\nAll Scores:")
    for domain, score in sorted(all_scores.items(), key=lambda x: x[1], reverse=True):
        print(f" - {domain}: {score:.4f}")

if __name__ == "__main__":
    asyncio.run(debug_query())
