// Chat completion & RAG endpoint with crisis safety guardrails
const express = require('express');
const router = express.Router();
const { optionalAuth } = require('../middleware/auth');
const { chatLimiter } = require('../middleware/rateLimit');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const mongoose = require('mongoose');
const { getMemConversations, memMessages } = require('../config/memStore');

// Crisis keywords
const CRISIS_KEYWORDS = [
  'suicide', 'kill myself', 'end my life', 'want to die', 'harm myself',
  'self harm', 'hang myself', 'slit my wrist', 'no reason to live'
];

// Curated Grounded Knowledge Repository
const KNOWLEDGE_BASE = [
  {
    topic: 'CBT Cognitive Reframing',
    source: 'Beck Institute for Cognitive Behavior Therapy Protocol',
    keywords: ['stress', 'thought', 'negative', 'anxious', 'overwhelmed', 'fail', 'pressure', 'catastrophize'],
    content: `In Cognitive Behavioral Therapy (CBT), we recognize that thoughts are automatic interpretations, not absolute facts. When feeling overwhelmed, apply the "Three C's":
1. **Catch it**: Notice the catastrophic or all-or-nothing thought.
2. **Check it**: What is the factual evidence supporting this thought? What is the evidence against it?
3. **Change it**: Reframe the thought into a balanced, compassionate, and actionable alternative.`
  },
  {
    topic: 'Diaphragmatic Respiration & Autonomic Regulation',
    source: 'Clinical Mindfulness-Based Stress Reduction (MBSR)',
    keywords: ['breathe', 'breathing', 'panic', 'heart', 'pulse', 'shaking', 'calm', 'relax'],
    content: `When stress triggers sympathetic arousal (fight-or-flight), diaphragmatic respiration directly activates the vagus nerve to decrease heart rate:
1. Inhale slowly through your nose for 4 counts, ensuring your belly expands rather than just your chest.
2. Pause gently for 2–4 counts.
3. Exhale steadily through parted lips for 6–8 counts. Prolonging the exhalation phase stimulates parasympathetic calm.`
  },
  {
    topic: 'Circadian Rhythm & Sleep Hygiene',
    source: 'American Academy of Sleep Medicine (AASM) Guidelines',
    keywords: ['sleep', 'insomnia', 'night', 'tired', 'rest', 'awake', 'morning'],
    content: `Evidence-grounded sleep hygiene practices:
1. Maintain consistent wake-up times, even on non-working days, to stabilize circadian pacing.
2. Maintain a "digital sunset" 60 minutes before bedtime by avoiding back-lit OLED/LED screens.
3. Stimulus control: Use your bed solely for sleep and rest. If you remain awake after 20 minutes, move to a dim room and engage in quiet reading until natural drowsiness returns.`
  },
  {
    topic: 'Sensory Grounding Protocol (5-4-3-2-1)',
    source: 'Somatic Trauma-Informed Grounding Standards',
    keywords: ['grounding', 'dissociation', 'panic attack', 'dizzy', 'fear', 'scared', 'senses'],
    content: `The 5-4-3-2-1 grounding technique re-anchors attention to the present external environment:
• 5 things you can visually see (colors, shapes, textures)
• 4 things you can physically feel (feet touching the floor, clothes on skin)
• 3 sounds you can audibly hear (distant birds, humming fan)
• 2 scents you can detect
• 1 pleasant taste or conscious positive affirmation.`
  },
  {
    topic: 'Behavioral Activation & Social Support',
    source: 'Behavioral Activation for Emotional Well-Being',
    keywords: ['lonely', 'isolated', 'empty', 'alone', 'motivation', 'hopeless', 'connection'],
    content: `Behavioral activation emphasizes that action often precedes mood improvement rather than waiting for motivation to strike:
1. Schedule a micro-activity that once brought a sense of mastery or connection (e.g., watering a plant, a 5-minute walk).
2. Reach out to one trusted person with a low-pressure message.
3. Practice self-compassion: Remind yourself that feelings of loneliness are temporary emotional states, not permanent identity traits.`
  }
];

// Helper: Check for crisis
function checkCrisisTrigger(text) {
  const lower = text.toLowerCase();
  return CRISIS_KEYWORDS.some(kw => lower.includes(kw));
}

// Helper: Retrieve best knowledge match
function retrieveKnowledge(query) {
  const lower = query.toLowerCase();
  let bestMatch = null;
  let maxScore = 0;

  for (const item of KNOWLEDGE_BASE) {
    let score = 0;
    for (const kw of item.keywords) {
      if (lower.includes(kw)) score += 2;
    }
    if (score > maxScore) {
      maxScore = score;
      bestMatch = item;
    }
  }

  return bestMatch;
}

const { queryRAG } = require('../services/ragService');

// POST /api/chat/message
router.post('/message', chatLimiter, optionalAuth, async (req, res) => {
  try {
    const { message, conversationId, history } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Validation Error', message: 'Message cannot be empty' });
    }

    const userText = message.trim();
    const isCrisis = checkCrisisTrigger(userText);

    let reply = '';
    let source = '';
    let citations = [];
    let disclaimer = 'MindCare AI provides educational wellness guidance only. It is not medical or diagnostic care.';

    if (isCrisis) {
      reply = `I can hear how much pain you are experiencing right now, and I want you to know that your safety and life are deeply valued. You do not have to walk through this alone.

Please pause and connect directly with trained professionals who are ready to support you 24/7 without judgment:
• **Tele-MANAS (Govt. of India)**: Call toll-free **14416** or **1800-891-4416**
• **National Emergency Service**: Call **112**
• **KIRAN Helpline**: Call **1800-599-0019**
• **Vandrevala Foundation**: Call **+91 9999 666 555**

Please reach out to one of these numbers or a trusted loved one right now.`;
      source = '';
    } else if (/^(hi+|hey+|hello+|howdy|greetings|good\s+(morning|afternoon|evening|day)|sup|yo|namaste|hola)\b/i.test(userText.trim().replace(/[^\w\s]/g, '')) && userText.trim().split(/\s+/).length <= 4) {
      reply = `Hello! Welcome to MentalHealth Assistant. I am here to provide compassionate, evidence-based mental wellness support. How are you feeling today, or what would you like to explore?`;
      source = '';
    } else if (/^(can\s+i\s+(tell|ask|share|talk)|may\s+i\s+(tell|ask|share|talk)|i\s+(want|need)\s+to\s+(talk|share|tell)|are\s+you\s+(there|listening)|can\s+we\s+talk)\b/i.test(userText.trim().replace(/[^\w\s]/g, '')) && userText.trim().split(/\s+/).length <= 8) {
      reply = `Of course, I am right here and listening. Please feel free to share whatever is on your mind — whether you are going through a difficult situation, feeling stressed or low, or just need a safe space to express yourself. Take your time, I am here to support you.`;
      source = '';
    } else {
      // Execute Retrieval-Augmented Generation (RAG) over knowledge base
      try {
        const ragResult = await queryRAG(userText);
        const isAbstention = !ragResult || !ragResult.reply ||
          ragResult.reply.trim().length < 60 ||
          ragResult.reply.includes("could not find enough information") ||
          ragResult.reply.includes("documents provided to MentalHealth Assistant");

        if (ragResult && ragResult.reply && !isAbstention) {
          reply = ragResult.reply;
          source = '';
          citations = [];
          if (ragResult.disclaimer) {
            disclaimer = ragResult.disclaimer;
          }
        } else {
          // If RAG abstained or returned empty, check curated grounded knowledge base
          const matchedDoc = retrieveKnowledge(userText);
          if (matchedDoc) {
            source = "";
            reply = `Thank you for sharing this. Based on evidence-grounded wellness strategies, here is guidance tailored to what you described:\n\n${matchedDoc.content}\n\nTake this one moment at a time. Would you like to try a gentle relaxation exercise together, or would you like to unpack any part of this?`;
          } else if (ragResult && ragResult.reply) {
            reply = ragResult.reply;
            source = "";
          } else {
            reply = "I could not find enough information to answer this question in the documents provided to MentalHealth Assistant.";
            source = "";
          }
        }
      } catch (ragErr) {
        console.error('RAG service error, using safe fallback:', ragErr);
        // Fallback to local curated knowledge if RAG service encounters unexpected system fault
        const matchedDoc = retrieveKnowledge(userText);
        if (matchedDoc) {
          source = "";
          reply = `Thank you for sharing this. Based on evidence-grounded wellness strategies, here is guidance tailored to what you described:\n\n${matchedDoc.content}\n\nTake this one moment at a time. Would you like to try a gentle relaxation exercise together, or would you like to unpack any part of this?`;
        } else {
          reply = "I could not find enough information to answer this question in the documents provided to MentalHealth Assistant.";
          source = "";
        }
      }

      // Strip any residual source / citation annotations
      if (reply) {
        reply = reply.replace(/\[Source:\s*[^\]]+\]/gi, '')
                     .replace(/\(Source:\s*[^)]+\)/gi, '')
                     .replace(/Source:\s*[\w\s.-]+\.pdf/gi, '')
                     .trim();
      }
    }

    // Attempt DB logging to MongoDB Atlas if connected, otherwise fallback to in-memory store
    let finalConvId = conversationId;
    if (mongoose.connection.readyState === 1) {
      try {
        let convDoc = null;
        if (conversationId && conversationId.match(/^[0-9a-fA-F]{24}$/)) {
          convDoc = await Conversation.findById(conversationId);
        }
        if (!convDoc) {
          convDoc = await Conversation.create({
            userId: req.user ? req.user.id : null,
            guestId: req.headers['x-guest-session-id'] || null,
            title: userText ? (userText.length > 28 ? userText.slice(0, 28) + '...' : userText) : 'New Conversation'
          });
        }

        if (convDoc) {
          finalConvId = convDoc._id.toString();
          await Message.create({
            conversationId: convDoc._id,
            sender: 'user',
            text: userText
          });

          await Message.create({
            conversationId: convDoc._id,
            sender: 'assistant',
            text: reply,
            source,
            isCrisis
          });
          await Conversation.findByIdAndUpdate(convDoc._id, { updatedAt: new Date() });
        }
      } catch (dbErr) {
        console.warn('DB logging error (skipped):', dbErr.message);
      }
    }

    // Fallback store when MongoDB Atlas is offline or disconnected
    if (!finalConvId) {
      finalConvId = conversationId || 'conv_' + Date.now();
      const userId = req.user ? req.user.id : null;
      const guestId = req.headers['x-guest-session-id'] || null;
      const memConvs = getMemConversations();
      let memConv = memConvs.find(c => c.id === finalConvId);
      if (!memConv) {
        memConv = {
          id: finalConvId,
          userId,
          guestId,
          title: userText ? (userText.length > 28 ? userText.slice(0, 28) + '...' : userText) : 'New Conversation',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        memConvs.unshift(memConv);
      }
      memMessages.push({
        conversationId: finalConvId,
        sender: 'user',
        text: userText,
        timestamp: new Date()
      });
      memMessages.push({
        conversationId: finalConvId,
        sender: 'assistant',
        text: reply,
        source,
        isCrisis,
        timestamp: new Date()
      });
    }

    res.json({
      reply,
      source,
      citations,
      isCrisis,
      disclaimer,
      conversationId: finalConvId
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Server Error', message: 'Failed to generate response' });
  }
});

module.exports = router;
