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
    realInputPath = `${tempInputPath}.pdf`; // Uzantı ekleyerek Inkscape'e yardım ediyoruz
    outputPath = `${tempInputPath}.dxf`;

    // Dosyayı .pdf uzantısıyla yeniden adlandır
    await fs.rename(tempInputPath, realInputPath);

    console.log(`Dönüştürme başlıyor: ${file.originalname}`);
    console.log(`Giriş (Raw): ${realInputPath}`);
    console.log(`Çıkış (Target): ${outputPath}`);

    // Inkscape yolu
    const inkscapePath = 'C:\\Program Files\\Inkscape\\bin\\inkscape.com';
    
    // Spawn kullanımı
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
            else reject(new Error(`Inkscape hata kodu (${code}) ile kapandı. \nSTDOUT: ${stdout}\nSTDERR: ${stderr}`));
        });
        inkscapeProcess.on('error', (err) => reject(err));
    });

    // Dosyanın gerçekten oluştuğunu kontrol et (stat öncesi bir saniye beklemek gerekebilir mi? Hayır, promise bekliyor)
    try {
        const stats = await fs.stat(outputPath);
        if (stats.size === 0) {
            throw new Error('Dönüştürme sonucu boş dosya oluştu.');
        }
    } catch (e) {
        console.error('Çıktı dosyası bulunamadı or boş:', e);
        throw new Error(`Dönüştürme işlemi bitti ama çıktı dosyası bulunamadı. \nInkscape Log: ${stdout} ${stderr}`);
    }

    console.log(`Dönüştürme başarılı: ${outputPath}`);

    res.json({
        success: true,
        message: 'Dönüştürme işlemi başarıyla tamamlandı.',
        download_url: `/api/download/${path.basename(outputPath)}`,
        originalName: file.originalname.replace('.pdf', '.dxf')
    });

  } catch (error) {
    console.error('Dönüştürme sırasında hata oluştu:', error);
    res.status(500).json({ error: `Dönüştürme işlemi başarısız oldu: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}` });
  } finally {
    // Temizlik
    if (realInputPath) {
        fs.unlink(realInputPath).catch(() => {});
    }
  }
});

// Dosya indirme endpoint'i
app.get('/api/download/:filename', async (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join('uploads', filename);

    try {
        await fs.access(filePath);
        res.download(filePath, (err) => {
            if (!err) {
                // İndirme sonrası dosyayı temizle
                fs.unlink(filePath).catch(e => console.error('İndirme sonrası temizlik hatası:', e));
            }
        });
    } catch {
        res.status(404).send('Dosya bulunamadı.');
    }
});

app.listen(port, () => {
  console.log(`Sunucu ${port} portunda çalışıyor.`);
});
