const S = {
  profile: null,
  puk: {},
  iuran: {},
  anggota: {},
  pengaturan: {},
  tab: '',
  lastTab: '',
  periode: null,
  tahunLap: new Date().getFullYear(),
  tmp: {},
  refs: []
};

const isPC = () => S.profile && S.profile.role === 'pc';

function resetData() {
  S.profile = null;
  S.puk = {};
  S.iuran = {};
  S.anggota = {};
  S.pengaturan = {};
}

function allIuran() {
  const out = [];
  Object.keys(S.iuran).forEach(pid => {
    const per = S.iuran[pid] || {};
    Object.keys(per).forEach(k => out.push(Object.assign({}, per[k], { pid, key: k })));
  });
  return out;
}

function sortedPUK() {
  return Object.keys(S.puk).sort((a, b) => (S.puk[a].namaPerusahaan || '').localeCompare(S.puk[b].namaPerusahaan || ''));
}

function detach() {
  S.refs.forEach(r => r.off());
  S.refs = [];
}

function listen(path, apply) {
  const r = db.ref(path);
  r.on('value', s => { apply(s.val()); render(); }, e => toast('Gagal memuat data: ' + pesan(e)));
  S.refs.push(r);
}

function attach() {
  listen('pengaturan', v => { S.pengaturan = v || {}; });
  if (isPC()) {
    listen('puk', v => { S.puk = v || {}; });
    listen('iuran', v => { S.iuran = v || {}; });
  } else {
    const pid = S.profile.pukId;
    listen('puk/' + pid, v => { S.puk = { [pid]: v || {} }; });
    listen('iuran/' + pid, v => { S.iuran = { [pid]: v || {} }; });
    listen('anggota/' + pid, v => { S.anggota = v || {}; });
  }
}
