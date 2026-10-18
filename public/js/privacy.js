// Privacy & data control panel
'use strict';

const PrivacyApp = {
  init() {
    this.bindDOM();
    this.refreshCounts();
  },

  bindDOM() {
    this.conversationCount = document.getElementById('conversationCount');
    this.clearConversationsBtn = document.getElementById('clearConversationsBtn');
    this.exportAllBtn = document.getElementById('exportAllBtn');
    this.exportChatsBtn = document.getElementById('exportChatsBtn');

    this.deleteHistoryModal = document.getElementById('deleteHistoryModal');
    this.deleteHistoryModalClose = document.getElementById('deleteHistoryModalClose');
    this.deleteHistoryCancelBtn = document.getElementById('deleteHistoryCancelBtn');
    this.deleteHistoryConfirmBtn = document.getElementById('deleteHistoryConfirmBtn');

    if (this.deleteHistoryModalClose) {
      this.deleteHistoryModalClose.addEventListener('click', () => {
        if (this.deleteHistoryModal) this.deleteHistoryModal.classList.remove('open');
      });
    }
    if (this.deleteHistoryCancelBtn) {
      this.deleteHistoryCancelBtn.addEventListener('click', () => {
        if (this.deleteHistoryModal) this.deleteHistoryModal.classList.remove('open');
      });
    }
    if (this.deleteHistoryConfirmBtn) {
      this.deleteHistoryConfirmBtn.addEventListener('click', () => {
        Storage.remove('conversations');
        this.refreshCounts();
        if (this.deleteHistoryModal) this.deleteHistoryModal.classList.remove('open');
        Toast.success('Deleted', 'All chat conversations have been erased.');
      });
    }
    if (this.deleteHistoryModal) {
      this.deleteHistoryModal.addEventListener('click', (e) => {
        if (e.target === this.deleteHistoryModal) {
          this.deleteHistoryModal.classList.remove('open');
        }
      });
    }

    if (this.clearConversationsBtn) {
      this.clearConversationsBtn.addEventListener('click', () => {
        if (this.deleteHistoryModal) {
          this.deleteHistoryModal.classList.add('open');
        } else if (confirm('Permanently delete all conversation history? This cannot be undone.')) {
          Storage.remove('conversations');
          this.refreshCounts();
          Toast.success('Deleted', 'All chat conversations have been erased.');
        }
      });
    }

    if (this.exportAllBtn) {
      this.exportAllBtn.addEventListener('click', () => {
        const allData = {
          user: AuthManager.getUser(),
          preferences: Storage.get('preferences'),
          conversations: Storage.getList('conversations'),
          trustedContact: Storage.get('trusted_contact'),
          exportedAt: new Date().toISOString()
        };
        Utils.downloadJSON(allData, `mindcare-all-data-${Date.now()}.json`);
        Toast.success('Export Complete', 'Full data archive downloaded.');
      });
    }

    if (this.exportChatsBtn) {
      this.exportChatsBtn.addEventListener('click', () => {
        const chats = Storage.getList('conversations');
        Utils.downloadJSON({ conversations: chats, exportedAt: new Date().toISOString() }, `mindcare-chats-${Date.now()}.json`);
        Toast.success('Export Complete', 'Conversations downloaded.');
      });
    }
  },

  refreshCounts() {
    const convs = Storage.getList('conversations');
    if (this.conversationCount) {
      this.conversationCount.textContent = `${convs.length} conversation${convs.length === 1 ? '' : 's'}`;
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  PrivacyApp.init();
});
