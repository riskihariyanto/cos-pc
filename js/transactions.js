const KUNCI_CACHE_KAS = 'cos_kas_cache';
const KUNCI_ANTRIAN_KAS = 'cos_kas_antrian';
const BATAS_KARTU_KAS = 100;

let kasList = [];
let kasIds = {};
let subCatat = 'kuitansi';
let subRiwayat = 'kuitansi';
let draftKas = { jenis: 'masuk', tgl: '', nominal: '', ket: '' };
let kasTerakhir = null;
let sedangSinkron = false;
let pengenalSuara = null;

const IKON_MIK = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><line x1="12" y1="18" x2="12" y2="21"/></svg>';

function bacaJson(kunci, cadangan) {
  try {
    const mentah = localStorage.getItem(kunci);
    return mentah ? JSON.parse(mentah) : cadangan;
  } catch (e) {
    return cadangan;
  }
}

function simpanJson(kunci, nilai) {
  try {
    localStorage.setItem(kunci, JSON.stringify(nilai));
  } catch (e) {}
}

function antrianKas() {
  const daftar = bacaJson(KUNCI_ANTRIAN_KAS, []);
  return Array.isArray(daftar) ? daftar : [];
}

function hapusAntrian(id) {
  simpanJson(KUNCI_ANTRIAN_KAS, antrianKas().filter(x => x.id !== id));
}

function selisihKas(x) {
  const n = Number(x.nominal) || 0;
  return x.jenis === 'keluar' ? -n : n;
}

function urutKas(a, b) {
  return String(b.tgl || '').localeCompare(String(a.tgl || '')) || (b.dibuat || 0) - (a.dibuat || 0);
}

function antrianBelumMasuk() {
  return antrianKas().filter(x => !kasIds[x.id]);
}

function hitungTotal() {
  return entriLaporan().reduce((t, x) => t + x.masuk - x.keluar, 0);
}

function muatCacheKas() {
  const c = bacaJson(KUNCI_CACHE_KAS, {});
  kasList = Array.isArray(c.log) ? c.log : [];
}

function terapkanKas(v) {
  const data = v || {};
  const arr = Object.keys(data).map(k => Object.assign({}, data[k], { id: k }));
  kasIds = {};
  arr.forEach(x => { kasIds[x.id] = 1; });
  kasList = arr.sort(urutKas);
  simpanJson(KUNCI_CACHE_KAS, { log: kasList });
  const sisa = antrianKas().filter(x => !kasIds[x.id]);
  if (sisa.length !== antrianKas().length) simpanJson(KUNCI_ANTRIAN_KAS, sisa);
}

function daftarKasGabungan() {
  const menunggu = antrianBelumMasuk().map(x => Object.assign({}, x, { menunggu: true }));
  return menunggu.concat(kasList).sort(urutKas);
}

function hariIniLokal() {
  return new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function muatanKas(x) {
  return { tgl: x.tgl, jenis: x.jenis, nominal: x.nominal, ket: x.ket, oleh: x.oleh, dibuat: x.dibuat };
}

function sinkronKas() {
  if (sedangSinkron || !navigator.onLine || typeof db === 'undefined' || !S.profile) return Promise.resolve();
  const daftar = antrianKas();
  if (!daftar.length) return Promise.resolve();
  sedangSinkron = true;
  let terkirim = 0;
  let ditolak = 0;
  let rantai = Promise.resolve();
  daftar.forEach(x => {
    rantai = rantai.then(() => db.ref('kas/' + x.id).set(muatanKas(x)).then(() => {
      terkirim++;
      hapusAntrian(x.id);
    }).catch(e => {
      if (/PERMISSION_DENIED/.test((e && e.message) || '')) ditolak++;
    }));
  });
  return rantai.then(() => {
    sedangSinkron = false;
    render();
    if (ditolak) toast('Belum bisa disimpan: aturan database belum mengizinkan kas. Data tetap aman di HP.');
    else if (terkirim && kasTerakhir) {
      const k = kasTerakhir;
      kasTerakhir = null;
      animasiSukses({
        judul: 'Transaksi Tersimpan',
        nominal: k.nominal,
        jenis: k.jenis,
        detail: (k.jenis === 'keluar' ? 'Kas Keluar' : 'Kas Masuk') + ' · ' + k.ket
      });
    } else if (terkirim) toast(terkirim === 1 ? 'Transaksi kas tersimpan' : terkirim + ' transaksi kas tersinkron');
    if (terkirim && antrianKas().length) return sinkronKas();
  });
}

function simpanDraftKas() {
  const n = $('kNominal');
  const k = $('kKet');
  const t = $('kTgl');
  if (t) draftKas.tgl = t.value;
  if (n) draftKas.nominal = n.value;
  if (k) draftKas.ket = k.value;
}

function hentikanSuara() {
  if (pengenalSuara) {
    try { pengenalSuara.abort(); } catch (e) {}
    pengenalSuara = null;
  }
}

function pilihSubCatat(k) {
  simpanDraftKas();
  hentikanSuara();
  subCatat = k;
  render();
}

function pilihJenisKas(j) {
  simpanDraftKas();
  hentikanSuara();
  draftKas.jenis = j === 'keluar' ? 'keluar' : 'masuk';
  render();
}

function pilihSubRiwayat(k) {
  hentikanSuara();
  subRiwayat = k;
  render();
}

function simpanKas() {
  simpanDraftKas();
  const jenis = draftKas.jenis === 'keluar' ? 'keluar' : 'masuk';
  const nominal = angka(($('kNominal') || {}).value);
  const ket = (($('kKet') || {}).value || '').trim();
  if (!nominal) {
    toast('Nominal belum diisi');
    if ($('kNominal')) $('kNominal').focus();
    return;
  }
  if (!ket) {
    toast('Keterangan belum diisi');
    if ($('kKet')) $('kKet').focus();
    return;
  }
  const hariIni = hariIniLokal();
  const tgl = /^\d{4}-\d{2}-\d{2}$/.test(draftKas.tgl) ? draftKas.tgl : hariIni;
  if (tgl > hariIni) {
    toast('Tanggal tidak boleh melewati hari ini');
    if ($('kTgl')) $('kTgl').focus();
    return;
  }
  hentikanSuara();
  const item = {
    id: db.ref('kas').push().key,
    tgl,
    jenis,
    nominal,
    ket,
    oleh: (S.profile && S.profile.nama) || S.pengaturan.namaPC || 'Admin PC',
    dibuat: Date.now()
  };
  simpanJson(KUNCI_ANTRIAN_KAS, antrianKas().concat([item]));
  draftKas = { jenis, tgl: '', nominal: '', ket: '' };
  kasTerakhir = { jenis, nominal, ket };
  S.lastTab = null;
  render();
  if (!navigator.onLine) {
    toast('Offline · transaksi disimpan di HP dan disinkron otomatis');
    return;
  }
  sinkronKas();
}

function setTombolMik(aktif) {
  const b = $('kMik');
  if (!b) return;
  b.classList.toggle('rekam', aktif);
  b.setAttribute('aria-pressed', aktif ? 'true' : 'false');
}

function pesanSuara(kode) {
  if (kode === 'not-allowed' || kode === 'service-not-allowed') return 'Izin mikrofon ditolak. Aktifkan izin mikrofon untuk Chrome.';
  if (kode === 'no-speech') return 'Suara tidak terdengar, coba lagi.';
  if (kode === 'audio-capture') return 'Mikrofon tidak ditemukan.';
  if (kode === 'network') return 'Pengenalan suara butuh koneksi internet.';
  return 'Pengenalan suara gagal, coba lagi.';
}

function toggleSuara() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    toast('Input suara tidak didukung di browser ini. Gunakan Google Chrome.');
    return;
  }
  if (pengenalSuara) {
    pengenalSuara.stop();
    return;
  }
  const kolom = $('kKet');
  if (!kolom) return;
  const dasar = kolom.value.trim();
  const p = new SR();
  p.lang = 'id-ID';
  p.interimResults = true;
  p.continuous = false;
  p.maxAlternatives = 1;
  p.onstart = () => setTombolMik(true);
  p.onresult = e => {
    let teks = '';
    for (let i = 0; i < e.results.length; i++) teks += e.results[i][0].transcript;
    teks = teks.trim();
    if (!dasar) teks = teks.charAt(0).toUpperCase() + teks.slice(1);
    const el = $('kKet');
    if (el) {
      el.value = dasar ? dasar + ' ' + teks : teks;
      draftKas.ket = el.value;
    }
  };
  p.onerror = e => toast(pesanSuara(e && e.error));
  p.onend = () => {
    pengenalSuara = null;
    setTombolMik(false);
  };
  pengenalSuara = p;
  try {
    p.start();
  } catch (e) {
    pengenalSuara = null;
    toast('Mikrofon tidak bisa dimulai.');
  }
}

function sakelarSub(aktif, fungsi, pilihan) {
  return '<div class="sub-tab" role="tablist">' + pilihan.map(p =>
    '<button type="button" role="tab" class="' + (p[0] === aktif ? 'on' : '') + '" aria-selected="' + (p[0] === aktif) + '" onclick="' + fungsi + '(\'' + p[0] + '\')">' + esc(p[1]) + '</button>'
  ).join('') + '</div>';
}

function kartuSaldo() {
  const menunggu = antrianBelumMasuk().length;
  const saldo = hitungTotal();
  return '<section class="kas-saldo' + (saldo < 0 ? ' minus' : '') + '">' +
    '<span class="kas-saldo-label">Sisa Saldo Kas Digital PC</span>' +
    '<b class="kas-saldo-nilai">' + esc(rp(saldo)) + '</b>' +
    (menunggu ? '<small class="kas-saldo-info">' + menunggu + ' transaksi menunggu sinkron</small>' : '') +
    '</section>';
}

function viewKasForm() {
  return '<section class="card kas-form"><h2>Catat Kas Digital</h2>' +
    '<label>Jenis Transaksi</label>' +
    '<div class="kas-jenis" role="group" aria-label="Jenis Transaksi">' +
    '<button type="button" class="keluar' + (draftKas.jenis === 'keluar' ? ' on' : '') + '" aria-pressed="' + (draftKas.jenis === 'keluar') + '" onclick="pilihJenisKas(\'keluar\')">Kas Keluar</button>' +
    '<button type="button" class="masuk' + (draftKas.jenis !== 'keluar' ? ' on' : '') + '" aria-pressed="' + (draftKas.jenis !== 'keluar') + '" onclick="pilihJenisKas(\'masuk\')">Kas Masuk</button></div>' +
    '<label for="kTgl">Tanggal transaksi</label>' +
    '<input id="kTgl" type="date" max="' + hariIniLokal() + '" value="' + esc(draftKas.tgl || hariIniLokal()) + '">' +
    '<label for="kNominal">Nominal (Rp)</label>' +
    '<input id="kNominal" placeholder="0" value="' + esc(draftKas.nominal) + '">' +
    '<label for="kKet">Keterangan</label>' +
    '<div class="kas-ket"><input id="kKet" type="text" maxlength="120" autocomplete="off" placeholder="Contoh: Konsumsi Rapat" value="' + esc(draftKas.ket) + '">' +
    '<button type="button" id="kMik" class="kas-mik" onclick="toggleSuara()" aria-label="Isi keterangan dengan suara" aria-pressed="false">' + IKON_MIK + '</button></div>' +
    '<button class="btn" onclick="simpanKas()">Simpan Transaksi</button></section>';
}

function barisRiwayatKas() {
  const antre = {};
  antrianBelumMasuk().forEach(x => { antre[x.tgl + '|' + (x.ket || '-') + '|' + (Number(x.dibuat) || 0)] = true; });
  return entriLaporan().reverse().map(x => Object.assign({}, x, {
    menunggu: !!antre[x.tgl + '|' + x.ket + '|' + x.urut]
  }));
}

const GAYA_DAFTAR_KAS = `
.sub-tab button{padding:8px 4px;font-size:13.5px;white-space:nowrap}
.kas-judul{margin:0 0 2px}
.kas-sub{margin:0 0 6px;font-size:14px}
.riw-daftar{margin:0;padding:0;list-style:none}
.riw-baris{display:flex;align-items:center;gap:14px;padding:14px 0;border-bottom:1px solid #e8edf3}
.riw-baris:last-child{border-bottom:0}
.riw-ikon{display:flex;align-items:center;justify-content:center;flex:none;width:48px;height:48px;background:#f3f6fb;border-radius:14px}
.riw-ikon svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}
.riw-isi{flex:1;min-width:0}
.riw-tgl{display:block;font-size:13px;font-weight:500;line-height:1.3;color:#94a3b8}
.riw-ket{display:block;margin-top:2px;font-size:16.5px;font-weight:600;line-height:1.3;color:#142b45;overflow-wrap:anywhere}
.riw-isi .kas-tunggu{margin-top:4px}
.riw-nilai{flex:none;max-width:42%;font-size:16px;font-weight:700;line-height:1.3;text-align:right;font-variant-numeric:tabular-nums}
.kas-catatan{margin:14px 0 0;font-size:13px;color:#64748b;text-align:center}
`;

const IKON_PANAH_MASUK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>';
const IKON_PANAH_KELUAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14"/><path d="M19 12l-7 7-7-7"/></svg>';

function pasangGayaDaftarKas() {
  const el = document.createElement('style');
  el.textContent = GAYA_DAFTAR_KAS;
  document.head.appendChild(el);
}

function barisKas(x) {
  const masuk = !x.keluar;
  const warna = masuk ? 'kas-masuk' : 'kas-keluar';
  return '<li class="riw-baris">' +
    '<span class="riw-ikon ' + warna + '" role="img" aria-label="' + (masuk ? 'Kas masuk' : 'Kas keluar') + '">' + (masuk ? IKON_PANAH_MASUK : IKON_PANAH_KELUAR) + '</span>' +
    '<div class="riw-isi"><span class="riw-tgl">' + esc(fmtTgl(x.tgl)) + '</span>' +
    '<span class="riw-ket">' + esc(x.ket) + '</span>' +
    (x.menunggu ? '<span class="kas-tunggu">menunggu sinkron</span>' : '') + '</div>' +
    '<div class="riw-nilai ' + warna + '">' + esc(rp(masuk ? x.masuk : x.keluar)) + '</div></li>';
}

function viewKasRiwayat() {
  const baris = barisRiwayatKas();
  if (!baris.length) {
    return '<section class="card"><h2 class="kas-judul">Riwayat Kas Digital</h2><p class="kas-kosong">Belum ada transaksi kas.</p></section>';
  }
  const tampil = baris.slice(0, BATAS_KARTU_KAS);
  return '<section class="card"><h2 class="kas-judul">Riwayat Kas Digital</h2>' +
    '<p class="hint kas-sub">Iuran dan kas, terbaru di atas.</p>' +
    '<ul class="riw-daftar">' + tampil.map(barisKas).join('') + '</ul>' +
    (baris.length > BATAS_KARTU_KAS ? '<p class="kas-catatan">Menampilkan ' + BATAS_KARTU_KAS + ' transaksi terbaru.</p>' : '') +
    '</section>';
}

const viewDasborAsli = VIEWS.dasbor;
const viewCatatAsli = VIEWS.catat;
const viewRiwayatAsli = VIEWS.kuitansi;

VIEWS.dasbor = () => kartuSaldo() + viewDasborAsli();

VIEWS.catat = () => sakelarSub(subCatat, 'pilihSubCatat', [['kuitansi', 'Kuitansi Iuran'], ['kas', 'Kas Masuk/Keluar']]) +
  (subCatat === 'kas' ? viewKasForm() : viewCatatAsli());

function isiSubRiwayat() {
  if (subRiwayat === 'kas') return viewKasRiwayat();
  if (subRiwayat === 'laporan') return '';
  return viewRiwayatAsli();
}

VIEWS.kuitansi = () => sakelarSub(subRiwayat, 'pilihSubRiwayat', [['kuitansi', 'Kuitansi Iuran'], ['kas', 'Riwayat Kas'], ['laporan', 'Laporan']]) +
  isiSubRiwayat();

INPUT_RUPIAH.push('kNominal');

const attachAsli = attach;

attach = function () {
  attachAsli();
  listen('kas', v => { terapkanKas(v); });
  sinkronKas();
};

const resetDataAsli = resetData;

resetData = function () {
  resetDataAsli();
  hentikanSuara();
  kasIds = {};
  muatCacheKas();
};

window.addEventListener('online', sinkronKas);

muatCacheKas();

pasangGayaDaftarKas();
