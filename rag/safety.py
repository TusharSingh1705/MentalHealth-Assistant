# Safety guardrail: detects crisis keywords and attaches emergency helpline resources

import re
from typing import Tuple, Dict, Any

CRISIS_PATTERNS = [
    r'\b(suicide|suicidal)\b',
    r'\b(kill\s+(my\s*self|me))\b',
    r'\b(end(ing)?\s+(my|all)?\s*life)\b',
    r'\b(want\s+to\s+die)\b',
    r'\b(feel\s+like\s+dying)\b',
    r'\b(don\'?t\s+want\s+to\s+live)\b',
    r'\b(slit\s+(my\s*)?wrist)\b',
    r'\b(hang\s+myself)\b',
    r'\b(no\s+reason\s+to\s+live)\b',
    r'\b(self\s*harm)\b',
    r'\b(overdose\s+(my\s*self|me))\b'
]

EMERGENCY_HELPLINES_INDIA = {
    "tele_manas": {
        "name": "Tele-MANAS (Govt. of India)",
        "number": "14416 / 1800-891-4416",
        "availability": "24/7 Toll-Free"
    },
    "emergency": {
        "name": "National Emergency Services",
        "number": "112",
        "availability": "24/7 Toll-Free"
    },
    "kiran": {
        "name": "KIRAN Mental Health Helpline",
        "number": "1800-599-0019",
        "availability": "24/7 Toll-Free"
    },
    "vandrevala": {
        "name": "Vandrevala Foundation",
        "number": "+91 9999 666 555",
        "availability": "24/7 Free"
    }
}

DISCLAIMER_TEXT = (
    "MindCare AI is an educational wellness support companion and does not diagnose, "
    "prescribe, or replace professional mental health care or therapy."
)

def evaluate_safety(prompt: str) -> Tuple[bool, Dict[str, Any]]:
    """
    Evaluates input prompt for acute crisis or self-harm markers.
    Returns (is_crisis, response_payload).
    """
    clean_prompt = prompt.lower().strip()
    
    for pattern in CRISIS_PATTERNS:
        if re.search(pattern, clean_prompt):
            crisis_response = (
                "I can hear how much pain you are experiencing right now, and I want you to know "
                "that your life and safety are profoundly valuable. You don't have to carry this alone.\n\n"
                "Please pause and reach out immediately to trained professionals who are ready to support you 24/7:\n"
                f"• **Tele-MANAS**: Call toll-free **14416** or **1800-891-4416**\n"
                f"• **National Emergency**: Call **112**\n"
                f"• **KIRAN Helpline**: Call **1800-599-0019**\n"
                f"• **Vandrevala Foundation**: Call **+91 9999 666 555**\n\n"
                "Please connect with one of these resources or contact a trusted person right now."
            )
            return True, {
                "is_crisis": True,
                "reply": crisis_response,
                "source": "India National Crisis Intervention Standards",
                "helplines": EMERGENCY_HELPLINES_INDIA,
                "disclaimer": DISCLAIMER_TEXT
            }
            
    return False, {"is_crisis": False}
