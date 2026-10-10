const PUK_AWAL = ['TES 1 Cikupa', 'TES 2 HF Jayanti', 'MAYORA Jayanti 1', 'MAYORA Jayanti 2', 'DSC Jayanti 3'];

const normNama = s => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();

const bersihNamaPUK = s => String(s || '').replace(/\s+/g, ' ').trim().replace(/^puk\s+/i, '').trim();

function nomorTerbit(i) {
  return !!(i && i.nomorKuitansi && i.nomorKuitansi !== '-');
}

function periodeKunci(i) {
  return !!(i && i.status === 'Lunas' && nomorTerbit(i));
}

function labelMetode(m) {
  return m === 'Tunai' ? 'Cash' : m === 'Transfer' ? 'Transfer' : '';
}

function pesanAdmin() {
  return 'Kuitansi untuk PUK dan bulan ini sudah diterbitkan';
}

function cariPUK(nama) {
  const n = normNama(bersihNamaPUK(nama));
  if (!n) return '';
  return Object.keys(S.puk).filter(pid => normNama(S.puk[pid].namaPerusahaan) === n)[0] || '';
}

async function klaimPeriode(pid, key, data) {
  const res = await db.ref('iuran/' + pid + '/' + key).transaction(cur => {
    if (periodeKunci(cur)) return;
    return data;
  });
  return res.committed;
}

async function nextNomor(namaPT, bulan, tahun) {
  const res = await db.ref('counter/' + tahun).transaction(v => (v || 0) + 1);
  if (!res.committed) throw new Error('Nomor kuitansi gagal dibuat');
  const seq = String(res.snapshot.val()).padStart(3, '0');
  const slug = String(namaPT || '').replace(/[^A-Za-z0-9]+/g, '');
  return seq + '/COS/PUK-' + slug + '/' + ROMAWI[bulan - 1] + '/' + tahun;
}

function periodeCatat() {
  const now = new Date();
  return {
    b: S.tmp.catatBulan || now.getMonth() + 1,
    t: S.tmp.catatTahun || now.getFullYear()
  };
}

function ubahPeriodeCatat() {
  S.tmp.catatBulan = +$('fBulan').value || undefined;
  S.tmp.catatTahun = +$('fTahun').value || undefined;
  render();
}

function daftarPilihanPUK() {
  const out = [];
  const terpakai = {};
  PUK_AWAL.forEach(n => {
    const pid = cariPUK(n);
    if (pid) terpakai[pid] = true;
    out.push({ nilai: pid || 'awal:' + n, nama: pid ? S.puk[pid].namaPerusahaan : n });
  });
  sortedPUK().forEach(pid => {
    if (!terpakai[pid] && jumlahKuitansiPUK(pid) > 0) out.push({ nilai: pid, nama: S.puk[pid].namaPerusahaan });
  });
  return out;
}

function ubahPUKCatat() {
  const pil = $('fPukPilih').value;
  if (pil === '__baru') {
    S.tmp.pukBaru = true;
    S.tmp.pukNama = $('fPuk') ? bersihNamaPUK($('fPuk').value) : '';
  } else {
    S.tmp.pukBaru = false;
    const o = daftarPilihanPUK().filter(x => x.nilai === pil)[0];
    S.tmp.pukNama = o ? o.nama : '';
  }
  render();
}

function panelTerkunci(pid, key, i) {
  const arg = '\'' + pid + '\',\'' + key + '\'';
  return '<div class="row"><div class="info"><b>Kuitansi sudah terbit</b> <span class="badge b-Lunas">Lunas</span><br>' +
    '<span class="hint">' + rp(i.total) + ' · ' + esc(labelMetode(i.metode)) + ' · ' + esc(fmtTgl(i.tanggalSetor)) + '<br>' + esc(i.nomorKuitansi) + '</span></div>' +
    '<div class="act"><button class="btn sm prev" onclick="previewKuitansi(' + arg + ')">Preview Kuitansi</button>' +
    '<button class="btn sm alt btn-batal" onclick="batalkanKuitansi(' + arg + ')">Batalkan Kuitansi</button></div></div>' +
    '<p class="hint">Periode ' + esc(labelPeriode(key)) + ' sudah memiliki kuitansi. Jika ada salah ketik, batalkan lalu terbitkan ulang. Atau pilih bulan atau PUK lain.</p>';
}

function tglCetak(i) {
  return i.tanggalCetak || i.tanggalVerifikasi || i.tanggalSetor || '';
}

function daftarRiwayat() {
  const q = normNama(S.tmp.rPuk);
  const per = S.tmp.rPer || '';
  return allIuran()
    .filter(i => i.status === 'Lunas' && nomorTerbit(i))
    .filter(i => !q || normNama((S.puk[i.pid] || {}).namaPerusahaan).indexOf(q) !== -1)
    .filter(i => !per || i.key === per)
    .sort((x, y) => tglCetak(y).localeCompare(tglCetak(x)) || (y.dibuat || 0) - (x.dibuat || 0));
}

function ubahFilterRiwayat() {
  S.tmp.rPuk = $('rPuk').value;
  S.tmp.rPer = $('rPer').value;
  render();
}

function resetFilterRiwayat() {
  S.tmp.rPuk = '';
  S.tmp.rPer = '';
  render();
}

function viewRiwayatKuitansi() {
  const semua = allIuran().filter(i => i.status === 'Lunas' && nomorTerbit(i));
  const periodeAda = semua.map(i => i.key).filter((k, n, a) => a.indexOf(k) === n).sort().reverse();
  if (S.tmp.rPer && periodeAda.indexOf(S.tmp.rPer) === -1) S.tmp.rPer = '';
  const list = daftarRiwayat();
  const jumlah = list.reduce((a, i) => a + (Number(i.total) || 0), 0);
  const aktif = !!(S.tmp.rPuk || S.tmp.rPer);
  const arg = i => '\'' + i.pid + '\',\'' + i.key + '\'';
  const optPeriode = '<option value="">Semua periode</option>' + periodeAda.map(k =>
    '<option value="' + esc(k) + '"' + (k === S.tmp.rPer ? ' selected' : '') + '>' + esc(labelPeriode(k)) + '</option>').join('');
  const kosong = aktif ? 'Tidak ada kuitansi yang cocok dengan pencarian.' : 'Belum ada kuitansi yang diterbitkan.';
  const baris = list.map(i => {
    const p = S.puk[i.pid] || {};
    return '<tr><td>' + esc(p.namaPerusahaan || '-') + '<br><span class="hint">' + esc(i.nomorKuitansi) + '</span></td>' +
      '<td>' + esc(labelPeriode(i.key)) + '</td>' +
      '<td class="r">' + rp(i.total) + '</td>' +
      '<td>' + esc(labelMetode(i.metode) || '-') + '</td>' +
      '<td>' + esc(fmtTgl(tglCetak(i))) + '</td>' +
      '<td><button class="btn sm prev" onclick="previewKuitansi(' + arg(i) + ')">Preview Kuitansi</button> ' +
      '<button class="btn sm alt" onclick="unduhKuitansi(' + arg(i) + ')">Unduh</button> ' +
      '<button class="btn sm alt btn-batal" onclick="batalkanKuitansi(' + arg(i) + ')">Batalkan</button></td></tr>';
  }).join('');
  const kartu = list.map(i => {
    const p = S.puk[i.pid] || {};
    return '<article class="rk-item">' +
      '<div class="rk-kepala"><div class="rk-teks">' +
      '<div class="rk-nama">' + esc(p.namaPerusahaan || '-') + '</div>' +
      '<div class="rk-nomor">' + esc(i.nomorKuitansi) + '</div></div>' +
      '<button type="button" class="rk-menu" aria-label="Opsi kuitansi" aria-haspopup="menu" onclick="bukaMenuKuitansi(event,' + arg(i) + ')">' + IKON_TITIK + '</button></div>' +
      '<div class="rk-info"><span class="rk-periode">' + esc(labelPeriode(i.key)) + '</span>' +
      '<span class="rk-nominal">' + rp(i.total) + '</span></div></article>';
  }).join('');
  return '<section class="card rk"><h3>Riwayat Kuitansi (' + list.length + ')</h3>' +
    '<label for="rPuk">Cari nama PUK</label>' +
    '<input id="rPuk" type="search" autocomplete="off" placeholder="Ketik nama PUK" value="' + esc(S.tmp.rPuk || '') + '" oninput="ubahFilterRiwayat()">' +
    '<label for="rPer">Periode</label>' +
    '<select id="rPer" onchange="ubahFilterRiwayat()">' + optPeriode + '</select>' +
    '<p class="hint"><b>Total setoran: ' + rp(jumlah) + '</b> dari ' + list.length + ' kuitansi' + (aktif ? ' (hasil pencarian)' : '') + '</p>' +
    (aktif ? '<button class="btn alt" onclick="resetFilterRiwayat()">Tampilkan Semua</button>' : '') +
    '<button class="btn alt rk-csv" onclick="exportCSV()">Ekspor CSV</button>' +
    '<div class="tw rk-tabel"><table>' +
    '<tr><th>Nama PUK</th><th>Bulan/Tahun</th><th class="r">Nominal</th><th>Metode</th><th>Tanggal cetak</th><th>Aksi</th></tr>' +
    (baris || '<tr><td colspan="6">' + kosong + '</td></tr>') + '</table></div>' +
    '<div class="rk-kartu">' + (kartu || '<p class="hint">' + kosong + '</p>') + '</div></section>';
}

const IKON_TITIK = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>';

const MENU_KUITANSI = [
  ['Lihat Pratinjau', 'previewKuitansi', ''],
  ['Unduh PDF', 'unduhKuitansi', ''],
  ['Unduh Foto', 'unduhFotoRiwayat', ''],
  ['Batalkan Kuitansi', 'batalkanKuitansi', 'bahaya']
];

function tutupMenuKuitansi() {
  const m = $('rkPop');
  if (m) m.remove();
  document.querySelectorAll('.rk-menu[aria-expanded="true"]').forEach(b => b.setAttribute('aria-expanded', 'false'));
}

function bukaMenuKuitansi(e, pid, key) {
  e.stopPropagation();
  const tombol = e.currentTarget;
  const lama = $('rkPop');
  const sama = lama && lama.dataset.pid === pid && lama.dataset.key === key;
  tutupMenuKuitansi();
  if (sama) return;
  const menu = document.createElement('div');
  menu.id = 'rkPop';
  menu.className = 'rk-pop';
  menu.setAttribute('role', 'menu');
  menu.dataset.pid = pid;
  menu.dataset.key = key;
  MENU_KUITANSI.forEach(([label, fn, gaya]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'menuitem');
    b.className = 'rk-pop-item' + (gaya ? ' ' + gaya : '');
    b.textContent = label;
    b.addEventListener('click', () => {
      tutupMenuKuitansi();
      window[fn](pid, key);
    });
    menu.appendChild(b);
  });
  document.body.appendChild(menu);
  tombol.setAttribute('aria-expanded', 'true');
  const r = tombol.getBoundingClientRect();
  const tinggi = menu.offsetHeight;
  const bawah = r.bottom + 6 + tinggi > window.innerHeight - 12;
  menu.style.top = Math.max(8, bawah ? r.top - 6 - tinggi : r.bottom + 6) + 'px';
  menu.style.right = Math.max(8, window.innerWidth - r.right) + 'px';
  const pertama = menu.querySelector('button');
  if (pertama) pertama.focus();
}

document.addEventListener('click', e => {
  const m = $('rkPop');
  if (m && !m.contains(e.target)) tutupMenuKuitansi();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') tutupMenuKuitansi();
});
window.addEventListener('resize', tutupMenuKuitansi);
window.addEventListener('scroll', tutupMenuKuitansi, true);

async function batalkanKuitansi(pid, key) {
  const i = (S.iuran[pid] || {})[key];
  if (!i) return toast('Data kuitansi tidak ditemukan');
  const nama = (S.puk[pid] || {}).namaPerusahaan || '';
  const tanya = 'Batalkan kuitansi ' + i.nomorKuitansi + '?\n' + nama + ' · ' + labelPeriode(key) + ' · ' + rp(i.total) +
    '\n\nKuitansi akan dihapus dan tidak bisa dikembalikan. Nomor ini tidak dipakai lagi.';
  if (!window.confirm(tanya)) return;
  await jalankan(() => db.ref('iuran/' + pid + '/' + key).remove(), 'Kuitansi dibatalkan');
}

function viewCatat() {
  const hari = new Date().toISOString().slice(0, 10);
  const nama = S.tmp.pukNama || '';
  const pid = cariPUK(nama);
  const { b, t } = periodeCatat();
  const key = periodeKey(t, b);
  const ada = pid ? (S.iuran[pid] || {})[key] : null;
  const opsi = daftarPilihanPUK();
  const cocok = opsi.filter(o => normNama(o.nama) === normNama(nama))[0];
  const pilih = S.tmp.pukBaru ? '__baru' : (cocok ? cocok.nilai : '');
  const optPuk = '<option value="">Pilih nama PUK</option>' +
    opsi.map(o => '<option value="' + esc(o.nilai) + '"' + (o.nilai === pilih ? ' selected' : '') + '>PUK ' + esc(o.nama) + '</option>').join('') +
    '<option value="__baru"' + (pilih === '__baru' ? ' selected' : '') + '>+ PUK baru (ketik nama sendiri)</option>';
  const optBulan = BULAN.map((n, i) => '<option value="' + (i + 1) + '"' + (i + 1 === b ? ' selected' : '') + '>' + n + '</option>').join('');
  const kepala = '<section class="card"><h3>Buat Kuitansi Iuran</h3>' +
    '<label for="fPukPilih">Nama PUK</label>' +
    '<select id="fPukPilih" onchange="ubahPUKCatat()">' + optPuk + '</select>' +
    (pilih === '__baru' ? '<label for="fPuk">Nama PUK baru</label><input id="fPuk" autocomplete="off" placeholder="Ketik nama PUK, tanpa kata PUK" value="' + esc(nama) + '" onchange="ubahPUKCatat()">' : '') +
    '<label for="fBulan">Bulan</label><select id="fBulan" onchange="ubahPeriodeCatat()">' + optBulan + '</select>' +
    '<label for="fTahun">Tahun</label><input id="fTahun" type="number" value="' + t + '" onchange="ubahPeriodeCatat()">';

  if (pid && periodeKunci(ada)) {
    return kepala + '<p class="peringatan">' + esc(pesanAdmin()) + '</p>' + panelTerkunci(pid, key, ada) + '</section>';
  }
  return kepala +
    '<label for="fMetode">Metode</label><select id="fMetode"><option value="Tunai">Cash (Tunai)</option><option value="Transfer">Transfer</option></select>' +
    '<label for="fTotal">Total Nominal Setoran (Rp)</label><input id="fTotal" type="number" inputmode="numeric" placeholder="20000000">' +
    '<label for="fTanggal">Tanggal terima</label><input id="fTanggal" type="date" value="' + hari + '">' +
    '<p class="hint">Kuitansi langsung terbit dan sah setelah disimpan.</p>' +
    '<button class="btn" onclick="catatSetoran()">Terbitkan Kuitansi</button></section>';
}

async function catatSetoran() {
  const pil = $('fPukPilih').value;
  const dipilih = daftarPilihanPUK().filter(x => x.nilai === pil)[0];
  const nama = pil === '__baru' ? bersihNamaPUK($('fPuk') ? $('fPuk').value : '') : (dipilih ? dipilih.nama : '');
  const metode = $('fMetode').value === 'Transfer' ? 'Transfer' : 'Tunai';
  const bulan = +$('fBulan').value;
  const tahun = +$('fTahun').value;
  const tgl = $('fTanggal').value;
  const total = angka($('fTotal').value);
  if (!nama || !bulan || !tahun || !(total > 0) || !tgl) return toast('Isi nama PUK, total nominal, dan tanggal terima');

  const key = periodeKey(tahun, bulan);
  let pid = cariPUK(nama);
  const ada = pid ? (S.iuran[pid] || {})[key] : null;
  if (periodeKunci(ada)) return toast(pesanAdmin());
  const namaTersimpan = pid ? S.puk[pid].namaPerusahaan : nama;

  const ok = await jalankan(async () => {
    if (!pid) {
      pid = db.ref('puk').push().key;
      await db.ref('puk/' + pid).set({ namaPerusahaan: nama });
    }
    const hariIni = new Date().toISOString().slice(0, 10);
    const nomor = await nextNomor(namaTersimpan, bulan, tahun);
    const data = {
      periode: key,
      total: total,
      tanggalSetor: tgl,
      status: 'Lunas',
      metode: metode,
      sumber: 'PC',
      nomorKuitansi: nomor,
      dibuat: firebase.database.ServerValue.TIMESTAMP,
      diverifikasiOleh: S.profile.nama || '',
      tanggalVerifikasi: hariIni,
      tanggalCetak: hariIni
    };
    const berhasil = await klaimPeriode(pid, key, data);
    if (!berhasil) throw new Error('Kuitansi untuk PUK dan bulan ini sudah diterbitkan');
    if (ada) await db.ref('bukti/' + pid + '/' + key).remove().catch(() => {});
    return true;
  }, 'Kuitansi diterbitkan');
  if (ok) {
    S.tmp.pukNama = namaTersimpan;
    render();
  }
}

function exportCSV() {
  const namaPUK = pid => (S.puk[pid] || {}).namaPerusahaan || '';
  const data = daftarRiwayat()
    .sort((x, y) => y.key.localeCompare(x.key) || namaPUK(x.pid).localeCompare(namaPUK(y.pid)));
  if (!data.length) return toast('Tidak ada kuitansi untuk diekspor');
  const rows = [['Nomor Kuitansi', 'PUK', 'Periode', 'Tanggal Setor', 'Tanggal Cetak', 'Metode', 'Total']];
  data.forEach(x => rows.push([x.nomorKuitansi, namaPUK(x.pid), labelPeriode(x.key), x.tanggalSetor, tglCetak(x), labelMetode(x.metode), x.total]));
  const csv = rows.map(r => r.map(c => '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"').join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'riwayat-kuitansi-cos.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function jumlahKuitansiPUK(pid) {
  const per = S.iuran[pid] || {};
  return Object.keys(per).filter(k => per[k].status === 'Lunas' && nomorTerbit(per[k])).length;
}

function viewPengaturan() {
  const c = S.pengaturan || {};
  const img = k => S.tmp[k] || c[k] || '';
  const pv = k => '<img class="pv" id="pv_' + k + '" src="' + img(k) + '"' + (img(k) ? '' : ' hidden') + '>';
  return '<section class="card"><h3>Identitas PC & penandatangan kuitansi</h3>' +
    '<label for="sNama">Nama Pengurus Cabang</label><input id="sNama" value="' + esc(c.namaPC) + '">' +
    '<label for="sAlamat">Alamat</label><input id="sAlamat" value="' + esc(c.alamat) + '">' +
    '<label for="sKota">Kota (untuk tanggal kuitansi)</label><input id="sKota" value="' + esc(c.kota) + '">' +
    '<label for="sBendahara">Nama bendahara / ketua penandatangan</label><input id="sBendahara" value="' + esc(c.bendahara) + '">' +
    '<label for="sJabatan">Jabatan penandatangan</label><input id="sJabatan" value="' + esc(c.jabatan || 'Bendahara') + '">' +
    '<label for="fStempel">Gambar stempel (PNG transparan disarankan)</label><input id="fStempel" type="file" accept="image/*" onchange="muatGambar(this,\'stempel\')">' + pv('stempel') +
    '<label for="fTtd">Gambar tanda tangan</label><input id="fTtd" type="file" accept="image/*" onchange="muatGambar(this,\'ttd\')">' + pv('ttd') +
    '<button class="btn" onclick="simpanPengaturan()">Simpan</button></section>';
}

function muatGambar(inp, key) {
  const f = inp.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    const im = new Image();
    im.onload = () => {
      const k = Math.min(1, 400 / Math.max(im.width, im.height));
      const cv = document.createElement('canvas');
      cv.width = Math.round(im.width * k);
      cv.height = Math.round(im.height * k);
      cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
      S.tmp[key] = cv.toDataURL('image/png');
      const el = $('pv_' + key);
      el.src = S.tmp[key];
      el.hidden = false;
    };
    im.src = r.result;
  };
  r.readAsDataURL(f);
}

function simpanPengaturan() {
  const c = S.pengaturan || {};
  const data = {
    namaPC: $('sNama').value.trim(),
    alamat: $('sAlamat').value.trim(),
    kota: $('sKota').value.trim(),
    bendahara: $('sBendahara').value.trim(),
    jabatan: $('sJabatan').value.trim() || 'Bendahara',
    stempel: S.tmp.stempel || c.stempel || '',
    ttd: S.tmp.ttd || c.ttd || ''
  };
  if (!data.namaPC) return toast('Nama Pengurus Cabang wajib diisi');
  jalankan(async () => {
    await db.ref('pengaturan').set(data);
    S.tmp = {};
  }, 'Pengaturan disimpan');
}
