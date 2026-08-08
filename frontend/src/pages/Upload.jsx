import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
// import { storage } from '../config/firebase';
// import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../context/AuthContext';
// import { v4 as uuidv4 } from 'uuid'; // Need to add uuid to frontend

export default function Upload() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const isMock = import.meta.env.VITE_MOCK_AUTH === 'true';

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setError(null);
    } else {
      setFile(null);
      setPreviewUrl(null);
      setError('Please select a valid image file.');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setUploading(true);
    setError(null);
    
    try {
      if (isMock) {
        // Mock upload delay
        for (let i = 0; i <= 100; i += 10) {
          setProgress(i);
          await new Promise(r => setTimeout(r, 200));
        }
        
        // Use local object URL for previewing during mock
        const mockUrl = previewUrl;
        // In a real app we'd get a document ID from the backend here
        const mockDocId = 'mock-audit-' + Date.now();
        navigate(`/audit-review/${mockDocId}`, { state: { imageUrl: mockUrl } });
        return;
      }
      
      // --- CLOUDINARY UPLOAD ---
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
      
      if (!cloudName || !uploadPreset) {
        setError("Cloudinary configuration missing in .env");
        setUploading(false);
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);
      
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);
      
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const progressPercent = (e.loaded / e.total) * 100;
          setProgress(progressPercent);
        }
      };
      
      xhr.onload = async () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          const downloadURL = response.secure_url;
          
          try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            const res = await fetch(`${apiUrl}/api/process`, { 
              method: 'POST', 
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ imageUrl: downloadURL }) 
            });
            const data = await res.json();
            
            if (data.success) {
              navigate(`/audit-review/${data.auditId}`, { 
                state: { 
                  imageUrl: downloadURL, 
                  extractedData: data.extractedData,
                  auditResults: data.auditResults 
                } 
              });
            } else {
              setError("Backend processing failed.");
              setUploading(false);
            }
          } catch (err) {
            console.error("Backend error:", err);
            setError("Failed to connect to backend server.");
            setUploading(false);
          }
        } else {
          console.error("Cloudinary upload failed:", xhr.responseText);
          setError("Image Upload failed. Please try again.");
          setUploading(false);
        }
      };
      
      xhr.onerror = () => {
        setError("Network error during upload.");
        setUploading(false);
      };
      
      xhr.send(formData);

      /* --- FIREBASE STORAGE BACKUP (COMMENTED OUT) ---
      const fileExt = file.name.split('.').pop();
      const fileName = `prescriptions/${currentUser.uid}/${Date.now()}-${uuidv4()}.${fileExt}`;
      const storageRef = ref(storage, fileName);
      
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setProgress(progress);
        }, 
        (error) => {
          console.error("Upload error:", error);
          setError("Upload failed. Please try again.");
          setUploading(false);
        }, 
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          
          try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            const res = await fetch(`${apiUrl}/api/process`, { 
              method: 'POST', 
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ imageUrl: downloadURL }) 
            });
            const data = await res.json();
            
            if (data.success) {
              navigate(`/audit-review/${data.auditId}`, { 
                state: { 
                  imageUrl: downloadURL, 
                  extractedData: data.extractedData,
                  auditResults: data.auditResults 
                } 
              });
            } else {
              setError("Backend processing failed.");
              setUploading(false);
            }
          } catch (err) {
            console.error("Backend error:", err);
            setError("Failed to connect to backend server.");
            setUploading(false);
          }
        }
      );
      */
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred.');
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
        
        {!previewUrl ? (
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
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                fileInputRef.current.files = e.dataTransfer.files;
                handleFileChange({ target: fileInputRef.current });
              }
            }}
          >
            <div style={{ fontSize: '3rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>📄</div>
            <h3>Drag & Drop or Click to Upload</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Supports JPG, PNG (Max 5MB)</p>
          </div>
        ) : (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ 
              width: '100%', 
              maxHeight: '400px', 
              overflow: 'hidden', 
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              justifyContent: 'center',
              backgroundColor: '#000'
            }}>
              <img src={previewUrl} alt="Prescription preview" style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain' }} />
            </div>
            
            <div className="flex-between">
              <div>
                <strong>{file.name}</strong>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </div>
              </div>
              <button 
                className="btn btn-secondary" 
                onClick={() => { setFile(null); setPreviewUrl(null); }}
                disabled={uploading}
              >
                Change Image
              </button>
            </div>
          </div>
        )}

        <input 
          type="file" 
          accept="image/*" 
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
              <span>Uploading...</span>
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
          disabled={!file || uploading}
          onClick={handleUpload}
        >
          {uploading ? 'Processing...' : 'Upload & Start Analysis'}
        </button>

      </div>
    </div>
  );
}
