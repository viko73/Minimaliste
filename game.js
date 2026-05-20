/* ══════════════════════════════════════════
   Guess The Poster — game.js
   ══════════════════════════════════════════ */

/* ── Configuration ── */

const CATEGORIES = [
  { id: 'films',  label: 'Films',      file: 'data/films.json',  icon: '🎬' },
  { id: 'series', label: 'Séries',     file: 'data/series.json', icon: '📺' },
  { id: 'anime',  label: 'Animé',      file: 'data/anime.json',  icon: '⛩️' },
  { id: 'jeux',   label: 'Jeux vidéo', file: 'data/jeux.json',   icon: '🎮' },
];

const RESULT_MESSAGES = [
  { threshold: 1.00, msg: 'Parfait ! Tu es un vrai expert. 🏆' },
  { threshold: 0.75, msg: 'Très bien joué, tu maîtrises le sujet !' },
  { threshold: 0.50, msg: "Pas mal ! Encore un peu d'entraînement." },
  { threshold: 0.25, msg: 'Il reste du chemin à faire… Retente ta chance !' },
  { threshold: 0.00, msg: "Aïe. Peut-être que ce n'est pas ta catégorie ?" },
];

/* ── State ── */

let currentCat    = null;
let questions     = [];
let qIndex        = 0;
let score         = 0;
let answered      = false;
let hintsRevealed = 0;
let totalErrors   = 0;
let totalHints    = 0;

/* ── DOM references ── */

const DOM = {
  catGrid:        document.getElementById('catGrid'),
  homeError:      document.getElementById('homeError'),
  catBadge:       document.getElementById('catBadge'),
  progressBar:    document.getElementById('progressBar'),
  progressLabel:  document.getElementById('progressLabel'),
  posterLoading:  document.getElementById('posterLoading'),
  posterImg:      document.getElementById('posterImg'),
  posterYear:     document.getElementById('posterYear'),
  posterCredit:   document.getElementById('posterCredit'),
  feedback:       document.getElementById('feedback'),
  feedbackIcon:   document.getElementById('feedbackIcon'),
  feedbackText:   document.getElementById('feedbackText'),
  nextBtn:        document.getElementById('nextBtn'),
  headerScore:    document.getElementById('headerScore'),
  headerScoreVal: document.getElementById('headerScoreVal'),
  resultsCat:     document.getElementById('resultsCat'),
  bigScore:       document.getElementById('bigScore'),
  scoreDenom:     document.getElementById('scoreDenom'),
  statsLine:      document.getElementById('statsLine'),
  resultMsg:      document.getElementById('resultMsg'),
  hintsWrap:      document.getElementById('hintsWrap'),
  answerInput:    document.getElementById('answerInput'),
  submitBtn:      document.getElementById('submitBtn'),
};

/* ══════════════════════════════════════════
   INITIALISATION
   ══════════════════════════════════════════ */

function init() {
  CATEGORIES.forEach(cat => {
    const card = createCategoryCard(cat);
    DOM.catGrid.appendChild(card);

    fetch(cat.file)
      .then(r => r.json())
      .then(data => {
        const n = data.length;
        card.querySelector('.cat-count').textContent =
          `${n} affiche${n > 1 ? 's' : ''}`;
      })
      .catch(() => {
        card.querySelector('.cat-count').textContent = 'Fichier manquant';
      });
  });
}

function createCategoryCard(cat) {
  const card = document.createElement('button');
  card.className = 'cat-card';
  card.innerHTML = `
    <span class="cat-icon">${cat.icon}</span>
    <span class="cat-name">${cat.label}</span>
    <span class="cat-count">Chargement…</span>
  `;
  card.addEventListener('click', () => startGame(cat));
  return card;
}

/* ══════════════════════════════════════════
   DÉMARRAGE DU JEU
   ══════════════════════════════════════════ */

async function startGame(cat) {
  DOM.homeError.style.display = 'none';

  try {
    const res = await fetch(cat.file);
    if (!res.ok) throw new Error('Fichier introuvable');

    const data = await res.json();
    if (!data.length) throw new Error('Aucune question dans ce fichier');

    currentCat  = cat;
    questions   = shuffle([...data]).slice(0, 10);
    qIndex      = 0;
    score       = 0;
    answered    = false;
    totalErrors = 0;
    totalHints  = 0;

    showScreen('game');
    DOM.catBadge.textContent = `${cat.icon}  ${cat.label}`;
    DOM.headerScore.style.display = 'block';
    updateHeaderScore();
    renderQuestion();

  } catch (e) {
    DOM.homeError.textContent =
      `Erreur : ${e.message}. Vérifiez que ${cat.file} existe et est valide.`;
    DOM.homeError.style.display = 'block';
  }
}

/* ══════════════════════════════════════════
   RENDU D'UNE QUESTION
   ══════════════════════════════════════════ */

function renderQuestion() {
  answered      = false;
  hintsRevealed = 0;
  const q = questions[qIndex];

  updateProgress();
  renderPoster(q);
  renderInput();
  resetFeedback();
}

function updateProgress() {
  const pct = (qIndex / questions.length) * 100;
  DOM.progressBar.style.width = pct + '%';
  DOM.progressLabel.textContent = `${qIndex + 1} / ${questions.length}`;
}

function renderPoster(q) {
  DOM.posterLoading.style.display = 'flex';
  DOM.posterImg.style.opacity     = '0';
  DOM.posterYear.style.display    = 'none';
  DOM.posterCredit.style.display  = 'none';
  DOM.posterImg.src = '';

  const img = new Image();

  img.onload = () => {
    DOM.posterImg.src               = img.src;
    DOM.posterImg.style.opacity     = '1';
    DOM.posterLoading.style.display = 'none';
    DOM.posterYear.textContent      = q.annee;
    DOM.posterYear.style.display    = 'block';

    if (q.credit) {
      DOM.posterCredit.textContent   = `© ${q.credit}`;
      DOM.posterCredit.style.display = 'block';
    }
  };

  img.onerror = () => {
    DOM.posterLoading.innerHTML = `
      <div class="no-image">
        <span class="no-image-icon">🖼️</span>
        <span class="no-image-text">Image non trouvée</span>
      </div>`;
  };

  img.src = q.image;
}

function renderInput() {
  DOM.hintsWrap.innerHTML      = '';
  DOM.answerInput.value        = '';
  DOM.answerInput.disabled     = false;
  DOM.submitBtn.disabled       = false;
  DOM.answerInput.focus();
  DOM.answerInput.onkeydown = (e) => {
    if (e.key === 'Enter') submitAnswer();
  };
}

function resetFeedback() {
  DOM.feedback.className = 'feedback';
  DOM.nextBtn.className  = 'next-btn';
}

/* ══════════════════════════════════════════
   INDICES — construction selon la catégorie
   ══════════════════════════════════════════ */

function buildIndices(q) {
  const indices = [];

  if (currentCat.id === 'jeux') {
    if (q.studio)  indices.push(`🎮 Studio · ${q.studio}`);
    if (q.resume)  indices.push(`📖 ${q.resume}`);
    indices.push(`💡 La réponse était : ${q.titre}`);
  } else {
    if (q.realisateur) indices.push(`🎬 Réalisateur · ${q.realisateur}`);
    if (q.resume)      indices.push(`📖 ${q.resume}`);
  }

  return indices;
}

function revealNextHint(indices) {
  if (hintsRevealed >= indices.length) return;

  const texte = indices[hintsRevealed];
  hintsRevealed++;
  totalHints++;

  const el = document.createElement('div');
  el.className = 'hint-item';
  el.innerHTML = `<span class="hint-number">${hintsRevealed}</span>${texte}`;
  DOM.hintsWrap.appendChild(el);
}

/* ══════════════════════════════════════════
   SAISIE DE LA RÉPONSE
   ══════════════════════════════════════════ */

function submitAnswer() {
  if (answered) return;

  const q      = questions[qIndex];
  const saisie = DOM.answerInput.value.trim();
  if (!saisie) return;

  const isCorrect = normalize(saisie) === normalize(q.titre);

  if (isCorrect) {
    // ── Bonne réponse ──
    answered = true;
    score++;
    updateHeaderScore();
    DOM.answerInput.disabled = true;
    DOM.submitBtn.disabled   = true;
    showFeedback('correct', '✓', `Bravo ! C'est bien "${q.titre}".`);
    showNextBtn();

  } else {
    // ── Mauvaise réponse ──
    totalErrors++;
    DOM.answerInput.value = '';
    DOM.answerInput.focus();

    const indices = buildIndices(q);

    // Tous les indices déjà révélés → dernier essai épuisé
    if (hintsRevealed >= indices.length) {
      answered = true;
      DOM.answerInput.disabled = true;
      DOM.submitBtn.disabled   = true;
      showFeedback('wrong', '✗', `La bonne réponse était "${q.titre}".`);
      showNextBtn();
      return;
    }

    // Révèle l'indice suivant
    revealNextHint(indices);

    // Pour les jeux : si le dernier indice révélé est l'indice-réponse,
    // on bloque directement sans attendre une saisie supplémentaire
    const lastHintIsAnswer = currentCat.id === 'jeux' &&
                             hintsRevealed >= indices.length;

    if (lastHintIsAnswer) {
      answered = true;
      DOM.answerInput.disabled = true;
      DOM.submitBtn.disabled   = true;
      showFeedback('wrong', '✗', `Bien essayé !`);
      showNextBtn();
    } else if (hintsRevealed >= indices.length) {
      // Autres catégories : tous les indices visibles → dernier essai
      showFeedback('wrong', '✗', `Raté ! Dernier essai…`);
    } else {
      showFeedback('wrong', '✗', `Raté ! Un indice vient d'apparaître…`);
    }
  }
}

/* ── Normalise : minuscules + sans accents ── */
function normalize(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function showFeedback(type, icon, text) {
  DOM.feedback.className       = `feedback ${type} show`;
  DOM.feedbackIcon.textContent = icon;
  DOM.feedbackText.textContent = text;
}

function showNextBtn() {
  const isLast = qIndex >= questions.length - 1;
  DOM.nextBtn.className   = 'next-btn show';
  DOM.nextBtn.textContent = isLast ? 'Voir les résultats →' : 'Question suivante →';
}

/* ══════════════════════════════════════════
   NAVIGATION
   ══════════════════════════════════════════ */

function nextQuestion() {
  qIndex++;
  if (qIndex >= questions.length) {
    showResults();
  } else {
    renderQuestion();
  }
}

function replayCategory() {
  startGame(currentCat);
}

function goHome() {
  showScreen('home');
  DOM.headerScore.style.display = 'none';
}

/* ══════════════════════════════════════════
   RÉSULTATS
   ══════════════════════════════════════════ */

function showResults() {
  showScreen('results');
  DOM.progressBar.style.width = '100%';

  DOM.resultsCat.textContent = `${currentCat.icon}  ${currentCat.label}`;
  DOM.bigScore.textContent   = score;
  DOM.scoreDenom.textContent = `sur ${questions.length}`;
  DOM.resultMsg.textContent  = getResultMessage(score / questions.length);
  DOM.statsLine.textContent  =
    `${totalErrors} erreur${totalErrors > 1 ? 's' : ''} · ` +
    `${totalHints} indice${totalHints > 1 ? 's' : ''} utilisé${totalHints > 1 ? 's' : ''}`;
}

function getResultMessage(ratio) {
  for (const { threshold, msg } of RESULT_MESSAGES) {
    if (ratio >= threshold) return msg;
  }
  return RESULT_MESSAGES.at(-1).msg;
}

/* ══════════════════════════════════════════
   UTILITAIRES
   ══════════════════════════════════════════ */

function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(name + 'Screen').classList.add('active');
}

function updateHeaderScore() {
  DOM.headerScoreVal.textContent = `${score} / ${qIndex + (answered ? 1 : 0)}`;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* ── Démarrage ── */
init();