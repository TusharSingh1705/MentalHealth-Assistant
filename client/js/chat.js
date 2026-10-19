'use strict';

const ChatApp = {
  currentConversationId: null,
  conversations: [],
  isTyping: false,
  pendingDeleteConvId: null,

  wellnessKnowledge: [
    {
      keywords: ['stress', 'coping', 'overwhelm', 'burnout', 'pressure'],
      source: 'CBT Stress Management Protocol',
      response: `Stress usually spikes when daily demands feel like they exceed our immediate bandwidth. Here are a couple of practical, evidence-backed steps you can try right now:

1. **Box Breathing**: Inhale for 4 seconds, hold for 4, exhale for 4, hold empty for 4. Doing this for 2 minutes helps down-regulate your sympathetic nervous system.
2. **Fact vs. Assumption**: Ask yourself, *"Is this worry a proven fact right now, or is it an assumption my anxious mind is making?"*
3. **Pick One Micro-Step**: Break whatever is piling up into a single 5-minute task. Starting small rebuilds your sense of momentum.`
    },
    {
      keywords: ['sleep', 'insomnia', 'tired', 'rest', 'night', 'wake'],
      source: 'Clinical Sleep Hygiene Guidelines (AASM)',
      response: `Quality rest is essential for emotional balance. A few grounded habits that make a noticeable difference:

1. **Screen Sunset**: Step away from backlit screens 45 minutes before sleep so your brain can naturally produce melatonin.
2. **The 20-Minute Reset**: If you find yourself tossing and turning after 20 minutes, get out of bed, sit in dim light, and read something relaxing until you feel naturally drowsy.
3. **Anchor Your Morning**: Waking up around the same time each day (even on weekends) is the strongest biological cue for your sleep-wake cycle.`
    },
    {
      keywords: ['anxiety', 'panic', 'nervous', 'scared', 'worry', 'racing', 'palpitation'],
      source: 'Grounding & Somatic Panic Protocols',
      response: `When anxiety spikes, your nervous system is simply trying to protect you from perceived threat. Let's gently anchor back into your senses:

1. **5-4-3-2-1 Grounding**:
   • Notice **5** objects you can see around the room.
   • Feel **4** physical textures (the fabric of your clothes, the floor under your shoes).
   • Listen for **3** distinct ambient sounds.
   • Notice **2** scents.
   • Acknowledge **1** comforting thought or sip of water.
2. **Longer Exhales**: Inhale deeply through your nose, then make your exhale twice as long through your mouth. This slows your heart rate directly.`
    },
    {
      keywords: ['lonely', 'isolated', 'alone', 'connection', 'sad', 'empty'],
      source: 'Social Connectedness & Behavioral Activation',
      response: `Feeling disconnected is painful, but it is a very common human experience. A few gentle ways to re-engage:

1. **Low-Stakes Micro-Connections**: A simple hello to a neighbor, a quick text to check in on a friend, or stepping outside around people helps release oxytocin.
2. **Behavioral Activation**: When we feel low, motivation drops. Picking one small, pleasant activity (a warm beverage, listening to a favorite track, watering a plant) often gently lifts our state.
3. **Self-Compassion**: Treat yourself today with the exact same warmth you would offer a close friend who is going through a tough time.`
    },
    {
      keywords: ['breathe', 'breathing', 'exercise', 'relaxation', 'calm'],
      source: 'Mindfulness & Diaphragmatic Respiration',
      response: `Let's take a slow, mindful breath together:

• **Inhale gently** through your nose for **4 seconds**... expanding your belly.
• **Hold softly** for **4 seconds**...
• **Exhale smoothly** through your mouth for **6 seconds**... releasing any tension held in your shoulders.

You can also visit our [Mindfulness page](mindfulness.html) for full-screen visual breathing pacers like 4-7-8 and Box Breathing.`
    }
  ],

  crisisKeywords: [
    'suicide', 'kill myself', 'end my life', 'want to die', 'harm myself',
    'self harm', 'hang myself', 'slit my wrist', 'no reason to live'
  ],

  init() {
    this.bindDOM();
    this.loadConversations();
    this.checkGuestOrUser();
  },

  bindDOM() {
    this.sidebar = document.getElementById('chatSidebar');
    this.sidebarToggle = document.getElementById('sidebarToggle');
    this.conversationList = document.getElementById('conversationList');
    this.noConversations = document.getElementById('noConversations');
    this.newChatBtn = document.getElementById('newChatBtn');
    this.chatTitle = document.getElementById('chatTitle');
    this.clearChatBtn = document.getElementById('clearChatBtn');
    this.chatMessages = document.getElementById('chatMessages');
    this.chatWelcome = document.getElementById('chatWelcome');
    this.chatInput = document.getElementById('chatInput');
    this.chatSendBtn = document.getElementById('chatSendBtn');

    this.deleteConvModal = document.getElementById('deleteConvModal');
    this.deleteConvModalClose = document.getElementById('deleteConvModalClose');
    this.deleteConvCancelBtn = document.getElementById('deleteConvCancelBtn');
    this.deleteConvConfirmBtn = document.getElementById('deleteConvConfirmBtn');

    this.renameChatHeaderBtn = document.getElementById('renameChatHeaderBtn');
    this.renameConvModal = document.getElementById('renameConvModal');
    this.renameConvInput = document.getElementById('renameConvInput');
    this.renameConvModalClose = document.getElementById('renameConvModalClose');
    this.renameConvCancelBtn = document.getElementById('renameConvCancelBtn');
    this.renameConvConfirmBtn = document.getElementById('renameConvConfirmBtn');

    if (this.deleteConvModalClose) {
      this.deleteConvModalClose.addEventListener('click', () => this.closeDeleteConvModal());
    }
    if (this.deleteConvCancelBtn) {
      this.deleteConvCancelBtn.addEventListener('click', () => this.closeDeleteConvModal());
    }
    if (this.deleteConvConfirmBtn) {
      this.deleteConvConfirmBtn.addEventListener('click', () => {
        if (this.pendingDeleteConvId) {
          this.executeDeleteConversation(this.pendingDeleteConvId);
          this.closeDeleteConvModal();
        }
      });
    }
    if (this.deleteConvModal) {
      this.deleteConvModal.addEventListener('click', (e) => {
        if (e.target === this.deleteConvModal) {
          this.closeDeleteConvModal();
        }
      });
    }

    if (this.renameChatHeaderBtn) {
      this.renameChatHeaderBtn.addEventListener('click', () => {
        if (this.currentConversationId) {
          this.promptRenameConversation(this.currentConversationId);
        }
      });
    }
    if (this.renameConvModalClose) {
      this.renameConvModalClose.addEventListener('click', () => this.closeRenameConvModal());
    }
    if (this.renameConvCancelBtn) {
      this.renameConvCancelBtn.addEventListener('click', () => this.closeRenameConvModal());
    }
    if (this.renameConvConfirmBtn) {
      this.renameConvConfirmBtn.addEventListener('click', () => this.confirmRenameConversation());
    }
    if (this.renameConvInput) {
      this.renameConvInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.confirmRenameConversation();
        } else if (e.key === 'Escape') {
          this.closeRenameConvModal();
        }
      });
    }
    if (this.renameConvModal) {
      this.renameConvModal.addEventListener('click', (e) => {
        if (e.target === this.renameConvModal) {
          this.closeRenameConvModal();
        }
      });
    }

    if (this.sidebarToggle && this.sidebar) {
      this.sidebarToggle.addEventListener('click', () => {
        this.sidebar.classList.toggle('open');
      });
    }

    const collapseBtn = document.getElementById('sidebarCollapseBtn');
    if (collapseBtn && this.sidebar) {
      collapseBtn.addEventListener('click', () => {
        this.sidebar.classList.toggle('collapsed');
      });
    }

    if (this.newChatBtn) {
      this.newChatBtn.addEventListener('click', () => this.startNewConversation());
    }

    if (this.clearChatBtn) {
      this.clearChatBtn.addEventListener('click', () => this.clearCurrentChat());
    }

    if (this.chatSendBtn) {
      this.chatSendBtn.addEventListener('click', () => this.handleSendMessage());
    }

    if (this.chatInput) {
      this.chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.handleSendMessage();
        }
      });

      this.chatInput.addEventListener('input', () => {
        this.chatInput.style.height = 'auto';
        this.chatInput.style.height = Math.min(this.chatInput.scrollHeight, 140) + 'px';
      });
    }

    document.querySelectorAll('.chat-welcome__suggestion').forEach(btn => {
      btn.addEventListener('click', () => {
        const query = btn.getAttribute('data-query');
        if (query && this.chatInput) {
          this.chatInput.value = query;
          this.handleSendMessage();
        }
      });
    });
  },

  checkGuestOrUser() {
    if (AuthManager.isGuest()) {
      Toast.info('Guest Session', 'Your chats are stored locally in your browser.');
    }
  },

  loadConversations() {
    this.conversations = Storage.getList('conversations');
    this.renderSidebar();

    if (this.conversations.length > 0) {
      this.switchConversation(this.conversations[0].id);
    } else {
      this.startNewConversation(false);
    }
  },

  renderSidebar() {
    if (!this.conversationList) return;
    this.conversationList.innerHTML = '';

    if (this.conversations.length === 0) {
      if (this.noConversations) {
        this.conversationList.appendChild(this.noConversations);
        this.noConversations.style.display = 'block';
      }
      return;
    }

    this.conversations.forEach(conv => {
      const item = document.createElement('div');
      item.className = `chat-sidebar__item ${conv.id === this.currentConversationId ? 'active' : ''}`;
      item.innerHTML = `
        <span class="chat-sidebar__item-icon" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </span>
        <span class="chat-sidebar__item-title">${Utils.escapeHtml(conv.title || 'Conversation')}</span>
        <div class="chat-sidebar__item-actions">
          <button class="chat-sidebar__item-rename" title="Rename conversation" aria-label="Rename">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
            </svg>
          </button>
          <button class="chat-sidebar__item-delete" title="Delete conversation" aria-label="Delete">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      `;

      item.addEventListener('click', (e) => {
        if (e.target.closest('.chat-sidebar__item-rename')) {
          e.stopPropagation();
          this.promptRenameConversation(conv.id);
        } else if (e.target.closest('.chat-sidebar__item-delete')) {
          e.stopPropagation();
          this.promptDeleteConversation(conv.id);
        } else {
          this.switchConversation(conv.id);
          if (this.sidebar) this.sidebar.classList.remove('open');
        }
      });

      this.conversationList.appendChild(item);
    });
  },

  startNewConversation(shouldRender = true) {
    const newConv = {
      id: Utils.generateId(),
      title: 'New Conversation',
      createdAt: new Date().toISOString(),
      messages: []
    };

    this.conversations.unshift(newConv);
    Storage.set('conversations', this.conversations);
    this.currentConversationId = newConv.id;

    if (shouldRender) {
      this.renderSidebar();
      this.renderMessages();
      if (this.chatTitle) this.chatTitle.textContent = 'New Conversation';
    }
  },

  switchConversation(id) {
    this.currentConversationId = id;
    const conv = this.conversations.find(c => c.id === id);
    if (conv) {
      if (this.chatTitle) this.chatTitle.textContent = conv.title || 'Conversation';
      this.renderMessages();
    }
    this.renderSidebar();
  },

  promptDeleteConversation(id) {
    this.pendingDeleteConvId = id;
    if (this.deleteConvModal) {
      this.deleteConvModal.classList.add('open');
    } else {
      // Fallback check
      if (confirm('Delete this conversation? This action cannot be undone.')) {
        this.executeDeleteConversation(id);
      }
    }
  },

  closeDeleteConvModal() {
    this.pendingDeleteConvId = null;
    if (this.deleteConvModal) {
      this.deleteConvModal.classList.remove('open');
    }
  },

  promptRenameConversation(id) {
    this.pendingRenameConvId = id;
    const conv = this.conversations.find(c => c.id === id);
    if (!conv) return;

    if (this.renameConvModal && this.renameConvInput) {
      this.renameConvInput.value = conv.title || 'Conversation';
      this.renameConvModal.classList.add('open');
      setTimeout(() => {
        this.renameConvInput.focus();
        this.renameConvInput.select();
      }, 50);
    } else {
      const newTitle = prompt('Enter a new title for this conversation:', conv.title || 'Conversation');
      if (newTitle && newTitle.trim()) {
        this.executeRenameConversation(id, newTitle.trim());
      }
    }
  },

  closeRenameConvModal() {
    this.pendingRenameConvId = null;
    if (this.renameConvModal) {
      this.renameConvModal.classList.remove('open');
    }
  },

  confirmRenameConversation() {
    if (!this.pendingRenameConvId) return;
    const newTitle = this.renameConvInput ? this.renameConvInput.value.trim() : '';
    if (!newTitle) {
      Toast.error('Title Required', 'Please enter a conversation title.');
      return;
    }
    this.executeRenameConversation(this.pendingRenameConvId, newTitle);
    this.closeRenameConvModal();
  },

  executeRenameConversation(id, newTitle) {
    const conv = this.conversations.find(c => c.id === id);
    if (conv) {
      conv.title = newTitle;
      Storage.set('conversations', this.conversations);
      if (this.currentConversationId === id && this.chatTitle) {
        this.chatTitle.textContent = newTitle;
      }
      this.renderSidebar();

      try {
        if (typeof API !== 'undefined' && API.patch) {
          API.patch(`/conversations/${id}`, { title: newTitle }).catch(() => {});
        }
      } catch (e) {}

      Toast.success('Renamed', 'Conversation title updated.');
    }
  },

  deleteConversation(id) {
    this.promptDeleteConversation(id);
  },

  executeDeleteConversation(id) {
    this.conversations = this.conversations.filter(c => c.id !== id);
    Storage.set('conversations', this.conversations);

    if (this.currentConversationId === id) {
      if (this.conversations.length > 0) {
        this.switchConversation(this.conversations[0].id);
      } else {
        this.startNewConversation(true);
      }
    } else {
      this.renderSidebar();
    }
    Toast.info('Deleted', 'Conversation removed.');
  },

  clearCurrentChat() {
    const conv = this.conversations.find(c => c.id === this.currentConversationId);
    if (!conv || conv.messages.length === 0) return;

    this.promptDeleteConversation(this.currentConversationId);
  },

  renderMessages() {
    const conv = this.conversations.find(c => c.id === this.currentConversationId);
    if (!conv || !conv.messages || conv.messages.length === 0) {
      this.chatMessages.innerHTML = '';
      if (this.chatWelcome) {
        this.chatMessages.appendChild(this.chatWelcome);
        this.chatWelcome.style.display = 'flex';
      }
      return;
    }

    if (this.chatWelcome) {
      this.chatWelcome.style.display = 'none';
    }

    this.chatMessages.innerHTML = '';
    conv.messages.forEach(msg => this.appendMessageElement(msg));
    this.scrollToBottom();
  },

  appendMessageElement(msg) {
    const isUser = msg.sender === 'user';
    const msgEl = document.createElement('div');
    msgEl.className = `chat-message chat-message--${isUser ? 'user' : 'assistant'}`;

    let crisisAlert = '';
    if (msg.isCrisis) {
      crisisAlert = `
        <div class="chat-emergency-banner" style="background: rgba(225, 29, 72, 0.08); border: 1px solid var(--rose-600); padding: 12px 14px; border-radius: var(--radius-md); margin-top: 10px;">
          <div style="font-weight: 700; color: var(--rose-700); margin-bottom: 6px;">
            Support is available 24/7
          </div>
          <p style="font-size: var(--text-xs); margin-bottom: 10px; color: var(--text-primary); line-height: 1.4;">
            If you or someone you know is in crisis, trained counselors are ready to support you:
          </p>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <a href="tel:14416" class="btn btn--danger btn--sm">Tele-MANAS (14416)</a>
            <a href="tel:112" class="btn btn--secondary btn--sm">Emergency (112)</a>
            <a href="sos.html" class="btn btn--ghost btn--sm">More Helplines</a>
          </div>
        </div>
      `;
    }

    const timeFormatted = Utils.formatTime(msg.timestamp || new Date());

    if (isUser) {
      msgEl.innerHTML = `
        <div class="chat-message__content">
          <div class="chat-message__bubble">
            ${this.formatMessageBody(msg.text)}
          </div>
          <div class="chat-message__time">${timeFormatted}</div>
        </div>
      `;
    } else {
      msgEl.innerHTML = `
        <div class="chat-message__avatar" aria-hidden="true" title="Assistant">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="7" cy="12" r="3.2"/>
            <circle cx="17" cy="12" r="3.2"/>
          </svg>
        </div>
        <div class="chat-message__content">
          <div class="chat-message__bubble">
            ${this.formatMessageBody(msg.text)}
            ${crisisAlert}
          </div>
          <div class="chat-message__time">${timeFormatted}</div>
        </div>
      `;
    }

    this.chatMessages.appendChild(msgEl);
    this.scrollToBottom();
  },

  formatMessageBody(text) {
    if (!text) return '';
    let formatted = text.replace(/\[Source:\s*[^\]]+\]/gi, '');
    formatted = formatted.replace(/\(Source:\s*[^)]+\)/gi, '');
    formatted = formatted.replace(/Source:\s*[\w\s.-]+\.pdf/gi, '');
    formatted = formatted.trim();

    formatted = Utils.escapeHtml(formatted);
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    formatted = formatted.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="chat-link" target="_blank">$1</a>');
    formatted = formatted.replace(/\n\n/g, '<br><br>');
    formatted = formatted.replace(/\n/g, '<br>');
    return formatted;
  },

  showTypingIndicator() {
    this.removeTypingIndicator();
    const ind = document.createElement('div');
    ind.id = 'chatTypingIndicator';
    ind.className = 'chat-message chat-message--assistant';
    ind.innerHTML = `
      <div class="chat-message__avatar" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="7" cy="12" r="3.2"/>
          <circle cx="17" cy="12" r="3.2"/>
        </svg>
      </div>
      <div class="chat-message__content">
        <div class="chat-message__bubble">
          <div class="chat-typing">
            <span class="chat-typing__dot"></span>
            <span class="chat-typing__dot"></span>
            <span class="chat-typing__dot"></span>
          </div>
        </div>
      </div>
    `;
    this.chatMessages.appendChild(ind);
    this.scrollToBottom();
  },

  removeTypingIndicator() {
    const ind = document.getElementById('chatTypingIndicator');
    if (ind) ind.remove();
  },

  scrollToBottom() {
    if (this.chatMessages) {
      this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
  },

  async handleSendMessage() {
    if (this.isTyping) return;
    const text = this.chatInput.value.trim();
    if (!text) return;

    this.chatInput.value = '';
    this.chatInput.style.height = 'auto';

    let conv = this.conversations.find(c => c.id === this.currentConversationId);
    if (!conv) {
      this.startNewConversation(false);
      conv = this.conversations[0];
    }

    if (conv.messages.length === 0) {
      conv.title = Utils.truncate(text, 28);
      if (this.chatTitle) this.chatTitle.textContent = conv.title;
      if (this.chatWelcome) this.chatWelcome.style.display = 'none';
    }

    const userMsg = {
      id: Utils.generateId(),
      sender: 'user',
      text: text,
      timestamp: new Date().toISOString()
    };
    conv.messages.push(userMsg);
    this.appendMessageElement(userMsg);
    this.renderSidebar();
    Storage.set('conversations', this.conversations);

    const isCrisis = this.checkCrisis(text);

    this.isTyping = true;
    this.showTypingIndicator();

    try {
      let aiResponseText = '';
      let sourceName = null;

      try {
        const apiRes = await API.post('/chat/message', {
          conversationId: conv.id,
          message: text,
          history: conv.messages.slice(-6)
        });
        if (apiRes) {
          if (apiRes.conversationId && conv.id !== apiRes.conversationId) {
            conv.id = apiRes.conversationId;
            this.currentConversationId = conv.id;
            this.renderSidebar();
          }
          if (apiRes.reply) {
            aiResponseText = apiRes.reply;
            sourceName = '';
          }
        }
      } catch {
        const match = this.findKnowledgeMatch(text);
        if (match) {
          aiResponseText = match.response;
          sourceName = '';
        } else {
          aiResponseText = `Thank you for sharing that with me. Grounding our thoughts and taking a conscious pause can help clarify what you're going through.

Here are a couple of gentle thoughts to keep in mind:
• Notice if your body is holding physical tension right now (jaw, shoulders, hands).
• Take two or three slow, steady breaths.
• Remember you don't have to figure everything out in this single moment.

Would you like to try a guided mindfulness exercise together, or would you like to explore this situation further?`;
          sourceName = '';
        }
      }

      if (isCrisis) {
        aiResponseText = `I hear how heavy things feel right now, and I want you to know that your safety and well-being are deeply important. You do not have to walk through this alone. Please reach out to someone who can support you right now:`;
        sourceName = '';
      }

      await new Promise(resolve => setTimeout(resolve, 500));
      this.removeTypingIndicator();

      const aiMsg = {
        id: Utils.generateId(),
        sender: 'assistant',
        text: aiResponseText,
        source: sourceName,
        isCrisis: isCrisis,
        timestamp: new Date().toISOString()
      };

      conv.messages.push(aiMsg);
      Storage.set('conversations', this.conversations);
      this.appendMessageElement(aiMsg);

    } catch (err) {
      this.removeTypingIndicator();
      Toast.error('Message Error', 'Could not send message. Please try again.');
    } finally {
      this.isTyping = false;
    }
  },

  checkCrisis(text) {
    const lower = text.toLowerCase();
    return this.crisisKeywords.some(kw => lower.includes(kw));
  },

  findKnowledgeMatch(text) {
    const lower = text.toLowerCase();
    for (const item of this.wellnessKnowledge) {
      if (item.keywords.some(k => lower.includes(k))) {
        return item;
      }
    }
    return null;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  ChatApp.init();
});
