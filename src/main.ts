import './styles.css';
import { validateQuestions, validateVerses } from './core/content';
import { choiceLetter, formatAccuracy, QuizMachine } from './core/quizMachine';
import { QuestionTimer } from './core/timer';
import { VerseRotation } from './core/verseRotation';
import { createMessageBags, type MessageKind } from './data/messages';
import { questionBank } from './data/questions';
import { verses } from './data/verses';
import type { AnswerResult, Choice, PresentedQuestion, QuizStats, VerseCard } from './types';

const QUESTION_SECONDS = 60;
const FEEDBACK_DELAY_MS = 1250;
const VERSE_ROTATION_MS = 180000;

type AppPhase = 'welcome' | 'playing' | 'feedback' | 'complete' | 'unavailable';

class QuizApp {
  private phase: AppPhase = 'welcome';
  private engine: QuizMachine | null = null;
  private timer: QuestionTimer | null = null;
  private timerHandle: number | undefined;
  private feedbackHandle: number | undefined;
  private verseHandle: number | undefined;
  private answerLocked = false;
  private milestoneShown = new Set<number>();
  private messageBags = createMessageBags();
  private readonly verseRotation = new VerseRotation(verses, VERSE_ROTATION_MS);
  private currentVerse: VerseCard | null = null;

  public constructor(private readonly root: HTMLElement) {}

  public boot(): void {
    const questionErrors = validateQuestions(questionBank);
    const verseErrors = validateVerses(verses);
    if (questionErrors.length > 0 || verseErrors.length > 0) {
      this.phase = 'unavailable';
      this.renderUnavailable([...questionErrors, ...verseErrors]);
      return;
    }

    this.renderWelcome();
    window.addEventListener('keydown', (event) => this.handleKeyboard(event));
  }

  private renderWelcome(): void {
    this.root.innerHTML = `
      <main class="app-shell welcome-shell">
        <div class="ambient-shape ambient-shape-one" aria-hidden="true"></div>
        <div class="ambient-shape ambient-shape-two" aria-hidden="true"></div>
        <section class="welcome-panel" aria-labelledby="welcome-title">
          <div class="welcome-copy">
            <div class="eyebrow"><span class="eyebrow-dot"></span> A little courage for your big dream</div>
            <p class="brand-lockup">QUIZ FOR MY LOVE</p>
            <h1 id="welcome-title">Board Exam<br /><em>Quiz Rumble</em></h1>
            <p class="welcome-lede">A bright little practice arena for My Love—one question, one brave try, and one step closer to the goal.</p>
            <div class="welcome-signoff"><span class="signoff-line"></span><span>made with love, <strong>—Gab</strong></span></div>
            <button class="primary-button start-button" type="button" id="start-button">
              <span>Start the rumble</span><span class="button-arrow" aria-hidden="true">↗</span>
            </button>
            <div class="welcome-facts" aria-label="Quiz rules">
              <span><strong>60s</strong> per question</span>
              <span><strong>${questionBank.length}</strong> questions from your test bank</span>
              <span><strong>∞</strong> brave retries</span>
            </div>
          </div>
          <div class="welcome-art" aria-hidden="true">
            <div class="orbit orbit-one"></div>
            <div class="orbit orbit-two"></div>
            <div class="floating-card floating-card-top"><span>YOUR NEXT WIN</span><strong>is closer than you think.</strong></div>
            <div class="heart-star">✦</div>
            <div class="question-preview-card">
              <div class="preview-kicker">YOUR SUPPLIED QUESTION BANK</div>
              <div class="preview-question">${questionBank.length} questions, ready one at a time.</div>
              <div class="preview-answer preview-answer-green">Read carefully</div>
              <div class="preview-answer preview-answer-muted">Choose bravely</div>
              <div class="preview-answer preview-answer-muted">Keep going</div>
              <div class="preview-footer"><span class="mini-bar"><i></i></span><span>you've got this</span></div>
            </div>
            <div class="floating-card floating-card-bottom"><span>FAITH · FOCUS · HEART</span><strong>Keep going, My Love.</strong></div>
          </div>
        </section>
        <footer class="welcome-footer"><span>No login. No pressure. Just practice.</span><span>Every question is another chance to shine.</span></footer>
      </main>
    `;

    this.root.querySelector<HTMLButtonElement>('#start-button')?.addEventListener('click', () => this.startSession());
  }

  private renderUnavailable(errors: string[]): void {
    this.root.innerHTML = `
      <main class="app-shell unavailable-shell">
        <section class="unavailable-card" role="alert">
          <div class="status-orb status-orb-error">!</div>
          <p class="eyebrow">QUIZ CONTENT CHECK</p>
          <h1>We need to tidy the question bank first.</h1>
          <p>The app stopped before the game began because some bundled content did not pass validation.</p>
          <ul id="validation-errors"></ul>
        </section>
      </main>
    `;
    const list = this.root.querySelector('#validation-errors');
    errors.forEach((error) => {
      const item = document.createElement('li');
      item.textContent = error;
      list?.append(item);
    });
  }

  private startSession(): void {
    this.clearTimers();
    this.engine = new QuizMachine(questionBank);
    this.timer = new QuestionTimer(QUESTION_SECONDS);
    this.messageBags = createMessageBags();
    this.verseRotation.reset();
    this.milestoneShown.clear();
    this.answerLocked = false;
    this.phase = 'playing';
    this.engine.start();
    this.renderQuizShell();
    this.startVerseRotation();
    this.renderCurrentQuestion();
    this.startTimer();
  }

  private renderQuizShell(): void {
    this.root.innerHTML = `
      <main class="app-shell quiz-shell">
        <div class="quiz-atmosphere" aria-hidden="true"><span></span><span></span><span></span></div>
        <header class="quiz-header">
          <a class="mini-brand" href="." aria-label="Back to quiz welcome screen"><span class="mini-brand-mark">✦</span><span>QUIZ FOR MY LOVE</span></a>
          <div class="header-note"><span class="live-dot"></span> A quiet little cheer from Gab</div>
          <button class="header-reset" type="button" id="header-reset">Restart</button>
        </header>
        <div class="quiz-layout">
          <section class="question-stage" aria-labelledby="question-heading">
            <div class="stage-topline">
              <div>
                <p class="eyebrow">BOARD EXAM RUMBLE</p>
                <p class="stage-caption">One question at a time. You only need to be brave for this one.</p>
              </div>
              <div class="timer-wrap" aria-label="Question timer">
                 <div class="timer-ring" id="timer-ring" role="timer" aria-live="polite" aria-atomic="true" aria-label="60 seconds remaining"><span id="timer-number">60</span><small>SEC</small></div>
              </div>
            </div>
            <div class="progress-row" aria-label="Quiz progress">
              <div class="progress-track"><span id="mastery-progress"></span></div>
              <span id="progress-label">0 / ${questionBank.length} mastered</span>
            </div>
            <article class="question-card" id="question-card">
              <div class="question-card-glow" aria-hidden="true"></div>
              <div class="question-meta"><span id="question-number">QUESTION 01</span><span class="category-pill" id="question-category">Category</span></div>
             <h1 id="question-heading" tabindex="-1">Loading your next brave question…</h1>
              <p class="question-helper">Choose the answer that feels right. You can always meet this one again.</p>
              <div class="answer-grid" id="answer-grid" role="group" aria-label="Answer choices"></div>
              <div class="feedback-panel" id="feedback-panel" aria-live="polite" aria-atomic="true" hidden>
                <span class="feedback-symbol" id="feedback-symbol">✓</span>
                <div><strong id="feedback-title">Correct</strong><p id="feedback-message"></p></div>
              </div>
            </article>
            <div class="stats-strip" aria-label="Current quiz statistics">
              <div class="stat-chip"><span class="stat-icon stat-icon-pink">♥</span><span><small>MASTERED</small><strong id="stat-mastered">0</strong></span></div>
              <div class="stat-chip"><span class="stat-icon stat-icon-blue">↗</span><span><small>ACCURACY</small><strong id="stat-accuracy">0%</strong></span></div>
              <div class="stat-chip"><span class="stat-icon stat-icon-gold">↻</span><span><small>RETRIES</small><strong id="stat-retries">0</strong></span></div>
              <div class="stat-chip"><span class="stat-icon stat-icon-violet">✦</span><span><small>STREAK</small><strong id="stat-streak">0</strong></span></div>
            </div>
            <p class="keyboard-hint"><span>Tip</span> Press <kbd>1</kbd>–<kbd>6</kbd> to choose an answer.</p>
          </section>
          <aside class="verse-rail" aria-labelledby="verse-heading">
            <div class="verse-rail-label"><span class="verse-spark">✦</span><span>FAITH NOTE</span><span class="verse-rule"></span></div>
            <article class="verse-card" id="verse-card">
              <p class="verse-theme" id="verse-theme">Courage for today</p>
              <h2 id="verse-heading">A little reminder for your heart</h2>
              <blockquote id="verse-text">Your encouragement is loading…</blockquote>
              <p class="verse-reference" id="verse-reference">WEB · —</p>
              <div class="verse-note" id="verse-note">You are held, supported, and more capable than the nerves suggest.</div>
            </article>
            <div class="side-love-note"><span class="side-love-star">✦</span><p>Every brave answer is part of your story.</p><strong>Keep going, My Love.</strong></div>
          </aside>
        </div>
      </main>
    `;
     this.root.querySelector<HTMLButtonElement>('#header-reset')?.addEventListener('click', () => this.resetToWelcome());
  }

  private renderCurrentQuestion(): void {
    const current = this.engine?.currentQuestion;
    if (!current || !this.engine) {
      return;
    }

    this.answerLocked = false;
    this.phase = 'playing';
    this.timer?.reset();
    this.setText('#question-number', `QUESTION ${String(this.engine.stats.attempts + 1).padStart(2, '0')}`);
    this.setText('#question-category', current.question.category);
    this.setText('#question-heading', current.question.prompt);
    this.setText('#feedback-message', '');
    this.hideFeedback();
    this.renderChoices(current);
    this.updateStats(this.engine.stats);
    this.updateTimer();
    document.querySelector<HTMLElement>('#question-heading')?.focus({ preventScroll: true });
  }

  private renderChoices(current: PresentedQuestion): void {
    const grid = this.root.querySelector<HTMLDivElement>('#answer-grid');
    if (!grid) {
      return;
    }
    grid.innerHTML = '';
    current.choices.forEach((choice, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `answer-tile answer-tile-${index % 6}`;
      button.dataset.choiceId = choice.id;
      button.setAttribute('aria-label', `Answer ${choiceLetter(index)}: ${choice.label}`);
      button.innerHTML = `<span class="choice-key">${choiceLetter(index)}</span><span class="choice-label"></span><span class="choice-arrow" aria-hidden="true">↗</span>`;
      const label = button.querySelector('.choice-label');
      if (label) {
        label.textContent = choice.label;
      }
      button.addEventListener('click', () => this.handleAnswer(choice.id));
      grid.append(button);
    });
  }

  private startTimer(): void {
    if (this.timerHandle !== undefined) {
      window.clearInterval(this.timerHandle);
    }
    this.timerHandle = window.setInterval(() => {
      if (this.phase !== 'playing' || !this.timer) {
        return;
      }
      this.timer.tick();
      this.updateTimer();
      if (this.timer.expired) {
        this.handleTimeout();
      }
    }, 1000);
  }

  private handleAnswer(choiceId: string): void {
    if (this.answerLocked || this.phase !== 'playing' || !this.engine) {
      return;
    }

    this.answerLocked = true;
    this.stopTimer();
    const result = this.engine.answer(choiceId);
    this.highlightChoice(result.presented.choices, result.selectedChoiceId);
    this.showFeedback(result);
  }

  private handleTimeout(): void {
    if (this.answerLocked || this.phase !== 'playing' || !this.engine) {
      return;
    }

    this.answerLocked = true;
    this.stopTimer();
    const result = this.engine.timeout();
    this.showFeedback(result);
  }

  private highlightChoice(choices: readonly Choice[], selectedChoiceId?: string): void {
    const buttons = [...this.root.querySelectorAll<HTMLButtonElement>('.answer-tile')];
    buttons.forEach((button) => {
      button.disabled = true;
      if (button.dataset.choiceId === selectedChoiceId) {
        button.classList.add('answer-selected');
      }
    });
    if (selectedChoiceId && choices.length > 0) {
      const selected = buttons.find((button) => button.dataset.choiceId === selectedChoiceId);
      selected?.setAttribute('aria-label', `${selected.getAttribute('aria-label') ?? 'Selected answer'} selected`);
    }
  }

  private showFeedback(result: AnswerResult): void {
    this.phase = 'feedback';
    const feedbackPanel = this.root.querySelector<HTMLElement>('#feedback-panel');
    if (!feedbackPanel) {
      return;
    }

    const kind: MessageKind = result.outcome === 'correct' ? 'correct' : result.outcome === 'timeout' ? 'timeout' : 'retry';
    const title = result.outcome === 'correct' ? 'Correct!' : result.outcome === 'timeout' ? "Time's up" : 'Not quite';
    feedbackPanel.className = `feedback-panel feedback-${result.outcome}`;
    feedbackPanel.hidden = false;
    this.setText('#feedback-title', title);
    this.setText('#feedback-message', this.messageBags[kind].next());
    this.setText('#feedback-symbol', result.outcome === 'correct' ? '✓' : result.outcome === 'timeout' ? '⌛' : '↻');
    this.updateStats(result.stats);

    const mastered = result.stats.mastered;
    const milestone = [25, 50, 75].find((threshold) => mastered >= Math.ceil((result.stats.totalQuestions * threshold) / 100) && !this.milestoneShown.has(threshold));
    if (milestone) {
      this.milestoneShown.add(milestone);
      window.setTimeout(() => {
        const toast = document.createElement('div');
        toast.className = 'milestone-toast';
        toast.textContent = this.messageBags.milestone.next();
        document.body.append(toast);
        window.setTimeout(() => toast.remove(), 2600);
      }, 180);
    }

    this.feedbackHandle = window.setTimeout(() => {
      if (!this.engine) {
        return;
      }
      if (result.completed) {
        this.renderCompletion(result.stats);
        return;
      }
      this.engine.next();
      this.renderCurrentQuestion();
      this.startTimer();
    }, FEEDBACK_DELAY_MS);
  }

  private renderCompletion(stats: QuizStats): void {
    this.clearTimers();
    this.stopVerseRotation();
    this.phase = 'complete';
    this.root.innerHTML = `
      <main class="app-shell completion-shell">
        <div class="completion-confetti" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>
        <section class="completion-card" aria-labelledby="completion-title">
          <div class="completion-badge">✦</div>
          <p class="eyebrow">THE WHOLE BANK IS YOURS</p>
          <h1 id="completion-title">You did it,<br /><em>My Love.</em></h1>
          <p class="completion-message" id="completion-message"></p>
          <div class="completion-stats">
            <div><strong>${stats.mastered}</strong><span>mastered</span></div>
            <div><strong>${formatAccuracy(stats.firstAttemptAccuracy)}</strong><span>first-try accuracy</span></div>
            <div><strong>${stats.retries}</strong><span>comeback tries</span></div>
            <div><strong>${stats.bestStreak}</strong><span>best streak</span></div>
          </div>
          <p class="completion-footnote">Every answer was a little bit of courage. I am so proud of you. —Gab</p>
          <button class="primary-button" type="button" id="restart-button"><span>Rumble again</span><span class="button-arrow" aria-hidden="true">↗</span></button>
        </section>
      </main>
    `;
    this.setText('#completion-message', this.messageBags.completion.next());
    this.root.querySelector<HTMLButtonElement>('#restart-button')?.addEventListener('click', () => this.startSession());
  }

  private updateStats(stats: QuizStats): void {
    this.setText('#stat-mastered', `${stats.mastered}`);
    this.setText('#stat-accuracy', formatAccuracy(stats.firstAttemptAccuracy));
    this.setText('#stat-retries', `${stats.retries}`);
    this.setText('#stat-streak', `${stats.streak}`);
    this.setText('#progress-label', `${stats.mastered} / ${stats.totalQuestions} mastered`);
    const progress = this.root.querySelector<HTMLElement>('#mastery-progress');
    if (progress) {
      progress.style.width = `${(stats.mastered / stats.totalQuestions) * 100}%`;
    }
  }

  private updateTimer(): void {
    if (!this.timer) {
      return;
    }
    const remaining = this.timer.remaining;
    const ring = this.root.querySelector<HTMLElement>('#timer-ring');
    this.setText('#timer-number', `${remaining}`);
    if (ring) {
      ring.setAttribute('aria-label', `${remaining} seconds remaining`);
      ring.style.setProperty('--timer-progress', `${(remaining / QUESTION_SECONDS) * 360}deg`);
      ring.classList.toggle('timer-warning', remaining <= 15);
      ring.classList.toggle('timer-danger', remaining <= 5);
    }
  }

  private rotateVerse(): void {
    if (this.phase === 'unavailable' || !this.root.querySelector('#verse-card')) {
      return;
    }
    this.currentVerse = this.verseRotation.advance(Date.now());
    this.setText('#verse-theme', `${this.currentVerse.theme.toUpperCase()} FOR TODAY`);
    this.setText('#verse-text', this.currentVerse.text);
    this.setText('#verse-reference', `${this.currentVerse.reference} · WEB`);
    this.setText('#verse-note', this.currentVerse.note);
  }

  private startVerseRotation(): void {
    this.stopVerseRotation();
    this.rotateVerse();
    this.verseHandle = window.setInterval(() => this.rotateVerse(), VERSE_ROTATION_MS);
  }

  private handleKeyboard(event: KeyboardEvent): void {
    if (this.phase !== 'playing' || this.answerLocked) {
      return;
    }
    const number = Number(event.key);
    if (!Number.isInteger(number) || number < 1 || number > 6) {
      return;
    }
    const buttons = [...this.root.querySelectorAll<HTMLButtonElement>('.answer-tile')];
    buttons[number - 1]?.click();
  }

  private hideFeedback(): void {
    const panel = this.root.querySelector<HTMLElement>('#feedback-panel');
    if (panel) {
      panel.hidden = true;
      panel.className = 'feedback-panel';
    }
  }

  private setText(selector: string, value: string): void {
    const element = this.root.querySelector<HTMLElement>(selector);
    if (element) {
      element.textContent = value;
    }
  }

  private stopTimer(): void {
    if (this.timerHandle !== undefined) {
      window.clearInterval(this.timerHandle);
      this.timerHandle = undefined;
    }
  }

  private clearTimers(): void {
    this.stopTimer();
    if (this.feedbackHandle !== undefined) {
      window.clearTimeout(this.feedbackHandle);
      this.feedbackHandle = undefined;
    }
  }

  private stopVerseRotation(): void {
    if (this.verseHandle !== undefined) {
      window.clearInterval(this.verseHandle);
      this.verseHandle = undefined;
    }
  }

  private resetToWelcome(): void {
    this.clearTimers();
    this.stopVerseRotation();
    this.phase = 'welcome';
    this.answerLocked = false;
    this.engine = null;
    this.timer = null;
    this.renderWelcome();
  }
}

const appRoot = document.querySelector<HTMLElement>('#app');
if (!appRoot) {
  throw new Error('The quiz app root was not found.');
}

new QuizApp(appRoot).boot();
