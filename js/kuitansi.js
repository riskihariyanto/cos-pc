function gambarQR(d, teks, x, y, size) {
  const q = qrcode(0, 'M');
  q.addData(teks);
  q.make();
  const n = q.getModuleCount();
  const m = size / n;
  d.setFillColor(0, 0, 0);
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (q.isDark(r, c)) d.rect(x + c * m, y + r * m, m + 0.02, m + 0.02, 'F');
    }
  }
}

function buatPDF(pid, key) {
  const p = S.puk[pid] || {};
  const i = (S.iuran[pid] || {})[key];
  const c = S.pengaturan || {};
  const { jsPDF } = window.jspdf;
  const d = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a5' });
  const W = 210, H = 148;

  d.setDrawColor(40);
  d.setLineWidth(0.4);
  d.rect(8, 8, W - 16, H - 16);

  d.setFont('helvetica', 'bold');
  d.setFontSize(14);
  d.text((c.namaPC || 'Pengurus Cabang').toUpperCase(), W / 2, 18, { align: 'center' });
  d.setFont('helvetica', 'normal');
  d.setFontSize(9);
  if (c.alamat) d.text(c.alamat, W / 2, 23, { align: 'center' });
  d.line(12, 27, W - 12, 27);

  d.setFont('helvetica', 'bold');
  d.setFontSize(13);
  d.text('KUITANSI IURAN COS', W / 2, 35, { align: 'center' });
  d.setFont('helvetica', 'normal');
  d.setFontSize(10);
  d.text('No: ' + i.nomorKuitansi, W / 2, 41, { align: 'center' });

  let y = 52;
  const baris = (label, nilai) => {
    d.setFont('helvetica', 'normal');
    d.text(label, 14, y);
    d.text(':', 54, y);
    const t = d.splitTextToSize(nilai, 135);
    d.text(t, 58, y);
    y += Math.max(1, t.length) * 5 + 3;
  };

  baris('Telah terima dari', 'PUK ' + (p.namaPerusahaan || ''));
  baris('Uang sejumlah', terbilangRupiah(i.total));
  baris('Untuk pembayaran', 'Iuran COS periode ' + labelPeriode(key) + ' (' + (i.jumlahAnggota || 0) + ' anggota)');
  baris('Tanggal setor', fmtTgl(i.tanggalSetor));
  baris('Status', teksStatus(i));

  gambarQR(d, 'KUITANSI COS|' + i.nomorKuitansi + '|' + (p.namaPerusahaan || '') + '|' + labelPeriode(key) + '|' + i.total + '|' + i.status, 14, 100, 30);

  d.setDrawColor(40);
  d.rect(50, 106, 72, 14);
  d.setFont('helvetica', 'bold');
  d.setFontSize(14);
  d.text(rp(i.total), 86, 115.5, { align: 'center' });

  d.setFont('helvetica', 'normal');
  d.setFontSize(10);
  d.text((c.kota ? c.kota + ', ' : '') + fmtTgl(i.tanggalSetor), 168, 88, { align: 'center' });
  d.text(c.jabatan || 'Bendahara', 168, 93, { align: 'center' });

  if (c.stempel) { try { d.addImage(c.stempel, 'PNG', 132, 92, 28, 28); } catch (e) {} }
  if (c.ttd) { try { d.addImage(c.ttd, 'PNG', 154, 95, 28, 15); } catch (e) {} }

  d.setFont('helvetica', 'bold');
  const nm = c.bendahara || '';
  d.text(nm, 168, 124, { align: 'center' });
  const lebar = Math.max(30, d.getTextWidth(nm));
  d.line(168 - lebar / 2, 125, 168 + lebar / 2, 125);

  return d;
}

function teksStatus(i) {
  return i.status === 'Lunas' ? 'Lunas (terverifikasi)' : i.status === 'Ditolak' ? 'Ditolak' : 'Menunggu verifikasi';
}

function dataQR(teks) {
  try {
    const q = qrcode(0, 'M');
    q.addData(teks);
    q.make();
    return q.createDataURL(4, 0);
  } catch (e) {
    return '';
  }
}

const GAYA_PREVIEW = `
.kp-overlay{position:fixed;inset:0;z-index:40;background:rgba(15,23,21,.72);display:flex;align-items:center;justify-content:center;padding:10px}
.kp-box{background:#fff;border-radius:14px;width:100%;max-width:880px;max-height:100%;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,.35)}
.kp-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 16px;background:var(--pri,#0f766e);color:#fff}
.kp-head h2{margin:0;font-size:20px}
.kp-x{background:rgba(255,255,255,.2);color:#fff;border:0;border-radius:8px;font-size:22px;line-height:1;width:44px;height:44px;cursor:pointer}
.kp-body{overflow:auto;padding:14px;background:#eef1f0;-webkit-overflow-scrolling:touch}
.kp-paper{background:#fff;color:#111;border:2px solid #333;padding:22px 20px;font-size:19px;line-height:1.5;max-width:800px;margin:0 auto}
.kp-pc{text-align:center;font-weight:700;font-size:22px;text-transform:uppercase}
.kp-alamat{text-align:center;font-size:16px;color:#333;margin-top:2px}
.kp-garis{border:0;border-top:2px solid #333;margin:12px 0}
.kp-judul{text-align:center;font-weight:700;font-size:25px;letter-spacing:.5px}
.kp-no{text-align:center;font-size:18px;margin:2px 0 16px;word-break:break-all}
.kp-baris{display:grid;grid-template-columns:190px 1fr;gap:4px 10px;padding:8px 0;border-bottom:1px dotted #999}
.kp-baris b{font-weight:600;color:#333}
.kp-baris span{word-break:break-word}
.kp-bawah{display:flex;flex-wrap:wrap;gap:18px;align-items:flex-end;justify-content:space-between;margin-top:20px}
.kp-kiri{display:flex;flex-direction:column;gap:14px;align-items:flex-start}
.kp-total{border:2px solid #333;padding:10px 20px;font-size:30px;font-weight:700;text-align:center;min-width:240px}
.kp-qr{width:110px;height:110px;image-rendering:pixelated}
.kp-ttd{text-align:center;min-width:210px}
.kp-cap{position:relative;height:96px;margin:4px 0}
.kp-cap img{position:absolute;top:0;max-height:96px;max-width:110px}
.kp-cap .st{left:6px}
.kp-cap .tt{right:6px;max-height:70px;top:12px}
.kp-nama{display:inline-block;font-weight:700;border-bottom:2px solid #111;padding:0 6px;min-width:150px}
.kp-foot{display:flex;flex-wrap:wrap;gap:10px;padding:12px 14px;border-top:1px solid #dbe3e0;background:#fff}
.kp-foot button{flex:1 1 150px;margin:0;padding:15px 12px;font-size:18px;border-radius:10px;cursor:pointer;font-weight:700;border:2px solid var(--pri,#0f766e);background:var(--pri,#0f766e);color:#fff}
.kp-foot button.alt{background:#fff;color:var(--pri,#0f766e)}
@media (max-width:600px){
.kp-overlay{padding:0}
.kp-box{border-radius:0;height:100%}
.kp-paper{padding:16px 12px;font-size:18px}
.kp-baris{grid-template-columns:1fr;gap:0}
.kp-total{min-width:0;width:100%;font-size:28px}
.kp-bawah{flex-direction:column;align-items:stretch}
.kp-ttd{align-self:center}
}
`;

let kpPenutup = null;

function tutupPreview() {
  const el = document.getElementById('kpOverlay');
  if (el) el.remove();
  document.body.style.overflow = '';
  if (kpPenutup) {
    document.removeEventListener('keydown', kpPenutup);
    kpPenutup = null;
  }
}

function previewKuitansi(pid, key) {
  const p = S.puk[pid] || {};
  const i = (S.iuran[pid] || {})[key];
  const c = S.pengaturan || {};
  if (!i || !i.nomorKuitansi || i.nomorKuitansi === '-') {
    toast('Kuitansi belum tersedia');
    return;
  }
  tutupPreview();

  if (!document.getElementById('kpGaya')) {
    const g = document.createElement('style');
    g.id = 'kpGaya';
    g.textContent = GAYA_PREVIEW;
    document.head.appendChild(g);
  }

  const qr = dataQR('KUITANSI COS|' + i.nomorKuitansi + '|' + (p.namaPerusahaan || '') + '|' + labelPeriode(key) + '|' + i.total + '|' + i.status);
  const baris = (label, nilai) => '<div class="kp-baris"><b>' + esc(label) + '</b><span>' + esc(nilai) + '</span></div>';
  const gbr = (src, kelas) => src ? '<img class="' + kelas + '" src="' + esc(src) + '" alt="">' : '';

  const kertas =
    '<div class="kp-paper">' +
    '<div class="kp-pc">' + esc(c.namaPC || 'Pengurus Cabang') + '</div>' +
    (c.alamat ? '<div class="kp-alamat">' + esc(c.alamat) + '</div>' : '') +
    '<hr class="kp-garis">' +
    '<div class="kp-judul">KUITANSI IURAN COS</div>' +
    '<div class="kp-no">No: ' + esc(i.nomorKuitansi) + '</div>' +
    baris('Telah terima dari', 'PUK ' + (p.namaPerusahaan || '')) +
    baris('Uang sejumlah', terbilangRupiah(i.total)) +
    baris('Untuk pembayaran', 'Iuran COS periode ' + labelPeriode(key) + ' (' + (i.jumlahAnggota || 0) + ' anggota)') +
    baris('Tanggal setor', fmtTgl(i.tanggalSetor)) +
    baris('Status', teksStatus(i)) +
    '<div class="kp-bawah">' +
    '<div class="kp-kiri"><div class="kp-total">' + esc(rp(i.total)) + '</div>' +
    (qr ? '<img class="kp-qr" src="' + qr + '" alt="Kode QR kuitansi">' : '') + '</div>' +
    '<div class="kp-ttd"><div>' + esc((c.kota ? c.kota + ', ' : '') + fmtTgl(i.tanggalSetor)) + '</div>' +
    '<div>' + esc(c.jabatan || 'Bendahara') + '</div>' +
    '<div class="kp-cap">' + gbr(c.stempel, 'st') + gbr(c.ttd, 'tt') + '</div>' +
    '<span class="kp-nama">' + esc(c.bendahara || '') + '</span></div>' +
    '</div></div>';

  const el = document.createElement('div');
  el.id = 'kpOverlay';
  el.className = 'kp-overlay';
  el.innerHTML =
    '<div class="kp-box" role="dialog" aria-modal="true" aria-label="Pratinjau kuitansi">' +
    '<div class="kp-head"><h2>Pratinjau Kuitansi</h2><button type="button" class="kp-x" aria-label="Tutup">&times;</button></div>' +
    '<div class="kp-body">' + kertas + '</div>' +
    '<div class="kp-foot">' +
    '<button type="button" data-aksi="unduh">Unduh PDF</button>' +
    '<button type="button" class="alt" data-aksi="wa">Kirim WhatsApp</button>' +
    '<button type="button" class="alt" data-aksi="tutup">Tutup</button>' +
    '</div></div>';

  el.addEventListener('click', e => {
    if (e.target === el || e.target.closest('.kp-x')) {
      tutupPreview();
      return;
    }
    const b = e.target.closest('button[data-aksi]');
    if (!b) return;
    const aksi = b.dataset.aksi;
    if (aksi === 'tutup') tutupPreview();
    else if (aksi === 'unduh') unduhKuitansi(pid, key);
    else if (aksi === 'wa') kirimWA(pid, key);
  });

  kpPenutup = e => {
    if (e.key === 'Escape') tutupPreview();
  };
  document.addEventListener('keydown', kpPenutup);

  document.body.appendChild(el);
  document.body.style.overflow = 'hidden';
  el.querySelector('.kp-body').scrollTop = 0;
  el.querySelector('button[data-aksi="unduh"]').focus();
}

function namaFile(pid, key) {
  const i = (S.iuran[pid] || {})[key];
  return 'Kuitansi-' + String(i.nomorKuitansi).replace(/[\/\\]+/g, '-') + '.pdf';
}

function unduhKuitansi(pid, key) {
  try {
    buatPDF(pid, key).save(namaFile(pid, key));
  } catch (e) {
    toast('Gagal membuat PDF: ' + pesan(e));
  }
}

async function kirimWA(pid, key) {
  const i = (S.iuran[pid] || {})[key];
  const p = S.puk[pid] || {};
  const teks = 'Kuitansi iuran COS\nNo: ' + i.nomorKuitansi + '\nPUK: ' + p.namaPerusahaan + '\nPeriode: ' + labelPeriode(key) + '\nNominal: ' + rp(i.total) + '\nStatus: ' + i.status;
  try {
    const doc = buatPDF(pid, key);
    const nama = namaFile(pid, key);
    const file = new File([doc.output('blob')], nama, { type: 'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text: teks });
        return;
      } catch (e) {
        if (e.name === 'AbortError') return;
      }
    }
    doc.save(nama);
    window.open('https://wa.me/?text=' + encodeURIComponent(teks), '_blank');
  } catch (e) {
    toast('Gagal menyiapkan kuitansi: ' + pesan(e));
  }
}
