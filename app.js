(function () {
  'use strict';

  const STORAGE_KEY = 'game-lobby-preferences-v1';
  const FAVORITES_KEY = 'game-lobby-favorites-v1';
  const state = { games: [], filter: 'all', query: '', favorites: readList(FAVORITES_KEY), preferences: readPreferences(), presence: {}, lastFocus: null, openModal: null };
  const categoryLabels = { brain: '動動腦', action: '反應派', cozy: '療癒系' };
  const colors = { sky: '#b8e1f5', pink: '#ffb5c5', lilac: '#d8c9f2', mint: '#bfe8d5', peach: '#ffc5a6', lemon: '#ffe49a', lime: '#d7ec9c' };
  const iconStroke = '#352f3c';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function readList(key) {
    try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; }
  }

  function readPreferences() {
    try { return { music: false, sfx: true, motion: false, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }; } catch { return { music: false, sfx: true, motion: false }; }
  }

  function saveList(key, list) { try { localStorage.setItem(key, JSON.stringify(list)); } catch {} }
  function savePreferences() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.preferences)); } catch {} }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  }

  function iconSvg(type) {
    const common = `fill="none" stroke="${iconStroke}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"`;
    const icons = {
      checkers: `<svg viewBox="0 0 80 80" aria-hidden="true"><rect x="12" y="12" width="56" height="56" rx="13" fill="#fff4dd" ${common}/><path d="M26 12v56M40 12v56M54 12v56M12 26h56M12 40h56M12 54h56" ${common}/><circle cx="26" cy="26" r="5" fill="#ff9e91" stroke="${iconStroke}" stroke-width="2"/><circle cx="54" cy="54" r="5" fill="#8dc9ec" stroke="${iconStroke}" stroke-width="2"/><circle cx="54" cy="26" r="5" fill="#a9d9a7" stroke="${iconStroke}" stroke-width="2"/></svg>`,
      cards: `<svg viewBox="0 0 80 80" aria-hidden="true"><rect x="17" y="13" width="38" height="52" rx="8" fill="#ffd6e0" stroke="${iconStroke}" stroke-width="3" transform="rotate(-10 17 13)"/><rect x="28" y="15" width="38" height="52" rx="8" fill="#fff9e8" stroke="${iconStroke}" stroke-width="3" transform="rotate(9 28 15)"/><path d="M47 30c-4-7-13 0 0 10 13-10 4-17 0-10Z" fill="#ef8fa8" stroke="${iconStroke}" stroke-width="2"/></svg>`,
      sudoku: `<svg viewBox="0 0 80 80" aria-hidden="true"><rect x="12" y="12" width="56" height="56" rx="10" fill="#f7efff" stroke="${iconStroke}" stroke-width="3"/><path d="M30.7 12v56M49.3 12v56M12 30.7h56M12 49.3h56" ${common}/><path d="M40 12v56M12 40h56" stroke="${iconStroke}" stroke-width="4"/><circle cx="21" cy="21" r="2.5" fill="#9c83cf"/><circle cx="58" cy="58" r="2.5" fill="#9c83cf"/><path d="m34 23 3 3 6-7" ${common}/></svg>`,
      market: `<svg viewBox="0 0 80 80" aria-hidden="true"><path d="M17 28h47l-5 36H23l-6-36Z" fill="#fff4db" stroke="${iconStroke}" stroke-width="3"/><path d="M13 27h55l-5-13H18l-5 13Z" fill="#ffb67e" stroke="${iconStroke}" stroke-width="3"/><path d="M22 14v13M34 14v13M46 14v13M58 14v13" ${common}/><path d="M31 39c3-8 11-8 14 0M36 48c3-4 7-4 10 0" ${common}/><circle cx="27" cy="69" r="4" fill="#b5dff1" stroke="${iconStroke}" stroke-width="2"/><circle cx="55" cy="69" r="4" fill="#b5dff1" stroke="${iconStroke}" stroke-width="2"/></svg>`,
      catdog: `<svg viewBox="0 0 80 80" aria-hidden="true"><path d="M11 29 18 13l13 11" fill="#ffb4a7" stroke="${iconStroke}" stroke-width="3" stroke-linejoin="round"/><path d="m69 29-7-16-13 11" fill="#a8d7ef" stroke="${iconStroke}" stroke-width="3" stroke-linejoin="round"/><circle cx="28" cy="43" r="18" fill="#fff1d5" stroke="${iconStroke}" stroke-width="3"/><circle cx="52" cy="43" r="18" fill="#dceffc" stroke="${iconStroke}" stroke-width="3"/><circle cx="23" cy="41" r="2.5" fill="${iconStroke}"/><circle cx="33" cy="41" r="2.5" fill="${iconStroke}"/><circle cx="47" cy="41" r="2.5" fill="${iconStroke}"/><circle cx="57" cy="41" r="2.5" fill="${iconStroke}"/><path d="M25 50c2 2 4 2 6 0M49 50c2 2 4 2 6 0" ${common}/><path d="M40 32v27" stroke="${iconStroke}" stroke-width="2" stroke-dasharray="3 4"/></svg>`,
      bubble: `<svg viewBox="0 0 80 80" aria-hidden="true"><rect x="9" y="9" width="62" height="62" rx="16" fill="#eafaf4" stroke="${iconStroke}" stroke-width="3"/><circle cx="34" cy="42" r="17" fill="#8fd9ef" stroke="${iconStroke}" stroke-width="3"/><circle cx="27" cy="35" r="5" fill="rgba(255,255,255,.85)"/><circle cx="57" cy="26" r="9" fill="#bdeef7" stroke="${iconStroke}" stroke-width="2.6"/><circle cx="54" cy="23" r="2.6" fill="rgba(255,255,255,.9)"/><circle cx="59" cy="52" r="6" fill="#ffe49a" stroke="${iconStroke}" stroke-width="2.4"/><path d="M18 66h44" ${common}/></svg>`,
      mole: `<svg viewBox="0 0 80 80" aria-hidden="true"><path d="M10 68h60" ${common}/><path d="M17 68c0-21 10-35 23-35s23 14 23 35" fill="#b98b70" stroke="${iconStroke}" stroke-width="3"/><path d="M28 36 22 21l14 8M52 36l6-15-14 8" fill="#cda48b" stroke="${iconStroke}" stroke-width="3" stroke-linejoin="round"/><circle cx="32" cy="45" r="3" fill="#fff" stroke="${iconStroke}" stroke-width="2"/><circle cx="48" cy="45" r="3" fill="#fff" stroke="${iconStroke}" stroke-width="2"/><circle cx="32" cy="45" r="1.4" fill="${iconStroke}"/><circle cx="48" cy="45" r="1.4" fill="${iconStroke}"/><path d="M38 53c1 2 3 2 4 0" ${common}/><path d="m66 15 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z" fill="#ffe49a" stroke="${iconStroke}" stroke-width="2"/></svg>`,
      stairs: `<svg viewBox="0 0 80 80" aria-hidden="true"><rect x="9" y="9" width="62" height="62" rx="16" fill="#eafaf4" stroke="${iconStroke}" stroke-width="3"/><path d="M14 20h52" fill="none" stroke="${iconStroke}" stroke-width="3" stroke-linecap="round"/><path d="M32 20l4 6 4-6zM44 20l4 6 4-6zM56 20l4 6 4-6z" fill="#b8c6d4" stroke="${iconStroke}" stroke-width="2"/><rect x="14" y="38" width="20" height="7" rx="3" fill="#f0b878" stroke="${iconStroke}" stroke-width="2.6"/><rect x="30" y="48" width="20" height="7" rx="3" fill="#f0b878" stroke="${iconStroke}" stroke-width="2.6"/><rect x="46" y="58" width="20" height="7" rx="3" fill="#f0b878" stroke="${iconStroke}" stroke-width="2.6"/><rect x="20" y="32.5" width="8" height="5.5" rx="2.6" fill="#ffb4a7" stroke="${iconStroke}" stroke-width="2.4"/><circle cx="24" cy="27" r="5" fill="#fff3db" stroke="${iconStroke}" stroke-width="2.6"/><circle cx="22.3" cy="27" r="1" fill="${iconStroke}"/><circle cx="25.7" cy="27" r="1" fill="${iconStroke}"/></svg>`,
      fruit: `<svg viewBox="0 0 80 80" aria-hidden="true"><rect x="9" y="9" width="62" height="62" rx="16" fill="#fff5e2" stroke="${iconStroke}" stroke-width="3"/><path d="M27 29v23h26" fill="none" stroke="#7cc8ad" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M27 19c1-4 4-6 8-6" ${common}/><circle cx="27" cy="29" r="10" fill="#ff9e91" stroke="${iconStroke}" stroke-width="2.6"/><circle cx="23.5" cy="26" r="2.2" fill="rgba(255,255,255,.8)"/><path d="M53 42c1-4 4-6 8-6" ${common}/><circle cx="53" cy="52" r="10" fill="#a9d9a7" stroke="${iconStroke}" stroke-width="2.6"/><circle cx="49.5" cy="49" r="2.2" fill="rgba(255,255,255,.8)"/></svg>`
    };
    return icons[type] || icons.cards;
  }

  function cardMarkup(game) {
    const isFavorite = state.favorites.includes(game.id);
    return `<article class="game-card" data-game-id="${escapeHtml(game.id)}" tabindex="0" aria-label="開啟${escapeHtml(game.title)}" style="--card-color:${colors[game.accent] || colors.sky}">
      <div class="card-top"><button class="favorite-button${isFavorite ? ' is-favorite' : ''}" type="button" data-favorite="${escapeHtml(game.id)}" aria-label="${isFavorite ? '取消收藏' : '收藏'} ${escapeHtml(game.title)}" aria-pressed="${isFavorite}">${isFavorite ? '♥' : '♡'}</button><span class="card-badge">${escapeHtml(game.badge || categoryLabels[game.category] || '推薦')}</span><div class="card-icon">${iconSvg(game.icon)}</div></div>
      <div class="card-body"><span class="card-eyebrow">${escapeHtml(game.eyebrow || categoryLabels[game.category] || 'PLAY')}</span><div class="card-title-row"><h3 class="card-title">${escapeHtml(game.title)}</h3></div><p class="card-description">${escapeHtml(game.description)}</p><div class="card-tags">${(game.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div><div class="presence-status" data-presence="${escapeHtml(game.id)}" aria-live="polite">${presenceMarkup(game)}</div><div class="card-actions"><a class="play-link" href="${escapeHtml(game.launchUrl)}">立即遊玩 <span>→</span></a><button class="details-link" type="button" data-details="${escapeHtml(game.id)}">了解玩法</button></div></div>
    </article>`;
  }

  function presenceMarkup(game) {
    if (!game.presenceUrl) return '<span class="presence-muted">線上人數尚未設定</span>';
    const presence = state.presence[game.id];
    if (!presence || presence.status === 'checking') return '<span class="presence-dot is-checking" aria-hidden="true"></span>查詢在線人數…';
    if (presence.status !== 'ok') return '<span class="presence-dot is-offline" aria-hidden="true"></span>暫時無法取得在線人數';
    return `<span class="presence-dot" aria-hidden="true"></span>在線 ${presence.online} 人 ・ 玩家 ${presence.players} ・ 觀戰 ${presence.spectators} ・ 房間 ${presence.rooms}`;
  }

  function visibleGames() {
    const query = state.query.trim().toLowerCase();
    return state.games.filter((game) => {
      const matchesFilter = state.filter === 'all' || game.category === state.filter;
      const haystack = [game.title, game.description, game.eyebrow, ...(game.tags || [])].join(' ').toLowerCase();
      return matchesFilter && (!query || haystack.includes(query));
    });
  }

  function renderGames() {
    const gamesGrid = $('#games-grid');
    const emptyState = $('#empty-state');
    if (!gamesGrid) return;
    const games = visibleGames();
    gamesGrid.innerHTML = games.length ? games.map(cardMarkup).join('') : '';
    emptyState.hidden = games.length > 0;
    $('#all-count').textContent = state.games.length;
    $('#games-helper').textContent = state.filter === 'all' && !state.query ? '每一張卡片都能直接帶你前往遊戲。' : `找到 ${games.length} 個適合你的遊戲。`;
    bindCardEvents();
  }

  function bindCardEvents() {
    $$('.game-card').forEach((card) => {
      const launchGame = () => openGame(state.games.find((game) => game.id === card.dataset.gameId));
      card.addEventListener('click', (event) => { if (!event.target.closest('button, a')) launchGame(); });
      card.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); launchGame(); } });
    });
    $$('[data-details]').forEach((button) => button.addEventListener('click', () => openDetails(button.dataset.details)));
    $$('[data-favorite]').forEach((button) => button.addEventListener('click', () => toggleFavorite(button.dataset.favorite)));
    $$('.play-link').forEach((link) => link.addEventListener('click', () => playSfx('open')));
  }

  function openGame(game) {
    if (!game?.launchUrl) return;
    playSfx('open');
    window.location.assign(game.launchUrl);
  }

  function toggleFavorite(id) {
    state.favorites = state.favorites.includes(id) ? state.favorites.filter((item) => item !== id) : [id, ...state.favorites];
    saveList(FAVORITES_KEY, state.favorites);
    renderGames();
    showToast(state.favorites.includes(id) ? '已收藏這個遊戲 ♥' : '已取消收藏');
    playSfx('click');
  }

  function openDetails(id) {
    const game = state.games.find((item) => item.id === id);
    if (!game) return;
    const modal = $('#details-modal');
    $('#details-eyebrow').textContent = game.eyebrow || categoryLabels[game.category] || '遊戲介紹';
    $('#details-title').textContent = game.title;
    $('#details-description').textContent = game.description;
    $('#details-tags').innerHTML = (game.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('');
    $('#details-modes').textContent = (game.modes || []).join(' ・ ');
    $('#details-controls').textContent = game.controls || '依遊戲畫面提示操作';
    $('#details-visual').style.setProperty('--card-color', colors[game.accent] || colors.sky);
    $('#details-visual').innerHTML = iconSvg(game.icon);
    const launch = $('#details-launch');
    launch.href = game.launchUrl;
    launch.onclick = () => playSfx('open');
    openModal(modal);
  }

  function openModal(modal) {
    state.lastFocus = document.activeElement;
    state.openModal = modal;
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    const focusTarget = modal.querySelector('button, a, input');
    setTimeout(() => (focusTarget || modal.querySelector('.modal-card')).focus(), 0);
  }

  function closeModal(modal = state.openModal) {
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    if (state.lastFocus && typeof state.lastFocus.focus === 'function') state.lastFocus.focus();
    state.lastFocus = null;
    state.openModal = null;
  }

  function setFilter(filter) {
    state.filter = filter;
    $$('.filter-chip').forEach((button) => button.classList.toggle('active', button.dataset.filter === filter));
    renderGames();
  }

  function applyPreferences() {
    document.body.classList.toggle('reduce-motion', Boolean(state.preferences.motion));
    $('#setting-music').checked = Boolean(state.preferences.music);
    $('#setting-sfx').checked = Boolean(state.preferences.sfx);
    $('#setting-motion').checked = Boolean(state.preferences.motion);
  }

  let audioContext;
  function playSfx(kind) {
    if (!state.preferences.sfx) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = kind === 'open' ? 660 : 520;
      gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.035, audioContext.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.11);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(); oscillator.stop(audioContext.currentTime + 0.12);
    } catch {}
  }

  let toastTimer;
  function showToast(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
  }

  function setupEvents() {
    $$('.filter-chip').forEach((button) => button.addEventListener('click', () => { playSfx('click'); setFilter(button.dataset.filter); }));
    $('#game-search').addEventListener('input', (event) => { state.query = event.target.value; state.filter = 'all'; $$('.filter-chip').forEach((button) => button.classList.toggle('active', button.dataset.filter === 'all')); renderGames(); });
    $('#clear-filter').addEventListener('click', () => { state.query = ''; $('#game-search').value = ''; setFilter('all'); });
    $('#settings-open').addEventListener('click', () => { playSfx('click'); openModal($('#settings-modal')); });
    $$('[data-close-modal]').forEach((button) => button.addEventListener('click', () => closeModal(button.closest('.modal-backdrop'))));
    $$('.modal-backdrop').forEach((modal) => modal.addEventListener('click', (event) => { if (event.target === modal) closeModal(modal); }));
    ['music', 'sfx', 'motion'].forEach((key) => { $(`#setting-${key}`).addEventListener('change', (event) => { state.preferences[key] = event.target.checked; savePreferences(); applyPreferences(); if (key === 'sfx') playSfx('click'); }); });
    $('#settings-reset').addEventListener('click', () => { state.preferences = { music: false, sfx: true, motion: false }; savePreferences(); applyPreferences(); playSfx('click'); showToast('已恢復大廳預設設定'); });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && state.openModal) closeModal(); if (event.key === 'Tab' && state.openModal) trapFocus(event, state.openModal); });
  }

  function trapFocus(event, modal) {
    const focusable = $$('button:not([disabled]), a[href], input:not([disabled])', modal);
    if (!focusable.length) return;
    const first = focusable[0]; const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  function validCount(value) {
    return Number.isInteger(value) && value >= 0;
  }

  function normalizePresence(payload) {
    const counts = ['online', 'players', 'spectators', 'lobby', 'rooms'];
    if (!payload || counts.some((key) => !validCount(payload[key]))) throw new Error('在線人數格式不正確');
    return { status: 'ok', ...Object.fromEntries(counts.map((key) => [key, payload[key]])) };
  }

  async function fetchPresence(game) {
    if (!game.presenceUrl) {
      state.presence[game.id] = { status: 'unset' };
      return;
    }
    state.presence[game.id] = { status: 'checking' };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(game.presenceUrl, { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      state.presence[game.id] = normalizePresence(await response.json());
    } catch (error) {
      state.presence[game.id] = { status: 'error' };
      console.warn(`[presence] ${game.id} 無法取得在線人數`, error);
    } finally {
      clearTimeout(timer);
    }
  }

  async function refreshPresence() {
    if (!state.games.length) return;
    state.games.forEach((game) => { state.presence[game.id] = game.presenceUrl ? { status: 'checking' } : { status: 'unset' }; });
    renderGames();
    await Promise.all(state.games.map(fetchPresence));
    renderGames();
  }

  /**
   * 大廳的名字一律跟著設定檔的 title 走（index.html 裡那幾份只是設定檔還沒讀到前的備援）。
   *
   * 以前是四個地方各寫死一份「遊戲小小島」，改名要改四處；而且 <title> 上那句
   * 「六個可愛小遊戲」在上架第七款（小朋友下樓梯）之後就數錯了 —— 數量改成數出來的。
   * 說明文字同理：把遊戲名字一個個列在 HTML 裡，每次上架都會漏掉新的，直接從清單接。
   */
  function applyLobbyTitle(config) {
    const title = String(config.title || '').trim();
    if (!title) return;                          /* 設定檔沒寫就留 HTML 裡那一份 */
    const names = config.games.map((game) => game.title).filter(Boolean);
    document.title = `${title}｜${names.length} 個可愛小遊戲`;
    const brand = $('#brand-title');
    if (brand) brand.textContent = title;
    const brandLink = $('#brand-link');
    if (brandLink) brandLink.setAttribute('aria-label', `${title}首頁`);
    const footer = $('#footer-brand');
    if (footer) footer.textContent = title;
    const description = $('#page-description');
    if (description && names.length) {
      description.setAttribute('content', `${title}：${names.join('、')}的可愛遊戲大廳`);
    }
  }

  async function loadGames() {
    try {
      const response = await fetch('config/games.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const config = await response.json();
      if (!config || !Array.isArray(config.games)) throw new Error('設定檔格式不正確');
      state.games = config.games;
      applyLobbyTitle(config);
      renderGames();
      refreshPresence();
      setInterval(refreshPresence, 30000);
    } catch (error) {
      $('#games-grid').innerHTML = `<div class="empty-state"><div class="empty-art">!</div><h3>遊戲清單讀取失敗</h3><p>請確認伺服器正在執行，再重新整理頁面。</p><button class="button button-soft" type="button" id="retry-games">重新載入</button></div>`;
      $('#retry-games').addEventListener('click', loadGames);
      console.error(error);
    }
  }

  applyPreferences();
  setupEvents();
  loadGames();
})();
