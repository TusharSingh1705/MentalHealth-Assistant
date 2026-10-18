# MentalHealth Assistant

MentalHealth Assistant is a privacy-first mental wellness web application. It provides evidence-grounded wellness conversations, interactive mindfulness exercises, and immediate connections to 24/7 crisis resources.

---

## Features

- **Supportive Chat**: Evidence-based wellness guidance with real-time crisis detection and helpline prompts.
- **Mindfulness & Grounding**: Interactive exercises including Box Breathing, 4-7-8 Breathing, 5-4-3-2-1 Sensory Grounding, Body Scan, and Progressive Muscle Relaxation.
- **Crisis Support (India)**: Quick-dial access to verified 24/7 helplines (Tele-MANAS 14416, Emergency 112, KIRAN 1800-599-0019) and personal trusted emergency contacts.
- **Privacy First**: Guest mode available with no registration required, client-side persistence, and data export or deletion controls.

---

## Tech Stack

- **Frontend**: HTML5, Vanilla CSS, JavaScript
- **Backend**: Node.js, Express
- **RAG Pipeline**: Python, ChromaDB, Google Gemini API

---

## Getting Started

### Prerequisites

- Node.js (v18 or newer)
- npm (v9 or newer)

### Installation & Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment:
   ```bash
   cp .env.example .env
   ```

3. Start the application:
   ```bash
   npm start
   ```

4. Open `http://localhost:5000` in your browser.

---

## RAG Pipeline (Optional)

To index reference documents and run evaluations:

```bash
# Ingest PDF documents into ChromaDB
npm run rag:ingest

# Run retrieval and safety evaluation
npm run rag:evaluate
```

---

## Disclaimer

MentalHealth Assistant is an educational self-care tool. It does not provide clinical diagnosis, psychiatric therapy, or emergency services.

If you or someone you know is in acute distress or crisis, please contact verified emergency helplines:
- **Tele-MANAS**: 14416 / 1800-891-4416
- **National Emergency**: 112
- **KIRAN**: 1800-599-0019
- **Vandrevala Foundation**: +91 9999 666 555