const BUKTI_MAX = 300000;

function nomorTerbit(i) {
  return !!(i && i.nomorKuitansi && i.nomorKuitansi !== '-');
}

function viewSetor() {
  const pid = S.profile.pukId;
  const p = S.puk[pid] || {};
  const harapan = (Number(p.jumlahAnggota) || 0) * (Number(p.tarifPerAnggota) || 0);
  const now = new Date();
  const hari = now.toISOString().slice(0, 10);
  const opts = BULAN.map((n, i) => '<option value="' + (i + 1) + '"' + (i === now.getMonth() ? ' selected' : '') + '>' + n + '</option>').join('');
  const bukti = S.tmp.bukti || '';
  return '<section class="card">' +
    '<label for="fBulan">Bulan</label><select id="fBulan">' + opts + '</select>' +
    '<label for="fTahun">Tahun</label><input id="fTahun" type="number" value="' + now.getFullYear() + '">' +
    '<label for="fTotal">Nominal (Rp)</label><input id="fTotal" type="number" inputmode="numeric" placeholder="' + harapan + '">' +
    '<label for="fTanggal">Tanggal</label><input id="fTanggal" type="date" value="' + hari + '">' +
    '<label for="fBukti">Foto bukti transfer</label><input id="fBukti" type="file" accept="image/*" onchange="pilihBukti(this)">' +
    (bukti ? '<img src="' + bukti + '" alt="Bukti transfer" style="display:block;max-width:100%;max-height:260px;margin-top:10px;border:2px solid var(--pri);border-radius:8px">' : '') +
    '<button class="btn" onclick="submitSetor()">Kirim</button></section>';
}

function pilihBukti(inp) {
  const f = inp.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onerror = () => toast('Foto tidak bisa dibaca');
  r.onload = () => {
    const im = new Image();
    im.onerror = () => toast('File bukan gambar yang valid');
    im.onload = () => {
      const coba = [[1280, 0.7], [1024, 0.55], [800, 0.45]];
      let hasil = '';
      for (const [sisi, mutu] of coba) {
        const k = Math.min(1, sisi / Math.max(im.width, im.height));
        const cv = document.createElement('canvas');
        cv.width = Math.round(im.width * k);
        cv.height = Math.round(im.height * k);
        cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
        hasil = cv.toDataURL('image/jpeg', mutu);
        if (hasil.length <= BUKTI_MAX) break;
      }
      if (hasil.length > BUKTI_MAX) return toast('Foto terlalu besar, pilih foto lain');
      S.tmp.bukti = hasil;
      render();
    };
    im.src = r.result;
  };
  r.readAsDataURL(f);
}

async function nextNomor(namaPT, bulan, tahun) {
  const res = await db.ref('counter/' + tahun).transaction(v => (v || 0) + 1);
  if (!res.committed) throw new Error('Nomor kuitansi gagal dibuat');
  const seq = String(res.snapshot.val()).padStart(3, '0');
  const slug = String(namaPT || '').replace(/[^A-Za-z0-9]+/g, '');
  return seq + '/COS/PUK-' + slug + '/' + ROMAWI[bulan - 1] + '/' + tahun;
}

async function submitSetor() {
  const pid = S.profile.pukId;
  const p = S.puk[pid];
  const bulan = +$('fBulan').value;
  const tahun = +$('fTahun').value;
  const harapan = p ? (+p.jumlahAnggota || 0) * (+p.tarifPerAnggota || 0) : 0;
  const total = angka($('fTotal').value) || harapan;
  const tgl = $('fTanggal').value;
  if (!p || !bulan || !tahun || !(total > 0) || !tgl) return toast('Lengkapi data transfer');
  if (!S.tmp.bukti) return toast('Pilih foto bukti transfer dulu');

  const key = periodeKey(tahun, bulan);
  const ada = (S.iuran[pid] || {})[key];
  if (ada && ada.status !== 'Ditolak') return toast('Setoran periode ini sudah ada');

  if (total !== harapan) {
    const lanjut = confirm('Nominal ' + rp(total) + ' tidak sama dengan ' + rp(harapan) + ' (' + p.jumlahAnggota + ' anggota × ' + rp(p.tarifPerAnggota) + '). Tetap kirim?');
    if (!lanjut) return;
  }

  const ok = await jalankan(async () => {
    const up = {};
    up['iuran/' + pid + '/' + key] = {
      periode: key,
      total: total,
      tanggalSetor: tgl,
      status: 'Pending',
      metode: 'Transfer',
      nomorKuitansi: '-',
      jumlahAnggota: +p.jumlahAnggota || 0,
      tarifPerAnggota: +p.tarifPerAnggota || 0,
      selisih: total - harapan,
      dibuat: firebase.database.ServerValue.TIMESTAMP
    };
    up['bukti/' + pid + '/' + key] = S.tmp.bukti;
    await db.ref().update(up);
    return true;
  }, 'Bukti transfer terkirim, menunggu konfirmasi Admin PC');
  if (ok) {
    delete S.tmp.bukti;
    $('fTotal').value = '';
    showTab('riwayat');
  }
}

function viewRiwayat() {
  const pid = S.profile.pukId;
  const per = S.iuran[pid] || {};
  const keys = Object.keys(per).sort().reverse();
  const list = keys.map(k => {
    const i = per[k];
    const metode = i.metode ? ' · ' + esc(i.metode) : '';
    const siap = i.status === 'Lunas' && nomorTerbit(i);
    const catatan = siap ? '<br>' + esc(i.nomorKuitansi)
      : i.status === 'Ditolak' ? '<br>Ditolak. Kirim ulang bukti transfer di menu Setor COS.'
      : '<br>Menunggu konfirmasi Admin PC. Kuitansi terbit setelah dikonfirmasi.';
    const aksi = siap ? '<div class="act"><button class="btn sm prev" onclick="previewKuitansi(\'' + pid + '\',\'' + k + '\')">Preview Kuitansi</button>' +
      '<button class="btn sm" onclick="unduhKuitansi(\'' + pid + '\',\'' + k + '\')">Unduh PDF</button>' +
      '<button class="btn sm alt" onclick="kirimWA(\'' + pid + '\',\'' + k + '\')">WhatsApp</button></div>' : '';
    return '<div class="row"><div class="info"><b>' + esc(labelPeriode(k)) + '</b> ' + badge(i.status) + '<br>' +
      '<span class="hint">' + rp(i.total) + ' · setor ' + esc(fmtTgl(i.tanggalSetor)) + metode + catatan + '</span></div>' + aksi + '</div>';
  }).join('');
  return '<section class="card"><h3>Riwayat setoran</h3>' + (list || '<p class="hint">Belum ada setoran.</p>') + '</section>';
}

function viewAnggota() {
  const ids = Object.keys(S.anggota).sort((a, b) => (S.anggota[a].nama || '').localeCompare(S.anggota[b].nama || ''));
  const aktif = ids.filter(id => S.anggota[id].aktif).length;
  const list = ids.map(id => {
    const a = S.anggota[id];
    const tag = a.aktif ? '<span class="badge b-Lunas">Aktif</span>' : '<span class="badge b-Belum">Nonaktif</span>';
    return '<div class="row"><div class="info">' + esc(a.nama) + ' ' + tag + '</div>' +
      '<div class="act"><button class="btn sm alt" onclick="toggleAnggota(\'' + id + '\')">' + (a.aktif ? 'Nonaktifkan' : 'Aktifkan') + '</button>' +
      '<button class="btn sm bad" onclick="hapusAnggota(\'' + id + '\')">Hapus</button></div></div>';
  }).join('');
  return '<section class="card"><h3>Tambah anggota</h3>' +
    '<label for="aNama">Nama (satu per baris untuk impor banyak)</label><textarea id="aNama"></textarea>' +
    '<p class="hint">Setelah ada anggota terdaftar, jumlah anggota aktif dihitung otomatis dari daftar ini.</p>' +
    '<button class="btn" onclick="tambahAnggota()">Simpan</button></section>' +
    '<section class="card"><h3>Daftar anggota (' + aktif + ' aktif dari ' + ids.length + ')</h3>' + (list || '<p class="hint">Belum ada anggota terdaftar.</p>') + '</section>';
}

async function syncJumlah(pid) {
  const s = await db.ref('anggota/' + pid).once('value');
  const semua = Object.values(s.val() || {});
  if (!semua.length) return;
  await db.ref('puk/' + pid + '/jumlahAnggota').set(semua.filter(a => a.aktif).length);
}

async function tambahAnggota() {
  const pid = S.profile.pukId;
  const nama = $('aNama').value.split('\n').map(x => x.trim()).filter(Boolean);
  if (!nama.length) return toast('Isi nama anggota');
  const ok = await jalankan(async () => {
    const up = {};
    nama.forEach(n => { up[db.ref('anggota/' + pid).push().key] = { nama: n, aktif: true }; });
    await db.ref('anggota/' + pid).update(up);
    await syncJumlah(pid);
    return true;
  }, nama.length + ' anggota ditambahkan');
  if (ok) $('aNama').value = '';
}

function toggleAnggota(id) {
  const pid = S.profile.pukId;
  const a = S.anggota[id];
  if (!a) return;
  jalankan(async () => {
    await db.ref('anggota/' + pid + '/' + id + '/aktif').set(!a.aktif);
    await syncJumlah(pid);
  });
}

function hapusAnggota(id) {
  const pid = S.profile.pukId;
  const a = S.anggota[id];
  if (!a || !confirm('Hapus ' + a.nama + '?')) return;
  jalankan(async () => {
    await db.ref('anggota/' + pid + '/' + id).remove();
    await syncJumlah(pid);
  });
}
