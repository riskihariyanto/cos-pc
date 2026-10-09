function pilihPUKCatat() {
  S.tmp.pukPilih = $('fPuk').value;
  render();
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

function tglCetak(i) {
  return i.tanggalCetak || i.tanggalVerifikasi || i.tanggalSetor || '';
}

function pesanAdmin(i) {
  return i && i.status === 'Lunas'
    ? 'Kuitansi untuk bulan ini sudah diterbitkan'
    : 'Periode ini sudah diajukan dan menunggu ACC di menu Verifikasi Setoran';
}

function viewRiwayatKuitansi() {
  const list = allIuran()
    .filter(i => i.status === 'Lunas' && nomorTerbit(i))
    .sort((x, y) => tglCetak(y).localeCompare(tglCetak(x)) || (y.dibuat || 0) - (x.dibuat || 0));
  const arg = i => '\'' + i.pid + '\',\'' + i.key + '\'';
  const baris = list.map(i => {
    const p = S.puk[i.pid] || {};
    return '<tr><td>' + esc(p.namaPerusahaan || '-') + '<br><span class="hint">' + esc(i.nomorKuitansi) + '</span></td>' +
      '<td>' + esc(labelPeriode(i.key)) + '</td>' +
      '<td class="r">' + rp(i.total) + '</td>' +
      '<td>' + esc(labelMetode(i.metode) || '-') + '</td>' +
      '<td>' + esc(fmtTgl(tglCetak(i))) + '</td>' +
      '<td><button class="btn sm prev" onclick="previewKuitansi(' + arg(i) + ')">Preview Kuitansi</button></td></tr>';
  }).join('');
  const kartu = list.map(i => {
    const p = S.puk[i.pid] || {};
    return '<article class="rk-item">' +
      '<div class="rk-nama">' + esc(p.namaPerusahaan || '-') + '</div>' +
      '<div class="rk-nomor">' + esc(i.nomorKuitansi) + '</div>' +
      '<div class="rk-info"><span class="rk-periode">' + esc(labelPeriode(i.key)) + '</span>' +
      '<span class="rk-nominal">' + rp(i.total) + '</span></div>' +
      '<div class="rk-aksi">' +
      '<button class="btn sm prev" onclick="previewKuitansi(' + arg(i) + ')">Preview Kuitansi</button>' +
      '<button class="btn sm alt" onclick="unduhKuitansi(' + arg(i) + ')">Unduh</button>' +
      '</div></article>';
  }).join('');
  return '<section class="card rk"><h3>Riwayat Kuitansi (' + list.length + ')</h3>' +
    '<button class="btn alt rk-csv" onclick="exportCSV()">Ekspor CSV</button>' +
    '<div class="tw rk-tabel"><table>' +
    '<tr><th>Nama PUK</th><th>Bulan/Tahun</th><th class="r">Nominal</th><th>Metode</th><th>Tanggal cetak</th><th>Aksi</th></tr>' +
    (baris || '<tr><td colspan="6">Belum ada kuitansi yang diterbitkan.</td></tr>') + '</table></div>' +
    '<div class="rk-kartu">' + (kartu || '<p class="hint">Belum ada kuitansi yang diterbitkan.</p>') + '</div></section>';
}

function viewCatat() {
  const hari = new Date().toISOString().slice(0, 10);
  const pilih = S.tmp.pukPilih || '';
  const pp = S.puk[pilih];
  const { b, t } = periodeCatat();
  const key = periodeKey(t, b);
  const ada = pilih ? (S.iuran[pilih] || {})[key] : null;
  const harapan = pp ? (+pp.jumlahAnggota || 0) * (+pp.tarifPerAnggota || 0) : 0;
  const optPUK = '<option value="">Pilih PUK</option>' + sortedPUK().map(pid => '<option value="' + pid + '"' + (pid === pilih ? ' selected' : '') + '>' + esc(S.puk[pid].namaPerusahaan) + '</option>').join('');
  const optBulan = BULAN.map((n, i) => '<option value="' + (i + 1) + '"' + (i + 1 === b ? ' selected' : '') + '>' + n + '</option>').join('');
  const kepala = '<section class="card"><h3>Catat Setoran Masuk</h3>' +
    '<label for="fPuk">PUK</label><select id="fPuk" onchange="pilihPUKCatat()">' + optPUK + '</select>' +
    '<label for="fBulan">Bulan</label><select id="fBulan" onchange="ubahPeriodeCatat()">' + optBulan + '</select>' +
    '<label for="fTahun">Tahun</label><input id="fTahun" type="number" value="' + t + '" onchange="ubahPeriodeCatat()">';

  if (pilih && periodeKunci(ada)) {
    return kepala + '<p class="peringatan">' + esc(pesanAdmin(ada)) + '</p>' + panelTerkunci(pilih, key, ada) + '</section>';
  }
  return kepala +
    '<label for="fMetode">Metode</label><select id="fMetode"><option value="Tunai">Cash (Tunai)</option><option value="Transfer">Transfer</option></select>' +
    '<label for="fTotal">Nominal (Rp)</label><input id="fTotal" type="number" inputmode="numeric" placeholder="' + harapan + '">' +
    '<label for="fTanggal">Tanggal terima</label><input id="fTanggal" type="date" value="' + hari + '">' +
    '<p class="hint">' + (pp ? 'Seharusnya ' + rp(harapan) + ' (' + (pp.jumlahAnggota || 0) + ' anggota × ' + rp(pp.tarifPerAnggota) + '). Nominal dikosongkan = nilai ini. ' : '') + 'Kuitansi langsung terbit dan muncul di akun PUK.</p>' +
    '<button class="btn" onclick="catatSetoran()">Catat lunas & terbitkan kuitansi</button></section>';
}

function viewVerifikasi() {
  const list = allIuran().filter(x => x.status === 'Pending').sort((x, y) => (x.dibuat || 0) - (y.dibuat || 0));
  const rows = list.map(i => {
    const p = S.puk[i.pid] || {};
    const sel = i.selisih ? '<br><span class="hint" style="color:var(--warn)">Selisih ' + rp(i.selisih) + ' dari ' + i.jumlahAnggota + ' × ' + rp(i.tarifPerAnggota) + '</span>' : '';
    const bukti = i.metode === 'Transfer' ? '<button class="btn sm alt" onclick="lihatBukti(\'' + i.pid + '\',\'' + i.key + '\')">Lihat bukti</button>' : '';
    return '<div class="row"><div class="info"><b>' + esc(p.namaPerusahaan || '-') + '</b> · ' + esc(labelPeriode(i.key)) + '<br>' + badgeIuran(i) + '<br>' +
      '<span class="hint">' + rp(i.total) + ' · tanggal ' + esc(fmtTgl(i.tanggalSetor)) + ' · ' + esc(labelMetode(i.metode)) + '</span>' + sel + '</div>' +
      '<div class="act">' + bukti + '<button class="btn sm" onclick="verifikasiIuran(\'' + i.pid + '\',\'' + i.key + '\')">ACC / Verifikasi</button>' +
      '<button class="btn sm bad" onclick="tolakIuran(\'' + i.pid + '\',\'' + i.key + '\')">Tolak</button></div></div>';
  }).join('');
  return '<section class="card"><h3>Verifikasi Setoran (' + list.length + ')</h3>' +
    (rows || '<p class="hint">Tidak ada pengajuan setoran yang menunggu.</p>') + '</section>';
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
  if (periodeKunci(ada)) return toast(pesanAdmin(ada));

  if (total !== harapan) {
    const lanjut = confirm('Nominal ' + rp(total) + ' tidak sama dengan ' + rp(harapan) + ' (' + p.jumlahAnggota + ' anggota × ' + rp(p.tarifPerAnggota) + '). Tetap catat?');
    if (!lanjut) return;
  }

  const ok = await jalankan(async () => {
    const hariIni = new Date().toISOString().slice(0, 10);
    const nomor = await nextNomor(p.namaPerusahaan, bulan, tahun);
    const data = {
      periode: key,
      total: total,
      tanggalSetor: tgl,
      status: 'Lunas',
      metode: metode,
      sumber: 'PC',
      nomorKuitansi: nomor,
      jumlahAnggota: +p.jumlahAnggota || 0,
      tarifPerAnggota: +p.tarifPerAnggota || 0,
      selisih: total - harapan,
      dibuat: firebase.database.ServerValue.TIMESTAMP,
      diverifikasiOleh: S.profile.nama || '',
      tanggalVerifikasi: hariIni,
      tanggalCetak: hariIni
    };
    const berhasil = await klaimPeriode(pid, key, data);
    if (!berhasil) throw new Error('Kuitansi untuk bulan ini sudah diterbitkan atau sedang diajukan');
    if (ada) await db.ref('bukti/' + pid + '/' + key).remove();
    return true;
  }, 'Setoran dicatat, kuitansi terbit di akun PUK');
  if (ok) $('fTotal').value = '';
}

async function verifikasiIuran(pid, key) {
  const i = (S.iuran[pid] || {})[key];
  const p = S.puk[pid];
  if (!i || !p) return toast('Data setoran tidak ditemukan');
  if (i.status !== 'Pending') return toast('Pengajuan ini sudah diproses');
  if (!confirm('ACC pengajuan ' + p.namaPerusahaan + ' periode ' + labelPeriode(key) + ' dan terbitkan kuitansi?')) return;
  await jalankan(async () => {
    const [t, b] = key.split('-');
    const hariIni = new Date().toISOString().slice(0, 10);
    const nomor = nomorTerbit(i) ? i.nomorKuitansi : await nextNomor(p.namaPerusahaan, +b, +t);
    const res = await db.ref('iuran/' + pid + '/' + key).transaction(cur => {
      if (!cur || cur.status !== 'Pending') return;
      return Object.assign({}, cur, {
        status: 'Lunas',
        nomorKuitansi: nomor,
        diverifikasiOleh: S.profile.nama || '',
        tanggalVerifikasi: hariIni,
        tanggalCetak: hariIni
      });
    });
    if (!res.committed) throw new Error('Pengajuan ini sudah diproses');
  }, 'Pengajuan di-ACC, kuitansi terbit di akun PUK');
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
  jalankan(async () => {
    const res = await db.ref('iuran/' + pid + '/' + key).transaction(cur => {
      if (!cur || cur.status !== 'Pending') return;
      return Object.assign({}, cur, { status: 'Ditolak' });
    });
    if (!res.committed) throw new Error('Pengajuan ini sudah diproses');
  }, 'Setoran ditolak');
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

function exportCSV() {
  const namaPUK = pid => (S.puk[pid] || {}).namaPerusahaan || '';
  const data = allIuran()
    .filter(x => x.status === 'Lunas' && nomorTerbit(x))
    .sort((x, y) => y.key.localeCompare(x.key) || namaPUK(x.pid).localeCompare(namaPUK(y.pid)));
  if (!data.length) return toast('Belum ada kuitansi yang diterbitkan');
  const rows = [['Nomor Kuitansi', 'PUK', 'Periode', 'Tanggal Setor', 'Tanggal Cetak', 'Metode', 'Anggota', 'Total']];
  data.forEach(x => rows.push([x.nomorKuitansi, namaPUK(x.pid), labelPeriode(x.key), x.tanggalSetor, tglCetak(x), labelMetode(x.metode), x.jumlahAnggota, x.total]));
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
