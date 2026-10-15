let lapBulan = '';

const TGL_VALID = /^\d{4}-\d{2}-\d{2}$/;

function entriLaporan() {
  const kas = daftarKasGabungan()
    .filter(x => TGL_VALID.test(x.tgl || ''))
    .map(x => ({
      tgl: x.tgl,
      ket: x.ket || '-',
      masuk: x.jenis === 'keluar' ? 0 : Number(x.nominal) || 0,
      keluar: x.jenis === 'keluar' ? Number(x.nominal) || 0 : 0,
      urut: Number(x.dibuat) || 0
    }));
  const iuran = daftarRiwayat()
    .map(i => ({
      tgl: i.tanggalSetor || tglCetak(i),
      ket: 'Iuran COS PUK ' + ((S.puk[i.pid] || {}).namaPerusahaan || '-') + ' periode ' + labelPeriode(i.key),
      masuk: Number(i.total) || 0,
      keluar: 0,
      urut: Number(i.dibuat) || 0
    }))
    .filter(x => TGL_VALID.test(x.tgl));
  return kas.concat(iuran).sort((a, b) => a.tgl.localeCompare(b.tgl) || a.urut - b.urut);
}

function daftarBulanLaporan(entri) {
  const ada = {};
  entri.forEach(x => { ada[x.tgl.slice(0, 7)] = 1; });
  return Object.keys(ada).sort().reverse();
}

function bulanAktifLaporan(daftar) {
  return daftar.indexOf(lapBulan) >= 0 ? lapBulan : (daftar[0] || '');
}

function rekapBulan(entri, key) {
  const awal = entri
    .filter(x => x.tgl.slice(0, 7) < key)
    .reduce((t, x) => t + x.masuk - x.keluar, 0);
  let saldo = awal;
  const baris = entri
    .filter(x => x.tgl.slice(0, 7) === key)
    .map(x => {
      saldo += x.masuk - x.keluar;
      return Object.assign({}, x, { saldo });
    });
  return {
    awal,
    baris,
    masuk: baris.reduce((t, x) => t + x.masuk, 0),
    keluar: baris.reduce((t, x) => t + x.keluar, 0),
    akhir: saldo
  };
}

const kolomLaporan = n => (n ? ribuan(n) : '');

const saldoLaporan = n => (n < 0 ? '-' : '') + (ribuan(Math.abs(n)) || '0');

const tglPendek = iso => iso.split('-').reverse().join('/');

function ubahBulanLaporan() {
  lapBulan = $('lapBulan').value;
  render();
}

function viewLaporan() {
  const entri = entriLaporan();
  const daftar = daftarBulanLaporan(entri);
  if (!daftar.length) return '';
  const key = bulanAktifLaporan(daftar);
  const r = rekapBulan(entri, key);
  const opsi = daftar.map(k => '<option value="' + k + '"' + (k === key ? ' selected' : '') + '>' + esc(labelPeriode(k)) + '</option>').join('');
  return '<section class="card"><h2>Laporan Pemasukan dan Pengeluaran</h2>' +
    '<label for="lapBulan">Bulan laporan</label>' +
    '<select id="lapBulan" onchange="ubahBulanLaporan()">' + opsi + '</select>' +
    '<p class="hint">Saldo awal bulan ini: ' + esc(rp(r.awal)) + '</p>' +
    '<div class="kas-ringkas"><div><span>Pemasukan</span><b class="kas-masuk">' + esc(rp(r.masuk)) + '</b></div>' +
    '<div><span>Pengeluaran</span><b class="kas-keluar">' + esc(rp(r.keluar)) + '</b></div>' +
    '<div><span>Saldo Akhir</span><b>' + esc(rp(r.akhir)) + '</b></div></div>' +
    '<div class="rk-aksi">' +
    '<button type="button" onclick="pratinjauLaporan()">Pratinjau</button>' +
    '<button type="button" onclick="cetakLaporanPDF()">Unduh PDF</button>' +
    '<button type="button" onclick="unduhFotoLaporan(this)">Unduh Foto</button></div>' +
    '<button type="button" class="rk-wa" onclick="kirimLaporanWA(this)">' + IKON_WA + '<span>Kirim PDF ke WA</span></button></section>';
}

function akhirBulan(key) {
  const [t, b] = key.split('-').map(Number);
  return key + '-' + String(new Date(t, b, 0).getDate()).padStart(2, '0');
}

function tglTandaTangan(c) {
  return [c.kota, fmtTgl(hariIniLokal())].filter(Boolean).join(', ');
}

function tandaTanganLaporan(d, y, key, c) {
  const kolom = [
    { x: 45, jabatan: 'Ketua', nama: c.ketua || '' },
    { x: 105, jabatan: 'Sekretaris', nama: c.sekretaris || '' },
    { x: 165, jabatan: 'Bendahara', nama: c.bendahara || '' }
  ];
  const tglTtd = tglTandaTangan(c);
  const yJabatan = y + 5.5;
  const yNama = yJabatan + 30;

  d.setTextColor(26, 26, 26);
  d.setFont('helvetica', 'normal');
  d.setFontSize(9.5);
  d.text('Mengetahui,', 75, y, { align: 'center' });
  if (tglTtd) d.text(tglTtd, 165, y, { align: 'center' });
  kolom.forEach(k => d.text(k.jabatan, k.x, yJabatan, { align: 'center' }));

  taruhGambar(d, c.stempel, 23, yNama - 24, 26, 22, 'kanan');
  taruhGambar(d, c.ttdKetua, 29, yNama - 24, 32, 22, 'tengah');
  taruhGambar(d, c.ttdSekretaris, 89, yNama - 24, 32, 22, 'tengah');
  taruhGambar(d, c.ttd, 149, yNama - 24, 32, 22, 'tengah');

  d.setFont('helvetica', 'bold');
  d.setFontSize(10);
  d.setDrawColor(26, 26, 26);
  d.setLineWidth(0.25);
  kolom.forEach(k => {
    if (k.nama) d.text(k.nama, k.x, yNama, { align: 'center' });
    const lebar = k.nama ? d.getTextWidth(k.nama) : 36;
    d.line(k.x - lebar / 2, yNama + 1, k.x + lebar / 2, yNama + 1);
  });
}

function buatLaporanPDF(d, key) {
  const c = S.pengaturan || {};
  const r = rekapBulan(entriLaporan(), key);
  const W = 210;
  const tengah = W / 2;

  d.setTextColor(26, 26, 26);
  d.setFont('helvetica', 'bold');
  d.setFontSize(15);
  d.text((c.namaPC || 'Pengurus Cabang').toUpperCase(), tengah, 17, { align: 'center' });
  d.setFont('helvetica', 'normal');
  d.setFontSize(8);
  d.setTextColor(85, 85, 85);
  if (c.alamat) d.text(c.alamat, tengah, 22, { align: 'center' });
  d.setDrawColor(0, 85, 165);
  d.setLineWidth(0.9);
  d.line(15, 25, W - 15, 25);
  d.setDrawColor(253, 185, 19);
  d.setLineWidth(0.3);
  d.line(15, 26.4, W - 15, 26.4);

  d.setTextColor(26, 26, 26);
  d.setFont('helvetica', 'bold');
  d.setFontSize(13);
  d.text('LAPORAN KEUANGAN', tengah, 35, { align: 'center' });
  d.setFont('helvetica', 'normal');
  d.setFontSize(9.5);
  d.text('Periode ' + labelPeriode(key), tengah, 40.5, { align: 'center' });

  d.setFont('helvetica', 'bold');
  d.setFontSize(10);
  d.text('Saldo Awal Bulan Ini: ' + rp(r.awal), 15, 49);

  const kanan = { halign: 'right' };
  d.autoTable({
    startY: 52,
    margin: { left: 15, right: 15, bottom: 15 },
    theme: 'grid',
    showFoot: 'lastPage',
    head: [['Tanggal', 'Keterangan', 'Pemasukan (Rp)', 'Pengeluaran (Rp)', 'Saldo (Rp)']
      .map(t => ({ content: t, styles: { halign: 'center' } }))],
    body: r.baris.map(x => [tglPendek(x.tgl), x.ket, kolomLaporan(x.masuk), kolomLaporan(x.keluar), saldoLaporan(x.saldo)]),
    foot: [
      [{ content: 'Jumlah Bulan Ini', colSpan: 2, styles: kanan }, { content: kolomLaporan(r.masuk) || '0', styles: kanan }, { content: kolomLaporan(r.keluar) || '0', styles: kanan }, ''],
      [{ content: 'Saldo Akhir Bulan Ini', colSpan: 4, styles: kanan }, saldoLaporan(r.akhir)]
    ],
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 2, textColor: [26, 26, 26], lineColor: [190, 196, 204], lineWidth: 0.2, overflow: 'linebreak' },
    headStyles: { fillColor: [0, 85, 165], textColor: [255, 255, 255], fontStyle: 'bold' },
    footStyles: { fillColor: [238, 243, 249], textColor: [26, 26, 26], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 30, halign: 'right' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 30, halign: 'right' }
    }
  });

  let y = d.lastAutoTable.finalY + 12;
  if (y + 46 > 297 - 15) {
    d.addPage();
    y = 25;
  }
  tandaTanganLaporan(d, y, key, c);
  return d;
}

function kunciLaporanAktif() {
  return bulanAktifLaporan(daftarBulanLaporan(entriLaporan()));
}

function namaBerkasLaporan(key, ext) {
  return 'Laporan-Keuangan-' + key + '.' + ext;
}

function teksBagikanLaporan(key) {
  const r = rekapBulan(entriLaporan(), key);
  return 'Laporan keuangan ' + ((S.pengaturan && S.pengaturan.namaPC) || 'PC') + '\nPeriode ' + labelPeriode(key) + '\nSaldo akhir: ' + rp(r.akhir);
}

function buatDokumenLaporan(key) {
  const pustaka = window.jspdf;
  if (!pustaka) throw new Error('Pustaka PDF belum termuat. Periksa koneksi internet.');
  const d = new pustaka.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  if (typeof d.autoTable !== 'function') throw new Error('Pustaka tabel PDF belum termuat. Periksa koneksi internet.');
  return buatLaporanPDF(d, key);
}

function cetakLaporanPDF() {
  const key = kunciLaporanAktif();
  if (!key) return toast('Belum ada transaksi untuk dilaporkan');
  try {
    buatDokumenLaporan(key).save(namaBerkasLaporan(key, 'pdf'));
  } catch (e) {
    toast('Gagal membuat PDF: ' + pesan(e));
  }
}

const LEBAR_LAPORAN = 794;

const GAYA_LAPORAN = `
.pv-stage.lap{align-items:flex-start;overflow:hidden;touch-action:none;overscroll-behavior:contain;-webkit-user-select:none;user-select:none}
.pv-stage.lap .pv-wrap{transform-origin:0 0}
.lap-kertas{position:absolute;left:0;top:0;width:794px;box-sizing:border-box;padding:57px;background:#fff;color:#1a1a1a;font-family:Helvetica,Arial,sans-serif;transform-origin:0 0}
.lap-kop{text-align:center}
.lap-kop b{display:block;font-size:20px;font-weight:700}
.lap-kop span{display:block;margin-top:4px;font-size:11px;color:#555}
.lap-g1{height:3px;margin-top:12px;background:#0055a5}
.lap-g2{height:1px;margin:2px 0 18px;background:#fdb913}
.lap-judul{font-size:17px;font-weight:700;text-align:center}
.lap-periode{margin-top:4px;font-size:12.5px;color:#555;text-align:center}
.lap-awal{margin:18px 0 8px;font-size:13px;font-weight:700}
.lap-tabel{width:100%;border-collapse:collapse;table-layout:fixed;font-size:11.5px}
.lap-tabel th{padding:7px 6px;color:#fff;background:#0055a5;border:1px solid #bec4cc;font-weight:700;text-align:center}
.lap-tabel td{padding:6px;border:1px solid #bec4cc;vertical-align:top;overflow-wrap:anywhere}
.lap-tabel td.t{white-space:nowrap}
.lap-tabel td.a{text-align:right;white-space:nowrap}
.lap-tabel tfoot td{background:#eef3f9;font-weight:700}
.lap-ttd{display:grid;grid-template-columns:1fr 1fr 1fr;row-gap:4px;margin-top:40px;font-size:13px;text-align:center}
.lap-ttd .span2{grid-column:1/3}
.lap-gbr{position:relative;height:100px}
.lap-gbr img{position:absolute;bottom:4px;height:83px;object-fit:contain}
.lap-gbr .st{left:calc(50% - 83px);width:98px;object-position:right bottom}
.lap-gbr .tt{left:calc(50% - 60px);width:121px;object-position:center bottom}
.lap-nama span{display:inline-block;min-width:136px;min-height:17px;padding:0 6px;border-bottom:1px solid #1a1a1a;font-weight:700}
`;

function pasangGayaLaporan() {
  if ($('gayaLaporan')) return;
  const el = document.createElement('style');
  el.id = 'gayaLaporan';
  el.textContent = GAYA_LAPORAN;
  document.head.appendChild(el);
}

function htmlLaporan(key) {
  const c = S.pengaturan || {};
  const r = rekapBulan(entriLaporan(), key);
  const tglTtd = tglTandaTangan(c);
  const baris = r.baris.map(x =>
    '<tr><td class="t">' + esc(tglPendek(x.tgl)) + '</td><td>' + esc(x.ket) + '</td>' +
    '<td class="a">' + esc(kolomLaporan(x.masuk)) + '</td><td class="a">' + esc(kolomLaporan(x.keluar)) + '</td>' +
    '<td class="a">' + esc(saldoLaporan(x.saldo)) + '</td></tr>'
  ).join('');
  const gambar = (src, kelas) => (src ? '<img class="' + kelas + '" alt="" src="' + src + '">' : '');
  const nama = v => '<div class="lap-nama"><span>' + esc(v || '') + '</span></div>';
  return '<div class="lap-kertas" id="lapKertas">' +
    '<div class="lap-kop"><b>' + esc((c.namaPC || 'Pengurus Cabang').toUpperCase()) + '</b>' + (c.alamat ? '<span>' + esc(c.alamat) + '</span>' : '') + '</div>' +
    '<div class="lap-g1"></div><div class="lap-g2"></div>' +
    '<div class="lap-judul">LAPORAN KEUANGAN</div><div class="lap-periode">Periode ' + esc(labelPeriode(key)) + '</div>' +
    '<div class="lap-awal">Saldo Awal Bulan Ini: ' + esc(rp(r.awal)) + '</div>' +
    '<table class="lap-tabel"><colgroup><col style="width:83px"><col><col style="width:113px"><col style="width:113px"><col style="width:113px"></colgroup>' +
    '<thead><tr><th>Tanggal</th><th>Keterangan</th><th>Pemasukan (Rp)</th><th>Pengeluaran (Rp)</th><th>Saldo (Rp)</th></tr></thead>' +
    '<tbody>' + baris + '</tbody>' +
    '<tfoot><tr><td colspan="2" class="a">Jumlah Bulan Ini</td><td class="a">' + esc(kolomLaporan(r.masuk) || '0') + '</td><td class="a">' + esc(kolomLaporan(r.keluar) || '0') + '</td><td></td></tr>' +
    '<tr><td colspan="4" class="a">Saldo Akhir Bulan Ini</td><td class="a">' + esc(saldoLaporan(r.akhir)) + '</td></tr></tfoot></table>' +
    '<div class="lap-ttd"><div class="span2">Mengetahui,</div><div>' + esc(tglTtd) + '</div>' +
    '<div>Ketua</div><div>Sekretaris</div><div>Bendahara</div>' +
    '<div class="lap-gbr">' + gambar(c.stempel, 'st') + gambar(c.ttdKetua, 'tt') + '</div><div class="lap-gbr">' + gambar(c.ttdSekretaris, 'tt') + '</div><div class="lap-gbr">' + gambar(c.ttd, 'tt') + '</div>' +
    nama(c.ketua) + nama(c.sekretaris) + nama(c.bendahara) + '</div></div>';
}

const LAP_ZOOM_MIN = 1;
const LAP_ZOOM_MAKS = 4;
const LAP_ZOOM_KETUK = 2.5;
const LAP_PINGGIR = 12;

let lapRiwayat = false;
let lapZoomAtur = null;
let lapZoomHapus = null;

function skalaLaporan() {
  const st = $('lapStage');
  const w = $('lapWrap');
  const k = $('lapKertas');
  if (!st || !w || !k) return;
  const s = Math.max(0.2, Math.min((st.clientWidth - 24) / LEBAR_LAPORAN, 1.5));
  w.style.width = (LEBAR_LAPORAN * s).toFixed(1) + 'px';
  w.style.height = (k.offsetHeight * s).toFixed(1) + 'px';
  k.style.transform = 'scale(' + s.toFixed(4) + ')';
  if (lapZoomAtur) lapZoomAtur();
}

function pasangZoomLaporan(stage, wrap) {
  const st = { z: 1, x: 0, y: 0 };
  let dasarX = 0;
  let dasarY = 0;
  let awal = null;
  let ketukAkhir = null;
  let anim = 0;

  const batasZoom = z => Math.min(LAP_ZOOM_MAKS, Math.max(LAP_ZOOM_MIN, z));
  const jarak = t => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1;
  const tengah = t => ({ x: (t[0].clientX + t[1].clientX) / 2, y: (t[0].clientY + t[1].clientY) / 2 });

  const hentikan = () => {
    if (anim) cancelAnimationFrame(anim);
    anim = 0;
  };

  const terapkan = () => {
    const r = stage.getBoundingClientRect();
    const lebar = wrap.offsetWidth * st.z;
    const tinggi = wrap.offsetHeight * st.z;
    const vw = stage.clientWidth;
    const vh = stage.clientHeight;
    let kiri = dasarX + st.x;
    let atas = dasarY + st.y;
    if (lebar + LAP_PINGGIR * 2 <= vw) kiri = r.left + (vw - lebar) / 2;
    else kiri = Math.min(r.left + LAP_PINGGIR, Math.max(r.left + vw - lebar - LAP_PINGGIR, kiri));
    if (tinggi + LAP_PINGGIR * 2 <= vh) atas = r.top + LAP_PINGGIR;
    else atas = Math.min(r.top + LAP_PINGGIR, Math.max(r.top + vh - tinggi - LAP_PINGGIR, atas));
    st.x = kiri - dasarX;
    st.y = atas - dasarY;
    wrap.style.transform = 'translate(' + st.x.toFixed(2) + 'px,' + st.y.toFixed(2) + 'px) scale(' + st.z.toFixed(4) + ')';
  };

  const ukurDasar = () => {
    st.z = 1;
    st.x = 0;
    st.y = 0;
    wrap.style.transform = '';
    const r = wrap.getBoundingClientRect();
    dasarX = r.left;
    dasarY = r.top;
  };

  const atur = () => {
    hentikan();
    awal = null;
    ukurDasar();
  };

  const zoomKe = (z, cx, cy) => {
    const baru = batasZoom(z);
    const qx = (cx - dasarX - st.x) / st.z;
    const qy = (cy - dasarY - st.y) / st.z;
    st.z = baru;
    st.x = cx - qx * baru - dasarX;
    st.y = cy - qy * baru - dasarY;
    terapkan();
  };

  const animasiZoom = (target, cx, cy) => {
    hentikan();
    const dari = st.z;
    const t0 = performance.now();
    const langkah = now => {
      const p = Math.min(1, (now - t0) / 180);
      zoomKe(dari + (target - dari) * (1 - Math.pow(1 - p, 3)), cx, cy);
      anim = p < 1 ? requestAnimationFrame(langkah) : 0;
    };
    anim = requestAnimationFrame(langkah);
  };

  const luncur = (vx, vy) => {
    hentikan();
    let akhir = performance.now();
    const langkah = now => {
      const dt = Math.min(now - akhir, 50);
      akhir = now;
      const redam = Math.exp(-dt / 325);
      vx *= redam;
      vy *= redam;
      const tx = st.x + vx * dt;
      const ty = st.y + vy * dt;
      st.x = tx;
      st.y = ty;
      terapkan();
      if (Math.abs(st.x - tx) > 0.5) vx = 0;
      if (Math.abs(st.y - ty) > 0.5) vy = 0;
      anim = Math.abs(vx) + Math.abs(vy) > 0.02 ? requestAnimationFrame(langkah) : 0;
    };
    anim = requestAnimationFrame(langkah);
  };

  const mulai = e => {
    hentikan();
    const t = e.touches;
    if (t.length >= 2) {
      const m = tengah(t);
      ketukAkhir = null;
      awal = {
        mode: 'cubit',
        jarak: jarak(t),
        z: st.z,
        qx: (m.x - dasarX - st.x) / st.z,
        qy: (m.y - dasarY - st.y) / st.z
      };
    } else if (t.length === 1) {
      const n = performance.now();
      awal = {
        mode: 'geser',
        px: t[0].clientX,
        py: t[0].clientY,
        lx: t[0].clientX,
        ly: t[0].clientY,
        pindah: false,
        jejak: [{ t: n, x: t[0].clientX, y: t[0].clientY }]
      };
    } else {
      awal = null;
    }
  };

  const gerak = e => {
    if (!awal) return;
    const t = e.touches;
    e.preventDefault();
    if (awal.mode === 'cubit' && t.length >= 2) {
      const m = tengah(t);
      st.z = batasZoom(awal.z * jarak(t) / awal.jarak);
      st.x = m.x - awal.qx * st.z - dasarX;
      st.y = m.y - awal.qy * st.z - dasarY;
      terapkan();
    } else if (awal.mode === 'geser' && t.length === 1) {
      const c = t[0];
      if (Math.hypot(c.clientX - awal.px, c.clientY - awal.py) > 8) awal.pindah = true;
      st.x += c.clientX - awal.lx;
      st.y += c.clientY - awal.ly;
      awal.lx = c.clientX;
      awal.ly = c.clientY;
      terapkan();
      const n = performance.now();
      awal.jejak.push({ t: n, x: c.clientX, y: c.clientY });
      while (awal.jejak.length > 2 && n - awal.jejak[0].t > 100) awal.jejak.shift();
    }
  };

  const selesai = e => {
    if (e.touches.length > 0) {
      mulai(e);
      if (awal && awal.mode === 'geser') awal.pindah = true;
      return;
    }
    const a = awal;
    awal = null;
    if (!a || a.mode !== 'geser') return;
    const c = e.changedTouches[0];
    const n = performance.now();
    if (!a.pindah) {
      if (ketukAkhir && n - ketukAkhir.t < 320 && Math.hypot(c.clientX - ketukAkhir.x, c.clientY - ketukAkhir.y) < 40) {
        ketukAkhir = null;
        animasiZoom(st.z > 1.05 ? 1 : LAP_ZOOM_KETUK, c.clientX, c.clientY);
      } else {
        ketukAkhir = { t: n, x: c.clientX, y: c.clientY };
      }
      return;
    }
    ketukAkhir = null;
    const j = a.jejak;
    const akhirJejak = j[j.length - 1];
    if (j.length >= 2 && n - akhirJejak.t < 80) {
      const dt = akhirJejak.t - j[0].t;
      if (dt > 0) luncur((akhirJejak.x - j[0].x) / dt, (akhirJejak.y - j[0].y) / dt);
    }
  };

  const batal = () => {
    awal = null;
  };

  const roda = e => {
    e.preventDefault();
    hentikan();
    if (e.ctrlKey || e.metaKey) {
      zoomKe(st.z * Math.exp(-e.deltaY * 0.01), e.clientX, e.clientY);
    } else {
      st.x -= e.deltaX;
      st.y -= e.deltaY;
      terapkan();
    }
  };

  const opsi = { passive: false };
  stage.addEventListener('touchstart', mulai, opsi);
  stage.addEventListener('touchmove', gerak, opsi);
  stage.addEventListener('touchend', selesai, opsi);
  stage.addEventListener('touchcancel', batal, opsi);
  stage.addEventListener('wheel', roda, opsi);

  lapZoomAtur = atur;
  lapZoomHapus = () => {
    hentikan();
    stage.removeEventListener('touchstart', mulai, opsi);
    stage.removeEventListener('touchmove', gerak, opsi);
    stage.removeEventListener('touchend', selesai, opsi);
    stage.removeEventListener('touchcancel', batal, opsi);
    stage.removeEventListener('wheel', roda, opsi);
    lapZoomAtur = null;
    lapZoomHapus = null;
  };
  ukurDasar();
}

function tombolEscLaporan(e) {
  if (e.key === 'Escape') tutupPratinjauLaporan();
}

function bersihPratinjauLaporan() {
  if (lapZoomHapus) lapZoomHapus();
  const ov = $('lapOv');
  if (ov) ov.remove();
  document.body.classList.remove('pv-buka');
  window.removeEventListener('resize', skalaLaporan);
  document.removeEventListener('keydown', tombolEscLaporan);
  window.removeEventListener('popstate', bersihPratinjauLaporan);
  lapRiwayat = false;
}

function tutupPratinjauLaporan() {
  if (lapRiwayat && history.state && history.state.laporan) {
    history.back();
    setTimeout(() => {
      if ($('lapOv')) bersihPratinjauLaporan();
    }, 500);
    return;
  }
  bersihPratinjauLaporan();
}

function pratinjauLaporan() {
  const key = kunciLaporanAktif();
  if (!key) return toast('Belum ada transaksi untuk dilaporkan');
  if ($('lapOv')) bersihPratinjauLaporan();
  pasangGayaPratinjau();
  pasangGayaLaporan();
  const ov = document.createElement('div');
  ov.id = 'lapOv';
  ov.className = 'pv-ov';
  ov.setAttribute('role', 'dialog');
  ov.setAttribute('aria-modal', 'true');
  ov.setAttribute('aria-label', 'Pratinjau laporan keuangan');
  ov.innerHTML =
    '<div class="pv-bar"><b>Pratinjau Laporan</b><button type="button" class="pv-x" onclick="tutupPratinjauLaporan()">Tutup</button></div>' +
    '<div class="pv-stage lap" id="lapStage"><div class="pv-wrap" id="lapWrap">' + htmlLaporan(key) + '</div></div>' +
    '<div class="pv-act">' +
    '<button type="button" class="pv-wa" onclick="kirimLaporanWA(this)">' + IKON_WA + '<span>Kirim PDF ke WA</span></button>' +
    '<button type="button" class="pv-pdf" onclick="cetakLaporanPDF()">Unduh PDF</button>' +
    '<button type="button" class="pv-foto" onclick="unduhFotoLaporan(this)">Unduh Foto</button>' +
    '</div>';
  document.body.appendChild(ov);
  document.body.classList.add('pv-buka');
  skalaLaporan();
  pasangZoomLaporan($('lapStage'), $('lapWrap'));
  window.addEventListener('resize', skalaLaporan);
  document.addEventListener('keydown', tombolEscLaporan);
  try {
    history.pushState({ laporan: true }, '');
    lapRiwayat = true;
  } catch (e) {
    lapRiwayat = false;
  }
  window.addEventListener('popstate', bersihPratinjauLaporan);
  const x = ov.querySelector('.pv-x');
  if (x) x.focus();
}

function fotoLaporanBlob(key) {
  pasangGayaPratinjau();
  pasangGayaLaporan();
  const wadah = document.createElement('div');
  wadah.innerHTML = htmlLaporan(key);
  return fotoDariKertas(wadah.firstChild);
}

function unduhFotoLaporan(tombol) {
  const key = kunciLaporanAktif();
  if (!key) return toast('Belum ada transaksi untuk dilaporkan');
  denganTombol(tombol, async () => {
    unduhBlob(await fotoLaporanBlob(key), namaBerkasLaporan(key, 'png'));
  });
}

function kirimLaporanWA(tombol) {
  const key = kunciLaporanAktif();
  if (!key) return toast('Belum ada transaksi untuk dilaporkan');
  const teks = teksBagikanLaporan(key);
  denganTombol(tombol, async () => {
    const blob = buatDokumenLaporan(key).output('blob');
    const berkas = new File([blob], namaBerkasLaporan(key, 'pdf'), { type: 'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files: [berkas] })) {
      try {
        await navigator.share({ files: [berkas], title: 'Laporan Keuangan PC', text: teks });
        return;
      } catch (e) {
        if (e && e.name === 'AbortError') return;
      }
    }
    unduhBlob(blob, berkas.name);
    toast('PDF tersimpan. Lampirkan di WhatsApp.');
    setTimeout(() => { window.open('https://wa.me/?text=' + encodeURIComponent(teks), '_blank'); }, 700);
  });
}

const URL_XLSX = 'https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.min.js';

const FORMAT_ANGKA = '#,##0;-#,##0';

let janjiXLSX = null;

function muatXLSX() {
  if (window.XLSX && window.XLSX.style_version) return Promise.resolve(window.XLSX);
  if (janjiXLSX) return janjiXLSX;
  janjiXLSX = new Promise((ok, gagal) => {
    const el = document.createElement('script');
    el.src = URL_XLSX;
    el.onload = () => ok(window.XLSX);
    el.onerror = () => {
      janjiXLSX = null;
      el.remove();
      gagal(new Error('Pustaka XLSX gagal dimuat. Periksa koneksi internet.'));
    };
    document.head.appendChild(el);
  });
  return janjiXLSX;
}

function gayaXLSX() {
  const garis = { style: 'thin', color: { rgb: 'BEC4CC' } };
  const batas = { top: garis, bottom: garis, left: garis, right: garis };
  const huruf = { name: 'Calibri', sz: 10 };
  const tebal = Object.assign({}, huruf, { bold: true });
  const isi = { fill: { fgColor: { rgb: 'EEF3F9' } }, border: batas };
  return {
    judul: { font: Object.assign({}, huruf, { bold: true, sz: 14 }), alignment: { horizontal: 'center' } },
    judulLaporan: { font: Object.assign({}, huruf, { bold: true, sz: 12 }), alignment: { horizontal: 'center' } },
    sub: { font: Object.assign({}, huruf, { sz: 9, color: { rgb: '555555' } }), alignment: { horizontal: 'center' } },
    kepala: { font: Object.assign({}, tebal, { color: { rgb: 'FFFFFF' } }), fill: { fgColor: { rgb: '0055A5' } }, border: batas, alignment: { horizontal: 'center', vertical: 'center', wrapText: true } },
    teks: { font: huruf, border: batas, alignment: { vertical: 'top', wrapText: true } },
    tengah: { font: huruf, border: batas, alignment: { horizontal: 'center', vertical: 'top' } },
    angka: { font: huruf, border: batas, alignment: { horizontal: 'right', vertical: 'top' } },
    jumlahTeks: Object.assign({ font: tebal, alignment: { horizontal: 'right' } }, isi),
    jumlahAngka: Object.assign({ font: tebal, alignment: { horizontal: 'right' } }, isi),
    ttd: { font: huruf, alignment: { horizontal: 'center' } },
    nama: { font: tebal, border: { bottom: { style: 'thin', color: { rgb: '1A1A1A' } } }, alignment: { horizontal: 'center' } }
  };
}

function sel(ws, br, kol, nilai, gaya) {
  const angkaSel = typeof nilai === 'number';
  const isi = { v: nilai == null ? '' : nilai, t: angkaSel ? 'n' : 's', s: gaya };
  if (angkaSel) isi.z = FORMAT_ANGKA;
  ws[XLSX.utils.encode_cell({ r: br, c: kol })] = isi;
}

function selGabung(ws, br, dari, sampai, nilai, gaya) {
  sel(ws, br, dari, nilai, gaya);
  for (let k = dari + 1; k <= sampai; k++) sel(ws, br, k, '', gaya);
  if (sampai > dari) ws['!merges'].push({ s: { r: br, c: dari }, e: { r: br, c: sampai } });
}

function tutupLembar(ws, barisAkhir, lebar) {
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: barisAkhir, c: lebar.length - 1 } });
  ws['!cols'] = lebar.map(w => ({ wch: w }));
  return ws;
}

let gayaLembar = null;

function kopLembar(ws, c, subjudul) {
  selGabung(ws, 0, 0, 4, (c.namaPC || 'Pengurus Cabang').toUpperCase(), gayaLembar.judul);
  selGabung(ws, 1, 0, 4, c.alamat || '', gayaLembar.sub);
  selGabung(ws, 2, 0, 4, 'LAPORAN KEUANGAN', gayaLembar.judulLaporan);
  selGabung(ws, 3, 0, 4, subjudul, gayaLembar.sub);
}

function lembarRingkasan(entri, daftar, c) {
  const g = gayaLembar;
  const ws = { '!merges': [] };
  kopLembar(ws, c, 'Ringkasan seluruh periode');
  ['Bulan', 'Saldo Awal (Rp)', 'Pemasukan (Rp)', 'Pengeluaran (Rp)', 'Saldo Akhir (Rp)'].forEach((t, k) => sel(ws, 5, k, t, g.kepala));
  let br = 6;
  let masuk = 0;
  let keluar = 0;
  let akhir = 0;
  daftar.forEach(key => {
    const r = rekapBulan(entri, key);
    sel(ws, br, 0, labelPeriode(key), g.teks);
    sel(ws, br, 1, r.awal, g.angka);
    sel(ws, br, 2, r.masuk, g.angka);
    sel(ws, br, 3, r.keluar, g.angka);
    sel(ws, br, 4, r.akhir, g.angka);
    masuk += r.masuk;
    keluar += r.keluar;
    akhir = r.akhir;
    br++;
  });
  sel(ws, br, 0, 'Total', g.jumlahTeks);
  sel(ws, br, 1, '', g.jumlahTeks);
  sel(ws, br, 2, masuk, g.jumlahAngka);
  sel(ws, br, 3, keluar, g.jumlahAngka);
  sel(ws, br, 4, akhir, g.jumlahAngka);
  return tutupLembar(ws, br, [22, 20, 20, 20, 20]);
}

function lembarBulan(entri, key, c) {
  const g = gayaLembar;
  const r = rekapBulan(entri, key);
  const ws = { '!merges': [], '!rows': [] };
  kopLembar(ws, c, 'Periode ' + labelPeriode(key));
  selGabung(ws, 5, 0, 3, 'Saldo Awal Bulan Ini', g.jumlahTeks);
  sel(ws, 5, 4, r.awal, g.jumlahAngka);
  ['Tanggal', 'Keterangan', 'Pemasukan (Rp)', 'Pengeluaran (Rp)', 'Saldo (Rp)'].forEach((t, k) => sel(ws, 6, k, t, g.kepala));
  let br = 7;
  r.baris.forEach(x => {
    sel(ws, br, 0, tglPendek(x.tgl), g.tengah);
    sel(ws, br, 1, x.ket, g.teks);
    sel(ws, br, 2, x.masuk || '', g.angka);
    sel(ws, br, 3, x.keluar || '', g.angka);
    sel(ws, br, 4, x.saldo, g.angka);
    br++;
  });
  selGabung(ws, br, 0, 1, 'Jumlah Bulan Ini', g.jumlahTeks);
  sel(ws, br, 2, r.masuk, g.jumlahAngka);
  sel(ws, br, 3, r.keluar, g.jumlahAngka);
  sel(ws, br, 4, '', g.jumlahTeks);
  br++;
  selGabung(ws, br, 0, 3, 'Saldo Akhir Bulan Ini', g.jumlahTeks);
  sel(ws, br, 4, r.akhir, g.jumlahAngka);
  br += 2;
  selGabung(ws, br, 0, 1, 'Mengetahui,', g.ttd);
  selGabung(ws, br, 3, 4, tglTandaTangan(c), g.ttd);
  br++;
  selGabung(ws, br, 0, 1, 'Ketua', g.ttd);
  selGabung(ws, br, 2, 3, 'Sekretaris', g.ttd);
  sel(ws, br, 4, 'Bendahara', g.ttd);
  br++;
  ws['!rows'][br] = { hpt: 56 };
  br++;
  selGabung(ws, br, 0, 1, c.ketua || '', g.nama);
  selGabung(ws, br, 2, 3, c.sekretaris || '', g.nama);
  sel(ws, br, 4, c.bendahara || '', g.nama);
  return tutupLembar(ws, br, [12, 50, 18, 18, 18]);
}

async function eksporLaporanXLSX() {
  const entri = entriLaporan();
  const daftar = daftarBulanLaporan(entri).reverse();
  if (!daftar.length) return toast('Belum ada transaksi untuk diekspor');
  await jalankan(async () => {
    await muatXLSX();
    const c = S.pengaturan || {};
    gayaLembar = gayaXLSX();
    const buku = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(buku, lembarRingkasan(entri, daftar, c), 'Ringkasan');
    daftar.forEach(key => XLSX.utils.book_append_sheet(buku, lembarBulan(entri, key, c), labelPeriode(key)));
    const data = XLSX.write(buku, { bookType: 'xlsx', type: 'array' });
    unduhBlob(new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'Laporan-Keuangan-COS.xlsx');
  }, 'Laporan XLSX diunduh');
}

const viewRiwayatLaporanAsli = VIEWS.kuitansi;

VIEWS.kuitansi = () => {
  const html = viewRiwayatLaporanAsli();
  return subRiwayat === 'kas' ? html.replace('</div>', m => m + viewLaporan()) : html;
};
