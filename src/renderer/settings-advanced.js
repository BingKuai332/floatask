'use strict';
(function () {
  const api = window.floatask;
  const t = (key, params) => window.FloatAskI18n.t(key, params);
  const tasks = ['initial','followup','vision'];
  const container = document.getElementById('modelProfiles');
  const hotkey = document.getElementById('hotkey');
  const record = document.getElementById('recordHotkeyBtn');
  let settings, getDraft, recording = false, previous = '', timer, updateState;
  const field = (task, name) => document.getElementById(`profile-${task}-${name}`);
  function renderProfiles() {
    for (const task of tasks) {
      const box = document.createElement('div'); box.className = 'model-profile'; box.dataset.task = task;
      box.innerHTML = `<h3 data-i18n="models.${task}"></h3>
        <label class="check-line"><input id="profile-${task}-enabled" type="checkbox"><span data-i18n="models.enable"></span></label>
        <div id="profile-${task}-fields" hidden>
          ${task === 'vision' ? '<p class="note" data-i18n="models.visionNote"></p>' : ''}
          <label class="check-line"><input id="profile-${task}-customService" type="checkbox"><span data-i18n="models.custom"></span></label>
          <p id="profile-${task}-inherit" class="note" data-i18n="models.inherit"></p>
          <div id="profile-${task}-service" hidden>
            <div class="form-grid">
              <label class="field"><span class="field-label">Provider</span><select id="profile-${task}-provider"></select></label>
              <label class="field"><span class="field-label">Base URL</span><input id="profile-${task}-baseUrl" type="url" spellcheck="false"></label>
              <label class="field"><span class="field-label">API Key</span><input id="profile-${task}-apiKey" type="password" autocomplete="off" spellcheck="false"></label>
            </div>
            <label class="check-line"><input id="profile-${task}-clearApiKey" type="checkbox"><span data-i18n="settings.clearKey"></span></label>
            <p class="note" data-i18n="models.keyNote"></p>
          </div>
          <div class="form-grid">
            <label class="field"><span class="field-label" data-i18n="settings.modelNameLabel"></span><input id="profile-${task}-model" type="text" spellcheck="false"></label>
            <label class="field"><span class="field-label" data-i18n="models.temperature"></span><input id="profile-${task}-temperature" type="number" min="0" max="2" step="0.1"></label>
            <label class="field"><span class="field-label" data-i18n="models.tokens"></span><input id="profile-${task}-maxTokens" type="number" min="64" max="32768" step="1"></label>
          </div>
          <label class="check-line" ${task === 'vision' ? 'hidden' : ''}><input id="profile-${task}-vision" type="checkbox"><span data-i18n="models.images"></span></label>
          <button id="profile-${task}-test" class="btn" type="button" data-i18n="settings.testBtn"></button>
          <span id="profile-${task}-result" class="profile-result" role="status"></span>
        </div>`;
      container.append(box);
      const profile = settings.modelProfiles?.[task] || {};
      for (const key of ['enabled','customService','vision']) field(task,key).checked = key === 'vision' ? profile.vision !== false : Boolean(profile[key]);
      for (const preset of settings.presets) {
        const option = document.createElement('option'); option.value = preset.id;
        if (preset.id === 'custom') option.dataset.i18n = 'settings.customHost';
        option.textContent = preset.id === 'custom' ? t('settings.customHost') : preset.id === 'ollama' ? 'Ollama' : preset.label;
        field(task,'provider').append(option);
      }
      for (const key of ['provider','baseUrl','model','temperature','maxTokens']) field(task,key).value = profile[key] ?? ({provider:'custom',baseUrl:'',model:'',temperature:0.4,maxTokens:1200})[key];
      field(task,'provider').value ||= 'custom';
      field(task,'apiKey').placeholder = profile.hasApiKey ? t('settings.keyPlaceholderSaved') : 'sk-…';
      field(task,'enabled').addEventListener('change', () => toggle(task));
      field(task,'customService').addEventListener('change', () => toggle(task));
      field(task,'provider').addEventListener('change', () => {
        const preset = settings.presets.find(p => p.id === field(task,'provider').value);
        if (preset && preset.id !== 'custom') { field(task,'baseUrl').value = preset.baseUrl; field(task,'model').value = preset.model; }
      });
      field(task,'test').addEventListener('click', async () => {
        const button = field(task,'test'), output = field(task,'result'); button.disabled = true; output.textContent = t('settings.testConnecting');
        try {
          const result = await api.testModelProfile(task,getDraft());
          output.textContent = result.ok ? t('settings.testOk',{ms:result.latencyMs,model:result.model ? ' · '+result.model : ''}) : [result.message,result.hint].filter(Boolean).join(' · ');
        } catch (error) { output.textContent = error.message; } finally { button.disabled = false; }
      });
      toggle(task);
    }
  }
  function toggle(task) {
    field(task,'fields').hidden = !field(task,'enabled').checked;
    field(task,'service').hidden = !field(task,'customService').checked;
    field(task,'inherit').hidden = field(task,'customService').checked;
  }
  function collect() {
    if (!settings) return {};
    const profiles = {};
    for (const task of tasks) {
      const profile = {};
      for (const name of ['enabled','customService','vision','clearApiKey']) profile[name] = field(task,name).checked;
      for (const name of ['provider','baseUrl','model','apiKey']) profile[name] = field(task,name).value.trim();
      for (const name of ['temperature','maxTokens']) profile[name] = Number(field(task,name).value);
      profiles[task] = profile;
    }
    return { modelProfiles: profiles, autoCheckUpdates: document.getElementById('autoCheckUpdates').checked };
  }
  function validate(draft) {
    if (!window.FloatAskHotkeys.normalizeHotkey(draft.hotkey)) return { message:t('hotkey.invalid'), focus:hotkey };
    for (const task of tasks) {
      const p = draft.modelProfiles?.[task]; if (!p?.enabled) continue;
      if (!Number.isFinite(p.temperature) || p.temperature < 0 || p.temperature > 2 || !Number.isInteger(p.maxTokens) || p.maxTokens < 64 || p.maxTokens > 32768) return {message:t('models.invalid'),focus:field(task,'temperature')};
      if (!p.model && p.customService) return {message:t('settings.validateModel'),focus:field(task,'model')};
      if (p.customService) {
        if (!/^https?:\/\//i.test(p.baseUrl)) return {message:t('settings.validateBaseUrl'),focus:field(task,'baseUrl')};
        const local=/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/|$)/i.test(p.baseUrl);
        if (!local && !p.apiKey && !(settings.modelProfiles?.[task]?.hasApiKey && !p.clearApiKey)) return {message:t('settings.validateKey'),focus:field(task,'apiKey')};
      }
    }
    return null;
  }
  async function finishRecording(cancel) {
    if (!recording) return;
    recording = false; clearTimeout(timer); if (cancel) hotkey.value = previous;
    hotkey.classList.remove('recording'); record.textContent = t('hotkey.record');
    await api.setHotkeyRecording(false);
  }
  record.addEventListener('click', async () => {
    if (recording) return finishRecording(true);
    await api.setHotkeyRecording(true); previous = hotkey.value; recording = true;
    hotkey.classList.add('recording'); record.textContent = t('hotkey.listening'); hotkey.focus();
    timer = setTimeout(() => finishRecording(true),30000);
  });
  document.addEventListener('keydown', event => {
    if (!recording) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (event.key === 'Escape') { finishRecording(true); return; }
    const value = window.FloatAskHotkeys.fromKeyboard(event);
    if (value) { hotkey.value = value; finishRecording(false); }
  },true);
  window.addEventListener('blur', () => finishRecording(true));
  document.getElementById('resetHotkeyBtn').onclick = async () => { await finishRecording(true); hotkey.value = 'Alt+Q'; };
  function showUpdate(state) {
    if (!state) return;
    updateState = state;
    const busy = ['checking','downloading','installing'].includes(state.phase);
    document.getElementById('checkUpdatesBtn').disabled = busy;
    document.getElementById('downloadUpdateBtn').hidden = !state.canInstall || !state.available || !['available','error'].includes(state.phase);
    document.getElementById('installUpdateBtn').hidden = state.phase !== 'ready';
    document.getElementById('updateDevNote').hidden = state.canInstall;
    document.getElementById('updateStatus').textContent = t('update.'+state.phase,{version:state.available?.version,n:state.progress,error:t(state.error || 'update.failed')});
  }
  for (const [id,method] of [['checkUpdatesBtn','checkUpdates'],['downloadUpdateBtn','downloadUpdate']]) document.getElementById(id).onclick = async () => {
    try { showUpdate(await api[method]()); } catch { showUpdate({...updateState,phase:'error',error:'update.failed'}); }
  };
  document.getElementById('installUpdateBtn').onclick = async () => {
    document.getElementById('installUpdateBtn').disabled = true;
    try { await api.installUpdate(); showUpdate(await api.getUpdateState()); } finally { document.getElementById('installUpdateBtn').disabled = false; }
  };
  api.onUpdateState(showUpdate);
  document.addEventListener('floatask:language', () => {
    if (updateState) showUpdate(updateState);
    if (recording) record.textContent = t('hotkey.listening');
    if (settings) for (const task of tasks) field(task,'apiKey').placeholder = settings.modelProfiles?.[task]?.hasApiKey ? t('settings.keyPlaceholderSaved') : 'sk-…';
  });
  window.FloatAskAdvanced = { collect, validate, get recording() { return recording; },
    populate(value,draft) {
      settings = value; getDraft = draft; container.replaceChildren(); renderProfiles();
      document.getElementById('autoCheckUpdates').checked = settings.autoCheckUpdates !== false;
      window.FloatAskI18n.apply(); api.getUpdateState().then(showUpdate);
    }
  };
})();
