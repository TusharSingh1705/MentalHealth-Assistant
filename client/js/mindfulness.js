'use strict';

const MindfulnessApp = {
  activeTimer: null,
  timerInterval: null,
  currentCategory: 'all',

  exercisesData: {
    'breathing-box': {
      title: 'Box Breathing (Navy SEAL Technique)',
      category: 'breathing',
      duration: '4 minutes',
      cycles: 4,
      steps: [
        { phase: 'Inhale slowly', duration: 4, action: 'inhale' },
        { phase: 'Hold breath', duration: 4, action: 'hold' },
        { phase: 'Exhale smoothly', duration: 4, action: 'exhale' },
        { phase: 'Hold breath empty', duration: 4, action: 'hold' }
      ],
      instructions: 'Equalize your breath in four equal parts: Inhale 4s, Hold 4s, Exhale 4s, Hold 4s to rapidly calm sympathetic adrenaline and steady focus.'
    },
    'breathing-478': {
      title: '4-7-8 Relaxing Breath',
      category: 'breathing',
      duration: '4 minutes',
      cycles: 4,
      steps: [
        { phase: 'Inhale through nose', duration: 4, action: 'inhale' },
        { phase: 'Hold your breath', duration: 7, action: 'hold' },
        { phase: 'Exhale completely through mouth', duration: 8, action: 'exhale' }
      ],
      instructions: 'Place the tip of your tongue against the ridge of tissue just behind your upper front teeth. Exhale completely, then begin the cycle to lower heart rate.'
    },
    'grounding-54321': {
      title: '5-4-3-2-1 Sensory Grounding',
      category: 'grounding',
      type: 'interactive-steps',
      steps: [
        { count: 5, prompt: 'Name 5 things you can see around you right now', placeholder: 'e.g., A lamp, the clock, my shoes, a book, the wall...' },
        { count: 4, prompt: 'Name 4 things you can physically feel against your body', placeholder: 'e.g., Feet on the floor, texture of my shirt, the chair back, phone in hand...' },
        { count: 3, prompt: 'Name 3 distinct sounds you can hear', placeholder: 'e.g., Distant traffic, fan humming, birds outside...' },
        { count: 2, prompt: 'Name 2 scents you can smell or enjoy', placeholder: 'e.g., Coffee, fresh air, shampoo, soap...' },
        { count: 1, prompt: 'Name 1 positive affirmation or sensation you feel within', placeholder: 'e.g., "I am safe in this room right now"...' }
      ]
    },
    'meditation-bodyscan': {
      title: 'Head-to-Toe Body Scan',
      category: 'meditation',
      type: 'guided-steps',
      steps: [
        { title: 'Posture & Grounding', text: 'Sit comfortably with feet flat. Close your eyes or soften your gaze. Feel gravity supporting you.' },
        { title: 'Crown & Facial Muscles', text: 'Bring awareness to your forehead. Soften your brow, un-clench your jaw, let your tongue rest loosely.' },
        { title: 'Neck & Shoulders', text: 'Drop your shoulders away from your ears. Breathe deeply into any tightness here and release.' },
        { title: 'Chest, Arms & Hands', text: 'Notice the gentle rise and fall of your chest. Let your hands rest unclenched and relaxed.' },
        { title: 'Belly, Legs & Feet', text: 'Soften your abdomen. Feel the steady contact of your feet against the earth. You are grounded and safe.' }
      ]
    },
    'selfcare-pmr': {
      title: 'Progressive Muscle Relaxation',
      category: 'selfcare',
      type: 'guided-steps',
      steps: [
        { title: '1. Hands & Forearms', text: 'Make tight fists with both hands. Hold for 5 seconds... Now completely release and feel the warmth rush in.' },
        { title: '2. Shoulders & Upper Back', text: 'Shrug your shoulders up toward your ears tightly. Hold for 5 seconds... Now let them drop heavily.' },
        { title: '3. Face & Jaw', text: 'Scrunch up your entire face—eyes, nose, mouth. Hold for 5 seconds... Now soften everything completely.' },
        { title: '4. Legs & Calves', text: 'Flex your toes toward your shins, tightening your calf muscles. Hold for 5 seconds... Release completely.' },
        { title: '5. Total Body Stillness', text: 'Take a deep breath and scan your body. Enjoy the heavy, peaceful relaxation flowing through.' }
      ]
    },
    'selfcare-checklist': {
      title: 'Mindful Self-Care Check-In',
      category: 'selfcare',
      type: 'checklist',
      items: [
        'Have I drank a full glass of water recently?',
        'Have I eaten a nourishing meal or snack today?',
        'Have I rested my eyes away from digital screens for 10 minutes?',
        'Have I taken a short walk or stretched my body?',
        'Have I spoken kindly to myself in my internal thoughts?'
      ]
    }
  },

  init() {
    this.bindTabs();
    this.bindExerciseCards();
    this.bindModal();
  },

  bindTabs() {
    const tabs = document.querySelectorAll('.mindfulness-tab');
    const cards = document.querySelectorAll('.exercise-card');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const category = tab.getAttribute('data-category');
        this.currentCategory = category;

        cards.forEach(card => {
          const cardCat = card.getAttribute('data-category');
          if (category === 'all' || cardCat === category) {
            card.style.display = 'flex';
          } else {
            card.style.display = 'none';
          }
        });
      });
    });
  },

  bindExerciseCards() {
    const cards = document.querySelectorAll('.exercise-card');
    cards.forEach(card => {
      const startBtn = card.querySelector('.exercise-card__start');
      const exKey = card.getAttribute('data-exercise');

      const trigger = () => {
        if (exKey && this.exercisesData[exKey]) {
          this.openExercise(exKey);
        }
      };

      if (startBtn) startBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        trigger();
      });
      card.addEventListener('click', trigger);
    });
  },

  bindModal() {
    this.modal = document.getElementById('exerciseModal');
    this.modalClose = document.getElementById('exerciseModalClose');
    this.modalContent = document.getElementById('exerciseContent');

    if (this.modalClose) {
      this.modalClose.addEventListener('click', () => this.closeExercise());
    }

    // Escape key closes modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal && this.modal.classList.contains('active')) {
        this.closeExercise();
      }
    });
  },

  openExercise(key) {
    const ex = this.exercisesData[key];
    if (!ex || !this.modal || !this.modalContent) return;

    this.stopActiveTimer();
    this.modalContent.innerHTML = '';
    this.modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    if (ex.category === 'breathing') {
      this.renderBreathingExercise(ex);
    } else if (ex.type === 'interactive-steps') {
      this.renderInteractiveSteps(ex);
    } else if (ex.type === 'checklist') {
      this.renderChecklist(ex);
    } else {
      this.renderGuidedSteps(ex);
    }
  },

  closeExercise() {
    this.stopActiveTimer();
    if (this.modal) {
      this.modal.classList.remove('active');
    }
    document.body.style.overflow = '';
  },

  stopActiveTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  },

  renderBreathingExercise(ex) {
    this.modalContent.innerHTML = `
      <div class="breathing-exercise">
        <h2 class="breathing-exercise__title">${Utils.escapeHtml(ex.title)}</h2>
        <p class="breathing-exercise__instruction">${Utils.escapeHtml(ex.instructions)}</p>

        <div class="breathing-circle-wrapper" style="position: relative; margin: 40px auto; width: 220px; height: 220px; display: flex; align-items: center; justify-content: center;">
          <div id="breathingVisualCircle" style="width: 160px; height: 160px; border-radius: 50%; background: linear-gradient(135deg, var(--primary-400), var(--accent-400)); transition: transform 4s ease-in-out, opacity 1s ease; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #fff; box-shadow: 0 0 40px rgba(78, 124, 245, 0.4); text-align: center; padding: 12px;">
            <div id="breathingPhaseText" style="font-size: 1.1rem; font-weight: 700;">Get Ready</div>
            <div id="breathingCounter" style="font-size: 2.2rem; font-weight: 800;">3</div>
          </div>
        </div>

        <div style="font-size: var(--text-sm); color: var(--text-secondary); margin-bottom: 24px;" id="cycleIndicator">
          Cycle 1 of ${ex.cycles}
        </div>

        <div style="display: flex; gap: 12px; justify-content: center;">
          <button class="btn btn--secondary" id="pauseBreathBtn">Pause</button>
          <button class="btn btn--danger btn--sm" id="stopBreathBtn">Stop Exercise</button>
        </div>
      </div>
    `;

    const circle = document.getElementById('breathingVisualCircle');
    const phaseText = document.getElementById('breathingPhaseText');
    const counter = document.getElementById('breathingCounter');
    const cycleIndicator = document.getElementById('cycleIndicator');
    const pauseBtn = document.getElementById('pauseBreathBtn');
    const stopBtn = document.getElementById('stopBreathBtn');

    if (stopBtn) stopBtn.addEventListener('click', () => this.closeExercise());

    let isPaused = false;
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        isPaused = !isPaused;
        pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
      });
    }

    // Start 3-second countdown then cycles
    let countdown = 3;
    const prepInterval = setInterval(() => {
      if (isPaused) return;
      countdown--;
      if (countdown > 0) {
        if (counter) counter.textContent = countdown;
      } else {
        clearInterval(prepInterval);
        this.runBreathingCycles(ex, circle, phaseText, counter, cycleIndicator, () => isPaused);
      }
    }, 1000);
    this.timerInterval = prepInterval;
  },

  runBreathingCycles(ex, circle, phaseText, counter, cycleIndicator, isPausedFn) {
    let currentCycle = 1;
    let stepIndex = 0;
    let secondsLeft = ex.steps[0].duration;

    const applyStepStyle = (step) => {
      if (phaseText) phaseText.textContent = step.phase;
      if (counter) counter.textContent = secondsLeft;

      if (circle) {
        circle.style.transition = `transform ${step.duration}s ease-in-out`;
        if (step.action === 'inhale') {
          circle.style.transform = 'scale(1.4)';
          circle.style.opacity = '1';
        } else if (step.action === 'hold') {
          circle.style.transform = circle.style.transform || 'scale(1.4)';
          circle.style.opacity = '0.9';
        } else if (step.action === 'exhale') {
          circle.style.transform = 'scale(0.85)';
          circle.style.opacity = '0.7';
        }
      }
    };

    applyStepStyle(ex.steps[stepIndex]);

    const interval = setInterval(() => {
      if (isPausedFn()) return;

      secondsLeft--;
      if (counter) counter.textContent = secondsLeft;

      if (secondsLeft <= 0) {
        stepIndex++;
        if (stepIndex >= ex.steps.length) {
          stepIndex = 0;
          currentCycle++;
          if (currentCycle > ex.cycles) {
            clearInterval(interval);
            if (phaseText) phaseText.textContent = 'Well done! 🌸';
            if (counter) counter.textContent = '✨';
            if (circle) circle.style.transform = 'scale(1)';
            Toast.success('Session Complete', 'Great job taking this mindful pause.');
            return;
          }
          if (cycleIndicator) {
            cycleIndicator.textContent = `Cycle ${currentCycle} of ${ex.cycles}`;
          }
        }
        secondsLeft = ex.steps[stepIndex].duration;
        applyStepStyle(ex.steps[stepIndex]);
      }
    }, 1000);

    this.timerInterval = interval;
  },

  renderInteractiveSteps(ex) {
    let currentStep = 0;
    const renderCurrent = () => {
      const step = ex.steps[currentStep];
      this.modalContent.innerHTML = `
        <div style="max-width: 540px; margin: 0 auto; text-align: center;">
          <span class="badge badge--accent" style="margin-bottom: 16px;">Step ${currentStep + 1} of ${ex.steps.length}</span>
          <h2 style="font-size: 1.5rem; margin-bottom: 16px; font-weight: 700;">${Utils.escapeHtml(ex.title)}</h2>
          <div class="glass-card" style="padding: 24px; text-align: left; margin-bottom: 24px;">
            <p style="font-size: 1.15rem; font-weight: 600; margin-bottom: 16px; color: var(--primary-400);">
              ${Utils.escapeHtml(step.prompt)}
            </p>
            <textarea id="stepAnswer" class="form-input" rows="3" placeholder="${Utils.escapeHtml(step.placeholder)}"></textarea>
          </div>
          <div style="display: flex; gap: 12px; justify-content: center;">
            ${currentStep > 0 ? `<button class="btn btn--secondary" id="prevStepBtn">Back</button>` : ''}
            <button class="btn btn--primary" id="nextStepBtn">
              ${currentStep === ex.steps.length - 1 ? 'Finish Exercise' : 'Next Step'}
            </button>
          </div>
        </div>
      `;

      const nextBtn = document.getElementById('nextStepBtn');
      const prevBtn = document.getElementById('prevStepBtn');

      if (prevBtn) {
        prevBtn.addEventListener('click', () => {
          currentStep--;
          renderCurrent();
        });
      }

      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          if (currentStep === ex.steps.length - 1) {
            Toast.success('Exercise Completed', 'You have anchored your mind in the present moment.');
            this.closeExercise();
          } else {
            currentStep++;
            renderCurrent();
          }
        });
      }
    };

    renderCurrent();
  },

  renderGuidedSteps(ex) {
    let currentStep = 0;
    const renderCurrent = () => {
      const step = ex.steps[currentStep];
      this.modalContent.innerHTML = `
        <div style="max-width: 540px; margin: 0 auto; text-align: center;">
          <span class="badge badge--primary" style="margin-bottom: 16px;">Section ${currentStep + 1} of ${ex.steps.length}</span>
          <h2 style="font-size: 1.5rem; margin-bottom: 16px; font-weight: 700;">${Utils.escapeHtml(ex.title)}</h2>
          <div class="glass-card" style="padding: 24px; text-align: center; margin-bottom: 24px;">
            <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--primary-700); margin-bottom: 12px;">
              ${Utils.escapeHtml(step.title)}
            </h3>
            <p style="font-size: 0.95rem; line-height: 1.6; color: var(--text-secondary);">
              ${Utils.escapeHtml(step.text)}
            </p>
          </div>
          <div style="display: flex; gap: 12px; justify-content: center;">
            ${currentStep > 0 ? `<button class="btn btn--secondary" id="prevGuideBtn">Previous</button>` : ''}
            <button class="btn btn--primary" id="nextGuideBtn">
              ${currentStep === ex.steps.length - 1 ? 'Complete Session' : 'Next Section'}
            </button>
          </div>
        </div>
      `;

      const nextBtn = document.getElementById('nextGuideBtn');
      const prevBtn = document.getElementById('prevGuideBtn');

      if (prevBtn) {
        prevBtn.addEventListener('click', () => {
          currentStep--;
          renderCurrent();
        });
      }

      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          if (currentStep === ex.steps.length - 1) {
            Toast.success('Relaxation Complete', 'Enjoy the calm and spaciousness you created.');
            this.closeExercise();
          } else {
            currentStep++;
            renderCurrent();
          }
        });
      }
    };

    renderCurrent();
  },

  renderChecklist(ex) {
    const checkinHistory = Storage.get('selfcare_checkins', []);
    const lastCheckin = checkinHistory.length > 0 ? checkinHistory[checkinHistory.length - 1] : null;
    const lastCheckedIndices = lastCheckin && lastCheckin.completedIndices ? lastCheckin.completedIndices : [];

    this.modalContent.innerHTML = `
      <div style="max-width: 520px; margin: 0 auto;">
        <h2 style="font-size: 1.35rem; margin-bottom: 8px; font-weight: 700; text-align: center;">${Utils.escapeHtml(ex.title)}</h2>
        <p style="font-size: var(--text-sm); color: var(--text-secondary); text-align: center; margin-bottom: 12px;">
          Check off any self-care actions you've done or plan to do right now:
        </p>
        ${lastCheckin ? `<p style="font-size: 0.75rem; color: var(--primary-700); text-align: center; margin-bottom: 16px; background: var(--primary-50); padding: 6px 12px; border-radius: 6px;">Last saved: ${new Date(lastCheckin.timestamp).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} (${lastCheckin.completedCount}/${lastCheckin.totalCount} completed)</p>` : ''}
        <div class="glass-card" style="padding: 16px; display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px;">
          ${ex.items.map((item, idx) => `
            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: var(--text-sm);">
              <input type="checkbox" id="chk_${idx}" ${lastCheckedIndices.includes(idx) ? 'checked' : ''} style="width: 16px; height: 16px; accent-color: var(--primary-700);">
              <span>${Utils.escapeHtml(item)}</span>
            </label>
          `).join('')}
        </div>
        <div style="display: flex; gap: 10px; justify-content: center;">
          <button class="btn btn--secondary btn--sm" id="clearChecklistBtn">Clear</button>
          <button class="btn btn--primary btn--sm" id="saveChecklistBtn">Done & Save Reflection</button>
        </div>
      </div>
    `;

    const doneBtn = document.getElementById('saveChecklistBtn');
    const clearBtn = document.getElementById('clearChecklistBtn');

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        ex.items.forEach((_, idx) => {
          const chk = document.getElementById(`chk_${idx}`);
          if (chk) chk.checked = false;
        });
      });
    }

    if (doneBtn) {
      doneBtn.addEventListener('click', () => {
        const completedIndices = [];
        const completedLabels = [];
        ex.items.forEach((item, idx) => {
          const chk = document.getElementById(`chk_${idx}`);
          if (chk && chk.checked) {
            completedIndices.push(idx);
            completedLabels.push(item);
          }
        });

        const entry = {
          timestamp: new Date().toISOString(),
          completedCount: completedIndices.length,
          totalCount: ex.items.length,
          completedIndices,
          completedLabels
        };

        const history = Storage.get('selfcare_checkins', []);
        history.push(entry);
        Storage.set('selfcare_checkins', history);

        Toast.success('Check-in Saved', `Recorded ${completedIndices.length} completed self-care habits.`);
        this.closeExercise();
      });
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  MindfulnessApp.init();
});
