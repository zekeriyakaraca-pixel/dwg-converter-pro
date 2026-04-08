import { spawn } from 'child_process';
import fs from 'fs/promises';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Frontend static files (Serve from 'dist' in production)
const __dirname = path.dirname(new URL(import.meta.url).pathname).substring(1); 
const distPath = path.resolve(__dirname, '../../frontend/dist');

// Serve static files
app.use(express.static(distPath));

// Health Check (Render vb. servisler için)
app.get('/healthz', (req, res) => res.status(200).send('ok'));

// Set up Multer for file uploads
const upload = multer({ dest: 'uploads/' });

app.post('/api/convert', upload.single('file'), async (req, res) => {
  let tempInputPath = '';
  let realInputPath = '';
  let outputPath = '';
  
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'Lütfen bir dosya yükleyin.' });
    }

    tempInputPath = path.resolve(file.path);
    realInputPath = `${tempInputPath}.pdf`; 
    outputPath = `${tempInputPath}.dxf`;

    await fs.rename(tempInputPath, realInputPath);

    console.log(`Dönüştürme başlıyor: ${file.originalname}`);

    // Inkscape yolu (İşletim sistemine göre dinamik seçim)
    const isWindows = process.platform === 'win32';
    const inkscapePath = isWindows 
        ? 'C:\\Program Files\\Inkscape\\bin\\inkscape.com' 
        : 'inkscape'; // Docker (Linux) üzerinde sistem yolundadır
    
    const inkscapeProcess = spawn(inkscapePath, [
      realInputPath,
      '--export-type=dxf',
      `--export-filename=${outputPath}`
    ]);

    let stdout = '';
    let stderr = '';
    inkscapeProcess.stdout.on('data', (data) => { stdout += data.toString(); });
    inkscapeProcess.stderr.on('data', (data) => { stderr += data.toString(); });

    await new Promise((resolve, reject) => {
        inkscapeProcess.on('close', (code) => {
            if (code === 0) resolve(null);
            else reject(new Error(`Inkscape hata kodu (${code}). \nLog: ${stdout} ${stderr}`));
        });
        inkscapeProcess.on('error', (err) => reject(err));
    });

    const stats = await fs.stat(outputPath);
    if (stats.size === 0) throw new Error('Boş dosya oluştu.');

    console.log(`Dönüştürme başarılı: ${outputPath}`);

    res.json({
        success: true,
        message: 'Başarıyla tamamlandı.',
        download_url: `/api/download/${path.basename(outputPath)}`,
        originalName: file.originalname.replace('.pdf', '.dxf')
    });

  } catch (error) {
    console.error('Hata:', error);
    res.status(500).json({ error: `Hata: ${error instanceof Error ? error.message : 'Bilinmeyen'}` });
  } finally {
    if (realInputPath) fs.unlink(realInputPath).catch(() => {});
  }
});

// Dosya indirme
app.get('/api/download/:filename', async (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join('uploads', filename);
    try {
        await fs.access(filePath);
        res.download(filePath, (err) => {
            if (!err) fs.unlink(filePath).catch(() => {});
        });
    } catch {
        res.status(404).send('Bulunamadı.');
    }
});

// SPA Fallback: Tüm diğer talepleri (API olmayanları) frontend'e yönlendir
app.use((req, res) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/healthz')) return;
    res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`Sunucu ${port} portunda çalışıyor.`);
});
