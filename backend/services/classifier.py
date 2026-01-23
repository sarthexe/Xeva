from openai import OpenAI
import sys
from pathlib import Path
# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))
from config import OPENAI_API_KEY, MODELS

CLASSIFIER_PROMPT = """You are a message complexity classifier. Analyze the user's message and classify it into one of three categories:

SIMPLE - Use for:
- Greetings ("Hi", "Hello", "How are you?")
- Simple factual questions ("What is 2+2?", "What's the capital of France?")
- Brief definitions ("What is AI?", "Define photosynthesis")
- Yes/no questions
- Very short, straightforward requests

MEDIUM - Use for:
- Summarization requests
- Writing short content (emails, messages)
- Explanations of concepts
- Translation requests
- Moderate complexity questions
- Questions requiring some thought but not deep analysis
- Creative writing (stories, essays)
- Technical explanations
- Content marketing and thought leadership strategies
- Product recommendations
- Newsletter writing
- News articles
- Blog posts
- Social media posts

COMPLEX - Use for:
- Code writing or debugging
- Data analysis requests
- In-depth comparisons
- Research tasks
- Multi-step problem solving
- Anything requiring reasoning, planning, or expertise

Respond with ONLY one word: SIMPLE, MEDIUM, or COMPLEX"""


class ComplexityClassifier:
    """Classifies message complexity to route to the appropriate model."""
    
    def __init__(self):
        self.client = OpenAI(api_key=OPENAI_API_KEY)
    
    def classify(self, message: str) -> str:
        """
        Classify the complexity of a message.
        
        Args:
            message: The user's message to classify
            
        Returns:
            'simple', 'medium', or 'complex'
        """
        try:
            response = self.client.chat.completions.create(
                model=MODELS["nano"],  # Use cheapest model for classification
                messages=[
                    {"role": "system", "content": CLASSIFIER_PROMPT},
                    {"role": "user", "content": message}
                ]
            )
            
            result = response.choices[0].message.content.strip().upper()
            
            if result in ["SIMPLE", "MEDIUM", "COMPLEX"]:
                return result.lower()
            else:
                # Default to medium if unclear
                return "medium"
                
        except Exception as e:
            print(f"Classification error: {e}")
            # Default to medium on error
            return "medium"


# Singleton instance
classifier = ComplexityClassifier()
