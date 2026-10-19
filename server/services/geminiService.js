// Direct Google Gemini API Service for instant, dynamic conversational mental wellness support
const GEMINI_MODELS = [
  'gemini-flash-lite-latest',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash'
];

const SYSTEM_INSTRUCTION = `You are MentalHealth Assistant, an empathetic, supportive mental wellness companion.
You must strictly follow these instructions:
1. Warmth & Empathy: Use simple, everyday, compassionate language. Listen deeply and validate the user's feelings.
2. Context-Specific: Always directly address the user's specific problem (e.g., exam pressure, feeling low, anxiety, loneliness, relationship stress, sleep troubles) with actionable, evidence-based coping tools (such as Pomodoro/pacing, CBT reframing, 4-7-8 breathing, behavioral activation, or grounding).
3. Structure: Flow naturally in clear, easy-to-read paragraphs. Avoid unnecessary robotic bullet points unless listing clear, practical steps that help readability.
4. Safety & Boundaries: Never provide psychiatric/medical diagnoses or recommend prescription medication. MindCare provides educational wellness guidance only.
5. Privacy & Cleanliness: Never cite internal document file names, page numbers, or [Source: ...] tags.
6. Crisis: If the user expresses active intent to self-harm, suicide, or crisis, express deep care and urge them to call emergency services or Tele-MANAS (14416 / 1800-891-4416 in India).`;

async function generateAIResponse(userMessage, conversationHistory = []) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    return null;
  }

  // Build contents with history if available
  const contents = [];

  if (conversationHistory && Array.isArray(conversationHistory) && conversationHistory.length > 0) {
    for (const msg of conversationHistory.slice(-4)) {
      if (msg.content && msg.content.trim()) {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content.trim() }]
        });
      }
    }
  }

  // Add current query with system instructions
  const prompt = `${SYSTEM_INSTRUCTION}\n\nUser: ${userMessage}\n\nAssistant:`;
  contents.push({
    role: 'user',
    parts: [{ text: prompt }]
  });

  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 800
          }
        })
      });

      if (!response.ok) {
        continue;
      }

      const data = await response.json();
      const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (replyText && replyText.trim().length > 20) {
        return replyText
          .replace(/\[Source:\s*[^\]]+\]/gi, '')
          .replace(/\(Source:\s*[^)]+\)/gi, '')
          .trim();
      }
    } catch (err) {
      console.warn(`Gemini query fallback on model ${model}:`, err.message);
    }
  }

  return null;
}

module.exports = {
  generateAIResponse
};
