import { useState, useRef } from 'react'
import './App.css'

function App() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const API_BASE_URL = 'http://localhost:3000';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleUpload(e.target.files[0]);
    }
  };

  const handleUpload = async (file: File) => {
    if (file.type !== 'application/pdf') {
      alert('Lütfen sadece PDF dosyası yükleyin.');
      return;
    }

    setFileName(file.name);
    setIsUploading(true);
    setResultUrl(null);
    setProgress(10);
    setStatusText('Dosya sunucuya gönderiliyor...');

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Simüle edilen ilerleme
      const progressInterval = setInterval(() => {
        setProgress(prev => {
           if (prev >= 90) {
               clearInterval(progressInterval);
               return 90;
           }
           return prev + 5;
        });
      }, 300);

      const response = await fetch(`${API_BASE_URL}/api/convert`, {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) throw new Error('Dönüştürme hatası');

      const data = await response.json();
      
      setProgress(100);
      setStatusText('Dönüştürme tamamlandı!');
      
      setTimeout(() => {
          setResultUrl(`${API_BASE_URL}${data.download_url}`);
          setIsUploading(false);
      }, 1000);

    } catch (error) {
      console.error(error);
      alert('Dönüştürme sırasında bir hata oluştu. Sunucunun çalıştığından ve Inkscape\'in kurulu olduğundan emin olun.');
      setIsUploading(false);
      setProgress(0);
    }
  };

  const handleDownload = async () => {
    if (!resultUrl) return;
    
    try {
      const response = await fetch(resultUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = fileName.replace('.pdf', '.dxf');
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('İndirme hatası:', error);
      alert('Dosya indirilemedi.');
    }
  };

  return (
    <div className="app-container">
      <div className="aurora-container">
        <div className="aurora aurora-1"></div>
        <div className="aurora aurora-2"></div>
      </div>

      <nav>
        <div className="logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{color:'var(--primary)'}}>
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
          DWG <span>Converter Pro</span>
        </div>
        <div className="nav-links">
           <a href="#features" style={{color: 'var(--text-muted)', textDecoration: 'none'}}>Nasıl Çalışır?</a>
        </div>
      </nav>

      <section className="hero">
        <h1>PDF Dosyalarınızı <br /> <span style={{color:'var(--primary)'}}>Mükemmel CAD</span>'e Çevirin</h1>
        <p>Mimari ve mühendislik planlarınız için en yüksek hassasiyete sahip yerel (local) dönüştürme motoru.</p>
      </section>

      <section className="converter-section">
        <div className="converter-card" id="converter">
          {!isUploading && !resultUrl ? (
            <div 
              className="dropzone" 
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('active'); }}
              onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('active'); }}
              onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('active'); if(e.dataTransfer.files[0]) handleUpload(e.dataTransfer.files[0]); }}
            >
              <span className="upload-icon">📄</span>
              <h3>PDF Dosyasını Buraya Bırakın</h3>
              <p>Veya bilgisayarınızdan seçmek için tıklayın</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{display: 'none'}} 
                accept=".pdf"
                onChange={handleFileChange}
              />
            </div>
          ) : isUploading ? (
            <div className="status-area">
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem'}}>
                <span>{statusText}</span>
                <span>{progress}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{width: `${progress}%`}}></div>
              </div>
              <p style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>{fileName}</p>
            </div>
          ) : resultUrl ? (
            <div className="result-box">
              <div style={{marginBottom: '2rem'}}>
                 <span style={{fontSize: '3rem'}}>✅</span>
                 <h3>Hazır!</h3>
                 <p>{fileName} başarıyla dönüştürüldü.</p>
              </div>

              <button onClick={handleDownload} className="btn-download">
                DXF Dosyasını İndir
              </button>

              <div style={{marginTop: '2rem'}}>
                  <button 
                    onClick={() => {setResultUrl(null); setProgress(0);}}
                    style={{background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline'}}
                  >
                    Başka bir dosya yükle
                  </button>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="features-grid" id="features">
        <div className="feature-item">
          <span className="feature-icon">⚡</span>
          <h3>Ultra Hızlı</h3>
          <p>Yerel Inkscape motoru sayesinde dönüştürme işlemleri saniyeler içinde tamamlanır.</p>
        </div>
        <div className="feature-item">
          <span className="feature-icon">🎯</span>
          <h3>Vektörel Kalite</h3>
          <p>Çizgiler, katmanlar ve geometrik şekiller korunarak yüksek kaliteli DXF üretilir.</p>
        </div>
        <div className="feature-item">
          <span className="feature-icon">🔒</span>
          <h3>Güvenli & Yerel</h3>
          <p>Dosyalarınız buluta yüklenmez, işlemler tamamen yerel sunucunuzda gerçekleşir.</p>
        </div>
      </section>

      <footer>
        <div className="logo" style={{justifyContent: 'center', marginBottom: '1rem'}}>
          DWG <span>Converter Pro</span>
        </div>
        <p style={{color: 'var(--text-muted)', fontSize: '0.8rem'}}>© 2026 DWG Converter Pro. Tüm hakları saklıdır.</p>
        <div className="footer-links">
           <a href="#">Kullanım Şartları</a>
           <a href="#">Gizlilik</a>
           <a href="#">İletişim</a>
        </div>
      </footer>
    </div>
  )
}

export default App
