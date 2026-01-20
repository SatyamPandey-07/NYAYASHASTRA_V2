
import sys
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(__file__).parent))

def test_language_detection():
    from app.services.system_prompt import LanguageDetector
    
    test_cases = [
        "What is the punishment for hitting a pedestrian and killing them?",
        "How to challenge a traffic challan for red light jumping",
        "Murder ki saza kya hai?",
        "चोरी के लिए क्या सजा है?",
        "Important rules for driving in India",
        "Explain criminal breach of trust"
    ]
    
    print("Testing Language Detection Improvements:")
    print("-" * 40)
    for query in test_cases:
        detected = LanguageDetector.detect(query)
        print(f"Query: {query}")
        print(f"Detected: {detected}")
        print("-" * 40)

if __name__ == "__main__":
    test_language_detection()
