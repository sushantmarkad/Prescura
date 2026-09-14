import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/* ─── SVG Icons ─── */
const UploadIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);
const ShieldIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const UndoIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 00-4-4H4"/>
  </svg>
);
const ClearIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const ArrowRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);

/* ═══════════════════════════════════════════
   PRIVACY MASKING CANVAS COMPONENT
   ═══════════════════════════════════════════ */
function PrivacyMasker({ imageFile, onMaskingDone, onSkip, currentIdx = 1, totalIdx = 1 }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [rects, setRects] = useState([]);
  const [currentRect, setCurrentRect] = useState(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const imgRef = useRef(null);
  const displayWidth = Math.min(window.innerWidth - 64, 680);

  // Load image onto canvas
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      redraw([]);
      setImgLoaded(true);
    };
    img.src = URL.createObjectURL(imageFile);
  }, [imageFile]);

  const getCanvasPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const redraw = useCallback((rectList, live = null) => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const aspectRatio = img.height / img.width;
    canvas.width = displayWidth;
    canvas.height = displayWidth * aspectRatio;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Draw all saved rectangles
    rectList.forEach(r => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      // Inner label
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.font = `bold ${Math.max(10, Math.min(14, r.h * 0.4))}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('REDACTED', r.x + r.w / 2, r.y + r.h / 2);
    });

    // Draw live rect
    if (live) {
      ctx.fillStyle = 'rgba(15,23,42,0.85)';
      ctx.fillRect(live.x, live.y, live.w, live.h);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      ctx.strokeRect(live.x, live.y, live.w, live.h);
      ctx.setLineDash([]);
    }
  }, [displayWidth]);

  const onMouseDown = (e) => {
    e.preventDefault();
    const pos = getCanvasPos(e, canvasRef.current);
    setIsDrawing(true);
    setStartPos(pos);
  };

  const onMouseMove = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const pos = getCanvasPos(e, canvasRef.current);
    const live = { x: Math.min(startPos.x, pos.x), y: Math.min(startPos.y, pos.y), w: Math.abs(pos.x - startPos.x), h: Math.abs(pos.y - startPos.y) };
    setCurrentRect(live);
    redraw(rects, live);
  };

  const onMouseUp = (e) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentRect && currentRect.w > 5 && currentRect.h > 5) {
      const newRects = [...rects, currentRect];
      setRects(newRects);
      redraw(newRects);
    }
    setCurrentRect(null);
  };

  const handleUndo = () => {
    const newRects = rects.slice(0, -1);
    setRects(newRects);
    redraw(newRects);
  };

  const handleClear = () => {
    setRects([]);
    redraw([]);
  };

  const handleApply = () => {
    // Export the masked canvas as a Blob
    canvasRef.current.toBlob(blob => {
      const maskedFile = new File([blob], imageFile.name, { type: 'image/png' });
      onMaskingDone(maskedFile, rects.length > 0);
    }, 'image/png', 0.95);
  };

  return (
    <div className="pm-root">
      <style>{`
        .pm-root { display: flex; flex-direction: column; gap: 1.25rem; }
        .pm-header { display: flex; align-items: center; gap: 0.75rem; }
        .pm-header-icon { width: 38px; height: 38px; border-radius: 10px; background: rgba(14,165,233,0.12); color: var(--primary-color); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .pm-header-text h3 { margin: 0; font-size: 1rem; font-weight: 700; color: var(--text-primary); }
        .pm-header-text p { margin: 0; font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.1rem; }
        .pm-hint { background: rgba(14,165,233,0.08); border: 1px solid rgba(14,165,233,0.2); border-radius: 10px; padding: 0.65rem 1rem; font-size: 0.8rem; color: var(--primary-color); display: flex; align-items: center; gap: 0.5rem; }
        .pm-canvas-wrap { position: relative; border-radius: 12px; overflow: hidden; border: 1.5px solid var(--border-color); background: #000; cursor: crosshair; touch-action: none; }
        .pm-canvas-wrap canvas { display: block; width: 100%; height: auto; }
        .pm-canvas-wrap::after { content: 'Draw boxes over patient name, DOB, address…'; position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(transparent, rgba(0,0,0,0.7)); color: rgba(255,255,255,0.7); font-size: 0.75rem; padding: 1rem 0.75rem 0.5rem; pointer-events: none; opacity: ${imgLoaded ? 1 : 0}; transition: opacity 0.3s; }
        .pm-toolbar { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; }
        .pm-toolbar-left { display: flex; gap: 0.5rem; flex: 1; }
        .pm-tool-btn { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.5rem 0.9rem; border-radius: 8px; font-size: 0.8rem; font-weight: 600; cursor: pointer; border: 1.5px solid var(--border-color); background: var(--surface-color); color: var(--text-primary); transition: all 0.15s; font-family: inherit; }
        .pm-tool-btn:hover:not(:disabled) { background: var(--bg-color); border-color: var(--text-secondary); }
        .pm-tool-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .pm-count { margin-left: auto; font-size: 0.78rem; color: var(--text-secondary); background: var(--bg-color); border-radius: 999px; padding: 0.25rem 0.65rem; border: 1px solid var(--border-color); }
        .pm-actions { display: flex; gap: 0.75rem; margin-top: 0.5rem; }
        .pm-skip-btn { flex: 1; padding: 0.75rem; border-radius: 12px; font-size: 0.875rem; font-weight: 600; cursor: pointer; border: 1.5px solid var(--border-color); background: transparent; color: var(--text-secondary); transition: all 0.15s; font-family: inherit; }
        .pm-skip-btn:hover { color: var(--text-primary); border-color: var(--text-secondary); }
        .pm-apply-btn { flex: 2; padding: 0.75rem; border-radius: 12px; font-size: 0.875rem; font-weight: 700; cursor: pointer; border: none; background: linear-gradient(135deg, var(--primary-color), #6366f1); color: #fff; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 0.5rem; font-family: inherit; box-shadow: 0 4px 14px rgba(14,165,233,0.3); }
        .pm-apply-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(14,165,233,0.4); }
      `}</style>

      <div className="pm-header">
        <div className="pm-header-icon"><ShieldIcon /></div>
        <div className="pm-header-text">
          <h3>Privacy Masking {totalIdx > 1 ? `(${currentIdx} of ${totalIdx})` : ''}</h3>
          <p>Draw boxes to redact patient PII before AI analysis</p>
        </div>
      </div>

      <div className="pm-hint">
        <ShieldIcon />
        Drag to draw a redaction box. Masked areas will be replaced with dark blocks so the AI cannot read personal information.
      </div>

      <div
        className="pm-canvas-wrap"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onMouseDown}
        onTouchMove={onMouseMove}
        onTouchEnd={onMouseUp}
      >
        <canvas ref={canvasRef} />
      </div>

      <div className="pm-toolbar">
        <div className="pm-toolbar-left">
          <button className="pm-tool-btn" onClick={handleUndo} disabled={rects.length === 0}>
            <UndoIcon /> Undo
          </button>
          <button className="pm-tool-btn" onClick={handleClear} disabled={rects.length === 0}>
            <ClearIcon /> Clear All
          </button>
        </div>
        <span className="pm-count">{rects.length} region{rects.length !== 1 ? 's' : ''} masked</span>
      </div>

      <div className="pm-actions">
        <button className="pm-skip-btn" onClick={() => onSkip(imageFile)}>
          Skip Masking
        </button>
        <button className="pm-apply-btn" onClick={handleApply}>
          <CheckIcon />
          {rects.length > 0 ? `Apply ${rects.length} Mask${rects.length > 1 ? 's' : ''} & Continue` : 'Continue Without Masking'}
          <ArrowRightIcon />
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN UPLOAD PAGE
   ═══════════════════════════════════════════ */
export default function Upload() {
  // Step: 'select' | 'mask' | 'uploading'
  const [step, setStep] = useState('select');
  const [selectedFiles, setSelectedFiles] = useState([]); // [{file, previewUrl, maskedFile?, masked?}]
  const [maskingIndex, setMaskingIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files).filter(f =>
      f.type.startsWith('image/') || f.type === 'application/pdf'
    );
    if (!newFiles.length) { setError('Please select valid image or PDF files.'); return; }
    setSelectedFiles(prev => [
      ...prev,
      ...newFiles.map(f => ({ file: f, previewUrl: URL.createObjectURL(f), maskedFile: null, masked: false }))
    ]);
    setError(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files?.length) handleFileChange({ target: { files: e.dataTransfer.files } });
  };

  const removeFile = (idx) => setSelectedFiles(prev => prev.filter((_, i) => i !== idx));

  /* ── Masking flow ── */
  const startMasking = () => {
    // Only mask images, skip PDFs
    const firstImageIdx = selectedFiles.findIndex(sf => sf.file.type.startsWith('image/'));
    if (firstImageIdx === -1) {
      // All PDFs — skip to upload directly
      handleUpload(selectedFiles);
      return;
    }
    setMaskingIndex(firstImageIdx);
    setStep('mask');
  };

  const onMaskDone = (maskedFile, wasMasked) => {
    const updated = selectedFiles.map((sf, i) =>
      i === maskingIndex ? { ...sf, maskedFile, masked: wasMasked } : sf
    );
    setSelectedFiles(updated);

    // Find next un-masked image
    const nextIdx = updated.findIndex((sf, i) => i > maskingIndex && sf.file.type.startsWith('image/') && !sf.maskedFile);
    if (nextIdx !== -1) {
      setMaskingIndex(nextIdx);
    } else {
      handleUpload(updated);
    }
  };

  const onSkipMask = (originalFile) => {
    onMaskDone(originalFile, false);
  };

  /* ── Upload ── */
  const handleUpload = async (files) => {
    setStep('uploading');
    setError(null);

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    if (!cloudName || !uploadPreset) {
      setError('Cloudinary configuration missing in .env');
      setStep('select');
      return;
    }

    let successCount = 0;
    let lastAuditId = null;
    let lastErrorDetails = null;
    let completed = 0;

    setStatusText(`Starting analysis for ${files.length} file(s)…`);
    setProgress(10);

    const results = [];

    for (let i = 0; i < files.length; i++) {
      const sf = files[i];
      const fileToUpload = sf.maskedFile || sf.file;
      try {
        // 1. Upload to Cloudinary
        const formData = new FormData();
        formData.append('file', fileToUpload);
        formData.append('upload_preset', uploadPreset);
        const uploadResp = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, { method: 'POST', body: formData });
        if (!uploadResp.ok) throw new Error(`Cloudinary upload failed for ${sf.file.name}`);
        const uploadData = await uploadResp.json();

        // 2. Send to AI with masking context
        const res = await fetch(`${apiUrl}/api/process`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrl: uploadData.secure_url,
            userId: currentUser?.uid,
            privacyMasked: sf.masked,       // Tell AI if image was masked
            maskedRegions: sf.masked ? true : false,
          }),
        });
        const data = await res.json();
        
        results.push({ status: 'fulfilled', value: data, sf });
      } catch (err) {
        results.push({ status: 'rejected', reason: err, sf });
      }

      completed++;
      setProgress(10 + Math.round((completed / files.length) * 85));
      setStatusText(`Analyzed ${completed} of ${files.length} file(s)…`);
    }
    setProgress(95);

    results.forEach(r => {
      if (r.status === 'fulfilled' && r.value.success) {
        successCount++;
        const d = r.value;
        if (d.audits?.length > 0) lastAuditId = d.audits[0].auditId;
        else if (d.auditId) lastAuditId = d.auditId;
      } else {
        lastErrorDetails = r.reason?.message || r.value?.error || 'Unknown error';
      }
    });

    if (successCount === 0) {
      setError(`Failed to process. ${lastErrorDetails || 'Check the backend.'}`);
      setStep('select');
      return;
    }

    setProgress(100);
    setStatusText(`${successCount} prescription(s) processed!`);
    setTimeout(() => {
      if (files.length === 1 && lastAuditId) navigate(`/audit-review/${lastAuditId}`);
      else navigate('/dashboard');
    }, 800);
  };

  /* ── Render ── */
  const currentMaskFile = selectedFiles[maskingIndex];

  return (
    <div className="up-root animate-fade-in">
      <style>{`
        .up-root { max-width: 740px; margin: 0 auto; }
        .up-title { font-size: clamp(1.4rem, 4vw, 2rem); font-weight: 800; letter-spacing: -0.04em; margin: 0 0 0.4rem; }
        .up-subtitle { color: var(--text-secondary); font-size: 0.9rem; margin: 0 0 2rem; }
        .up-card { background: var(--surface-color); border: 1px solid var(--border-color); border-radius: 20px; padding: 1.75rem; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }

        /* Dropzone */
        .up-dropzone { width: 100%; min-height: 260px; border: 2px dashed var(--border-color); border-radius: 14px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.75rem; cursor: pointer; background: var(--bg-color); transition: border-color 0.2s, background 0.2s; padding: 2rem; box-sizing: border-box; }
        .up-dropzone:hover, .up-dropzone.drag-over { border-color: var(--primary-color); background: rgba(14,165,233,0.04); }
        .up-dropzone-icon { color: var(--text-secondary); margin-bottom: 0.25rem; }
        .up-dropzone h3 { margin: 0; font-size: 1.05rem; font-weight: 700; color: var(--text-primary); }
        .up-dropzone p { margin: 0; color: var(--text-secondary); font-size: 0.85rem; }
        .up-dropzone-hint { font-size: 0.75rem; color: var(--text-secondary); background: var(--surface-color); padding: 0.3rem 0.75rem; border-radius: 999px; border: 1px solid var(--border-color); }

        /* Preview grid */
        .up-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px; margin-bottom: 1rem; }
        .up-thumb { position: relative; height: 100px; background: #000; border-radius: 10px; overflow: hidden; border: 1.5px solid var(--border-color); }
        .up-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .up-thumb-label { position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(transparent, rgba(0,0,0,0.7)); padding: 0.4rem 0.4rem 0.25rem; }
        .up-thumb-masked { display: inline-flex; align-items: center; gap: 0.2rem; font-size: 0.62rem; font-weight: 700; color: #38bdf8; letter-spacing: 0.04em; }
        .up-thumb-remove { position: absolute; top: 5px; right: 5px; width: 20px; height: 20px; border-radius: 50%; background: rgba(0,0,0,0.6); border: none; color: #fff; cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center; transition: background 0.15s; }
        .up-thumb-remove:hover { background: var(--danger-color); }
        .up-add-more { height: 100px; border: 2px dashed var(--border-color); border-radius: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; font-size: 0.8rem; color: var(--text-secondary); gap: 0.25rem; transition: all 0.15s; }
        .up-add-more:hover { border-color: var(--primary-color); color: var(--primary-color); }

        /* Meta row */
        .up-meta { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1.25rem; }
        .up-file-count { font-size: 0.85rem; font-weight: 600; color: var(--text-primary); }
        .up-clear-btn { font-size: 0.8rem; color: var(--text-secondary); background: none; border: 1px solid var(--border-color); padding: 0.3rem 0.75rem; border-radius: 8px; cursor: pointer; transition: all 0.15s; font-family: inherit; }
        .up-clear-btn:hover { border-color: var(--danger-color); color: var(--danger-color); }

        /* Privacy notice */
        .up-privacy-notice { display: flex; align-items: flex-start; gap: 0.75rem; background: rgba(14,165,233,0.07); border: 1px solid rgba(14,165,233,0.2); border-radius: 12px; padding: 0.85rem 1rem; margin-bottom: 1.25rem; }
        .up-privacy-icon { color: var(--primary-color); flex-shrink: 0; margin-top: 1px; }
        .up-privacy-text { font-size: 0.8rem; color: var(--text-secondary); line-height: 1.55; }
        .up-privacy-text strong { color: var(--primary-color); }

        /* Progress */
        .up-progress-wrap { margin-bottom: 1rem; }
        .up-progress-row { display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.4rem; }
        .up-progress-bar { height: 6px; border-radius: 999px; background: var(--border-color); overflow: hidden; }
        .up-progress-fill { height: 100%; background: linear-gradient(90deg, var(--primary-color), #6366f1); border-radius: 999px; transition: width 0.35s ease; }

        /* Error */
        .up-error { background: var(--danger-light); color: var(--danger-color); border-radius: 10px; padding: 0.75rem 1rem; font-size: 0.85rem; margin-bottom: 1rem; }

        /* Submit button */
        .up-submit-btn { width: 100%; padding: 0.9rem; border-radius: 14px; font-size: 0.95rem; font-weight: 700; cursor: pointer; border: none; background: linear-gradient(135deg, var(--primary-color), #6366f1); color: #fff; display: flex; align-items: center; justify-content: center; gap: 0.5rem; transition: transform 0.2s, box-shadow 0.2s; box-shadow: 0 4px 16px rgba(14,165,233,0.3); font-family: inherit; }
        .up-submit-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(14,165,233,0.4); }
        .up-submit-btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }

        /* Steps indicator */
        .up-steps { display: flex; align-items: center; gap: 0; margin-bottom: 1.75rem; }
        .up-step { display: flex; align-items: center; gap: 0.4rem; font-size: 0.78rem; font-weight: 600; color: var(--text-secondary); }
        .up-step.active { color: var(--primary-color); }
        .up-step.done { color: #059669; }
        .up-step-num { width: 22px; height: 22px; border-radius: 50%; border: 2px solid currentColor; display: flex; align-items: center; justify-content: center; font-size: 0.65rem; flex-shrink: 0; }
        .up-step-sep { flex: 1; height: 1px; background: var(--border-color); margin: 0 0.5rem; }
      `}</style>

      <h1 className="up-title">Upload Prescription</h1>
      <p className="up-subtitle">Securely upload and audit prescriptions with built-in privacy protection.</p>

      {/* Step indicators */}
      <div className="up-steps">
        {[
          { label: 'Select Files', key: 'select' },
          { label: 'Privacy Masking', key: 'mask' },
          { label: 'AI Analysis', key: 'uploading' },
        ].map((s, i, arr) => {
          const stepOrder = { select: 0, mask: 1, uploading: 2 };
          const cur = stepOrder[step];
          const me = stepOrder[s.key];
          const cls = me < cur ? 'done' : me === cur ? 'active' : '';
          return (
            <React.Fragment key={s.key}>
              <div className={`up-step ${cls}`}>
                <div className="up-step-num">
                  {me < cur ? <CheckIcon /> : i + 1}
                </div>
                {s.label}
              </div>
              {i < arr.length - 1 && <div className="up-step-sep" />}
            </React.Fragment>
          );
        })}
      </div>

      <div className="up-card">

        {/* ── STEP: SELECT ── */}
        {step === 'select' && (<>
          {selectedFiles.length === 0 ? (
            <div
              className="up-dropzone"
              onClick={() => fileInputRef.current.click()}
              onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }}
              onDragLeave={e => e.currentTarget.classList.remove('drag-over')}
              onDrop={e => { e.currentTarget.classList.remove('drag-over'); handleDrop(e); }}
            >
              <div className="up-dropzone-icon"><UploadIcon /></div>
              <h3>Drag & Drop or Click to Upload</h3>
              <p>Select one or multiple prescription images</p>
              <span className="up-dropzone-hint">JPG, PNG, PDF · Multiple files supported</span>
            </div>
          ) : (
            <>
              <div className="up-grid">
                {selectedFiles.map((sf, idx) => (
                  <div key={idx} className="up-thumb">
                    {sf.file.type === 'application/pdf'
                      ? <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.8rem' }}>PDF</div>
                      : <img src={sf.previewUrl} alt="Preview" />
                    }
                    {sf.masked && (
                      <div className="up-thumb-label">
                        <span className="up-thumb-masked"><ShieldIcon /> Masked</span>
                      </div>
                    )}
                    <button className="up-thumb-remove" onClick={() => removeFile(idx)}>×</button>
                  </div>
                ))}
                <div className="up-add-more" onClick={() => fileInputRef.current.click()}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Add More
                </div>
              </div>

              <div className="up-meta">
                <span className="up-file-count">{selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected</span>
                <button className="up-clear-btn" onClick={() => setSelectedFiles([])}>Clear All</button>
              </div>
            </>
          )}

          <div className="up-privacy-notice">
            <span className="up-privacy-icon"><ShieldIcon /></span>
            <p className="up-privacy-text">
              <strong>Privacy Protection:</strong> In the next step you can draw redaction boxes over patient name, date of birth, address, or any other personal information before it reaches the AI. The AI is trained to skip masked regions and will still evaluate all clinical parameters.
            </p>
          </div>

          {error && <div className="up-error">{error}</div>}

          <input type="file" multiple accept="image/*, application/pdf" style={{ display: 'none' }} ref={fileInputRef} onChange={handleFileChange} />

          <button
            className="up-submit-btn"
            disabled={selectedFiles.length === 0}
            onClick={startMasking}
          >
            <ShieldIcon />
            Continue to Privacy Masking
            <ArrowRightIcon />
          </button>
        </>)}

        {/* ── STEP: MASK ── */}
        {step === 'mask' && currentMaskFile && (
          <PrivacyMasker
            key={maskingIndex}
            imageFile={currentMaskFile.file}
            onMaskingDone={onMaskDone}
            onSkip={onSkipMask}
            currentIdx={maskingIndex + 1}
            totalIdx={selectedFiles.length}
          />
        )}

        {/* ── STEP: UPLOADING ── */}
        {step === 'uploading' && (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', border: '3px solid var(--border-color)', borderTopColor: 'var(--primary-color)', animation: 'up-spin 0.8s linear infinite', margin: '0 auto 1.5rem' }} />
            <style>{`@keyframes up-spin { to { transform: rotate(360deg) } }`}</style>
            <div className="up-progress-wrap">
              <div className="up-progress-row">
                <span>{statusText}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="up-progress-bar">
                <div className="up-progress-fill" style={{ width: `${progress}%` }} />
              </div>
            </div>
            {error && <div className="up-error">{error}</div>}
          </div>
        )}

      </div>
    </div>
  );
}
