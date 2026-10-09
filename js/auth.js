auth.onAuthStateChanged(async user => {
  detach();
  resetData();
  if (!user) {
    $('appView').hidden = true;
    $('loginView').hidden = false;
    return;
  }
  try {
    const snap = await db.ref('users/' + user.uid).once('value');
    const p = snap.val();
    if (!p) {
      toast('Akun belum terdaftar di sistem');
      await auth.signOut();
      return;
    }
    S.profile = p;
    S.tab = '';
    attach();
    render();
  } catch (e) {
    toast('Gagal memuat akun: ' + pesan(e));
    await auth.signOut();
  }
});

async function doLogin() {
  const e = $('lEmail').value.trim();
  const p = $('lPass').value;
  if (!e || !p) return toast('Isi email dan sandi');
  await jalankan(() => auth.signInWithEmailAndPassword(e, p));
}

function doLogout() {
  auth.signOut();
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
