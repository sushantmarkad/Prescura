import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
// import { storage } from '../config/firebase';
// import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../context/AuthContext';
// import { v4 as uuidv4 } from 'uuid'; // Need to add uuid to frontend

export default function Upload() {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const isMock = import.meta.env.VITE_MOCK_AUTH === 'true';

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files).filter(f => f.type.startsWith('image/') || f.type === 'application/pdf');
    if (newFiles.length > 0) {
      const newSelected = newFiles.map(f => ({
        file: f,
        previewUrl: URL.createObjectURL(f)
      }));
      setSelectedFiles(prev => [...prev, ...newSelected]);
      setError(null);
    } else {
      setError('Please select valid image or PDF files.');
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    
    setUploading(true);
    setError(null);
    
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    
    if (!cloudName || !uploadPreset) {
      setError("Cloudinary configuration missing in .env");
      setUploading(false);
      return;
    }

    let successCount = 0;
    let lastAuditId = null;

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const { file } = selectedFiles[i];
        setStatusText(`Processing ${i + 1} of ${selectedFiles.length}: ${file.name}...`);
        setProgress(Math.round(((i) / selectedFiles.length) * 100));

        // 1. Upload to Cloudinary
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);
        
        const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
          method: 'POST',
          body: formData
        });
        
        if (!uploadResponse.ok) throw new Error(`Cloudinary upload failed for ${file.name}`);
        const uploadData = await uploadResponse.json();
        const downloadURL = uploadData.secure_url;

        // 2. Process with AI
        const res = await fetch(`${apiUrl}/api/process`, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: downloadURL }) 
        });
        
        const data = await res.json();
        if (data.success) {
          successCount++;
          lastAuditId = data.auditId;
        } else {
          console.error(`Backend failed for ${file.name}:`, data.details);
        }
      }
      
      setProgress(100);
      setStatusText('Upload Complete!');
      
      // If only 1 file was uploaded and successful, go straight to review
      if (selectedFiles.length === 1 && successCount === 1) {
        navigate(`/audit-review/${lastAuditId}`);
      } else {
        // Otherwise, go to dashboard to see all new audits
        setTimeout(() => navigate('/dashboard'), 1500);
      }
      
    } catch (err) {
      console.error(err);
      setError('An error occurred during batch processing.');
      setUploading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '1rem' }}>Upload Prescription</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        Securely upload a prescription image for AI-assisted auditing. Ensure the image is clear and well-lit.
      </p>

      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        {selectedFiles.length === 0 ? (
          <div 
            style={{ 
              width: '100%', 
              height: '300px', 
              border: '2px dashed var(--border-color)', 
              borderRadius: 'var(--radius-md)', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              cursor: 'pointer',
              backgroundColor: 'var(--bg-color)',
              transition: 'border-color 0.3s ease'
            }}
            onClick={() => fileInputRef.current.click()}
            onDragOver={(e) => { e.preventDefault(); e.target.style.borderColor = 'var(--primary-color)'; }}
            onDragLeave={(e) => { e.preventDefault(); e.target.style.borderColor = 'var(--border-color)'; }}
            onDrop={(e) => {
              e.preventDefault();
              e.target.style.borderColor = 'var(--border-color)';
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleFileChange({ target: { files: e.dataTransfer.files } });
              }
            }}
          >
            <div style={{ fontSize: '3rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>📄</div>
            <h3>Drag & Drop or Click to Upload</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Select multiple images to batch process!</p>
          </div>
        ) : (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px' }}>
              {selectedFiles.map((sf, idx) => (
                <div key={idx} style={{ position: 'relative', height: '120px', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden' }}>
                  {sf.file.type === 'application/pdf' ? (
                    <div style={{ display: 'flex', height: '100%', justifyContent: 'center', alignItems: 'center', color: 'white' }}>PDF</div>
                  ) : (
                    <img src={sf.previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}
                  <button 
                    style={{ position: 'absolute', top: 5, right: 5, background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer' }}
                    onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                  >
                    ×
                  </button>
                </div>
              ))}
              <div 
                style={{ height: '120px', border: '2px dashed var(--border-color)', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer' }}
                onClick={() => fileInputRef.current.click()}
              >
                + Add More
              </div>
            </div>
            
            <div className="flex-between">
              <div>
                <strong>{selectedFiles.length} file(s) selected</strong>
              </div>
              <button 
                className="btn btn-secondary" 
                onClick={() => setSelectedFiles([])}
                disabled={uploading}
              >
                Clear All
              </button>
            </div>
          </div>
        )}

        <input 
          type="file" 
          multiple
          accept="image/*, application/pdf" 
          style={{ display: 'none' }} 
          ref={fileInputRef}
          onChange={handleFileChange}
        />

        {error && (
          <div style={{ width: '100%', marginTop: '1rem', padding: '0.8rem', backgroundColor: 'var(--danger-light)', color: 'var(--danger-color)', borderRadius: 'var(--radius-sm)' }}>
            {error}
          </div>
        )}

        {uploading && (
          <div style={{ width: '100%', marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
              <span>{statusText}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, backgroundColor: 'var(--primary-color)', transition: 'width 0.3s ease' }}></div>
            </div>
          </div>
        )}

        <button 
          className="btn btn-primary" 
          style={{ width: '100%', marginTop: '2rem', padding: '1rem' }}
          disabled={selectedFiles.length === 0 || uploading}
          onClick={handleUpload}
        >
          {uploading ? 'Processing...' : 'Upload & Start Analysis'}
        </button>

      </div>
    </div>
  );
}
