"""
Fast Rule-Based Prompt Router

Replaces LLM-based classification with instant heuristics.
⏱️ Time: ~0.1ms (vs 3-4 seconds for LLM classification)
"""


def route_prompt(prompt: str) -> str:
    """
    Fast prompt router using heuristics.
    
    Returns:
        'nano' - Fast tier (greetings, short messages)
        'mini' - Medium tier (explanations, simple code)
        'full' - Heavy tier (complex reasoning, architecture)
    """
    p = prompt.lower()
    words = set(p.split())  # Split into words for exact matching
    
    # Greetings and simple interactions (check first, use word matching)
    greetings = {"hello", "hi", "hey", "thanks", "bye", "goodbye"}
    greeting_phrases = ["thank you", "good morning", "good afternoon", "good evening", "how are you"]
    if (words & greetings) and len(prompt) < 50:
        return "nano"
    if any(phrase in p for phrase in greeting_phrases) and len(prompt) < 50:
        return "nano"
    
    # Complex: Code tasks -> full model
    code_keywords = ["write code", "implement", "refactor", "debug this", 
                     "create a function", "create a class", "algorithm",
                     "optimize this code", "code review"]
    if any(k in p for k in code_keywords):
        return "full"
    
    # Complex: Deep analysis -> full model
    complex_keywords = ["design", "architecture", "explain deeply", "analyze in detail",
                        "compare and contrast", "research", "comprehensive", 
                        "step by step reasoning", "prove that"]
    if any(k in p for k in complex_keywords):
        return "full"
    
    # Medium: Debugging/errors -> mini model  
    debug_keywords = ["bug", "error", "stack trace", "exception", "fix", 
                      "not working", "issue", "problem with"]
    if any(k in p for k in debug_keywords):
        return "mini"
    
    # Medium: Explanations and summaries
    explain_keywords = ["explain", "summarize", "what is", "how does", 
                        "describe", "tell me about", "help me understand"]
    if any(k in p for k in explain_keywords):
        return "mini"
    
    # Medium: Writing tasks
    writing_keywords = ["write", "draft", "compose", "create a", "generate"]
    if any(k in p for k in writing_keywords):
        return "mini"
    
    # Default based on length (only after keyword checks)
    if len(prompt) < 30:
        return "nano"
    elif len(prompt) < 100:
        return "nano"
    elif len(prompt) < 300:
        return "mini"
    else:
        return "full"


# Legacy compatibility - maps to complexity strings
def classify(message: str) -> str:
    """Legacy compatibility wrapper."""
    tier = route_prompt(message)
    tier_to_complexity = {
        "nano": "simple",
        "mini": "medium",
        "full": "complex"
    }
    return tier_to_complexity[tier]


# Singleton-style access
class RuleBasedRouter:
    """Fast rule-based router class for compatibility."""
    
    def classify(self, message: str) -> str:
        return classify(message)
    
    def route(self, message: str) -> str:
        return route_prompt(message)


classifier = RuleBasedRouter()
