const screens = [...document.querySelectorAll('.screen')];
const indicator = document.getElementById('screen-indicator');
const liveCountEl = document.getElementById('live-count');
const selectedCountEl = document.getElementById('selected-count');
const selectionHintEl = document.getElementById('selection-hint');
const interestsNext = document.getElementById('interests-next');
const pillWrap = document.getElementById('pill-wrap');
const historyList = document.getElementById('history-list');
const ghostCallout = document.getElementById('ghost-callout');
const liveShared = document.getElementById('live-shared');
const miniProfile = document.getElementById('mini-profile');
const miniName = document.getElementById('mini-name');
const miniTags = document.getElementById('mini-tags');
const miniClose = document.getElementById('mini-close');
const waveTags = document.getElementById('wave-tags');
const waveBtn = document.getElementById('wave-btn');
const waveStatus = document.getElementById('wave-status');
const openChatBtn = document.getElementById('open-chat-btn');
const chatTimer = document.getElementById('chat-timer');
const chatExpired = document.getElementById('chat-expired');
const mapPins = [...document.querySelectorAll('.map-pin')];
const chatMessages = [...document.querySelectorAll('.message-list .msg')];

const MAX_INTEREST_SELECTION = 3;
const LIVE_COUNT_MIN = 200;
const LIVE_COUNT_MAX = 240;
const LIVE_COUNT_UPDATE_INTERVAL_MS = 1800;
const WAVE_RESPONSE_DELAY_MS = 1200;
const CHAT_DURATION_MINUTES = 15;
const LIVE_COUNT_INCREMENT_PROBABILITY = 0.5;
const SECONDS_PER_MINUTE = 60;
const DEFAULT_SELECTED_INTERESTS = [];
const DEFAULT_SHARED_INTERESTS = ['Design', 'AI'];

const interests = ['AI', 'Design', 'Gaming', 'Music', 'Startups', 'Fitness', 'Film', 'Books', 'Cooking'];
const ghosts = [
  { name: 'Mia', when: '12m ago', tags: ['Design', 'AI', 'Film'] },
  { name: 'Noah', when: '1h ago', tags: ['Gaming', 'Music', 'AI'] },
  { name: 'Lena', when: '2h ago', tags: ['Books', 'Cooking', 'Design'] }
];

let current = 0;
let selected = new Set(DEFAULT_SELECTED_INTERESTS);
let countValue = 218;
let waveComplete = false;
let timerSeconds = CHAT_DURATION_MINUTES * SECONDS_PER_MINUTE;
let liveCountIntervalId = null;
let timerIntervalId = null;
let qrTimeoutId = null;

function startLiveCountTicker() {
  if (liveCountIntervalId !== null) return;
  liveCountIntervalId = setInterval(() => {
    countValue += Math.random() < LIVE_COUNT_INCREMENT_PROBABILITY ? 1 : -1;
    countValue = Math.max(LIVE_COUNT_MIN, Math.min(LIVE_COUNT_MAX, countValue));
    liveCountEl.textContent = countValue;
  }, LIVE_COUNT_UPDATE_INTERVAL_MS);
}

function stopLiveCountTicker() {
  if (liveCountIntervalId === null) return;
  clearInterval(liveCountIntervalId);
  liveCountIntervalId = null;
}

function showScreen(index) {
  current = Math.max(0, Math.min(index, screens.length - 1));
  screens.forEach((screen, i) => {
    screen.classList.toggle('active', i === current);
  });
  indicator.textContent = `${current + 1} / ${screens.length}`;
  if (current === 0) startLiveCountTicker();
  else stopLiveCountTicker();
  if (current === 1) startQrAutoAdvance();
  else clearQrAutoAdvance();
  if (current === 4) hideMiniProfile();
  if (current === 5) resetWave();
  if (current === 6) {
    hideChatExpired();
    startTimer(true);
    bounceMessages();
  } else {
    resetTimer();
    hideChatExpired();
  }
}

function startQrAutoAdvance() {
  clearQrAutoAdvance();
  qrTimeoutId = setTimeout(() => {
    showScreen(2);
  }, 2000);
}

function clearQrAutoAdvance() {
  if (qrTimeoutId === null) return;
  clearTimeout(qrTimeoutId);
  qrTimeoutId = null;
}

function renderPills() {
  pillWrap.innerHTML = '';
  interests.forEach((interest) => {
    const pill = document.createElement('button');
    pill.classList.add('pill');
    if (selected.has(interest)) pill.classList.add('selected');
    pill.type = 'button';
    pill.textContent = interest;
    pill.setAttribute('aria-pressed', String(selected.has(interest)));
    pill.addEventListener('click', () => {
      let changed = false;
      if (selected.has(interest)) {
        selected.delete(interest);
        selectionHintEl.textContent = '';
        changed = true;
      } else if (selected.size < MAX_INTEREST_SELECTION) {
        selected.add(interest);
        selectionHintEl.textContent = '';
        changed = true;
      } else {
        selectionHintEl.textContent = `You can pick up to ${MAX_INTEREST_SELECTION} interests.`;
      }
      updateSelection();
      if (changed) triggerPillPopByInterest(interest);
    });
    pillWrap.appendChild(pill);
  });
}

function triggerPillPopByInterest(interest) {
  const pill = [...pillWrap.querySelectorAll('.pill')]
    .find((item) => item.textContent === interest);
  if (!pill) return;
  pill.classList.remove('pop');
  void pill.offsetWidth;
  pill.classList.add('pop');
}

function createGhostTagElement(tag) {
  const element = document.createElement('span');
  element.classList.add('tag');
  if (selected.has(tag)) element.classList.add('match');
  element.textContent = tag;
  return element;
}

function updateGhosts() {
  let matchedGhosts = 0;
  historyList.innerHTML = '';
  ghosts.forEach((ghost) => {
    const hasMatch = ghost.tags.some((tag) => selected.has(tag));
    if (hasMatch) matchedGhosts += 1;

    const card = document.createElement('article');
    card.classList.add('history-item');

    const meta = document.createElement('div');
    meta.classList.add('ghost-meta');

    const name = document.createElement('strong');
    name.textContent = ghost.name;
    const when = document.createElement('span');
    when.textContent = ghost.when;
    meta.append(name, when);

    const badge = document.createElement('span');
    badge.classList.add('history-badge');
    badge.textContent = hasMatch ? 'Shared Interests' : 'No Shared Interests';
    if (hasMatch) badge.classList.add('match');

    const tags = document.createElement('div');
    tags.classList.add('tags');
    ghost.tags.forEach((tag) => tags.appendChild(createGhostTagElement(tag)));

    card.append(meta, badge, tags);
    historyList.appendChild(card);
  });
  ghostCallout.textContent = `${matchedGhosts} ghost${matchedGhosts === 1 ? '' : 's'} share your interests.`;
}

function updateSelection() {
  selectedCountEl.textContent = selected.size;
  const isComplete = selected.size === MAX_INTEREST_SELECTION;
  interestsNext.classList.toggle('hidden', !isComplete);
  pillWrap.classList.toggle('limit-reached', isComplete);
  renderPills();
  updateGhosts();
  const sharedInterests = [...selected].slice(0, 2);
  const displaySharedInterests = sharedInterests.length ? sharedInterests : DEFAULT_SHARED_INTERESTS;
  liveShared.textContent = displaySharedInterests.join(', ');
  waveTags.innerHTML = displaySharedInterests
    .map((tag) => `<span class="tag match">${tag}</span>`)
    .join('');
}

function renderMiniProfile(name, distance, interestsList) {
  const shared = interestsList.filter((tag) => selected.has(tag));
  miniName.textContent = `${name} · ${distance} away`;
  miniTags.innerHTML = '';
  interestsList.forEach((tag) => {
    const chip = document.createElement('span');
    chip.classList.add('mini-tag');
    if (shared.includes(tag)) chip.classList.add('match');
    chip.textContent = tag;
    miniTags.appendChild(chip);
  });
  miniProfile.classList.add('active');
}

function hideMiniProfile() {
  miniProfile.classList.remove('active');
}

function bounceMessages() {
  chatMessages.forEach((msg, index) => {
    msg.classList.remove('bounce');
    setTimeout(() => {
      msg.classList.add('bounce');
    }, 80 * index);
  });
}

function showChatExpired() {
  chatExpired.classList.add('active');
}

function hideChatExpired() {
  chatExpired.classList.remove('active');
}

function startWave() {
  if (waveComplete) return;
  waveBtn.disabled = true;
  waveStatus.textContent = 'Wave sent… waiting for Ari.';
  setTimeout(() => {
    waveComplete = true;
    waveStatus.textContent = 'Ari waved back! You can open chat now.';
    openChatBtn.disabled = false;
  }, WAVE_RESPONSE_DELAY_MS);
}

function resetWave() {
  waveComplete = false;
  waveBtn.disabled = false;
  openChatBtn.disabled = true;
  waveStatus.textContent = 'Wave to send a low-pressure ping.';
}

function formatTimer(seconds) {
  const m = String(Math.floor(seconds / SECONDS_PER_MINUTE)).padStart(2, '0');
  const s = String(seconds % SECONDS_PER_MINUTE).padStart(2, '0');
  return `${m}:${s}`;
}

function resetTimer() {
  if (timerIntervalId !== null) {
    clearInterval(timerIntervalId);
    timerIntervalId = null;
  }
  timerSeconds = CHAT_DURATION_MINUTES * SECONDS_PER_MINUTE;
  chatTimer.textContent = formatTimer(timerSeconds);
}

function startTimer(reset) {
  if (reset) resetTimer();
  if (timerIntervalId !== null) return;
  timerIntervalId = setInterval(() => {
    if (timerSeconds <= 0) return;
    timerSeconds -= 1;
    chatTimer.textContent = formatTimer(timerSeconds);
    if (timerSeconds === 0) {
      clearInterval(timerIntervalId);
      timerIntervalId = null;
      showChatExpired();
    }
  }, 1000);
}

document.querySelectorAll('[data-goto]').forEach((btn) => {
  btn.addEventListener('click', () => {
    showScreen(Number(btn.dataset.goto));
  });
});

mapPins.forEach((pin) => {
  pin.addEventListener('click', () => {
    const name = pin.dataset.name || 'Anonymous';
    const distance = pin.dataset.distance || '12m';
    const interestsList = (pin.dataset.interests || '').split(',').filter(Boolean);
    renderMiniProfile(name, distance, interestsList.length ? interestsList : DEFAULT_SHARED_INTERESTS);
  });
});

miniClose.addEventListener('click', hideMiniProfile);

waveBtn.addEventListener('click', startWave);
window.addEventListener('beforeunload', () => {
  stopLiveCountTicker();
  if (timerIntervalId !== null) {
    clearInterval(timerIntervalId);
    timerIntervalId = null;
  }
});

updateSelection();
showScreen(0);
