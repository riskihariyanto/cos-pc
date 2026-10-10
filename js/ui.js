const INPUT_RUPIAH = ['fTotal'];
const NOMOR_BANTUAN = '6281383179209';

const GAYA_LANSIA = `
:root{--mut:#1a1a1a;--line:#8c99ab;--warn:#7a4b00}
body{font-size:18px;line-height:1.5}
header{position:static;padding:10px 14px}
header b{font-size:18px}
header small{font-size:14px;opacity:1}
header button{min-height:44px;padding:8px 16px;font-size:16px;font-weight:700;background:#fff;color:var(--acc);border:3px solid var(--acc)}
main{padding:12px 12px 130px}
.card{padding:18px;border:1px solid var(--line);border-radius:14px}
.card h2{font-size:23px}
.card h3{font-size:21px}
label{font-size:18px;font-weight:700;color:var(--ink);margin:18px 0 6px}
input,select,textarea{min-height:58px;padding:12px 14px;font-size:20px;border:2px solid #3d3d3d;border-radius:10px}
textarea{min-height:150px}
input[data-rupiah]{font-size:28px;font-weight:700;letter-spacing:.02em}
input:focus,select:focus,textarea:focus,button:focus-visible{outline:4px solid #1a1a1a;outline-offset:2px;box-shadow:0 0 0 7px #fdb913}
.btn{width:100%;min-height:60px;padding:14px 18px;margin-top:20px;font-size:20px;border-radius:12px}
.btn.alt{border-width:2px}
.btn.sm{width:auto;flex:1 1 44%;min-height:54px;margin:0;padding:12px 14px;font-size:18px}
.row .act .btn.prev{border-width:3px}
.row{padding:18px 0;gap:12px}
.row .info{min-width:100%}
.row .act{width:100%;gap:10px}
.peringatan{font-size:20px;padding:16px 18px}
.hint{font-size:16px;color:var(--mut)}
.badge{padding:4px 12px;font-size:15px}
.b-Lunas{background:#dcfce7;color:#14532d}
.b-Pending{background:#fdb913;color:#1a1a1a}
.b-Ditolak,.b-Menunggak{background:#fee2e2;color:#7f1d1d}
.b-Belum{background:#e5e7eb;color:#1f2937}
table{font-size:17px}
th,td{padding:14px 10px}
th{font-size:15px;font-weight:700;color:var(--ink);text-transform:none;letter-spacing:0}
.bar>div{min-width:100%}
#busy{font-size:22px;background:rgba(255,255,255,.88)}
#toast{bottom:32px;max-width:92%;padding:16px 20px;font-size:18px;background:#1a1a1a}
@media (min-width:720px){
  .btn{width:auto;padding:14px 28px}
  .row .info{min-width:220px}
  .row .act{width:auto}
  .bar>div{min-width:140px}
}
`;

const VIEWS = {
  catat: viewCatat,
  kuitansi: viewRiwayatKuitansi,
  pengaturan: viewPengaturan
};

const IKON_NAV = {
  catat: '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>',
  kuitansi: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
  pengaturan: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>'
};

const TABS_PC = [
  ['catat', 'Buat Kuitansi', 'Catat'],
  ['kuitansi', 'Riwayat Kuitansi', 'Riwayat'],
  ['pengaturan', 'Pengaturan', 'Pengaturan']
];

function showTab(t) {
  S.tab = t;
  render();
  window.scrollTo(0, 0);
}

function render() {
  if (!S.profile) return;
  $('loginView').hidden = true;
  $('appView').hidden = false;

  const tabs = TABS_PC;
  if (!tabs.some(t => t[0] === S.tab)) S.tab = tabs[0][0];

  $('who').textContent = S.pengaturan.namaPC || 'Pengurus Cabang';
  $('role').textContent = 'Dashboard PC';

  $('nav').innerHTML = tabs.map(t => {
    const aktif = t[0] === S.tab;
    return '<button class="' + (aktif ? 'on' : '') + '" aria-label="' + esc(t[1]) + '"' + (aktif ? ' aria-current="page"' : '') + ' onclick="showTab(\'' + t[0] + '\')">' +
      '<span class="nav-ikon"><svg viewBox="0 0 24 24" aria-hidden="true">' + IKON_NAV[t[0]] + '</svg></span>' +
      '<span class="nav-label">' + esc(t[2]) + '</span></button>';
  }).join('');

  const box = $('content');
  const keep = {};
  let focusId = null;
  if (S.lastTab === S.tab) {
    box.querySelectorAll('input,select,textarea').forEach(el => {
      if (el.id && el.type !== 'file') keep[el.id] = el.value;
    });
    const a = document.activeElement;
    if (a && a.id && box.contains(a)) focusId = a.id;
  }

  box.innerHTML = VIEWS[S.tab]();
  siapkanInputRupiah(box);

  Object.keys(keep).forEach(id => {
    const el = $(id);
    if (el) el.value = keep[id];
  });
  if (focusId && $(focusId)) {
    const el = $(focusId);
    el.focus();
    if (el.setSelectionRange && /text|search|tel|url|password/.test(el.type)) {
      try { el.setSelectionRange(el.value.length, el.value.length); } catch (x) {}
    }
  }
  S.lastTab = S.tab;
}

function pasangGayaLansia() {
  const el = document.createElement('style');
  el.textContent = GAYA_LANSIA;
  document.head.appendChild(el);
}

function formatInputRupiah(el) {
  const lama = el.value;
  const aktif = document.activeElement === el;
  const posisi = aktif && el.selectionStart != null ? el.selectionStart : lama.length;
  const sebelum = lama.slice(0, posisi).replace(/\D/g, '').length;
  const baru = ribuan(lama);
  if (baru === lama) return;
  el.value = baru;
  if (!aktif) return;
  let hitung = 0;
  let idx = 0;
  while (idx < baru.length && hitung < sebelum) {
    if (/\d/.test(baru[idx])) hitung++;
    idx++;
  }
  el.setSelectionRange(idx, idx);
}

function siapkanInputRupiah(root) {
  INPUT_RUPIAH.forEach(id => {
    const el = root.querySelector('#' + id);
    if (!el) return;
    el.type = 'text';
    el.inputMode = 'numeric';
    el.autocomplete = 'off';
    el.maxLength = 15;
    el.dataset.rupiah = '1';
    if (/^\d+$/.test(el.placeholder)) el.placeholder = ribuan(el.placeholder);
    el.value = ribuan(el.value);
  });
}

document.addEventListener('input', e => {
  const el = e.target;
  if (el && el.dataset && el.dataset.rupiah) formatInputRupiah(el);
});

pasangGayaLansia();

function pesanBantuan() {
  const baris = ['Halo, saya mengalami kendala pada aplikasi Kuitansi COS.', ''];
  if (S && S.profile) {
    baris.push('Pengguna: ' + ((S.pengaturan && S.pengaturan.namaPC) || 'Pengurus Cabang'));
    const tab = TABS_PC.filter(t => t[0] === S.tab)[0];
    if (tab) baris.push('Menu: ' + tab[1]);
  }
  baris.push('Kendala: ');
  return baris.join('\n');
}

function bukaBantuanWA(el) {
  el.href = 'https://wa.me/' + NOMOR_BANTUAN + '?text=' + encodeURIComponent(pesanBantuan());
  return true;
}
