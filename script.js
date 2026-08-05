(() => {
  'use strict';

  const KEYS = {
    settings: 'topicmaster-v1-settings',
    used: 'topicmaster-v1-used',
    history: 'topicmaster-v1-history'
  };

  const screens = {
    home: document.getElementById('screen-home'),
    setup: document.getElementById('screen-setup'),
    roulette: document.getElementById('screen-roulette'),
    prep: document.getElementById('screen-prep'),
    speech: document.getElementById('screen-speech'),
    done: document.getElementById('screen-done'),
    history: document.getElementById('screen-history')
  };

  const $ = id => document.getElementById(id);

  function readJson(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
  }

  function categoryNames() {
    return [...new Set(TOPICS.map(topic => topic.category))];
  }

  const saved = readJson(KEYS.settings, {});
  const savedCategories = Array.isArray(saved.categories) ? saved.categories : categoryNames();

  const state = {
    selectedCategories: new Set(savedCategories.filter(name => categoryNames().includes(name))),
    prepMinutes: Number(saved.prepMinutes || 60),
    speechMinutes: Number(saved.speechMinutes || 1),
    currentTopic: null,
    usedIds: new Set(readJson(KEYS.used, [])),
    history: readJson(KEYS.history, []),
    prepRemaining: 0,
    speechRemaining: 0,
    prepTotal: 0,
    speechTotal: 0,
    timerId: null,
    paused: false,
    spinning: false,
    historyReturn: 'home'
  };

  if (state.selectedCategories.size === 0 && !Array.isArray(saved.categories)) {
    state.selectedCategories = new Set(categoryNames());
  }

  function saveSettings() {
    writeJson(KEYS.settings, {
      categories: [...state.selectedCategories],
      prepMinutes: state.prepMinutes,
      speechMinutes: state.speechMinutes
    });
  }

  function saveUsed() {
    writeJson(KEYS.used, [...state.usedIds]);
  }

  function saveHistory() {
    writeJson(KEYS.history, state.history.slice(0, 200));
  }

  function showScreen(name) {
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    screens[name].classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function toast(message) {
    const el = $('toast');
    el.textContent = message;
    el.classList.remove('hidden');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.add('hidden'), 2200);
  }

  function renderCategories() {
    const grid = $('categoryGrid');
    grid.innerHTML = '';
    categoryNames().forEach(name => {
      const selected = state.selectedCategories.has(name);
      const button = document.createElement('button');
      button.className = `category${selected ? ' selected' : ''}`;
      button.type = 'button';
      button.dataset.category = name;
      button.innerHTML = `<span class="check">${selected ? '✓' : ''}</span><span>${name}</span>`;
      button.addEventListener('click', () => {
        if (state.selectedCategories.has(name)) state.selectedCategories.delete(name);
        else state.selectedCategories.add(name);
        const active = state.selectedCategories.has(name);
        button.classList.toggle('selected', active);
        button.querySelector('.check').textContent = active ? '✓' : '';
        $('categoryError').classList.add('hidden');
        updateToggleAllLabel();
        saveSettings();
      });
      grid.appendChild(button);
    });
    updateToggleAllLabel();
  }

  function updateToggleAllLabel() {
    $('toggleAll').textContent = state.selectedCategories.size === categoryNames().length
      ? 'Снять все' : 'Выбрать все';
  }

  function setupOptionGroup(containerId, stateKey) {
    const container = $(containerId);
    container.querySelectorAll('button').forEach(button => {
      const isSelected = Number(button.dataset.minutes) === state[stateKey];
      button.classList.toggle('selected', isSelected);
      button.addEventListener('click', () => {
        container.querySelectorAll('button').forEach(item => item.classList.remove('selected'));
        button.classList.add('selected');
        state[stateKey] = Number(button.dataset.minutes);
        saveSettings();
      });
    });
  }

  function selectedTopics() {
    return TOPICS.filter(topic => state.selectedCategories.has(topic.category));
  }

  function availableTopics() {
    let pool = selectedTopics().filter(topic => !state.usedIds.has(topic.id));
    if (pool.length) return pool;

    const selectedIds = new Set(selectedTopics().map(topic => topic.id));
    state.usedIds = new Set([...state.usedIds].filter(id => !selectedIds.has(id)));
    saveUsed();
    pool = selectedTopics();
    if (pool.length) toast('Все выбранные темы уже выпадали — начинаем новый круг');
    return pool;
  }

  function shuffle(array) {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function randomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  function buildIdleReel() {
    const pool = selectedTopics();
    const reel = $('reel');
    reel.style.transition = 'none';
    reel.style.transform = 'translateY(0)';
    reel.innerHTML = '';
    const sample = shuffle(pool).slice(0, 7);
    while (sample.length < 7 && pool.length) sample.push(randomItem(pool));
    sample.forEach((topic, index) => {
      const item = document.createElement('div');
      item.className = `reel-item${index === 2 ? ' highlight' : ''}`;
      item.textContent = topic.title;
      reel.appendChild(item);
    });
  }

  function recordTopic(topic) {
    state.usedIds.add(topic.id);
    saveUsed();
    state.history.unshift({
      id: topic.id,
      title: topic.title,
      category: topic.category,
      time: new Date().toISOString()
    });
    saveHistory();
  }

  function spinRoulette() {
    if (state.spinning) return;
    const pool = availableTopics();
    if (!pool.length) {
      toast('Нет тем в выбранных категориях');
      return;
    }

    state.spinning = true;
    $('spinButton').disabled = true;
    $('acceptTopic').classList.add('hidden');
    $('rouletteHint').textContent = 'Рулетка вращается…';

    const target = randomItem(pool);
    const source = shuffle(selectedTopics());
    const longList = [];
    for (let i = 0; i < 34; i++) longList.push(source[i % source.length]);
    longList.push(target);
    for (let i = 0; i < 3; i++) longList.push(source[(i + 7) % source.length]);

    const reel = $('reel');
    reel.style.transition = 'none';
    reel.style.transform = 'translateY(0)';
    reel.innerHTML = '';

    longList.forEach(topic => {
      const item = document.createElement('div');
      item.className = 'reel-item';
      item.textContent = topic.title;
      reel.appendChild(item);
    });

    requestAnimationFrame(() => requestAnimationFrame(() => {
      const targetIndex = longList.length - 4;
      const offset = targetIndex * 66 - 132;
      reel.style.transition = 'transform 3.7s cubic-bezier(.08,.72,.08,1)';
      reel.style.transform = `translateY(-${offset}px)`;
    }));

    setTimeout(() => {
      const items = reel.querySelectorAll('.reel-item');
      items.forEach(item => item.classList.remove('highlight'));
      items[longList.length - 4].classList.add('highlight');
      state.currentTopic = target;
      recordTopic(target);
      state.spinning = false;
      $('spinButton').disabled = false;
      $('spinButton').textContent = 'Крутить ещё раз';
      $('acceptTopic').classList.remove('hidden');
      $('rouletteHint').textContent = `Категория: ${target.category}`;
      if (navigator.vibrate) navigator.vibrate([35, 30, 60]);
    }, 3850);
  }

  function formatTime(seconds) {
    const safe = Math.max(0, seconds);
    const mins = Math.floor(safe / 60);
    const secs = safe % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function clearTimer() {
    if (state.timerId) clearInterval(state.timerId);
    state.timerId = null;
  }

  function setTimerDisplay(mode) {
    const remaining = mode === 'prep' ? state.prepRemaining : state.speechRemaining;
    const total = mode === 'prep' ? state.prepTotal : state.speechTotal;
    const timerEl = mode === 'prep' ? $('prepTimer') : $('speechTimer');
    const progressEl = mode === 'prep' ? $('prepProgress') : $('speechProgress');
    timerEl.textContent = formatTime(remaining);
    progressEl.style.width = `${Math.max(0, total ? remaining / total * 100 : 0)}%`;
    document.title = `${formatTime(remaining)} — ${state.currentTopic?.title || 'TopicMaster'}`;
  }

  function updatePauseButtons() {
    const text = state.paused ? 'Продолжить' : 'Пауза';
    $('prepPause').textContent = text;
    $('speechPause').textContent = text;
  }

  function startCountdown(mode) {
    clearTimer();
    state.paused = false;
    updatePauseButtons();
    setTimerDisplay(mode);
    state.timerId = setInterval(() => {
      if (state.paused) return;
      if (mode === 'prep') {
        state.prepRemaining = Math.max(0, state.prepRemaining - 1);
        setTimerDisplay('prep');
        if (state.prepRemaining === 0) beginSpeech();
      } else {
        state.speechRemaining = Math.max(0, state.speechRemaining - 1);
        setTimerDisplay('speech');
        if (state.speechRemaining === 0) finishSession();
      }
    }, 1000);
  }

  function togglePause() {
    state.paused = !state.paused;
    updatePauseButtons();
  }

  function beginPreparation() {
    if (!state.currentTopic) return;
    $('prepTopic').textContent = state.currentTopic.title;
    state.prepTotal = state.prepMinutes * 60;
    state.prepRemaining = state.prepTotal;
    $('notes').value = localStorage.getItem(`topicmaster-notes:${state.currentTopic.id}`) || '';
    showScreen('prep');
    startCountdown('prep');
  }

  function beginSpeech() {
    clearTimer();
    if (!state.currentTopic) return;
    $('speechTopic').textContent = state.currentTopic.title;
    state.speechTotal = state.speechMinutes * 60;
    state.speechRemaining = state.speechTotal;
    showScreen('speech');
    startCountdown('speech');
  }

  function finishSession() {
    clearTimer();
    document.title = 'TopicMaster';
    $('doneTopic').textContent = state.currentTopic?.title || '';
    showScreen('done');
  }

  function resetForNewTopic() {
    clearTimer();
    state.currentTopic = null;
    state.spinning = false;
    $('spinButton').textContent = 'Крутить рулетку';
    $('spinButton').disabled = false;
    $('acceptTopic').classList.add('hidden');
    $('rouletteHint').textContent = 'Темы из выбранных категорий перемешаны';
    buildIdleReel();
    showScreen('roulette');
  }

  function renderHistory() {
    const list = $('historyList');
    list.innerHTML = '';
    $('historyCount').textContent = `${state.history.length} тем`;
    $('historyEmpty').classList.toggle('hidden', state.history.length !== 0);
    state.history.forEach(entry => {
      const item = document.createElement('div');
      item.className = 'history-item';
      const date = new Date(entry.time);
      const dateText = Number.isNaN(date.getTime()) ? '' : date.toLocaleString('ru-RU', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
      });
      item.innerHTML = `<strong>${entry.title}</strong><span>${entry.category}${dateText ? ' · ' + dateText : ''}</span>`;
      list.appendChild(item);
    });
  }

  function openHistory(returnTo) {
    state.historyReturn = returnTo;
    renderHistory();
    showScreen('history');
  }

  $('topicCount').textContent = TOPICS.length;
  $('categoryCount').textContent = categoryNames().length;

  $('homeStart').addEventListener('click', () => showScreen('setup'));
  $('homeHistory').addEventListener('click', () => openHistory('home'));

  document.querySelectorAll('[data-back]').forEach(button => {
    button.addEventListener('click', () => {
      if (state.spinning) return;
      showScreen(button.dataset.back);
    });
  });

  $('toggleAll').addEventListener('click', () => {
    const all = categoryNames();
    state.selectedCategories = state.selectedCategories.size === all.length ? new Set() : new Set(all);
    renderCategories();
    saveSettings();
  });

  $('toRoulette').addEventListener('click', () => {
    if (!state.selectedCategories.size) {
      $('categoryError').classList.remove('hidden');
      toast('Выбери хотя бы одну категорию');
      return;
    }
    saveSettings();
    buildIdleReel();
    showScreen('roulette');
  });

  $('spinButton').addEventListener('click', spinRoulette);
  $('acceptTopic').addEventListener('click', beginPreparation);
  $('prepPause').addEventListener('click', togglePause);
  $('speechPause').addEventListener('click', togglePause);
  $('prepSkip').addEventListener('click', beginSpeech);
  $('speechFinish').addEventListener('click', finishSession);

  $('exitPrep').addEventListener('click', resetForNewTopic);

  $('notes').addEventListener('input', event => {
    if (state.currentTopic) {
      localStorage.setItem(`topicmaster-notes:${state.currentTopic.id}`, event.target.value);
    }
  });

  $('clearNotes').addEventListener('click', () => {
    $('notes').value = '';
    if (state.currentTopic) localStorage.removeItem(`topicmaster-notes:${state.currentTopic.id}`);
    toast('Заметки очищены');
  });

  $('newTopic').addEventListener('click', resetForNewTopic);
  $('doneHistory').addEventListener('click', () => openHistory('done'));
  $('backHome').addEventListener('click', () => {
    clearTimer();
    state.currentTopic = null;
    document.title = 'TopicMaster';
    showScreen('home');
  });

  $('historyBack').addEventListener('click', () => showScreen(state.historyReturn));
  $('clearHistory').addEventListener('click', () => {
    state.history = [];
    state.usedIds.clear();
    saveHistory();
    saveUsed();
    renderHistory();
    toast('История и список использованных тем очищены');
  });

  setupOptionGroup('prepOptions', 'prepMinutes');
  setupOptionGroup('speechOptions', 'speechMinutes');
  renderCategories();
})();
