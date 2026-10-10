const PX = 4;
const PT = 1.411;
const LEBAR_KERTAS = 840;
const TINGGI_KERTAS = 592;

let pvAktif = null;
let pvFoto = null;

function buatQR(teks) {
  const q = qrcode(0, 'M');
  q.addData(teks);
  q.make();
  return q;
}

function gambarQR(d, teks, x, y, size) {
  const q = buatQR(teks);
  const n = q.getModuleCount();
  const m = size / n;
  d.setFillColor(0, 0, 0);
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (q.isDark(r, c)) d.rect(x + c * m, y + r * m, m + 0.02, m + 0.02, 'F');
    }
  }
}

function svgQR(teks) {
  const q = buatQR(teks);
  const n = q.getModuleCount();
  let p = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (q.isDark(r, c)) p += 'M' + c + ' ' + r + 'h1v1h-1z';
    }
  }
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + n + ' ' + n + '" shape-rendering="crispEdges">' +
    '<rect width="' + n + '" height="' + n + '" fill="#fff"/><path d="' + p + '" fill="#000"/></svg>';
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

function hitungGambar(d, src, x, y, maxW, maxH, rata) {
  if (!src) return null;
  try {
    const pr = d.getImageProperties(src);
    const k = Math.min(maxW / pr.width, maxH / pr.height);
    const w = pr.width * k;
    const h = pr.height * k;
    const px = rata === 'kanan' ? x + maxW - w : x + (maxW - w) / 2;
    return { src, tipe: pr.fileType || 'PNG', x: px, y: y + (maxH - h), w, h };
  } catch (e) {
    return null;
  }
}

function taruhGambar(d, src, x, y, maxW, maxH, rata) {
  const g = hitungGambar(d, src, x, y, maxW, maxH, rata);
  if (!g) return;
  try {
    d.addImage(g.src, g.tipe, g.x, g.y, g.w, g.h);
  } catch (e) {}
}

function susunKuitansi(d, pid, key) {
  const p = S.puk[pid] || {};
  const i = (S.iuran[pid] || {})[key] || {};
  const c = S.pengaturan || {};
  const W = 210;
  const namaPUK = p.namaPerusahaan || '';
  const periode = labelPeriode(key);
  const nomor = i.nomorKuitansi || '';

  const isi = [
    ['Telah terima dari', 'PUK ' + namaPUK],
    ['Uang sejumlah', terbilangRupiah(i.total || 0)],
    ['Untuk pembayaran', 'Iuran COS periode ' + periode],
    ['Tanggal setor', fmtTgl(i.tanggalSetor)],
    ['Status', 'Lunas']
  ];
  d.setFont('helvetica', 'bold');
  d.setFontSize(10);
  let y = 54;
  const baris = isi.map(([label, nilai]) => {
    const lines = d.splitTextToSize(nilai, W - 16 - 59);
    const r = { label, lines, y };
    y += Math.max(1, lines.length) * 4.6 + 3.2;
    return r;
  });

  const jumlahTeks = rp(i.total || 0);
  d.setFont('helvetica', 'bold');
  d.setFontSize(14);
  const lebarJumlah = d.getTextWidth(jumlahTeks);
  const jumlahPt = lebarJumlah > 60 ? Math.max(8, 14 * 60 / lebarJumlah) : 14;

  const bendahara = c.bendahara || '';
  d.setFont('helvetica', 'bold');
  d.setFontSize(10);
  const lebarNama = bendahara ? d.getTextWidth(bendahara) : 0;

  return {
    namaPC: (c.namaPC || 'Pengurus Cabang').toUpperCase(),
    alamat: c.alamat || '',
    nomor,
    baris,
    qrTeks: 'KUITANSI COS|' + nomor + '|' + namaPUK + '|' + periode + '|' + (i.total || 0) + '|' + (i.status || ''),
    jumlahTeks,
    jumlahPt,
    ttdTgl: [c.kota, fmtTgl(tglCetak(i))].filter(Boolean).join(', '),
    jabatan: c.jabatan || 'Bendahara',
    bendahara,
    lebarNama,
    stempel: hitungGambar(d, c.stempel, 140, 100, 26, 22, 'kanan'),
    ttd: hitungGambar(d, c.ttd, 146, 100, 32, 22, 'tengah')
  };
}

function buatPDF(pid, key) {
  const { jsPDF } = window.jspdf;
  const d = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a5' });
  const m = susunKuitansi(d, pid, key);
  const W = 210, H = 148;
  const tengah = W / 2;
  const xLabel = 16, xTitik = 55, xNilai = 59;

  d.setDrawColor(40, 40, 40);
  d.setLineWidth(0.5);
  d.rect(8, 8, W - 16, H - 16);
  d.setLineWidth(0.15);
  d.rect(9.5, 9.5, W - 19, H - 19);

  d.setTextColor(26, 26, 26);
  d.setFont('helvetica', 'bold');
  d.setFontSize(17);
  d.text(m.namaPC, tengah, 21, { align: 'center' });
  d.setFont('helvetica', 'normal');
  d.setFontSize(8);
  d.setTextColor(85, 85, 85);
  if (m.alamat) d.text(m.alamat, tengah, 26, { align: 'center' });
  d.setDrawColor(0, 85, 165);
  d.setLineWidth(0.9);
  d.line(14, 30, W - 14, 30);
  d.setDrawColor(253, 185, 19);
  d.setLineWidth(0.3);
  d.line(14, 31.4, W - 14, 31.4);

  d.setTextColor(26, 26, 26);
  d.setFont('helvetica', 'bold');
  d.setFontSize(13);
  d.text('KUITANSI IURAN COS PC', tengah, 39, { align: 'center' });
  d.setFont('helvetica', 'normal');
  d.setFontSize(9);
  d.setTextColor(85, 85, 85);
  d.text('No: ' + m.nomor, tengah, 44.5, { align: 'center' });

  m.baris.forEach(b => {
    d.setFontSize(10);
    d.setFont('helvetica', 'normal');
    d.setTextColor(85, 85, 85);
    d.text(b.label, xLabel, b.y);
    d.text(':', xTitik, b.y);
    d.setFont('helvetica', 'bold');
    if (b.label === 'Status') d.setTextColor(21, 128, 61);
    else d.setTextColor(26, 26, 26);
    d.text(b.lines, xNilai, b.y);
  });

  gambarQR(d, m.qrTeks, 16, 92, 28);
  d.setFont('helvetica', 'normal');
  d.setFontSize(6.5);
  d.setTextColor(85, 85, 85);
  d.text('Pindai untuk memeriksa data', 30, 123, { align: 'center' });

  d.setFillColor(248, 249, 250);
  d.setDrawColor(190, 196, 204);
  d.setLineWidth(0.25);
  d.roundedRect(52, 96, 66, 16, 1.8, 1.8, 'FD');
  d.setFontSize(7);
  d.setTextColor(85, 85, 85);
  d.text('JUMLAH DITERIMA', 85, 100.6, { align: 'center' });
  d.setFont('helvetica', 'bold');
  d.setFontSize(m.jumlahPt);
  d.setTextColor(26, 26, 26);
  d.text(m.jumlahTeks, 85, 108.5, { align: 'center' });

  d.setFont('helvetica', 'normal');
  d.setFontSize(9);
  d.setTextColor(26, 26, 26);
  if (m.ttdTgl) d.text(m.ttdTgl, 162, 94, { align: 'center' });
  d.text(m.jabatan, 162, 99, { align: 'center' });
  if (m.stempel) d.addImage(m.stempel.src, m.stempel.tipe, m.stempel.x, m.stempel.y, m.stempel.w, m.stempel.h);
  if (m.ttd) d.addImage(m.ttd.src, m.ttd.tipe, m.ttd.x, m.ttd.y, m.ttd.w, m.ttd.h);
  if (m.bendahara) {
    d.setFont('helvetica', 'bold');
    d.setFontSize(10);
    d.text(m.bendahara, 162, 125, { align: 'center' });
    d.setDrawColor(26, 26, 26);
    d.setLineWidth(0.25);
    d.line(162 - m.lebarNama / 2, 126, 162 + m.lebarNama / 2, 126);
  }
  return d;
}

function namaBerkasKuitansi(pid, key, ext) {
  const nama = ((S.puk[pid] || {}).namaPerusahaan || 'PUK').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return 'Kuitansi-COS-' + nama + '-' + key + '.' + ext;
}

function unduhBlob(blob, nama) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nama;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function unduhKuitansi(pid, key) {
  try {
    buatPDF(pid, key).save(namaBerkasKuitansi(pid, key, 'pdf'));
  } catch (e) {
    toast('Gagal membuat PDF: ' + pesan(e));
  }
}

const mm = v => (v * PX).toFixed(2) + 'px';

function elTeks(teks, x, y, pt, o) {
  o = o || {};
  const fs = pt * PT;
  const gaya = [
    'left:' + mm(x),
    'top:' + (y * PX - fs * 0.92).toFixed(2) + 'px',
    'font-size:' + fs.toFixed(2) + 'px',
    'color:' + (o.warna || '#1a1a1a')
  ];
  if (o.tebal) gaya.push('font-weight:700');
  if (o.tengah) gaya.push('transform:translateX(-50%)', 'text-align:center');
  const isi = Array.isArray(teks) ? teks.map(esc).join('<br>') : esc(teks);
  return '<div class="kt" style="' + gaya.join(';') + '">' + isi + '</div>';
}

function elKotak(x, y, w, h, gaya) {
  return '<div class="kb" style="left:' + mm(x) + ';top:' + mm(y) + ';width:' + mm(w) + ';height:' + mm(h) + ';' + gaya + '"></div>';
}

function elGambar(g) {
  if (!g) return '';
  return '<img class="kb" alt="" src="' + g.src + '" style="left:' + mm(g.x) + ';top:' + mm(g.y) + ';width:' + mm(g.w) + ';height:' + mm(g.h) + '">';
}

function htmlKertas(m) {
  const abu = '#555555';
  const h = [];
  h.push(elKotak(8, 8, 194, 132, 'border:2px solid #282828'));
  h.push(elKotak(9.5, 9.5, 191, 129, 'border:1px solid #282828'));
  h.push(elTeks(m.namaPC, 105, 21, 17, { tebal: true, tengah: true }));
  if (m.alamat) h.push(elTeks(m.alamat, 105, 26, 8, { warna: abu, tengah: true }));
  h.push(elKotak(14, 29.55, 182, 0.9, 'background:#0055a5'));
  h.push(elKotak(14, 31.25, 182, 0.3, 'background:#fdb913'));
  h.push(elTeks('KUITANSI IURAN COS PC', 105, 39, 13, { tebal: true, tengah: true }));
  h.push(elTeks('No: ' + m.nomor, 105, 44.5, 9, { warna: abu, tengah: true }));
  m.baris.forEach(b => {
    h.push(elTeks(b.label, 16, b.y, 10, { warna: abu }));
    h.push(elTeks(':', 55, b.y, 10, { warna: abu }));
    h.push(elTeks(b.lines, 59, b.y, 10, { tebal: true, warna: b.label === 'Status' ? '#15803d' : '#1a1a1a' }));
  });
  h.push('<img class="kb" alt="" src="' + svgQR(m.qrTeks) + '" style="left:' + mm(16) + ';top:' + mm(92) + ';width:' + mm(28) + ';height:' + mm(28) + '">');
  h.push(elTeks('Pindai untuk memeriksa data', 30, 123, 6.5, { warna: abu, tengah: true }));
  h.push(elKotak(52, 96, 66, 16, 'background:#f8f9fa;border:1px solid #bec4cc;border-radius:7px'));
  h.push(elTeks('JUMLAH DITERIMA', 85, 100.6, 7, { warna: abu, tengah: true }));
  h.push(elTeks(m.jumlahTeks, 85, 108.5, m.jumlahPt, { tebal: true, tengah: true }));
  if (m.ttdTgl) h.push(elTeks(m.ttdTgl, 162, 94, 9, { tengah: true }));
  h.push(elTeks(m.jabatan, 162, 99, 9, { tengah: true }));
  h.push(elGambar(m.stempel));
  h.push(elGambar(m.ttd));
  if (m.bendahara) {
    h.push(elTeks(m.bendahara, 162, 125, 10, { tebal: true, tengah: true }));
    h.push(elKotak(162 - m.lebarNama / 2, 125.9, m.lebarNama, 0.25, 'background:#1a1a1a'));
  }
  return '<div class="kertas" id="pvKertas">' + h.join('') + '</div>';
}

const GAYA_PRATINJAU = `
.pv-buka{overflow:hidden}
.pv-ov{position:fixed;inset:0;z-index:60;display:flex;flex-direction:column;background:#10243b}
.pv-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;padding-top:calc(10px + env(safe-area-inset-top,0px));background:var(--pri);color:#fff;border-bottom:4px solid var(--gold)}
.pv-bar b{font-size:19px}
.pv-x{min-height:48px;padding:8px 20px;font:inherit;font-size:17px;font-weight:700;background:#fff;color:var(--acc);border:3px solid var(--acc);border-radius:10px;cursor:pointer}
.pv-stage{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding:12px;overflow:auto}
.pv-wrap{position:relative;flex:none;box-shadow:0 10px 36px rgba(0,0,0,.5)}
.kertas{position:absolute;left:0;top:0;width:840px;height:592px;background:#fff;overflow:hidden;transform-origin:0 0;font-family:Helvetica,Arial,sans-serif;color:#1a1a1a}
.kertas .kt{position:absolute;white-space:nowrap;line-height:1.15;margin:0}
.kertas .kb{position:absolute;display:block;box-sizing:border-box}
.pv-petunjuk{display:none;margin:0;padding:8px 14px;background:#fff7d6;color:#5c3d00;font-size:16px;font-weight:600;text-align:center}
.pv-act{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:12px 14px calc(12px + env(safe-area-inset-bottom,0px));background:#fff;border-top:1px solid var(--line)}
.pv-act button{min-height:58px;padding:12px 14px;font:inherit;font-size:18px;font-weight:700;border-radius:12px;cursor:pointer;border:3px solid var(--pri);background:#fff;color:var(--pri)}
.pv-act .pv-pdf{background:var(--pri);color:#fff}
.pv-act .pv-wa{grid-column:1/-1;background:#1fa855;border-color:#14532d;color:#fff}
.pv-act button:disabled{opacity:.6;cursor:wait}
.pv-gudang{position:absolute;left:0;top:0;width:840px;height:592px;z-index:-1;pointer-events:none}
.pv-gudang .kertas{position:relative}
@media (orientation:portrait) and (max-width:720px){.pv-petunjuk{display:block}}
@media (min-width:720px){.pv-act{grid-template-columns:repeat(3,1fr)}.pv-act .pv-wa{grid-column:auto}}
`;

function pasangGayaPratinjau() {
  if ($('gayaPratinjau')) return;
  const el = document.createElement('style');
  el.id = 'gayaPratinjau';
  el.textContent = GAYA_PRATINJAU;
  document.head.appendChild(el);
}

function skalaKertas() {
  const st = $('pvStage');
  const w = $('pvWrap');
  const k = $('pvKertas');
  if (!st || !w || !k) return;
  const s = Math.max(0.2, Math.min((st.clientWidth - 24) / LEBAR_KERTAS, (st.clientHeight - 24) / TINGGI_KERTAS, 1.5));
  w.style.width = (LEBAR_KERTAS * s).toFixed(1) + 'px';
  w.style.height = (TINGGI_KERTAS * s).toFixed(1) + 'px';
  k.style.transform = 'scale(' + s.toFixed(4) + ')';
}

function tombolEsc(e) {
  if (e.key === 'Escape') tutupPreview();
}

function previewKuitansi(pid, key) {
  const i = (S.iuran[pid] || {})[key];
  if (!i) return toast('Data kuitansi tidak ditemukan');
  tutupPreview();
  pasangGayaPratinjau();
  let m;
  try {
    m = susunKuitansi(new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a5' }), pid, key);
  } catch (e) {
    return toast('Gagal membuat pratinjau: ' + pesan(e));
  }
  pvAktif = { pid, key };
  const ov = document.createElement('div');
  ov.id = 'pvOv';
  ov.className = 'pv-ov';
  ov.setAttribute('role', 'dialog');
  ov.setAttribute('aria-modal', 'true');
  ov.setAttribute('aria-label', 'Pratinjau kuitansi');
  ov.innerHTML =
    '<div class="pv-bar"><b>Pratinjau Kuitansi</b><button type="button" class="pv-x" onclick="tutupPreview()">Tutup</button></div>' +
    '<div class="pv-stage" id="pvStage"><div class="pv-wrap" id="pvWrap">' + htmlKertas(m) + '</div></div>' +
    '<p class="pv-petunjuk">Putar HP ke samping agar kuitansi tampil lebih besar.</p>' +
    '<div class="pv-act">' +
    '<button type="button" class="pv-pdf" onclick="unduhPDFPratinjau()">Unduh PDF</button>' +
    '<button type="button" class="pv-foto" onclick="unduhFotoPratinjau(this)">Unduh Foto</button>' +
    '<button type="button" class="pv-wa" onclick="bagikanWAPratinjau(this)">WhatsApp (Foto)</button>' +
    '</div>';
  document.body.appendChild(ov);
  document.body.classList.add('pv-buka');
  skalaKertas();
  window.addEventListener('resize', skalaKertas);
  document.addEventListener('keydown', tombolEsc);
  const x = ov.querySelector('.pv-x');
  if (x) x.focus();
  setTimeout(() => {
    if (!pvAktif || pvFoto) return;
    pvFoto = buatFotoBlob();
    pvFoto.catch(() => { pvFoto = null; });
  }, 200);
}

function tutupPreview() {
  const ov = $('pvOv');
  if (ov) ov.remove();
  document.body.classList.remove('pv-buka');
  window.removeEventListener('resize', skalaKertas);
  document.removeEventListener('keydown', tombolEsc);
  pvAktif = null;
  pvFoto = null;
}

function buatFotoBlob() {
  if (!window.html2canvas) return Promise.reject(new Error('Pustaka foto belum dimuat'));
  const sumber = $('pvKertas');
  if (!sumber) return Promise.reject(new Error('Pratinjau tidak aktif'));
  const gudang = document.createElement('div');
  gudang.className = 'pv-gudang';
  const salin = sumber.cloneNode(true);
  salin.removeAttribute('id');
  salin.style.transform = 'none';
  gudang.appendChild(salin);
  document.body.appendChild(gudang);
  return window.html2canvas(salin, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false })
    .then(cv => new Promise((ok, gagal) => {
      cv.toBlob(b => (b ? ok(b) : gagal(new Error('Foto gagal dibuat'))), 'image/png');
    }))
    .finally(() => gudang.remove());
}

function ambilFoto() {
  if (!pvFoto) {
    pvFoto = buatFotoBlob();
    pvFoto.catch(() => { pvFoto = null; });
  }
  return pvFoto;
}

async function denganTombol(tombol, fn) {
  const label = tombol.textContent;
  tombol.disabled = true;
  tombol.textContent = 'Menyiapkan...';
  try {
    await fn();
  } catch (e) {
    toast('Gagal: ' + pesan(e));
  } finally {
    tombol.disabled = false;
    tombol.textContent = label;
  }
}

function unduhPDFPratinjau() {
  if (pvAktif) unduhKuitansi(pvAktif.pid, pvAktif.key);
}

function unduhFotoPratinjau(tombol) {
  if (!pvAktif) return;
  const { pid, key } = pvAktif;
  denganTombol(tombol, async () => {
    const blob = await ambilFoto();
    unduhBlob(blob, namaBerkasKuitansi(pid, key, 'png'));
  });
}

function bagikanWAPratinjau(tombol) {
  if (!pvAktif) return;
  const { pid, key } = pvAktif;
  const i = (S.iuran[pid] || {})[key] || {};
  const nama = (S.puk[pid] || {}).namaPerusahaan || '';
  const teks = 'Kuitansi iuran COS PUK ' + nama + ' periode ' + labelPeriode(key) + '\nNo: ' + (i.nomorKuitansi || '-');
  denganTombol(tombol, async () => {
    const blob = await ambilFoto();
    const berkas = new File([blob], namaBerkasKuitansi(pid, key, 'png'), { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [berkas] })) {
      try {
        await navigator.share({ files: [berkas], title: 'Kuitansi Iuran COS', text: teks });
        return;
      } catch (e) {
        if (e && e.name === 'AbortError') return;
      }
    }
    unduhBlob(blob, berkas.name);
    toast('Foto tersimpan. Lampirkan di WhatsApp.');
    setTimeout(() => { window.open('https://wa.me/?text=' + encodeURIComponent(teks), '_blank'); }, 700);
  });
}
