import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import html2pdf from 'html2pdf.js';

export default function AuditReview() {
  const { id } = useParams();
  const location = useLocation();
  const [imageUrl, setImageUrl] = useState(location.state?.imageUrl || null);
  const [extractedData, setExtractedData] = useState(location.state?.extractedData || null);
  const [auditResults, setAuditResults] = useState(location.state?.auditResults || {});
  const [loading, setLoading] = useState(!location.state?.extractedData);
  const [classification, setClassification] = useState(null);
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [navigatingNext, setNavigatingNext] = useState(false);
  const [showDoneModal, setShowDoneModal] = useState(false);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Reset state when ID changes (for Next Pending navigation)
  useEffect(() => {
    if (!location.state?.extractedData) {
      setLoading(true);
      setClassification(null);
      setSaveSuccess(false);
      setError(null);
    }
  }, [id, location.state]);

  useEffect(() => {
    const fetchAudit = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const res = await fetch(`${apiUrl}/api/audit/${id}`);
        const data = await res.json();
        if (data.success && data.audit) {
          setImageUrl(data.audit.imageUrl);
          setExtractedData(data.audit.extractedData);
          setAuditResults(data.audit.auditResults);
          if (data.audit.status !== 'PENDING_REVIEW') {
            setClassification({ status: data.audit.finalClassification, reason: data.audit.classificationReason });
          }
        } else {
          setError("No audit data found. Please go back and upload an image.");
        }
      } catch (err) {
        setError("Failed to fetch audit details from server.");
      } finally {
        setLoading(false);
      }
    };
    
    // Fallback if accessed directly or via batch redirect
    if (loading) {
       fetchAudit();
    }
  }, [id, extractedData, loading]);

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '60vh', flexDirection: 'column' }}>
        <div className="animate-pulse" style={{ width: '50px', height: '50px', borderRadius: '50%', border: '4px solid var(--primary-color)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Loading AI Extraction Results...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-center" style={{ minHeight: '60vh', flexDirection: 'column' }}>
        <p style={{ color: 'var(--danger-color)' }}>{error}</p>
        <button className="btn btn-primary" onClick={() => window.location.href = '/upload'} style={{ marginTop: '1rem' }}>Go to Upload</button>
      </div>
    );
  }

  const renderField = (label, fieldData) => {
    if (!fieldData) return null;
    const isUnclear = fieldData.status === 'UNCLEAR';
    const isNotFound = fieldData.status === 'NOT_FOUND';
    
    return (
      <div style={{ marginBottom: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', backgroundColor: 'var(--bg-color)', borderRadius: 'var(--radius-sm)' }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isUnclear ? (
            <span style={{ color: 'var(--accent-color)', fontWeight: 500 }}>Unclear</span>
          ) : isNotFound ? (
            <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Not Found</span>
          ) : (
            <span style={{ fontWeight: 500 }}>{fieldData.value}</span>
          )}
          {fieldData.confidence > 0 && (
            <span className="badge" style={{ backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', fontSize: '0.65rem' }}>
              {Math.round(fieldData.confidence * 100)}%
            </span>
          )}
        </div>
      </div>
    );
  };

  const handleOverride = (criterionId, newAnswer) => {
    setAuditResults(prev => ({
      ...prev,
      [criterionId]: {
        ...prev[criterionId],
        finalAnswer: newAnswer,
        reviewStatus: 'REVIEWED'
      }
    }));
  };

  const renderCriterion = (item) => (
    <div key={item.criterionId} style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', backgroundColor: 'var(--surface-color)' }}>
      <div className="flex-between" style={{ marginBottom: '0.8rem' }}>
        <div style={{ fontWeight: 600 }}>{item.criterionId}. {item.question}</div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className={`btn ${item.finalAnswer === 'YES' ? 'btn-success' : 'btn-secondary'}`}
            style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}
            onClick={() => handleOverride(item.criterionId, 'YES')}
          >YES</button>
          <button 
            className={`btn ${item.finalAnswer === 'NO' ? 'btn-danger' : 'btn-secondary'}`}
            style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}
            onClick={() => handleOverride(item.criterionId, 'NO')}
          >NO</button>
        </div>
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <strong>AI Evidence:</strong> {item.evidence}
          {item.finalAnswer !== item.aiAnswer && (
            <span style={{ color: 'var(--accent-color)', marginLeft: '1rem', fontWeight: 600 }}>[Human Overridden]</span>
          )}
        </div>
        <div>
          {item.confidence > 0 && <span>Conf: {Math.round(item.confidence * 100)}%</span>}
        </div>
      </div>
    </div>
  );

  const handleDownloadPDF = () => {
    const html = `
      <style>
        tr, td, th { page-break-inside: avoid; }
      </style>
      <div style="padding: 20px; font-family: sans-serif; color: #333;">
        <h1 style="color: #0ea5e9; margin-bottom: 10px; border-bottom: 2px solid #0ea5e9; padding-bottom: 10px;">Prescription Audit Report</h1>
        <p><strong>Audit ID:</strong> ${id}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        
        <h3 style="margin-top: 20px; background-color: #f1f5f9; padding: 10px;">Classification Result</h3>
        <p><strong>Status:</strong> <span style="color: ${classification?.status === 'RATIONAL' ? 'green' : 'red'}; font-weight: bold;">${classification?.status || 'Pending'}</span></p>
        <p><strong>Reason:</strong> ${classification?.reason || 'N/A'}</p>

        <h3 style="margin-top: 20px; background-color: #f1f5f9; padding: 10px;">Detailed Audit Results</h3>
        ${['A', 'B', 'C', 'D', 'E', 'F'].map(section => {
          const sectionItems = Object.values(auditResults).filter(r => r.section === section);
          if (sectionItems.length === 0) return '';
          return `
            <div style="page-break-inside: avoid;">
              <h4 style="color: #0ea5e9; margin-top: 15px; margin-bottom: 5px;">${sectionItems[0].sectionName}</h4>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px; border: 1px solid #000;">
                <thead>
                  <tr>
                    <th style="border: 1px solid #000; padding: 8px; text-align: left; background-color: #e2e8f0; width: 35%;">Question</th>
                    <th style="border: 1px solid #000; padding: 8px; text-align: center; background-color: #e2e8f0; width: 15%;">Answer</th>
                    <th style="border: 1px solid #000; padding: 8px; text-align: left; background-color: #e2e8f0; width: 50%;">Evidence</th>
                  </tr>
                </thead>
                <tbody>
                  ${sectionItems.map(r => `
                    <tr>
                      <td style="border: 1px solid #000; padding: 8px;">${r.criterionId}. ${r.question}</td>
                      <td style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold; color: ${r.finalAnswer === 'NO' ? '#ef4444' : '#10b981'};">${r.finalAnswer}</td>
                      <td style="border: 1px solid #000; padding: 8px;">${r.evidence}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `;
        }).join('')}
      </div>
    `;

    const element = document.createElement('div');
    element.innerHTML = html;

    const opt = {
      margin:       10,
      filename:     `audit_report_${id}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
  };

  const handleDownloadExcel = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    window.location.href = `${apiUrl}/api/export?auditId=${id}`;
  };

  const handleNextPending = async () => {
    setNavigatingNext(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${apiUrl}/api/user/audits/${currentUser?.uid}`);
      const data = await res.json();
      if (data.success && data.audits) {
        const pending = data.audits.filter(a => (a.status === 'PENDING_REVIEW' || a.finalClassification === 'PENDING') && a.id !== id);
        if (pending.length > 0) {
          navigate(`/audit-review/${pending[0].id}`, { replace: true });
        } else {
          setShowDoneModal(true);
        }
      }
    } catch (e) {
      console.error(e);
      // Use a custom modal or toast for errors if we wanted, but this is rare
    } finally {
      setNavigatingNext(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
      
      {/* Top Navigation Bar */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center' }}>
        <button 
          onClick={() => navigate('/dashboard')}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', fontWeight: '600', padding: '0.5rem 0', transition: 'color 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          Back to Dashboard
        </button>
      </div>

      <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', height: 'calc(100vh - 240px)' }}>
        {/* LEFT COLUMN: PRESCRIPTION IMAGE */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <h3 style={{ marginBottom: '1rem' }}>Prescription Image</h3>
        <div style={{ flex: 1, backgroundColor: '#000', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
          {imageUrl ? (
            <img src={imageUrl.toLowerCase().endsWith('.pdf') ? imageUrl.slice(0, -4) + '.jpg' : imageUrl} alt="Prescription Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          ) : (
            <div style={{ color: 'var(--text-secondary)' }}>No image available</div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: AUDIT CHECKLIST */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>Audit Checklist</h3>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span className="badge badge-pending">Review Pending</span>
            <button 
              className="btn btn-secondary print-hide" 
              style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem' }}
              onClick={handleDownloadExcel}
              disabled={!classification} // Only enable if saved
            >
              📊 Excel Report
            </button>
            <button 
              className="btn btn-secondary print-hide" 
              style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem' }}
              onClick={handleDownloadPDF}
              disabled={!classification} // Only enable if saved
            >
              📄 PDF Report
            </button>
          </div>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
          
          {/* Dynamically map through all NABH sections */}
          {['A', 'B', 'C', 'D', 'E', 'F'].map(section => {
            const sectionItems = Object.values(auditResults).filter(r => r.section === section);
            if (sectionItems.length === 0) return null;
            return (
              <React.Fragment key={section}>
                <h4 style={{ color: 'var(--primary-color)', marginTop: section === 'A' ? '1rem' : '2rem', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  {sectionItems[0].sectionName}
                </h4>
                {sectionItems.map(renderCriterion)}
              </React.Fragment>
            );
          })}
          
        </div>

        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '1rem' }}>
          {!classification ? (
            <>
              <button className="btn btn-secondary" style={{ flex: 1 }}>Save Draft</button>
              <button 
                className="btn btn-primary" 
                style={{ flex: 2 }}
                disabled={finalizing}
                onClick={async () => {
                  setFinalizing(true);
                  
                  const resultsArray = Object.values(auditResults);
                  
                  // NABH Critical Parameters that automatically trigger IRRATIONAL if NO
                  const criticalCriteria = ['B3', 'C4', 'C5', 'C6', 'D1', 'D3', 'E2'];
                  let classStat = 'RATIONAL';
                  let classReas = 'Meets all critical NABH safety and rationality criteria.';

                  for (const crit of criticalCriteria) {
                    if (auditResults[crit]?.finalAnswer === 'NO') {
                      classStat = 'IRRATIONAL';
                      classReas = `Failed critical safety criteria (Section ${crit}): ${auditResults[crit].question}`;
                      break;
                    }
                  }
                  
                  setClassification({
                    status: classStat,
                    reason: classReas
                  });

                  // POST TO BACKEND to save
                  try {
                    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
                    const res = await fetch(`${apiUrl}/api/audit/finalize`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        auditId: id,
                        prescriptionData: { imageUrl, patientName: extractedData?.patientName || 'Unknown' },
                        auditResults,
                        classification: classStat,
                        classificationReason: classReas,
                        userId: currentUser?.uid || 'unknown'
                      })
                    });
                    
                    if (res.ok) {
                      setSaveSuccess(true);
                      setTimeout(() => setSaveSuccess(false), 3000);
                    }
                  } catch (e) {
                    console.error("Failed to save audit:", e);
                  }
                  
                  setFinalizing(false);
                }}
              >
                {finalizing ? 'Saving...' : 'Finalize Audit & Classify'}
              </button>
            </>
          ) : (
            <div className="animate-fade-in" style={{ width: '100%', textAlign: 'center', padding: '1.5rem', borderRadius: '16px', backgroundColor: classification.status === 'RATIONAL' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)', border: classification.status === 'RATIONAL' ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)', transition: 'all 0.3s ease' }}>
              {saveSuccess && (
                <div style={{ marginBottom: '1.5rem', padding: '0.85rem 1.2rem', backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '12px', fontWeight: '500', fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', animation: 'slide-down 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                  <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', padding: '4px', borderRadius: '50%', display: 'flex' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
                  Audit saved successfully! You can view it in your Dashboard.
                </div>
              )}
              <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
                {classification.status === 'RATIONAL' ? (
                   <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--success-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'scale-in 0.5s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                     <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                   </div>
                ) : (
                   <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'scale-in 0.5s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                     <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                   </div>
                )}
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', letterSpacing: '-0.02em', color: classification.status === 'RATIONAL' ? 'var(--success-color)' : 'var(--danger-color)' }}>
                FINAL CLASSIFICATION: {classification.status}
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.75rem', lineHeight: '1.5', maxWidth: '90%', margin: '0.75rem auto 0' }}>
                Reason: {classification.reason}
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
                <button className="btn btn-secondary" style={{ padding: '0.6rem 1.2rem', borderRadius: '999px', fontSize: '0.85rem' }} onClick={() => setClassification(null)}>
                  Edit Audit
                </button>
                <button className="btn btn-primary" style={{ padding: '0.6rem 1.2rem', borderRadius: '999px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={handleNextPending} disabled={navigatingNext}>
                  {navigatingNext ? 'Loading...' : 'Next Pending Prescription'}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

      {/* Done Modal overlay */}
      {showDoneModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, animation: 'fade-in 0.2s ease' }}>
          <div style={{ backgroundColor: 'var(--surface-color)', padding: '2rem', borderRadius: '16px', maxWidth: '400px', width: '90%', textAlign: 'center', border: '1px solid var(--border-color)', boxShadow: '0 10px 40px rgba(0,0,0,0.3)', animation: 'scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'rgba(14, 165, 233, 0.1)', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            </div>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>All Caught Up!</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              Great job! You have no more pending prescriptions to review in your queue.
            </p>
            <button 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '0.8rem', fontSize: '1rem', borderRadius: '12px' }}
              onClick={() => {
                setShowDoneModal(false);
                navigate('/dashboard');
              }}
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      )}
    </>
  );
}
