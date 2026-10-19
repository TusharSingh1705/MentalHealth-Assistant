// Authentication helpers: login, registration, validation & password strength
'use strict';

document.addEventListener('DOMContentLoaded', () => {
  // If already logged in, redirect away from login/register unless guest
  const isGuest = AuthManager.isGuest();
  const token = AuthManager.getToken();
  if (token && !isGuest) {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect') || 'chat.html';
    // If on login or register, can optionally go to chat
  }

  // Handle Login Form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    initLoginForm(loginForm);
  }

  // Handle Register Form
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    initRegisterForm(registerForm);
  }
});

// ========== Login Form Handling ==========
function initLoginForm(form) {
  const emailInput = document.getElementById('loginEmail');
  const passwordInput = document.getElementById('loginPassword');
  const emailError = document.getElementById('loginEmailError');
  const passwordError = document.getElementById('loginPasswordError');
  const submitBtn = document.getElementById('loginSubmit');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    let isValid = true;

    // Validate email
    const emailVal = emailInput.value.trim();
    if (!emailVal || !validateEmail(emailVal)) {
      emailInput.classList.add('invalid');
      if (emailError) emailError.style.display = 'block';
      isValid = false;
    } else {
      emailInput.classList.remove('invalid');
      if (emailError) emailError.style.display = 'none';
    }

    // Validate password
    const passVal = passwordInput.value;
    if (!passVal) {
      passwordInput.classList.add('invalid');
      if (passwordError) passwordError.style.display = 'block';
      isValid = false;
    } else {
      passwordInput.classList.remove('invalid');
      if (passwordError) passwordError.style.display = 'none';
    }

    if (!isValid) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in...';

    try {
      // Attempt backend API login
      const res = await API.post('/auth/login', {
        email: emailVal,
        password: passVal
      });

      AuthManager.login(res.user, res.token);
      Toast.success('Welcome back!', `Signed in as ${res.user.name}`);
      setTimeout(() => {
        window.location.href = 'chat.html';
      }, 700);
    } catch (err) {
      console.warn('API login failed or offline, falling back to local simulation:', err.message);
      // Fallback for standalone demo: check local registered users or test credentials
      const localUsers = Storage.get('registered_users') || [];
      const match = localUsers.find(u => u.email.toLowerCase() === emailVal.toLowerCase());
      
      if (match && match.password === passVal) {
        const dummyToken = 'jwt_mock_' + Utils.generateId();
        const { password, ...safeUser } = match;
        AuthManager.login(safeUser, dummyToken);
        Toast.success('Welcome back!', `Signed in as ${match.name}`);
        setTimeout(() => { window.location.href = 'chat.html'; }, 700);
      } else if (!match && (passVal.length >= 6)) {
        // Allow seamless login demo
        const demoUser = {
          id: Utils.generateId(),
          name: emailVal.split('@')[0],
          email: emailVal,
          joined: new Date().toISOString()
        };
        const dummyToken = 'jwt_mock_' + Utils.generateId();
        AuthManager.login(demoUser, dummyToken);
        Toast.success('Welcome back!', `Signed in as ${demoUser.name}`);
        setTimeout(() => { window.location.href = 'chat.html'; }, 700);
      } else {
        Toast.error('Login Failed', err.message || 'Invalid email or password');
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Log In';
    }
  });

  // Real-time input clear error
  emailInput.addEventListener('input', () => {
    emailInput.classList.remove('invalid');
    if (emailError) emailError.style.display = 'none';
  });
  passwordInput.addEventListener('input', () => {
    passwordInput.classList.remove('invalid');
    if (passwordError) passwordError.style.display = 'none';
  });
}

// ========== Register Form Handling ==========
function initRegisterForm(form) {
  const nameInput = document.getElementById('registerName');
  const dobInput = document.getElementById('registerDob');
  const emailInput = document.getElementById('registerEmail');
  const passInput = document.getElementById('registerPassword');
  const confirmInput = document.getElementById('registerConfirm');

  const nameError = document.getElementById('registerNameError');
  const emailError = document.getElementById('registerEmailError');
  const passError = document.getElementById('registerPasswordError');
  const confirmError = document.getElementById('registerConfirmError');
  const submitBtn = document.getElementById('registerSubmit');

  // Password strength meter
  const bars = [
    document.getElementById('strengthBar1'),
    document.getElementById('strengthBar2'),
    document.getElementById('strengthBar3'),
    document.getElementById('strengthBar4')
  ];
  const strengthText = document.getElementById('passwordStrengthText');

  passInput.addEventListener('input', () => {
    const val = passInput.value;
    const score = calculatePasswordStrength(val);
    updateStrengthMeter(score, bars, strengthText);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    let isValid = true;

    // Name
    const nameVal = nameInput.value.trim();
    if (!nameVal) {
      nameInput.classList.add('invalid');
      if (nameError) nameError.style.display = 'block';
      isValid = false;
    } else {
      nameInput.classList.remove('invalid');
      if (nameError) nameError.style.display = 'none';
    }

    // Email
    const emailVal = emailInput.value.trim();
    if (!emailVal || !validateEmail(emailVal)) {
      emailInput.classList.add('invalid');
      if (emailError) emailError.style.display = 'block';
      isValid = false;
    } else {
      emailInput.classList.remove('invalid');
      if (emailError) emailError.style.display = 'none';
    }

    // Password
    const passVal = passInput.value;
    if (!passVal || passVal.length < 8) {
      passInput.classList.add('invalid');
      if (passError) passError.style.display = 'block';
      isValid = false;
    } else {
      passInput.classList.remove('invalid');
      if (passError) passError.style.display = 'none';
    }

    // Confirm Password
    const confirmVal = confirmInput.value;
    if (confirmVal !== passVal) {
      confirmInput.classList.add('invalid');
      if (confirmError) confirmError.style.display = 'block';
      isValid = false;
    } else {
      confirmInput.classList.remove('invalid');
      if (confirmError) confirmError.style.display = 'none';
    }

    if (!isValid) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating Account...';

    try {
      const res = await API.post('/auth/register', {
        name: nameVal,
        email: emailVal,
        password: passVal,
        dob: dobInput ? dobInput.value : undefined
      });

      AuthManager.login(res.user, res.token);
      Toast.success('Account Created!', `Welcome to MentalHealth Assistant, ${res.user.name}`);
      setTimeout(() => {
        window.location.href = 'chat.html';
      }, 700);
    } catch (err) {
      console.warn('API register failed, saving locally for client demo:', err.message);
      // Fallback local registration
      const localUsers = Storage.get('registered_users') || [];
      const exists = localUsers.find(u => u.email.toLowerCase() === emailVal.toLowerCase());
      if (exists) {
        Toast.error('Registration Error', 'An account with this email already exists.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
        return;
      }

      const newUser = {
        id: Utils.generateId(),
        name: nameVal,
        email: emailVal,
        dob: dobInput ? dobInput.value : '',
        password: passVal,
        joined: new Date().toISOString()
      };
      localUsers.push(newUser);
      Storage.set('registered_users', localUsers);

      const dummyToken = 'jwt_mock_' + Utils.generateId();
      const { password, ...safeUser } = newUser;
      AuthManager.login(safeUser, dummyToken);

      Toast.success('Account Created!', `Welcome to MentalHealth Assistant, ${nameVal}`);
      setTimeout(() => {
        window.location.href = 'chat.html';
      }, 700);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Account';
    }
  });

  [nameInput, emailInput, passInput, confirmInput].forEach(inp => {
    if (!inp) return;
    inp.addEventListener('input', () => {
      inp.classList.remove('invalid');
    });
  });
}

// ========== Password Strength Calculator ==========
function calculatePasswordStrength(pass) {
  if (!pass) return 0;
  let score = 0;
  if (pass.length >= 8) score++;
  if (pass.length >= 12) score++;
  if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
  if (/[0-9]/.test(pass)) score++;
  if (/[^A-Za-z0-9]/.test(pass)) score++;
  return Math.min(4, Math.floor((score / 5) * 4));
}

function updateStrengthMeter(score, bars, textEl) {
  const levels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['var(--rose-500)', 'var(--warm-500)', '#eab308', 'var(--primary-500)', 'var(--accent-500)'];

  bars.forEach((bar, idx) => {
    if (!bar) return;
    if (idx < score) {
      bar.style.backgroundColor = colors[score];
      bar.style.opacity = '1';
    } else {
      bar.style.backgroundColor = 'var(--border-color)';
      bar.style.opacity = '0.4';
    }
  });

  if (textEl) {
    textEl.textContent = levels[score] || '';
    textEl.style.color = colors[score] || 'var(--text-tertiary)';
  }
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
