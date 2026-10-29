import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { calculatePrescriptionScore } from '../utils/scoring';
import { generateIndividualAuditPDF } from '../utils/pdfGenerator';
import { ChecklistIcon, ImageIcon, SplitViewIcon, ZoomInIcon, ReportIcon, ExcelIcon, PdfIcon } from '../components/Icons';

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
  const [mobileViewTab, setMobileViewTab] = useState('checklist'); // 'checklist' | 'image' | 'both'
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const liveScore = useMemo(() => calculatePrescriptionScore(auditResults), [auditResults]);

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
        const apiUrl = import.meta.env.VITE_API_URL || 'https://prescura-smif.onrender.com';
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
    <div key={item.criterionId} className="ar-criterion-item">
      <div className="ar-criterion-top">
        <div className="ar-criterion-title">{item.criterionId}. {item.question}</div>
        <div className="ar-criterion-btns">
          <button
            className={`btn ${item.finalAnswer === 'YES' ? 'btn-success' : 'btn-secondary'}`}
            style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem', minHeight: '36px' }}
            onClick={() => handleOverride(item.criterionId, 'YES')}
          >YES</button>
          <button
            className={`btn ${item.finalAnswer === 'NO' ? 'btn-danger' : 'btn-secondary'}`}
            style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem', minHeight: '36px' }}
            onClick={() => handleOverride(item.criterionId, 'NO')}
          >NO</button>
        </div>
      </div>
      <div className="ar-criterion-meta">
        <div>
          <strong>AI Evidence:</strong> {item.evidence}
          {item.finalAnswer !== item.aiAnswer && (
            <span style={{ color: 'var(--accent-color)', marginLeft: '0.5rem', fontWeight: 600 }}>[Human Overridden]</span>
          )}
        </div>
        {item.confidence > 0 && (
          <div style={{ flexShrink: 0 }}>Conf: {Math.round(item.confidence * 100)}%</div>
        )}
      </div>
    </div>
  );

  const handleDownloadPDF = () => {
    try {
      generateIndividualAuditPDF(id, extractedData, auditResults, classification, liveScore);
    } catch (err) {
      console.error('Vector PDF generation error:', err);
    }
  };

  const handleDownloadExcel = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'https://prescura-smif.onrender.com';
    window.location.href = `${apiUrl}/api/export?auditId=${id}`;
  };

  const handleNextPending = async () => {
    setNavigatingNext(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://prescura-smif.onrender.com';
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
        
        .ar-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          height: calc(100vh - 220px);
          min-height: 520px;
        }

        .ar-criterion-item {
          padding: 0.9rem;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          margin-bottom: 0.85rem;
          background-color: var(--surface-color);
        }

        .ar-criterion-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 0.75rem;
          margin-bottom: 0.6rem;
          flex-wrap: wrap;
        }

        .ar-criterion-title {
          font-weight: 600;
          font-size: 0.9rem;
          flex: 1;
          min-width: 180px;
        }

        .ar-criterion-btns {
          display: flex;
          gap: 0.4rem;
          flex-shrink: 0;
        }

        .ar-criterion-meta {
          font-size: 0.82rem;
          color: var(--text-secondary);
          display: flex;
          justify-content: space-between;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .ar-mobile-tabs {
          display: none;
          background: var(--surface-color);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 4px;
          margin-bottom: 1rem;
          gap: 4px;
        }

        .ar-mobile-tab-btn {
          flex: 1;
          padding: 0.6rem 0.5rem;
          border: none;
          background: transparent;
          border-radius: 8px;
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.35rem;
          font-family: inherit;
        }

        .ar-mobile-tab-btn.active {
          background: var(--primary-color);
          color: #fff;
          box-shadow: var(--shadow-sm);
        }

        @media (max-width: 900px) {
          .ar-grid {
            display: flex;
            flex-direction: column;
            height: auto;
            min-height: auto;
            gap: 1.25rem;
          }

          .ar-mobile-tabs {
            display: flex;
          }

          .ar-col-image {
            height: 380px !important;
          }

          .ar-col-image.mobile-hidden,
          .ar-col-checklist.mobile-hidden {
            display: none !important;
          }

          .ar-checklist-scroll {
            max-height: none !important;
            overflow-y: visible !important;
          }
        }

        @media (max-width: 480px) {
          .ar-col-image {
            height: 300px !important;
          }
        }
      `}</style>

      {/* Top Navigation Bar */}
      <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', fontWeight: '600', padding: '0.4rem 0', transition: 'color 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          Back to Dashboard
        </button>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="ar-mobile-tabs">
        <button
          className={`ar-mobile-tab-btn ${mobileViewTab === 'checklist' ? 'active' : ''}`}
          onClick={() => setMobileViewTab('checklist')}
        >
          <ChecklistIcon size={15} /> Checklist ({liveScore.complianceScore}%)
        </button>
        <button
          className={`ar-mobile-tab-btn ${mobileViewTab === 'image' ? 'active' : ''}`}
          onClick={() => setMobileViewTab('image')}
        >
          <ImageIcon size={15} /> Prescription
        </button>
        <button
          className={`ar-mobile-tab-btn ${mobileViewTab === 'both' ? 'active' : ''}`}
          onClick={() => setMobileViewTab('both')}
        >
          <SplitViewIcon size={15} /> Both
        </button>
      </div>

      <div className="ar-grid animate-fade-in">
        {/* LEFT COLUMN: PRESCRIPTION IMAGE */}
        <div className={`glass-card ar-col-image ${mobileViewTab === 'checklist' ? 'mobile-hidden' : ''}`} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Prescription Image</h3>
            {imageUrl && (
              <a 
                href={imageUrl} 
                target="_blank" 
                rel="noreferrer" 
                className="btn btn-secondary" 
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', minHeight: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <ZoomInIcon size={14} /> Full Size
              </a>
            )}
          </div>
          <div style={{ flex: 1, backgroundColor: '#000', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', minHeight: '220px' }}>
            {imageUrl ? (
              <img src={imageUrl.toLowerCase().endsWith('.pdf') ? imageUrl.slice(0, -4) + '.jpg' : imageUrl} alt="Prescription Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            ) : (
              <div style={{ color: 'var(--text-secondary)' }}>No image available</div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: AUDIT CHECKLIST */}
        <div className={`glass-card ar-col-checklist ${mobileViewTab === 'image' ? 'mobile-hidden' : ''}`} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Audit Checklist</h3>
            <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                className="btn btn-secondary print-hide"
                style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', color: 'var(--primary-color)', minHeight: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                onClick={() => navigate('/final-report')}
                title="View Hospital-wide NABH Audit Report"
              >
                <ReportIcon size={14} /> Final Report
              </button>
              <button
                className="btn btn-secondary print-hide"
                style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', minHeight: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                onClick={handleDownloadExcel}
                disabled={!classification} // Only enable if saved
              >
                <ExcelIcon size={14} /> Excel
              </button>
              <button
                className="btn btn-secondary print-hide"
                style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', minHeight: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                onClick={handleDownloadPDF}
                disabled={!classification} // Only enable if saved
              >
                <PdfIcon size={14} /> PDF
              </button>
            </div>
          </div>

          {/* Real-time NABH Compliance & Grading Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.6rem 0.85rem',
            background: liveScore.gradeBg,
            borderRadius: '10px',
            border: `1.5px solid ${liveScore.gradeColor}40`,
            marginBottom: '0.75rem',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Compliance:</span>
              <span style={{ fontSize: '1.15rem', fontWeight: 900, color: liveScore.gradeColor, letterSpacing: '-0.02em' }}>{liveScore.complianceScore}%</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>({liveScore.yesCount}/{liveScore.totalApplicable} Yes)</span>
            </div>
            <span
              className="badge"
              style={{
                backgroundColor: 'var(--surface-color)',
                color: liveScore.gradeColor,
                border: `1px solid ${liveScore.gradeColor}`,
                fontWeight: 800,
                fontSize: '0.7rem'
              }}
            >
              NABH: {liveScore.grade}
            </span>
          </div>

          <div className="ar-checklist-scroll" style={{ flex: 1, overflowY: 'auto', paddingRight: '0.35rem' }}>

            {/* Dynamically map through all NABH sections */}
            {['A', 'B', 'C', 'D', 'E', 'F'].map(section => {
              const sectionItems = Object.values(auditResults).filter(r => r.section === section);
              if (sectionItems.length === 0) return null;
              return (
                <React.Fragment key={section}>
                  <h4 style={{ color: 'var(--primary-color)', marginTop: section === 'A' ? '0.75rem' : '1.5rem', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem', fontSize: '0.92rem' }}>
                    {sectionItems[0].sectionName}
                  </h4>
                  {sectionItems.map(renderCriterion)}
                </React.Fragment>
              );
            })}

          </div>

          <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {!classification ? (
              <>
                <button className="btn btn-secondary" style={{ flex: '1 1 120px' }}>Save Draft</button>
                <button
                  className="btn btn-primary"
                  style={{ flex: '2 1 180px' }}
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
                      const apiUrl = import.meta.env.VITE_API_URL || 'https://prescura-smif.onrender.com';
                      const res = await fetch(`${apiUrl}/api/audit/finalize`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          auditId: id,
                          prescriptionData: { imageUrl, patientName: extractedData?.patientName || 'Unknown' },
                          auditResults,
                          complianceScore: liveScore.complianceScore,
                          grade: liveScore.grade,
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
                    Audit saved successfully! You can view it in your Dashboard or Final Report.
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
                <div style={{ marginTop: '0.4rem', fontSize: '0.95rem', fontWeight: 700, color: liveScore.gradeColor }}>
                  Compliance: {liveScore.complianceScore}% · NABH Grade: {liveScore.grade}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem', lineHeight: '1.5', maxWidth: '90%', margin: '0.5rem auto 0' }}>
                  Reason: {classification.reason}
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1.25rem', flexWrap: 'wrap' }}>
                  <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem', borderRadius: '999px', fontSize: '0.82rem' }} onClick={() => setClassification(null)}>
                    Edit Audit
                  </button>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '0.5rem 1rem', borderRadius: '999px', fontSize: '0.82rem', borderColor: 'var(--primary-color)', color: 'var(--primary-color)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                    onClick={() => navigate('/final-report')}
                  >
                    <ReportIcon size={14} /> Final NABH Report
                  </button>
                  <button className="btn btn-primary" style={{ padding: '0.5rem 1.1rem', borderRadius: '999px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={handleNextPending} disabled={navigatingNext}>
                    {navigatingNext ? 'Loading...' : 'Next Pending'}
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
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
