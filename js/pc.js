function setPeriode() {
  S.periode = { b: +$('rBulan').value, t: +$('rTahun').value };
  render();
}

function viewRekap() {
  const now = new Date();
  if (!S.periode) S.periode = { b: now.getMonth() + 1, t: now.getFullYear() };
  const { b, t } = S.periode;
  const key = periodeKey(t, b);
  const cur = now.getFullYear() * 12 + now.getMonth() + 1;
  const sel = t * 12 + b;
  let lunas = 0, pending = 0, belum = 0, totalLunas = 0, totalPending = 0;

  const rows = sortedPUK().map(pid => {
    const p = S.puk[pid];
    const i = (S.iuran[pid] || {})[key];
    const st = i ? i.status : (sel < cur ? 'Menunggak' : 'Belum Setor');
    if (st === 'Lunas') { lunas++; totalLunas += i.total; }
    else if (st === 'Pending') { pending++; totalPending += i.total; }
    else belum++;
    return '<tr><td>' + esc(p.namaPerusahaan) + '</td><td class="r">' + (p.jumlahAnggota || 0) + '</td><td class="r">' + (i ? rp(i.total) : '-') + '</td><td>' + badge(st) + '</td></tr>';
  }).join('');

  const opts = BULAN.map((n, j) => '<option value="' + (j + 1) + '"' + (j + 1 === b ? ' selected' : '') + '>' + n + '</option>').join('');
  return '<section class="card"><div class="bar">' +
    '<div><label for="rBulan">Bulan</label><select id="rBulan" onchange="setPeriode()">' + opts + '</select></div>' +
    '<div><label for="rTahun">Tahun</label><input id="rTahun" type="number" value="' + t + '" onchange="setPeriode()"></div></div></section>' +
    '<section class="card"><div class="grid">' +
    '<div class="stat"><span>Lunas</span><b>' + lunas + '</b></div>' +
    '<div class="stat"><span>Menunggu verifikasi</span><b>' + pending + '</b></div>' +
    '<div class="stat"><span>Belum / menunggak</span><b>' + belum + '</b></div>' +
    '<div class="stat"><span>Total lunas</span><b>' + rp(totalLunas) + '</b></div>' +
    '<div class="stat"><span>Total pending</span><b>' + rp(totalPending) + '</b></div></div></section>' +
    '<section class="card"><h3>Setoran ' + esc(labelPeriode(key)) + '</h3><div class="tw"><table>' +
    '<tr><th>PUK</th><th class="r">Anggota</th><th class="r">Setoran</th><th>Status</th></tr>' +
    (rows || '<tr><td colspan="4">Belum ada PUK terdaftar.</td></tr>') + '</table></div></section>';
}

function pilihPUKCatat() {
  S.tmp.pukPilih = $('fPuk').value;
  render();
}

function viewVerifikasi() {
  const now = new Date();
  const hari = now.toISOString().slice(0, 10);
  const pilih = S.tmp.pukPilih || '';
  const pp = S.puk[pilih];
  const harapan = pp ? (+pp.jumlahAnggota || 0) * (+pp.tarifPerAnggota || 0) : 0;
  const optPUK = '<option value="">Pilih PUK</option>' + sortedPUK().map(pid => '<option value="' + pid + '"' + (pid === pilih ? ' selected' : '') + '>' + esc(S.puk[pid].namaPerusahaan) + '</option>').join('');
  const optBulan = BULAN.map((n, i) => '<option value="' + (i + 1) + '"' + (i === now.getMonth() ? ' selected' : '') + '>' + n + '</option>').join('');
  const form = '<section class="card"><h3>Catat setoran masuk</h3>' +
    '<label for="fPuk">PUK</label><select id="fPuk" onchange="pilihPUKCatat()">' + optPUK + '</select>' +
    '<label for="fMetode">Cara bayar</label><select id="fMetode"><option value="Tunai">Tunai (cash)</option><option value="Transfer">Transfer</option></select>' +
    '<label for="fBulan">Bulan</label><select id="fBulan">' + optBulan + '</select>' +
    '<label for="fTahun">Tahun</label><input id="fTahun" type="number" value="' + now.getFullYear() + '">' +
    '<label for="fTotal">Jumlah diterima (Rp)</label><input id="fTotal" type="number" inputmode="numeric" placeholder="' + harapan + '">' +
    '<label for="fTanggal">Tanggal terima</label><input id="fTanggal" type="date" value="' + hari + '">' +
    '<p class="hint">' + (pp ? 'Seharusnya ' + rp(harapan) + ' (' + (pp.jumlahAnggota || 0) + ' anggota × ' + rp(pp.tarifPerAnggota) + '). Jumlah dikosongkan = nilai ini. ' : '') + 'Kuitansi langsung terbit dan muncul di akun PUK.</p>' +
    '<button class="btn" onclick="catatSetoran()">Catat lunas & terbitkan kuitansi</button></section>';

  const list = allIuran().filter(x => x.status === 'Pending').sort((a, b) => (a.dibuat || 0) - (b.dibuat || 0));
  const rows = list.map(i => {
    const p = S.puk[i.pid] || {};
    const sel = i.selisih ? '<br><span class="hint" style="color:var(--warn)">Selisih ' + rp(i.selisih) + ' dari ' + i.jumlahAnggota + ' × ' + rp(i.tarifPerAnggota) + '</span>' : '';
    const metode = i.metode ? ' · ' + esc(i.metode) : '';
    const nomor = nomorTerbit(i) ? '<br>' + esc(i.nomorKuitansi) : '';
    const bukti = i.metode === 'Transfer' ? '<button class="btn sm alt" onclick="lihatBukti(\'' + i.pid + '\',\'' + i.key + '\')">Lihat bukti</button>' : '';
    return '<div class="row"><div class="info"><b>' + esc(p.namaPerusahaan || '-') + '</b> · ' + esc(labelPeriode(i.key)) + '<br>' +
      '<span class="hint">' + rp(i.total) + ' · setor ' + esc(fmtTgl(i.tanggalSetor)) + metode + nomor + '</span>' + sel + '</div>' +
      '<div class="act">' + bukti + '<button class="btn sm" onclick="verifikasiIuran(\'' + i.pid + '\',\'' + i.key + '\')">Lunas</button>' +
      '<button class="btn sm bad" onclick="tolakIuran(\'' + i.pid + '\',\'' + i.key + '\')">Tolak</button></div></div>';
  }).join('');
  return form + '<section class="card"><h3>Menunggu verifikasi (' + list.length + ')</h3>' + (rows || '<p class="hint">Tidak ada setoran yang menunggu.</p>') + '</section>';
}

async function catatSetoran() {
  const pid = $('fPuk').value;
  const p = S.puk[pid];
  const metode = $('fMetode').value === 'Transfer' ? 'Transfer' : 'Tunai';
  const bulan = +$('fBulan').value;
  const tahun = +$('fTahun').value;
  const tgl = $('fTanggal').value;
  const harapan = p ? (+p.jumlahAnggota || 0) * (+p.tarifPerAnggota || 0) : 0;
  const total = angka($('fTotal').value) || harapan;
  if (!p || !bulan || !tahun || !(total > 0) || !tgl) return toast('Pilih PUK dan lengkapi data setoran');

  const key = periodeKey(tahun, bulan);
  const ada = (S.iuran[pid] || {})[key];
  if (ada && ada.status === 'Lunas') return toast('Periode ini sudah lunas');
  if (ada && ada.status === 'Pending') return toast('Periode ini sudah ada di antrean, konfirmasi dari daftar di bawah');

  if (total !== harapan) {
    const lanjut = confirm('Nominal ' + rp(total) + ' tidak sama dengan ' + rp(harapan) + ' (' + p.jumlahAnggota + ' anggota × ' + rp(p.tarifPerAnggota) + '). Tetap catat?');
    if (!lanjut) return;
  }

  const ok = await jalankan(async () => {
    const nomor = await nextNomor(p.namaPerusahaan, bulan, tahun);
    const up = {};
    up['iuran/' + pid + '/' + key] = {
      periode: key,
      total: total,
      tanggalSetor: tgl,
      status: 'Lunas',
      metode: metode,
      nomorKuitansi: nomor,
      jumlahAnggota: +p.jumlahAnggota || 0,
      tarifPerAnggota: +p.tarifPerAnggota || 0,
      selisih: total - harapan,
      dibuat: firebase.database.ServerValue.TIMESTAMP,
      diverifikasiOleh: S.profile.nama || '',
      tanggalVerifikasi: new Date().toISOString().slice(0, 10)
    };
    if (ada) up['bukti/' + pid + '/' + key] = null;
    await db.ref().update(up);
    return true;
  }, 'Setoran dicatat, kuitansi terbit di akun PUK');
  if (ok) $('fTotal').value = '';
}

function verifikasiIuran(pid, key) {
  const i = (S.iuran[pid] || {})[key];
  const p = S.puk[pid];
  if (!i || !p) return toast('Data setoran tidak ditemukan');
  jalankan(async () => {
    const [t, b] = key.split('-');
    const upd = {
      status: 'Lunas',
      diverifikasiOleh: S.profile.nama || '',
      tanggalVerifikasi: new Date().toISOString().slice(0, 10)
    };
    if (!nomorTerbit(i)) upd.nomorKuitansi = await nextNomor(p.namaPerusahaan, +b, +t);
    await db.ref('iuran/' + pid + '/' + key).update(upd);
  }, 'Setoran lunas, kuitansi terbit di akun PUK');
}

function tutupBukti() {
  const o = $('buktiView');
  if (o) o.remove();
}

async function lihatBukti(pid, key) {
  const src = await jalankan(async () => {
    const s = await db.ref('bukti/' + pid + '/' + key).once('value');
    return s.val();
  });
  if (typeof src !== 'string' || src.indexOf('data:image/') !== 0) return toast('Bukti transfer tidak ditemukan');
  tutupBukti();
  const ov = document.createElement('div');
  ov.id = 'buktiView';
  ov.style.cssText = 'position:fixed;inset:0;z-index:50;background:rgba(0,0,0,.88);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:12px;overflow:auto';
  ov.onclick = tutupBukti;
  const cap = document.createElement('div');
  cap.textContent = 'Ketuk di mana saja untuk menutup';
  cap.style.cssText = 'color:#fff;font-size:16px';
  const im = document.createElement('img');
  im.src = src;
  im.alt = 'Bukti transfer';
  im.style.cssText = 'max-width:100%;max-height:85%;background:#fff;border-radius:8px';
  ov.appendChild(cap);
  ov.appendChild(im);
  document.body.appendChild(ov);
}

function tolakIuran(pid, key) {
  if (!confirm('Tolak setoran ini? PUK dapat mengirim ulang.')) return;
  jalankan(() => db.ref('iuran/' + pid + '/' + key).update({ status: 'Ditolak' }), 'Setoran ditolak');
}

function viewPUK() {
  const list = sortedPUK().map(pid => {
    const p = S.puk[pid];
    return '<div class="row"><div class="info"><b>' + esc(p.namaPerusahaan) + '</b><br><span class="hint">Ketua: ' + esc(p.namaKetua) + ' · ' + (p.jumlahAnggota || 0) + ' anggota × ' + rp(p.tarifPerAnggota) + '<br>' + esc((p.email || '').replace(DOMAIN_LOGIN, '')) + '</span></div>' +
      '<div class="act"><button class="btn sm alt" onclick="editPUK(\'' + pid + '\')">Ubah anggota & tarif</button></div></div>';
  }).join('');
  return '<section class="card"><h3>Tambah PUK</h3>' +
    '<label for="pNama">Nama perusahaan</label><input id="pNama">' +
    '<label for="pKetua">Nama ketua PUK</label><input id="pKetua">' +
    '<label for="pJumlah">Jumlah anggota</label><input id="pJumlah" type="number" inputmode="numeric">' +
    '<label for="pTarif">Tarif iuran per anggota (Rp)</label><input id="pTarif" type="number" inputmode="numeric">' +
    '<label for="pId">ID login PUK</label><input id="pId" type="text" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false">' +
    '<label for="pPass">Sandi awal (min. 6 karakter)</label><input id="pPass" type="text" autocomplete="off">' +
    '<button class="btn" onclick="tambahPUK()">Tambah PUK</button></section>' +
    '<section class="card"><h3>Daftar PUK (' + Object.keys(S.puk).length + ')</h3>' + (list || '<p class="hint">Belum ada PUK.</p>') + '</section>';
}

async function tambahPUK() {
  const v = id => $(id).value.trim();
  const nama = v('pNama'), ketua = v('pKetua'), jml = +v('pJumlah'), tarif = angka($('pTarif').value), idLogin = v('pId'), pass = $('pPass').value;
  if (!nama || !ketua || !(jml > 0) || !(tarif > 0) || !idLogin || pass.length < 6) return toast('Lengkapi data, sandi minimal 6 karakter');
  if (/\s/.test(idLogin)) return toast('ID login tidak boleh mengandung spasi');
  const email = emailDariId(idLogin);

  const ok = await jalankan(async () => {
    const sec = firebase.initializeApp(firebaseConfig, 'sec' + Date.now());
    try {
      const cred = await sec.auth().createUserWithEmailAndPassword(email, pass);
      const pid = db.ref('puk').push().key;
      const up = {};
      up['puk/' + pid] = { namaPerusahaan: nama, namaKetua: ketua, jumlahAnggota: jml, tarifPerAnggota: tarif, email: email };
      up['users/' + cred.user.uid] = { role: 'puk', pukId: pid, nama: ketua, email: email };
      await db.ref().update(up);
      await sec.auth().signOut();
    } finally {
      await sec.delete().catch(() => {});
    }
    return true;
  }, 'PUK ditambahkan');
  if (ok) ['pNama', 'pKetua', 'pJumlah', 'pTarif', 'pId', 'pPass'].forEach(id => { $(id).value = ''; });
}

function editPUK(pid) {
  const p = S.puk[pid];
  if (!p) return;
  const j = prompt('Jumlah anggota aktif', p.jumlahAnggota);
  if (j === null) return;
  const t = prompt('Tarif per anggota (Rp)', ribuan(p.tarifPerAnggota));
  if (t === null) return;
  const tarif = angka(t);
  if (!(+j > 0) || !(tarif > 0)) return toast('Nilai tidak valid');
  jalankan(() => db.ref('puk/' + pid).update({ jumlahAnggota: +j, tarifPerAnggota: tarif }), 'Data PUK diperbarui');
}

function setTahunLap() {
  S.tahunLap = +$('lTahun').value || new Date().getFullYear();
  render();
}

function viewLaporan() {
  const t = S.tahunLap;
  const data = allIuran().filter(x => x.key.indexOf(t + '-') === 0);
  let grandLunas = 0, grandPending = 0;
  const rows = sortedPUK().map(pid => {
    const mine = data.filter(x => x.pid === pid);
    const lunas = mine.filter(x => x.status === 'Lunas');
    const pend = mine.filter(x => x.status === 'Pending');
    const tl = lunas.reduce((a, x) => a + x.total, 0);
    const tp = pend.reduce((a, x) => a + x.total, 0);
    grandLunas += tl;
    grandPending += tp;
    return '<tr><td>' + esc(S.puk[pid].namaPerusahaan) + '</td><td class="r">' + lunas.length + '/12</td><td class="r">' + rp(tl) + '</td><td class="r">' + rp(tp) + '</td></tr>';
  }).join('');
  return '<section class="card"><div class="bar"><div><label for="lTahun">Tahun laporan</label><input id="lTahun" type="number" value="' + t + '" onchange="setTahunLap()"></div>' +
    '<div><button class="btn" style="width:100%" onclick="exportCSV()">Ekspor CSV</button></div></div></section>' +
    '<section class="card"><div class="grid">' +
    '<div class="stat"><span>Total lunas ' + t + '</span><b>' + rp(grandLunas) + '</b></div>' +
    '<div class="stat"><span>Total pending</span><b>' + rp(grandPending) + '</b></div></div></section>' +
    '<section class="card"><h3>Rekap per PUK</h3><div class="tw"><table>' +
    '<tr><th>PUK</th><th class="r">Bulan lunas</th><th class="r">Total lunas</th><th class="r">Pending</th></tr>' +
    (rows || '<tr><td colspan="4">Belum ada data.</td></tr>') + '</table></div></section>';
}

function exportCSV() {
  const t = S.tahunLap;
  const namaPUK = pid => (S.puk[pid] || {}).namaPerusahaan || '';
  const data = allIuran()
    .filter(x => x.key.indexOf(t + '-') === 0)
    .sort((a, b) => a.key.localeCompare(b.key) || namaPUK(a.pid).localeCompare(namaPUK(b.pid)));
  if (!data.length) return toast('Tidak ada data untuk tahun ini');
  const rows = [['Nomor Kuitansi', 'PUK', 'Periode', 'Tanggal Setor', 'Cara Bayar', 'Anggota', 'Total', 'Status']];
  data.forEach(x => rows.push([nomorTerbit(x) ? x.nomorKuitansi : '', namaPUK(x.pid), labelPeriode(x.key), x.tanggalSetor, x.metode || '', x.jumlahAnggota, x.total, x.status]));
  const csv = rows.map(r => r.map(c => '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"').join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'laporan-cos-' + t + '.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
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
