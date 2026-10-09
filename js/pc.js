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

function viewVerifikasi() {
  const list = allIuran().filter(x => x.status === 'Pending').sort((a, b) => (a.dibuat || 0) - (b.dibuat || 0));
  const rows = list.map(i => {
    const p = S.puk[i.pid] || {};
    const sel = i.selisih ? '<br><span class="hint" style="color:var(--warn)">Selisih ' + rp(i.selisih) + ' dari ' + i.jumlahAnggota + ' × ' + rp(i.tarifPerAnggota) + '</span>' : '';
    return '<div class="row"><div class="info"><b>' + esc(p.namaPerusahaan || '-') + '</b> · ' + esc(labelPeriode(i.key)) + '<br>' +
      '<span class="hint">' + rp(i.total) + ' · setor ' + esc(fmtTgl(i.tanggalSetor)) + '<br>' + esc(i.nomorKuitansi) + '</span>' + sel + '</div>' +
      '<div class="act"><button class="btn sm" onclick="verifikasiIuran(\'' + i.pid + '\',\'' + i.key + '\')">Lunas</button>' +
      '<button class="btn sm bad" onclick="tolakIuran(\'' + i.pid + '\',\'' + i.key + '\')">Tolak</button></div></div>';
  }).join('');
  return '<section class="card"><h3>Menunggu verifikasi (' + list.length + ')</h3>' + (rows || '<p class="hint">Tidak ada setoran yang menunggu.</p>') + '</section>';
}

function verifikasiIuran(pid, key) {
  jalankan(() => db.ref('iuran/' + pid + '/' + key).update({
    status: 'Lunas',
    diverifikasiOleh: S.profile.nama || '',
    tanggalVerifikasi: new Date().toISOString().slice(0, 10)
  }), 'Setoran ditandai lunas');
}

function tolakIuran(pid, key) {
  if (!confirm('Tolak setoran ini? PUK dapat mengirim ulang.')) return;
  jalankan(() => db.ref('iuran/' + pid + '/' + key).update({ status: 'Ditolak' }), 'Setoran ditolak');
}

function viewPUK() {
  const list = sortedPUK().map(pid => {
    const p = S.puk[pid];
    return '<div class="row"><div class="info"><b>' + esc(p.namaPerusahaan) + '</b><br><span class="hint">Ketua: ' + esc(p.namaKetua) + ' · ' + (p.jumlahAnggota || 0) + ' anggota × ' + rp(p.tarifPerAnggota) + '<br>' + esc(p.email || '') + '</span></div>' +
      '<div class="act"><button class="btn sm alt" onclick="editPUK(\'' + pid + '\')">Ubah anggota & tarif</button></div></div>';
  }).join('');
  return '<section class="card"><h3>Tambah PUK</h3>' +
    '<label for="pNama">Nama perusahaan</label><input id="pNama">' +
    '<label for="pKetua">Nama ketua PUK</label><input id="pKetua">' +
    '<label for="pJumlah">Jumlah anggota</label><input id="pJumlah" type="number" inputmode="numeric">' +
    '<label for="pTarif">Tarif iuran per anggota (Rp)</label><input id="pTarif" type="number" inputmode="numeric">' +
    '<label for="pEmail">Email login PUK</label><input id="pEmail" type="email" autocomplete="off">' +
    '<label for="pPass">Sandi awal (min. 6 karakter)</label><input id="pPass" type="text" autocomplete="off">' +
    '<button class="btn" onclick="tambahPUK()">Tambah PUK</button></section>' +
    '<section class="card"><h3>Daftar PUK (' + Object.keys(S.puk).length + ')</h3>' + (list || '<p class="hint">Belum ada PUK.</p>') + '</section>';
}

async function tambahPUK() {
  const v = id => $(id).value.trim();
  const nama = v('pNama'), ketua = v('pKetua'), jml = +v('pJumlah'), tarif = +v('pTarif'), email = v('pEmail'), pass = $('pPass').value;
  if (!nama || !ketua || !(jml > 0) || !(tarif > 0) || !email || pass.length < 6) return toast('Lengkapi data, sandi minimal 6 karakter');

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
  if (ok) ['pNama', 'pKetua', 'pJumlah', 'pTarif', 'pEmail', 'pPass'].forEach(id => { $(id).value = ''; });
}

function editPUK(pid) {
  const p = S.puk[pid];
  if (!p) return;
  const j = prompt('Jumlah anggota aktif', p.jumlahAnggota);
  if (j === null) return;
  const t = prompt('Tarif per anggota (Rp)', p.tarifPerAnggota);
  if (t === null) return;
  if (!(+j > 0) || !(+t > 0)) return toast('Nilai tidak valid');
  jalankan(() => db.ref('puk/' + pid).update({ jumlahAnggota: +j, tarifPerAnggota: +t }), 'Data PUK diperbarui');
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
  const rows = [['Nomor Kuitansi', 'PUK', 'Periode', 'Tanggal Setor', 'Anggota', 'Total', 'Status']];
  data.forEach(x => rows.push([x.nomorKuitansi, namaPUK(x.pid), labelPeriode(x.key), x.tanggalSetor, x.jumlahAnggota, x.total, x.status]));
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
