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
const TABS_PUK = [['setor', 'Setor COS'], ['riwayat', 'Riwayat'], ['anggota', 'Anggota']];

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
