// ============================================================================
// KODE BACKEND GOOGLE APPS SCRIPT (Code.gs) - APLIKASI SIMTAQ
// Mendukung Dual-Mode: Google Antigravity IDE, GitHub Pages & Web App GAS
// MAN 2 Kabupaten Gorontalo x Yayasan Abulyatama Indonesia Gorontalo
// Pengembang Aplikasi : Herman Susanto Buhungo, S.Pd.
// ============================================================================

const SPREADSHEET_ID = '1m6zTyRyabvSeTCkm7Gg-MbkgafV7029BTvxjdYsqyzc';
const DRIVE_FOLDER_ID = '1N-9BgC9GZ_t7AWiixnx6mAl3_lHw3nTX';

function getSpreadsheet_() {
  if (SPREADSHEET_ID && SPREADSHEET_ID.indexOf('TEMPEL_') === -1) {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getDriveFolder_() {
  // 1. Coba ambil berdasarkan ID folder yang diberikan
  if (DRIVE_FOLDER_ID && DRIVE_FOLDER_ID.indexOf('TEMPEL_') === -1) {
    try {
      const folderById = DriveApp.getFolderById(DRIVE_FOLDER_ID);
      if (folderById && !folderById.isTrashed()) {
        return folderById;
      }
    } catch (e) {
      Logger.log('Folder ID tidak bisa diakses langsung: ' + e.toString());
    }
  }

  // 2. Cari berdasarkan nama folder 'SIMTAQ_Video_Setoran_Santri'
  try {
    const folders = DriveApp.getFoldersByName('SIMTAQ_Video_Setoran_Santri');
    while (folders.hasNext()) {
      const f = folders.next();
      if (!f.isTrashed()) {
        return f;
      }
    }
  } catch (e) {
    Logger.log('Pencarian folder berdasarkan nama gagal: ' + e.toString());
  }

  // 3. Buat folder baru jika belum ada
  try {
    const newFolder = DriveApp.createFolder('SIMTAQ_Video_Setoran_Santri');
    newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return newFolder;
  } catch (e) {
    Logger.log('Gagal membuat folder baru: ' + e.toString());
  }

  return DriveApp.getRootFolder();
}

// 1. HANDLER HTTP GET (doGet)
function doGet(e) {
  initSheetsIfNeeded();
  if (e && e.parameter && e.parameter.action === 'getAllSimtaqData') {
    const data = getAllSimtaqData();
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: data })).setMimeType(ContentService.MimeType.JSON);
  }
  try {
    return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('SIMTAQ - MAN 2 Kab. Gorontalo x Yayasan Abulyatama')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'online', app: 'SIMTAQ Backend API Ready for Antigravity' })).setMimeType(ContentService.MimeType.JSON);
  }
}

// 2. HANDLER HTTP POST (doPost) - Aman dijalankan manual maupun dari aplikasi
function doPost(e) {
  try {
    initSheetsIfNeeded();
    if (!e || !e.postData || !e.postData.contents) {
      Logger.log('Fungsi doPost(e) aktif dan siap menerima data dari aplikasi SIMTAQ!');
      return ContentService.createTextOutput(JSON.stringify({ status: 'ready', message: 'doPost aktif' })).setMimeType(ContentService.MimeType.JSON);
    }
    const body = JSON.parse(e.postData.contents || '{}');
    const action = body.action;
    const payload = body.payload;
    let result = { status: 'unknown_action' };
    if (action === 'getAllSimtaqData') result = getAllSimtaqData();
    else if (action === 'saveSetoranWithVideo') result = saveSetoranWithVideo(payload);
    else if (action === 'deleteSetoranVideoGAS') result = deleteSetoranVideoGAS(payload.setoranId);
    else if (action === 'upsertSantriGAS') result = upsertSantriGAS(payload);
    else if (action === 'upsertUstadzGAS') result = upsertUstadzGAS(payload);
    else if (action === 'upsertTargetGAS') result = upsertTargetGAS(payload);
    else if (action === 'upsertMusicGAS') result = upsertMusicGAS(payload);
    else if (action === 'upsertPenggunaGAS') result = upsertPenggunaGAS(payload);
    else if (action === 'deleteRecordByIdGAS') result = deleteRecordByIdGAS(payload.sheetName, payload.recordId);
    else if (action === 'clearSheetDataGAS') result = clearSheetDataGAS(payload.sheetName);
    else if (action === 'savePejabatGAS') result = savePejabatGAS(payload);
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', result: result })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function initSheetsIfNeeded() {
  const ss = getSpreadsheet_();
  const schema = {
    'Data_Santri': ['ID', 'NIS', 'Nama', 'JK', 'Kelas', 'Asrama', 'Juz', 'Status'],
    'Data_Ustadz': ['ID', 'NIP', 'Nama', 'Lembaga', 'Halaqah', 'Kontak', 'Status'],
    'Setoran_Hafalan': ['ID', 'Tanggal', 'SantriID', 'NIS', 'SantriNama', 'Surat', 'Ayat', 'Juz', 'Nilai', 'Ustadz', 'Catatan', 'HasVideo', 'VideoUrl'],
    'Target_Hafalan': ['ID', 'SantriID', 'NIS', 'SantriNama', 'Kelas', 'Target', 'TanggalTarget', 'Status'],
    'Musik_Latar': ['ID', 'Title', 'Artist', 'Url'],
    'Pengaturan_Pejabat': ['Key', 'Value'],
    'Data_Pengguna': ['ID', 'Username', 'Password', 'Nama', 'Peran', 'RefID', 'Status']
  };
  Object.keys(schema).forEach(name => {
    let s = ss.getSheetByName(name);
    if (!s) {
      s = ss.insertSheet(name);
      s.appendRow(schema[name]);
      s.getRange(1, 1, 1, schema[name].length).setBackground('#0f6832').setFontColor('#ffffff').setFontWeight('bold');
    }
  });

  // 1. Inisialisasi Musik Murotal
  const musikSheet = ss.getSheetByName('Musik_Latar');
  if (musikSheet.getLastRow() <= 1) {
    musikSheet.appendRow(['MRT-01', 'Murotal QS. Ar-Rahman (Ayat 1-78)', 'Syaikh Mishary Rashid Al-Afasy', 'https://server8.mp3quran.net/afs/055.mp3']);
    musikSheet.appendRow(['MRT-02', 'Murotal QS. Al-Mulk (Penjaga dari Siksa Kubur)', 'Syaikh Mishary Rashid Al-Afasy', 'https://server8.mp3quran.net/afs/067.mp3']);
    musikSheet.appendRow(['MRT-03', 'Murotal Merdu Juz 30 (YouTube Murotal)', 'Murotal Al-Qur’an Pilihan (YouTube)', 'https://www.youtube.com/watch?v=1dn6tQ2V3pA']);
  }

  // 2. Inisialisasi 5 Santri Resmi (SNT-01 s.d SNT-05) jika sheet kosong
  const santriSheet = ss.getSheetByName('Data_Santri');
  if (santriSheet.getLastRow() <= 1) {
    santriSheet.appendRow(['SNT-01', '2026001', 'Frisilia Juliyanti H. Kasim', 'Perempuan', 'X IPA 1', 'Asrama Putri Abulyatama', 30, 'Aktif']);
    santriSheet.appendRow(['SNT-02', '2026002', 'Zitri Rahmatia Adam', 'Perempuan', 'XI Agama', 'Asrama Putri Abulyatama', 30, 'Aktif']);
    santriSheet.appendRow(['SNT-03', '2026003', 'Siti Nazifah Rahman', 'Perempuan', 'X IPA 2', 'Asrama Putri Abulyatama', 30, 'Aktif']);
    santriSheet.appendRow(['SNT-04', '2026004', 'Fatmatiya Ishak', 'Perempuan', 'XI IPA 1', 'Asrama Putri Abulyatama', 30, 'Aktif']);
    santriSheet.appendRow(['SNT-05', '2026005', 'Nazwa Khairyah Fadib', 'Perempuan', 'X Agama', 'Asrama Putri Abulyatama', 30, 'Aktif']);
  }

  // 3. Inisialisasi Ustadzah Pembimbing (UST-01: Ustadzah Maryam Ali) jika sheet kosong
  const ustadzSheet = ss.getSheetByName('Data_Ustadz');
  if (ustadzSheet.getLastRow() <= 1) {
    ustadzSheet.appendRow(['UST-01', '198904122019032015', 'Ustadzah Maryam Ali', 'MAN 2 Kab. Gorontalo', 'Halaqah Khadijah (Putri)', '081234567890', 'Aktif']);
  }

  // 4. Inisialisasi Setoran Hafalan (Dikelola murni oleh pengguna/admin - tidak diisi otomatis jika kosong)
  const setoranSheet = ss.getSheetByName('Setoran_Hafalan');

  // 5. Inisialisasi Target Hafalan (Dikelola murni oleh pengguna/admin - tidak diisi otomatis jika kosong)
  const targetSheet = ss.getSheetByName('Target_Hafalan');

  // 6. Inisialisasi Akun Pengguna Resmi SIMTAQ (1 Admin, 5 Orang Tua, 1 Ustadzah)
  const penggunaSheet = ss.getSheetByName('Data_Pengguna');
  const officialAccounts = [
    ['USR-01', 'admin', 'admin123', 'Administrator SIMTAQ', 'admin', 'ALL', 'Aktif'],
    ['USR-02', 'mama_frisilia', '9wtzo420', 'Orang Tua (Frisilia Juliyanti H. Kasim)', 'ortu', 'SNT-01', 'Aktif'],
    ['USR-03', 'mama_zitri', '06s7j1', 'Orang Tua (Zitri Rahmatia Adam)', 'ortu', 'SNT-02', 'Aktif'],
    ['USR-04', 'mama_siti', 'vriipf', 'Orang Tua (Siti Nazifah Rahman)', 'ortu', 'SNT-03', 'Aktif'],
    ['USR-05', 'mama_fatmatiya', 't65vhr', 'Orang Tua (Fatmatiya Ishak)', 'ortu', 'SNT-04', 'Aktif'],
    ['USR-06', 'mama_nazwa', '9vqc8f', 'Orang Tua (Nazwa Khairyah Fadib)', 'ortu', 'SNT-05', 'Aktif'],
    ['USR-07', 'maryamali', 'maryam', 'Ustadzah Maryam Ali', 'ustadz', 'UST-01', 'Aktif']
  ];

  if (penggunaSheet.getLastRow() <= 1) {
    officialAccounts.forEach(row => penggunaSheet.appendRow(row));
  } else {
    // Sinkronisasi: pastikan setiap akun resmi SIMTAQ ada dan tautan referensinya benar
    const pData = penggunaSheet.getDataRange().getValues();
    officialAccounts.forEach(acc => {
      const uName = acc[1].toLowerCase();
      let foundIndex = -1;
      for (let r = 1; r < pData.length; r++) {
        const rowUser = String(pData[r][1] || '').replace(/^@+/, '').trim().toLowerCase();
        if (rowUser === uName) {
          foundIndex = r + 1;
          break;
        }
      }
      if (foundIndex === -1) {
        penggunaSheet.appendRow(acc);
      } else {
        // Update password & refId jika sebelumnya tertaut ke santri/ustadz dummy
        penggunaSheet.getRange(foundIndex, 3, 1, 5).setValues([[acc[2], acc[3], acc[4], acc[5], acc[6]]]);
      }
    });

    // Hapus permanen akun dummy lama (@ustadz & @ortu) jika masih ada
    for (let r = pData.length - 1; r >= 1; r--) {
      const rowUser = String(pData[r][1] || '').replace(/^@+/, '').trim().toLowerCase();
      if (rowUser === 'ustadz' || rowUser === 'ortu') {
        penggunaSheet.deleteRow(r + 1);
      }
    }
  }
}

function getAllSimtaqData() {
  initSheetsIfNeeded();
  const ss = getSpreadsheet_();
  const read = (name) => {
    const s = ss.getSheetByName(name);
    if (!s || s.getLastRow() <= 1) return [];
    return s.getRange(2, 1, s.getLastRow() - 1, s.getLastColumn()).getDisplayValues();
  };

  const defaultSantri = [
    { id: 'SNT-01', nis: '2026001', nama: 'Frisilia Juliyanti H. Kasim', jk: 'Perempuan', kelas: 'X IPA 1', asrama: 'Asrama Putri Abulyatama', juz: 30, status: 'Aktif' },
    { id: 'SNT-02', nis: '2026002', nama: 'Zitri Rahmatia Adam', jk: 'Perempuan', kelas: 'XI Agama', asrama: 'Asrama Putri Abulyatama', juz: 30, status: 'Aktif' },
    { id: 'SNT-03', nis: '2026003', nama: 'Siti Nazifah Rahman', jk: 'Perempuan', kelas: 'X IPA 2', asrama: 'Asrama Putri Abulyatama', juz: 30, status: 'Aktif' },
    { id: 'SNT-04', nis: '2026004', nama: 'Fatmatiya Ishak', jk: 'Perempuan', kelas: 'XI IPA 1', asrama: 'Asrama Putri Abulyatama', juz: 30, status: 'Aktif' },
    { id: 'SNT-05', nis: '2026005', nama: 'Nazwa Khairyah Fadib', jk: 'Perempuan', kelas: 'X Agama', asrama: 'Asrama Putri Abulyatama', juz: 30, status: 'Aktif' }
  ];

  const defaultUstadz = [
    { id: 'UST-01', nip: '198904122019032015', nama: 'Ustadzah Maryam Ali', lembaga: 'MAN 2 Kab. Gorontalo', halaqah: 'Halaqah Khadijah (Putri)', kontak: '081234567890', status: 'Aktif' }
  ];

  const defaultSetoran = [
    { id: 'STR-01', tanggal: '2026-11-06', santriId: 'SNT-01', nis: '2026001', santriNama: 'Frisilia Juliyanti H. Kasim', surat: 'Ad-Duha', ayat: '1-11', juz: 30, nilai: 95, ustadz: 'Ustadzah Maryam Ali', catatan: 'Alhamdulillah makhraj dan tajwid sangat baik dan lancar.', hasVideo: true, videoBlobUrl: '' },
    { id: 'STR-02', tanggal: '2026-11-06', santriId: 'SNT-02', nis: '2026002', santriNama: 'Zitri Rahmatia Adam', surat: 'Al-Insyirah', ayat: '1-8', juz: 30, nilai: 95, ustadz: 'Ustadzah Maryam Ali', catatan: 'Bacaan tartil, lancar, dan makharijul huruf tepat.', hasVideo: true, videoBlobUrl: '' }
  ];

  const defaultTarget = [
    { id: 'TRG-01', santriId: 'SNT-01', nis: '2026001', santriNama: 'Frisilia Juliyanti H. Kasim', kelas: 'X IPA 1', target: 'Juz 30 (An-Naba s.d An-Nas)', tanggalTarget: '2026-12-20', status: 'Proses' },
    { id: 'TRG-02', santriId: 'SNT-02', nis: '2026002', santriNama: 'Zitri Rahmatia Adam', kelas: 'XI Agama', target: 'Juz 30 (An-Naba s.d An-Nas)', tanggalTarget: '2026-12-20', status: 'Proses' }
  ];

  const defaultPengguna = [
    { id: 'USR-01', username: 'admin', password: 'admin123', nama: 'Administrator SIMTAQ', peran: 'admin', refId: 'ALL', status: 'Aktif' },
    { id: 'USR-02', username: 'mama_frisilia', password: '9wtzo420', nama: 'Orang Tua (Frisilia Juliyanti H. Kasim)', peran: 'ortu', refId: 'SNT-01', status: 'Aktif' },
    { id: 'USR-03', username: 'mama_zitri', password: '06s7j1', nama: 'Orang Tua (Zitri Rahmatia Adam)', peran: 'ortu', refId: 'SNT-02', status: 'Aktif' },
    { id: 'USR-04', username: 'mama_siti', password: 'vriipf', nama: 'Orang Tua (Siti Nazifah Rahman)', peran: 'ortu', refId: 'SNT-03', status: 'Aktif' },
    { id: 'USR-05', username: 'mama_fatmatiya', password: 't65vhr', nama: 'Orang Tua (Fatmatiya Ishak)', peran: 'ortu', refId: 'SNT-04', status: 'Aktif' },
    { id: 'USR-06', username: 'mama_nazwa', password: '9vqc8f', nama: 'Orang Tua (Nazwa Khairyah Fadib)', peran: 'ortu', refId: 'SNT-05', status: 'Aktif' },
    { id: 'USR-07', username: 'maryamali', password: 'maryam', nama: 'Ustadzah Maryam Ali', peran: 'ustadz', refId: 'UST-01', status: 'Aktif' }
  ];

  // Saring hanya data riil (bersihkan data dummy lama jika masih tersimpan di Spreadsheet)
  let santri = read('Data_Santri')
    .filter(r => {
      const nis = String(r[1] || '').trim();
      const nama = String(r[2] || '').trim();
      return nis !== '4334345' && nis !== '4334346' && !nama.includes('Lutfianiga') && !nama.includes('Muhammad Farhan');
    })
    .map(r => ({ id: r[0], nis: r[1], nama: r[2], jk: r[3], kelas: r[4], asrama: r[5], juz: Number(r[6] || 1), status: r[7] || 'Aktif' }));
  if (!santri.length) santri = defaultSantri;

  let ustadz = read('Data_Ustadz')
    .filter(r => {
      const nama = String(r[2] || '').trim();
      return !nama.includes('Ahmad Fauzan') && !nama.includes('Siti Rahmawati');
    })
    .map(r => ({ id: r[0], nip: r[1], nama: r[2], lembaga: r[3], halaqah: r[4], kontak: r[5], status: r[6] || 'Aktif' }));
  if (!ustadz.length) ustadz = defaultUstadz;

  let setoran = read('Setoran_Hafalan')
    .filter(r => {
      const nis = String(r[3] || '').trim();
      return nis !== '4334345' && nis !== '4334346';
    })
    .map(r => ({
      id: r[0],
      tanggal: r[1],
      santriId: r[2],
      nis: r[3],
      santriNama: r[4],
      surat: r[5],
      ayat: r[6],
      juz: Number(r[7] || 1),
      nilai: Number(r[8] || 0),
      ustadz: r[9],
      catatan: r[10],
      hasVideo: r[11] === 'TRUE' || (Boolean(r[12]) && !String(r[12]).startsWith('data:')),
      videoBlobUrl: (r[12] && String(r[12]).startsWith('http')) ? r[12] : ''
    }));
  // Jika setoran kosong karena telah dihapus oleh Admin, pertahankan array kosong (jangan dibangkitkan lagi)

  let target = read('Target_Hafalan')
    .filter(r => {
      const nis = String(r[2] || '').trim();
      return nis !== '4334345' && nis !== '4334346';
    })
    .map(r => ({ id: r[0], santriId: r[1], nis: r[2], santriNama: r[3], kelas: r[4], target: r[5], tanggalTarget: r[6], status: r[7] || 'Proses' }));

  const playlist = read('Musik_Latar').map(r => ({ id: r[0], title: r[1], artist: r[2], url: r[3] }));

  // Bersihkan akun dummy default lama (ustadz, ortu dummy)
  let pengguna = read('Data_Pengguna')
    .filter(r => {
      const u = String(r[1] || '').replace(/^@+/, '').trim().toLowerCase();
      return u && u !== 'ustadz' && u !== 'ortu';
    })
    .map(r => ({ id: r[0], username: String(r[1]).replace(/^@+/, '').trim(), password: r[2], nama: r[3], peran: r[4], refId: r[5], status: r[6] || 'Aktif' }));
  if (!pengguna.length) pengguna = defaultPengguna;

  const pejabat = {};
  read('Pengaturan_Pejabat').forEach(r => { if (r[0]) pejabat[r[0]] = r[1]; });
  return { santri, ustadz, setoran, target, playlist, pejabat, pengguna };
}

function upsertMusicGAS(m) {
  initSheetsIfNeeded();
  const sheet = getSpreadsheet_().getSheetByName('Musik_Latar');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(m.id)) {
      sheet.getRange(i + 1, 1, 1, 4).setValues([[m.id, m.title, m.artist, m.url]]);
      return { status: 'updated' };
    }
  }
  sheet.appendRow([m.id, m.title, m.artist, m.url]);
  return { status: 'inserted' };
}

function saveSetoranWithVideo(payload) {
  initSheetsIfNeeded();
  const sheet = getSpreadsheet_().getSheetByName('Setoran_Hafalan');
  let videoUrl = '';

  // 1. Jika ada video baru (data base64), upload langsung ke Google Drive SIMTAQ
  if (payload.videoBase64 && payload.videoBase64.indexOf('base64,') !== -1) {
    try {
      const folder = getDriveFolder_();
      const parts = payload.videoBase64.split('base64,');
      const bytes = Utilities.base64Decode(parts[1]);
      const cleanName = (payload.santriNama || 'Santri').replace(/[^a-zA-Z0-9]/g, '_');
      const mime = payload.videoMimeType || 'video/webm';
      const ext = (mime.indexOf('mp4') !== -1) ? '.mp4' : '.webm';
      const fileName = 'SIMTAQ_' + (payload.nis || 'NIS') + '_' + cleanName + '_' + Date.now() + ext;
      const blob = Utilities.newBlob(bytes, mime, fileName);
      const file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      videoUrl = file.getUrl();

      // Pastikan file tidak tercecer di Beranda (Root) Drive Saya jika folder tujuan berbeda
      try {
        const root = DriveApp.getRootFolder();
        if (folder.getId() !== root.getId()) {
          root.removeFile(file);
        }
      } catch (rmErr) {
        // Abaikan jika sudah tidak ada di root
      }
    } catch (driveErr) {
      Logger.log('Drive upload error: ' + driveErr.toString());
    }
  } else if (payload.videoBlobUrl && payload.videoBlobUrl.startsWith('http')) {
    // 2. Pertahankan link Google Drive yang sudah ada jika hanya mengedit data hafalan
    videoUrl = payload.videoBlobUrl;
  }

  // Pindahkan juga file rekaman SIMTAQ sebelumnya yang sempat masuk ke Beranda/Root ke folder tujuan
  moveOrphanSimtaqVideosToFolder();

  // Pastikan data base64 tidak masuk mengotori Spreadsheet
  if (videoUrl && videoUrl.startsWith('data:')) {
    videoUrl = '';
  }

  const hasVideoStr = (videoUrl && videoUrl.trim() !== '') ? 'TRUE' : 'FALSE';

  const rowValues = [
    payload.id,
    payload.tanggal,
    payload.santriId,
    payload.nis,
    payload.santriNama,
    payload.surat,
    payload.ayat,
    payload.juz,
    payload.nilai,
    payload.ustadz,
    payload.catatan,
    hasVideoStr,
    videoUrl
  ];

  // Cek apakah ID setoran sudah ada untuk update atau insert baru
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(payload.id)) {
      sheet.getRange(i + 1, 1, 1, rowValues.length).setValues([rowValues]);
      return { status: 'success', action: 'updated', videoUrl: videoUrl, id: payload.id };
    }
  }

  sheet.appendRow(rowValues);
  return { status: 'success', action: 'inserted', videoUrl: videoUrl, id: payload.id };
}

function deleteSetoranVideoGAS(setoranId) {
  initSheetsIfNeeded();
  const sheet = getSpreadsheet_().getSheetByName('Setoran_Hafalan');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(setoranId)) {
      sheet.getRange(i + 1, 12).setValue('FALSE');
      sheet.getRange(i + 1, 13).setValue('');
      return { status: 'success', message: 'Video setoran berhasil dihapus dari Spreadsheet' };
    }
  }
  return { status: 'not_found' };
}

// Memindahkan file-file rekaman SIMTAQ yang sempat masuk ke root/beranda Drive ke folder tujuan
function moveOrphanSimtaqVideosToFolder() {
  try {
    const folder = getDriveFolder_();
    const root = DriveApp.getRootFolder();
    if (!folder || folder.getId() === root.getId()) return;
    const files = root.getFiles();
    while (files.hasNext()) {
      const f = files.next();
      if (f.getName().indexOf('SIMTAQ_') === 0 && !f.isTrashed()) {
        try {
          folder.addFile(f);
          root.removeFile(f);
        } catch (eMove) {
          Logger.log('Move error: ' + eMove.toString());
        }
      }
    }
  } catch (e) {
    Logger.log('moveOrphan error: ' + e.toString());
  }
}

function upsertSantriGAS(s) {
  initSheetsIfNeeded();
  const sheet = getSpreadsheet_().getSheetByName('Data_Santri');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(s.id)) {
      sheet.getRange(i + 1, 1, 1, 8).setValues([[s.id, s.nis, s.nama, s.jk, s.kelas, s.asrama, s.juz, s.status]]);
      return { status: 'updated' };
    }
  }
  sheet.appendRow([s.id, s.nis, s.nama, s.jk, s.kelas, s.asrama, s.juz, s.status]);
  return { status: 'inserted' };
}

function upsertUstadzGAS(u) {
  initSheetsIfNeeded();
  const sheet = getSpreadsheet_().getSheetByName('Data_Ustadz');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(u.id)) {
      sheet.getRange(i + 1, 1, 1, 7).setValues([[u.id, u.nip, u.nama, u.lembaga, u.halaqah, u.kontak, u.status]]);
      return { status: 'updated' };
    }
  }
  sheet.appendRow([u.id, u.nip, u.nama, u.lembaga, u.halaqah, u.kontak, u.status]);
  return { status: 'inserted' };
}

function upsertTargetGAS(t) {
  initSheetsIfNeeded();
  const sheet = getSpreadsheet_().getSheetByName('Target_Hafalan');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(t.id)) {
      sheet.getRange(i + 1, 1, 1, 8).setValues([[t.id, t.santriId, t.nis, t.santriNama, t.kelas, t.target, t.tanggalTarget, t.status]]);
      return { status: 'updated' };
    }
  }
  sheet.appendRow([t.id, t.santriId, t.nis, t.santriNama, t.kelas, t.target, t.tanggalTarget, t.status]);
  return { status: 'inserted' };
}

function deleteRecordByIdGAS(sheetName, recordId) {
  initSheetsIfNeeded();
  const sheet = getSpreadsheet_().getSheetByName(sheetName);
  if (!sheet) return { status: 'not_found' };
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { status: 'empty', count: 0 };

  const target = String(recordId || '').replace(/^@+/, '').trim().toLowerCase();
  if (target === 'all' || target === 'clear_all') {
    sheet.deleteRows(2, lastRow - 1);
    return { status: 'cleared_all', count: lastRow - 1 };
  }

  const data = sheet.getDataRange().getValues();
  let deletedCount = 0;
  for (let i = data.length - 1; i >= 1; i--) {
    const col0 = String(data[i][0] || '').trim();
    const col1 = String(data[i][1] || '').replace(/^@+/, '').trim().toLowerCase();
    const col2 = String(data[i][2] || '').trim();
    const isTargetMatch = sheetName === 'Target_Hafalan' && (col0 === String(recordId) || col0.toLowerCase() === target || col1 === target || col1 === String(recordId) || col2 === String(recordId));
    const isSetoranMatch = sheetName === 'Setoran_Hafalan' && (col0 === String(recordId) || col0.toLowerCase() === target || col2 === String(recordId) || col2 === target);
    const isPenggunaMatch = sheetName === 'Data_Pengguna' && (col0 === String(recordId) || col1 === target);
    const isSantriMatch = sheetName === 'Data_Santri' && (col0 === String(recordId) || col2 === String(recordId));
    const isGeneralMatch = col0 === String(recordId) || col0.toLowerCase() === target;

    if (isGeneralMatch || isTargetMatch || isSetoranMatch || isPenggunaMatch || isSantriMatch) {
      sheet.deleteRow(i + 1);
      deletedCount++;
    }
  }
  return { status: deletedCount > 0 ? 'deleted' : 'not_found', count: deletedCount };
}

function clearSheetDataGAS(sheetName) {
  initSheetsIfNeeded();
  const sheet = getSpreadsheet_().getSheetByName(sheetName);
  if (!sheet) return { status: 'not_found' };
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
    return { status: 'cleared', count: lastRow - 1 };
  }
  return { status: 'already_empty', count: 0 };
}

function savePejabatGAS(pejabatObj) {
  initSheetsIfNeeded();
  const sheet = getSpreadsheet_().getSheetByName('Pengaturan_Pejabat');
  sheet.clearContents();
  sheet.appendRow(['Key', 'Value']);
  Object.keys(pejabatObj).forEach(k => sheet.appendRow([k, pejabatObj[k]]));
  return { status: 'success' };
}

function upsertPenggunaGAS(u) {
  initSheetsIfNeeded();
  const sheet = getSpreadsheet_().getSheetByName('Data_Pengguna');
  const cleanU = String(u.username || '').replace(/^@+/, '').trim().toLowerCase();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const rowId = String(data[i][0]);
    const rowUser = String(data[i][1]).replace(/^@+/, '').trim().toLowerCase();
    if (rowId === String(u.id) || rowUser === cleanU) {
      sheet.getRange(i + 1, 1, 1, 7).setValues([[u.id, cleanU, u.password, u.nama, u.peran, u.refId, u.status]]);
      return { status: 'updated' };
    }
  }
  sheet.appendRow([u.id, cleanU, u.password, u.nama, u.peran, u.refId, u.status]);
  return { status: 'inserted' };
}