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
- **Database**: MongoDB (Mongoose ODM)
- **Vector Database**: ChromaDB (RAG embedding store)
- **RAG Pipeline**: Python, ChromaDB, Google Gemini API

---

## Database Architecture

The application uses a dual-database design tailored for privacy, fast conversation retrieval, and evidence-grounded AI responses:

### 1. MongoDB (Primary Datastore)
- **Role**: Stores registered user profiles, authenticated credentials, preferences, emergency contacts, conversation history, and ephemeral guest sessions.
- **Connection**: Managed via Mongoose (`server/config/db.js`). Configured through `MONGODB_URI` in `.env` (supports both local MongoDB and MongoDB Atlas).
- **Graceful Fallback**: If MongoDB is unreachable locally, the server automatically degrades to an in-memory/client-side storage mode so you can continue testing without running a database daemon.
- **Schemas & Models** (`server/models/`):
  - **`User`**: Account info (hashed passwords with bcrypt), personal preferences (dark mode, citations, history retention), and emergency trusted contacts.
  - **`GuestSession`**: Ephemeral sessions featuring a 24-hour TTL index (`expires: 86400`) to guarantee automatic deletion for guest privacy.
  - **`Conversation`**: Conversation threads indexed by either `userId` or ephemeral `guestId`.
  - **`Message`**: Individual messages with sender roles (`user`, `assistant`, `system`), crisis detection flags (`isCrisis`), and resource citations.

### 2. ChromaDB (Vector Store)
- **Role**: High-dimensional vector index for RAG (Retrieval-Augmented Generation) psychoeducational guidelines.
- **Location**: Stored locally on disk at `./rag/chroma_db` (customizable via `CHROMA_DB_PATH`).
- **Management**: Populated through `rag/ingest.py` and queried through `rag/pipeline.py`.

---

## Getting Started

### Prerequisites

- Node.js (v18 or newer)
- npm (v9 or newer)
- MongoDB (Optional: local MongoDB Community Server or MongoDB Atlas cluster; in-memory fallback enabled if offline)

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
   npm run dev
   ```

4. Open `http://localhost:5000` in your browser.

---

## Disclaimer

MentalHealth Assistant is an educational self-care tool. It does not provide clinical diagnosis, psychiatric therapy, or emergency services.

If you or someone you know is in acute distress or crisis, please contact verified emergency helplines:
- **Tele-MANAS**: 14416 / 1800-891-4416
- **National Emergency**: 112
- **KIRAN**: 1800-599-0019
- **Vandrevala Foundation**: +91 9999 666 555