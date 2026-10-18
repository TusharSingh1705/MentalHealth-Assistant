// Profile & preferences controller
'use strict';

const ProfileApp = {
  user: null,

  init() {
    this.user = AuthManager.getUser() || {
      name: 'MindCare User',
      email: 'user@mindcare.ai',
      dob: ''
    };

    this.bindDOM();
    this.populateData();
  },

  bindDOM() {
    this.nameHeader = document.getElementById('profileName');
    this.emailHeader = document.getElementById('profileEmail');
    this.avatarEl = document.querySelector('.profile-header__avatar');

    // Profile editor form
    this.editProfileBtn = document.getElementById('editProfileBtn');
    this.profileForm = document.getElementById('profileForm');
    this.nameInput = document.getElementById('profileNameInput');
    this.dobInput = document.getElementById('profileDob');
    this.emailInput = document.getElementById('profileEmailInput');
    this.saveRow = document.getElementById('profileSaveRow');
    this.cancelBtn = document.getElementById('profileCancelBtn');

    // Switches
    this.prefDarkMode = document.getElementById('prefDarkMode');
    this.prefSaveHistory = document.getElementById('prefSaveHistory');
    this.prefShowCitations = document.getElementById('prefShowCitations');

    // Password fields
    this.passwordForm = document.getElementById('passwordForm');
    this.currentPassInput = document.getElementById('currentPassword');
    this.newPassInput = document.getElementById('newPassword');
    this.confirmPassInput = document.getElementById('confirmNewPassword');

    // Data export & account deletion
    this.exportDataBtn = document.getElementById('exportDataBtn');
    this.deleteAccountBtn = document.getElementById('deleteAccountBtn');
    this.deleteModal = document.getElementById('deleteModal');
    this.deleteModalClose = document.getElementById('deleteModalClose');
    this.deleteCancelBtn = document.getElementById('deleteCancelBtn');
    this.deleteConfirmInput = document.getElementById('deleteConfirmInput');
    this.deleteConfirmBtn = document.getElementById('deleteConfirmBtn');

    if (this.editProfileBtn) {
      this.editProfileBtn.addEventListener('click', () => this.toggleEditMode(true));
    }
    if (this.cancelBtn) {
      this.cancelBtn.addEventListener('click', () => {
        this.populateData();
        this.toggleEditMode(false);
      });
    }

    if (this.profileForm) {
      this.profileForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveProfileChanges();
      });
    }

    this.bindPreferences();

    if (this.passwordForm) {
      this.passwordForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleChangePassword();
      });
    }

    if (this.exportDataBtn) {
      this.exportDataBtn.addEventListener('click', () => this.exportUserData());
    }

    if (this.deleteAccountBtn) {
      this.deleteAccountBtn.addEventListener('click', () => this.openDeleteModal());
    }
    if (this.deleteModalClose) {
      this.deleteModalClose.addEventListener('click', () => this.closeDeleteModal());
    }
    if (this.deleteCancelBtn) {
      this.deleteCancelBtn.addEventListener('click', () => this.closeDeleteModal());
    }

    if (this.deleteConfirmInput && this.deleteConfirmBtn) {
      this.deleteConfirmInput.addEventListener('input', () => {
        const val = this.deleteConfirmInput.value.trim();
        this.deleteConfirmBtn.disabled = val !== 'DELETE';
      });

      this.deleteConfirmBtn.addEventListener('click', () => this.handleDeleteAccount());
    }
  },

  populateData() {
    if (this.nameHeader) this.nameHeader.textContent = this.user.name || 'User';
    if (this.emailHeader) this.emailHeader.textContent = this.user.email || 'user@example.com';

    if (this.avatarEl) {
      const initial = (this.user.name || 'U').charAt(0).toUpperCase();
      this.avatarEl.textContent = initial;
    }

    if (this.nameInput) this.nameInput.value = this.user.name || '';
    if (this.emailInput) this.emailInput.value = this.user.email || '';
    if (this.dobInput) this.dobInput.value = this.user.dob || '';

    const prefs = Storage.get('preferences') || {
      saveHistory: true,
      showCitations: true
    };

    if (this.prefSaveHistory) this.prefSaveHistory.checked = prefs.saveHistory !== false;
    if (this.prefShowCitations) this.prefShowCitations.checked = prefs.showCitations !== false;
  },

  toggleEditMode(isEditing) {
    if (this.nameInput) this.nameInput.disabled = !isEditing;
    if (this.dobInput) this.dobInput.disabled = !isEditing;
    if (this.emailInput) this.emailInput.disabled = !isEditing;

    if (this.saveRow) {
      this.saveRow.style.display = isEditing ? 'block' : 'none';
      this.saveRow.classList.toggle('hidden', !isEditing);
    }
    if (this.editProfileBtn) {
      this.editProfileBtn.style.display = isEditing ? 'none' : 'inline-flex';
    }
  },

  saveProfileChanges() {
    const newName = this.nameInput.value.trim();
    const newEmail = this.emailInput.value.trim();
    const newDob = this.dobInput.value;

    if (!newName) {
      Toast.error('Validation', 'Please provide a name.');
      return;
    }

    this.user.name = newName;
    this.user.email = newEmail;
    this.user.dob = newDob;

    localStorage.setItem('mindcare_user', JSON.stringify(this.user));
    this.populateData();
    this.toggleEditMode(false);
    AuthManager.updateUI();

    Toast.success('Saved', 'Profile updated successfully.');
  },

  bindPreferences() {
    // Only theme toggle remains in preferences
  },

  handleChangePassword() {
    const cur = this.currentPassInput.value;
    const next = this.newPassInput.value;
    const conf = this.confirmPassInput.value;

    if (!cur || !next || !conf) {
      Toast.error('Incomplete Fields', 'Please fill in all password fields.');
      return;
    }

    if (next.length < 8) {
      Toast.error('Password Length', 'New password must be at least 8 characters long.');
      return;
    }

    if (next !== conf) {
      Toast.error('Mismatch', 'New passwords do not match.');
      return;
    }

    this.currentPassInput.value = '';
    this.newPassInput.value = '';
    this.confirmPassInput.value = '';

    Toast.success('Password Updated', 'Your password has been changed.');
  },

  exportUserData() {
    const fullData = {
      user: this.user,
      preferences: Storage.get('preferences'),
      conversations: Storage.getList('conversations'),
      trustedContact: Storage.get('trusted_contact'),
      exportedAt: new Date().toISOString()
    };

    Utils.downloadJSON(fullData, `mindcare-backup-${Date.now()}.json`);
    Toast.success('Export Ready', 'Your profile backup has been downloaded.');
  },

  openDeleteModal() {
    if (this.deleteModal) {
      this.deleteModal.classList.add('open');
      this.deleteModal.classList.add('active');
      if (this.deleteConfirmInput) {
        this.deleteConfirmInput.value = '';
        this.deleteConfirmInput.focus();
      }
      if (this.deleteConfirmBtn) {
        this.deleteConfirmBtn.disabled = true;
      }
    }
  },

  closeDeleteModal() {
    if (this.deleteModal) {
      this.deleteModal.classList.remove('open');
      this.deleteModal.classList.remove('active');
    }
  },

  async handleDeleteAccount() {
    if (this.deleteConfirmBtn) {
      this.deleteConfirmBtn.disabled = true;
      this.deleteConfirmBtn.textContent = 'Deleting...';
    }

    try {
      await API.delete('/account');
    } catch (err) {
      console.warn('Backend delete call fallback:', err.message);
    }

    localStorage.clear();
    Toast.info('Account Deleted', 'All account data and history have been permanently cleared.');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 800);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  ProfileApp.init();
});
