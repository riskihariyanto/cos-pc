const firebaseConfig = {
  apiKey: "AIzaSyBY9iF2mVGVzcZet8ANmYfyVJjzhndXSGA",
  authDomain: "cos-pc.firebaseapp.com",
  databaseURL: "https://cos-pc-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "cos-pc",
  storageBucket: "cos-pc.firebasestorage.app",
  messagingSenderId: "585945369309",
  appId: "1:585945369309:web:27c031cf96f5e4832ae934"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.database();

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const ROMAWI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
