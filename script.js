const ALL_URL  = 'https://vpn.akres.fun/all';
const JSON_URL = 'main.json';

const ICONS = {
  copy:  `<svg viewBox="0 0 24 24"><path d="M16 1H4C2.9 1 2 1.9 2 3v14h2V3h12V1zm3 4H8C6.9 5 6 5.9 6 7v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`,
  check: `<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>`,
  clock: `<svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm.01 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/></svg>`,
};

let clashMode = false;

function toggleClash() {
  clashMode = !clashMode;
  document.body.classList.toggle('clash-mode', clashMode);
  const btn = document.getElementById('clash-toggle');
  btn.textContent = clashMode ? '✓ Clash режим включён' : 'У меня Clash клиент';
  btn.blur();
}

function getUrl(url) {
  return clashMode ? url + '.yaml' : url;
}

async function copyAllConfigs() {
  const btn = document.querySelector('.btn-all');
  const orig = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `${ICONS.check} Скопировано!`;
  btn.classList.add('copied');
  try {
    await navigator.clipboard.writeText(getUrl(ALL_URL));
    showToast(clashMode ? 'Clash-ссылка скопирована!' : 'Ссылка на все конфиги скопирована!');
  } catch {
    showToast('Ошибка копирования');
  }
  setTimeout(() => {
    btn.innerHTML = orig;
    btn.classList.remove('copied');
    btn.disabled = false;
  }, 2000);
}

async function loadData() {
  try {
    const resp = await fetch(JSON_URL);
    if (!resp.ok) throw new Error();
    const data = await resp.json();
    document.getElementById('loading').style.display = 'none';
    document.getElementById('main-content').style.display = 'block';
    renderStats(data);
    renderProtocols(data);
    renderCountries(data);
  } catch {
    document.getElementById('loading').innerHTML =
      `<div style="color:#f87171;font-size:.85rem;text-align:center">
        Не удалось загрузить данные.<br>
        Убедитесь, что <strong>main.json</strong> лежит рядом с index.html.
      </div>`;
  }
}

function renderStats(data) {
  document.getElementById('stats-bar').innerHTML = `
    <button class="clash-toggle" id="clash-toggle" onclick="toggleClash()">У меня Clash клиент</button>
    <div class="stat-chip"><span class="dot"></span>Конфигов:&nbsp;<strong>${data.total}</strong></div>
    <div class="update-badge">${ICONS.clock}&nbsp;Последнее обновление:&nbsp;<strong>${data.updated_at}</strong></div>
  `;
}

function renderProtocols(data) {
  const container = document.getElementById('protocols-panel');
  let html = '';

  for (const [protoName, proto] of Object.entries(data.protocols)) {
    let subHtml = '';

    if (proto.security) {
      subHtml += `<div><div class="proto-sub-title">Шифрование</div><div class="sub-chips">`;
      for (const [name, sec] of Object.entries(proto.security))
        subHtml += chip(name, sec.count, sec.file);
      subHtml += `</div></div>`;
    }
    if (proto.encryption) {
      subHtml += `<div><div class="proto-sub-title">Шифрование</div><div class="sub-chips">`;
      for (const [name, enc] of Object.entries(proto.encryption))
        subHtml += chip(name, enc.count, enc.file);
      subHtml += `</div></div>`;
    }
    if (proto.transports) {
      subHtml += `<div><div class="proto-sub-title">Транспорт</div><div class="sub-chips">`;
      for (const [name, tr] of Object.entries(proto.transports))
        subHtml += chip(name, tr.count, tr.file);
      subHtml += `</div></div>`;
    }

    const hasBody = subHtml.length > 0;
    html += `
      <div class="proto-card fade-up">
        <div class="proto-header${hasBody ? '' : ' proto-header--simple'}">
          <div class="proto-name">${protoName}</div>
          <div class="proto-header-right">
            <span class="proto-count-badge">${proto.count} конфигов</span>
            <button class="proto-copy-all" data-url="${proto.file}" onclick="copyUrl(this)">
              ${ICONS.copy} Все ${protoName}
            </button>
          </div>
        </div>
        ${hasBody ? `<div class="proto-body">${subHtml}</div>` : ''}
      </div>`;
  }
  container.innerHTML = html;
}

function chip(name, count, file) {
  return `<button class="sub-chip" data-url="${file}" onclick="copyUrl(this)">
    ${ICONS.copy}<span>${name}</span><span class="chip-count">${count}</span>
  </button>`;
}

let _countriesData = null;
let _countrySort = 'count';

function setCountrySort(sort, btn) {
  _countrySort = sort;
  document.querySelectorAll('.country-sort-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (_countriesData) renderCountriesInner(_countriesData);
}

function renderCountries(data) {
  _countriesData = data;
  renderCountriesInner(data);
}

function renderCountriesInner(data) {
  const container = document.getElementById('countries-list-inner');
  let entries = Object.entries(data.countries);

  if (_countrySort === 'count') {
    entries.sort((a, b) => b[1].count - a[1].count);
  } else {
    entries.sort((a, b) => a[1].name.localeCompare(b[1].name, 'ru'));
  }

  let html = '<div class="countries-list">';
  for (const [, c] of entries) {
    html += `
      <div class="country-row fade-up">
        <span class="country-flag">${c.flag}</span>
        <div class="country-info">
          <div class="country-name">${c.name}</div>
          <div class="country-count">${c.count} конфигов</div>
        </div>
        <button class="country-copy" data-url="${c.file}" onclick="copyUrl(this)">
          ${ICONS.copy} Скопировать
        </button>
      </div>`;
  }
  container.innerHTML = html + '</div>';
}

async function copyUrl(btn) {
  const url = getUrl(btn.dataset.url);
  const orig = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = btn.innerHTML.replace(ICONS.copy, ICONS.check);
  btn.classList.add('copied');
  try {
    await navigator.clipboard.writeText(url);
    showToast(clashMode ? 'Clash-ссылка скопирована!' : 'Ссылка скопирована!');
  } catch {
    showToast('Ошибка копирования');
  }
  setTimeout(() => {
    btn.innerHTML = orig;
    btn.classList.remove('copied');
    btn.disabled = false;
  }, 1800);
}

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelector(`.tab-btn[data-tab="${tab}"]`).classList.add('active');
  document.getElementById(tab + '-panel').classList.add('active');
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), 2200);
}

loadData();