const INPUT_RUPIAH = ['fTotal', 'pTarif'];

const GAYA_LANSIA = `
:root{--mut:#333;--line:#8c99ab;--warn:#7a4b00}
body{font-size:18px;line-height:1.5}
header{position:static;padding:14px 16px}
header b{font-size:20px}
header small{font-size:16px;opacity:1}
header button{min-height:48px;padding:10px 18px;font-size:17px;font-weight:700;background:#fff;color:var(--pri)}
nav{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;overflow:visible;position:static;padding:12px}
nav button{min-height:54px;padding:10px 8px;font-size:18px;font-weight:700;border:2px solid var(--pri);border-radius:12px;color:var(--pri)}
nav button.on{background:var(--pri);color:#fff}
nav button:last-child:nth-child(odd){grid-column:1/-1}
main{padding:16px 12px 90px}
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
.row .act .btn.prev{flex:1 1 100%;min-height:60px;font-size:20px}
.row{padding:18px 0;gap:12px}
.row .info{min-width:100%}
.row .act{width:100%;gap:10px}
.grid{grid-template-columns:1fr;gap:12px}
.stat{padding:14px;border:1px solid var(--line)}
.stat span{font-size:17px;color:var(--ink)}
.stat b{font-size:26px}
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
  nav{grid-template-columns:repeat(auto-fit,minmax(150px,1fr))}
  nav button:last-child:nth-child(odd){grid-column:auto}
  .btn{width:auto;padding:14px 28px}
  .grid{grid-template-columns:repeat(auto-fit,minmax(200px,1fr))}
  .row .info{min-width:220px}
  .row .act{width:auto}
  .bar>div{min-width:140px}
}
`;

const VIEWS = {
  setor: viewSetor,
  riwayat: viewRiwayat,
  anggota: viewAnggota,
  rekap: viewRekap,
  verifikasi: viewVerifikasi,
  puk: viewPUK,
  laporan: viewLaporan,
  pengaturan: viewPengaturan
};

const TABS_PC = [['rekap', 'Rekap'], ['verifikasi', 'Verifikasi'], ['puk', 'Data PUK'], ['laporan', 'Laporan'], ['pengaturan', 'Pengaturan']];
const TABS_PUK = [['setor', 'Setor COS'], ['riwayat', 'Riwayat']];

function showTab(t) {
  S.tab = t;
  render();
  window.scrollTo(0, 0);
}

function render() {
  if (!S.profile) return;
  $('loginView').hidden = true;
  $('appView').hidden = false;

  const pc = isPC();
  const tabs = pc ? TABS_PC : TABS_PUK;
  if (!tabs.some(t => t[0] === S.tab)) S.tab = tabs[0][0];

  const pukSendiri = pc ? null : S.puk[S.profile.pukId];
  $('who').textContent = pc ? (S.pengaturan.namaPC || 'Pengurus Cabang') : (pukSendiri ? pukSendiri.namaPerusahaan : 'PUK');
  $('role').textContent = pc ? 'Dashboard PC' : 'Dashboard PUK';

  $('nav').innerHTML = tabs.map(t => '<button class="' + (t[0] === S.tab ? 'on' : '') + '" onclick="showTab(\'' + t[0] + '\')">' + t[1] + '</button>').join('');

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
