'use strict';

const SOSApp = {
  contacts: [],

  init() {
    this.bindDOM();
    this.loadContacts();
    this.renderContacts();
  },

  bindDOM() {
    this.form = document.getElementById('trustedContactForm');
    this.nameInput = document.getElementById('trustedName');
    this.phoneInput = document.getElementById('trustedPhone');
    this.relationInput = document.getElementById('trustedRelation');
    this.contactsList = document.getElementById('trustedContactsList');

    if (this.form) {
      this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleAddContact();
      });
    }
  },

  loadContacts() {
    const legacyContact = Storage.get('trusted_contact');
    let list = Storage.getList('trusted_contacts');

    if (legacyContact && (legacyContact.name || legacyContact.phone)) {
      if (!list.some(c => c.phone === legacyContact.phone)) {
        list.push({
          id: Utils.generateId(),
          name: legacyContact.name || 'Trusted Contact',
          phone: legacyContact.phone || '',
          relation: legacyContact.relation || '',
          addedAt: legacyContact.savedAt || new Date().toISOString()
        });
        Storage.set('trusted_contacts', list);
      }
      Storage.remove('trusted_contact');
    }

    this.contacts = list;
  },

  renderContacts() {
    if (!this.contactsList) return;

    if (!this.contacts || this.contacts.length === 0) {
      this.contactsList.innerHTML = `
        <div style="text-align: center; padding: 20px; color: var(--text-tertiary); font-size: var(--text-xs); background: rgba(0,0,0,0.02); border: 1px dashed var(--border-medium); border-radius: var(--radius-md);">
          No trusted personal contacts added yet. Add a close friend, family member, or therapist above for instant one-tap calling.
        </div>
      `;
      return;
    }

    this.contactsList.innerHTML = '';
    this.contacts.forEach(contact => {
      const cleanPhone = (contact.phone || '').replace(/[^\d+]/g, '');
      const card = document.createElement('div');
      card.style.cssText = 'background: rgba(42, 131, 95, 0.07); border: 1px solid var(--primary-400); border-radius: var(--radius-md); padding: 14px 18px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;';

      const relationBadge = contact.relation
        ? `<span class="badge badge--primary" style="font-size: 0.72rem; padding: 2px 8px;">${Utils.escapeHtml(contact.relation)}</span>`
        : '';

      const initial = (contact.name || 'C').trim().charAt(0).toUpperCase();

      card.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px; min-width: 220px;">
          <div style="width: 38px; height: 38px; border-radius: 50%; background: var(--primary-700); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 0.95rem; font-weight: 700; flex-shrink: 0;">
            ${initial}
          </div>
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-weight: 700; font-size: 0.98rem; color: var(--text-primary);">${Utils.escapeHtml(contact.name || 'Contact')}</span>
              ${relationBadge}
            </div>
            <div style="font-size: 0.85rem; font-weight: 600; color: var(--primary-600); margin-top: 2px;">
              ${Utils.escapeHtml(contact.phone)}
            </div>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <a href="tel:${cleanPhone}" class="btn btn--primary btn--sm" style="display: inline-flex; align-items: center; gap: 4px; padding: 6px 14px;">
            📞 Call
          </a>
          <button class="btn btn--ghost btn--sm" data-id="${contact.id}" style="color: var(--rose-600); padding: 6px 10px;" title="Remove Contact">
            ✕
          </button>
        </div>
      `;

      const removeBtn = card.querySelector('button[data-id]');
      if (removeBtn) {
        removeBtn.addEventListener('click', () => this.handleRemoveContact(contact.id));
      }

      this.contactsList.appendChild(card);
    });
  },

  handleAddContact() {
    const name = this.nameInput ? this.nameInput.value.trim() : '';
    const phone = this.phoneInput ? this.phoneInput.value.trim() : '';
    const relation = this.relationInput ? this.relationInput.value.trim() : '';

    if (!name || !phone) {
      Toast.warning('Missing Info', 'Please enter both a contact name and phone number.');
      return;
    }

    const newContact = {
      id: Utils.generateId(),
      name,
      phone,
      relation,
      addedAt: new Date().toISOString()
    };

    this.contacts.unshift(newContact);
    Storage.set('trusted_contacts', this.contacts);

    const token = AuthManager.getToken();
    if (token && !AuthManager.isGuest()) {
      API.patch('/account/profile', { trustedContact: newContact }).catch(() => {});
    }

    if (this.nameInput) this.nameInput.value = '';
    if (this.phoneInput) this.phoneInput.value = '';
    if (this.relationInput) this.relationInput.value = '';

    this.renderContacts();
    Toast.success('Contact Added', `${name} is now saved for one-tap emergency calling.`);
  },

  handleRemoveContact(id) {
    const contact = this.contacts.find(c => c.id === id);
    const name = contact ? contact.name : 'contact';

    if (confirm(`Remove ${name} from your trusted contacts?`)) {
      this.contacts = this.contacts.filter(c => c.id !== id);
      Storage.set('trusted_contacts', this.contacts);
      this.renderContacts();
      Toast.info('Contact Removed', `${name} has been removed.`);
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  SOSApp.init();
});
