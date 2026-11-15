# Windows XP Clone

Kloning bergaya Windows XP yang berjalan penuh di browser, dibangun dengan React 19, TypeScript, dan Vite. Proyek penggemar untuk nostalgia, tidak berafiliasi dengan Microsoft. Ikon aplikasi dan suara dibuat ulang secara orisinal (SVG dan WebAudio). Wallpaper Bliss dan logo Windows XP (`src/assets/`, `public/favicon.ico`) adalah aset yang disediakan pemilik repo; hak ciptanya milik Microsoft, jadi gunakan hanya untuk proyek nonkomersial.

## Fitur

- Boot, login, log off, restart, dan shutdown
- Window manager: drag, resize, minimize, maximize, urutan z, taskbar, show desktop
- Start menu dengan All Programs, Run, dan pintasan
- Desktop: ikon, seleksi kotak, menu klik kanan, rename, drag ke Recycle Bin
- Virtual file system (disimpan di IndexedDB) dengan Recycle Bin dan Restore
- Aplikasi: Explorer, Notepad, Paint, Calculator, Minesweeper, Solitaire, Internet Explorer, Media Player, Command Prompt, Task Manager, Control Panel, Display Properties, About, Run
- Tema Blue, Olive, Silver dan wallpaper CSS
- Suara sistem hasil sintesis WebAudio

## Menjalankan

```
npm install
npm run dev
```

Skrip lain:

| Perintah | Fungsi |
| --- | --- |
| `npm run build` | Typecheck dan build produksi ke `dist/` |
| `npm run preview` | Menjalankan hasil build |
| `npm run typecheck` | Pemeriksaan tipe TypeScript |
| `npm run lint` | ESLint |
| `npm test` | Tes unit Vitest |

## Struktur

```
src/
  core/        store, VFS, window manager (os.ts), suara, metadata aplikasi
  components/  Window, Taskbar, StartMenu, Desktop, ContextMenu, Dialogs, Screens, Icon
  apps/        satu berkas per aplikasi, logika murni dipisah (*Logic.ts)
  styles/      base.css, shell.css, apps.css
  test/        tes unit untuk logika murni
```

Logika murni (VFS, kalkulator, Minesweeper, Solitaire, Command Prompt, flood fill Paint, normalisasi URL, WAV) dipisah dari UI agar mudah diuji tanpa browser.

## Deploy

`base: './'` sudah diatur, jadi hasil `dist/` dapat dipublikasikan ke GitHub Pages atau Vercel tanpa konfigurasi tambahan.

## Catatan

Internet Explorer memakai iframe, sehingga banyak situs menolak tampil di dalamnya (kebijakan X-Frame-Options). Halaman `about:home` selalu berfungsi.

## Lisensi

MIT. Windows adalah merek dagang Microsoft Corporation; proyek ini tidak berafiliasi atau didukung oleh Microsoft.
