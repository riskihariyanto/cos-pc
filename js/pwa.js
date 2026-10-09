let promptPasang = null;

function sudahTerpasang() {
  return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
}

function perangkatIOS() {
  const ua = navigator.userAgent || '';
  return /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
}

function pwaDitutup() {
  try {
    const t = +localStorage.getItem('pwaTutup') || 0;
    return Date.now() - t < 3 * 24 * 3600 * 1000;
  } catch (e) {
    return false;
  }
}

function pwaSimpanTutup() {
  try { localStorage.setItem('pwaTutup', String(Date.now())); } catch (e) {}
}

function pwaBuangBar() {
  const el = document.getElementById('pwaBar');
  if (el) el.remove();
}

function pwaTutupPanduan() {
  const el = document.getElementById('pwaPanduan');
  if (el) el.remove();
}

function pwaTampilBar(teks, aksi) {
  if (document.getElementById('pwaBar') || sudahTerpasang() || pwaDitutup()) return;
  const bar = document.createElement('div');
  bar.id = 'pwaBar';
  bar.className = 'pwa-bar';
  bar.innerHTML =
    '<div class="pwa-teks"><b>Pasang aplikasi</b><span>' + teks + '</span></div>' +
    '<div class="pwa-aksi"><button type="button" class="pwa-btn" id="pwaPasang">Pasang</button>' +
    '<button type="button" class="pwa-nanti" id="pwaNanti">Nanti</button></div>';
  document.body.appendChild(bar);
  document.getElementById('pwaPasang').onclick = aksi;
  document.getElementById('pwaNanti').onclick = () => {
    pwaSimpanTutup();
    pwaBuangBar();
  };
}

function pwaPanduanIOS() {
  pwaTutupPanduan();
  const el = document.createElement('div');
  el.id = 'pwaPanduan';
  el.className = 'pwa-overlay';
  el.innerHTML =
    '<div class="pwa-kotak" role="dialog" aria-modal="true" aria-label="Cara memasang di iPhone">' +
    '<h2>Pasang di iPhone</h2>' +
    '<ol>' +
    '<li>Buka aplikasi ini lewat <b>Safari</b>.</li>' +
    '<li>Ketuk tombol <b>Bagikan</b> (kotak dengan panah ke atas) di bagian bawah layar.</li>' +
    '<li>Gulir ke bawah, lalu pilih <b>Tambah ke Layar Utama</b>.</li>' +
    '<li>Ketuk <b>Tambah</b> di pojok kanan atas.</li>' +
    '</ol>' +
    '<p>Ikon <b>Kuitansi COS</b> akan muncul di layar utama dan terbuka seperti aplikasi biasa.</p>' +
    '<button type="button" class="pwa-btn" id="pwaPaham">Mengerti</button>' +
    '</div>';
  el.addEventListener('click', e => {
    if (e.target === el || e.target.id === 'pwaPaham') pwaTutupPanduan();
  });
  document.body.appendChild(el);
}

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  promptPasang = e;
  pwaTampilBar('Buka lebih cepat dari layar utama dan tetap bisa dibuka saat sinyal lemah.', () => {
    if (!promptPasang) return;
    const p = promptPasang;
    promptPasang = null;
    pwaBuangBar();
    p.prompt();
    p.userChoice.catch(() => {});
  });
});

window.addEventListener('appinstalled', () => {
  promptPasang = null;
  pwaBuangBar();
});

window.addEventListener('load', () => {
  if (perangkatIOS() && !sudahTerpasang()) {
    pwaTampilBar('Tambahkan ke layar utama iPhone agar terbuka seperti aplikasi.', pwaPanduanIOS);
  }
});
