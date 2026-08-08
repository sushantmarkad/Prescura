import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
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
  const { currentUser } = useAuth(); // Assume we imported useAuth

  useEffect(() => {
    // If no data is in state, and we have an ID, we could fetch from DB.
    // For now, if loading is false, it means we got it from state.
    if (!loading && extractedData) return;
    
    // Fallback if accessed directly
    if (loading) {
       setError("No audit data found. Please go back and upload an image.");
       setLoading(false);
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
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px;">
          <thead>
            <tr>
              <th style="border: 1px solid #ccc; padding: 8px; text-align: left; background-color: #e2e8f0; width: 35%;">Question</th>
              <th style="border: 1px solid #ccc; padding: 8px; text-align: center; background-color: #e2e8f0; width: 15%;">Answer</th>
              <th style="border: 1px solid #ccc; padding: 8px; text-align: left; background-color: #e2e8f0; width: 50%;">Evidence</th>
            </tr>
          </thead>
          <tbody>
            ${Object.values(auditResults).map(r => `
              <tr>
                <td style="border: 1px solid #ccc; padding: 8px;">${r.criterionId}. ${r.question}</td>
                <td style="border: 1px solid #ccc; padding: 8px; text-align: center; font-weight: bold; color: ${r.finalAnswer === 'NO' ? '#ef4444' : '#10b981'};">${r.finalAnswer}</td>
                <td style="border: 1px solid #ccc; padding: 8px;">${r.evidence}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
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

  return (
    <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', height: 'calc(100vh - 200px)' }}>
      {/* LEFT COLUMN: PRESCRIPTION IMAGE */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <h3 style={{ marginBottom: '1rem' }}>Prescription Image</h3>
        <div style={{ flex: 1, backgroundColor: '#000', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
          {imageUrl ? (
            imageUrl.includes('.pdf') ? (
              <iframe src={imageUrl} style={{ width: '100%', height: '100%', border: 'none' }} title="PDF Preview" />
            ) : (
              <img src={imageUrl} alt="Prescription" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            )
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
              onClick={handleDownloadPDF}
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
            <div style={{ width: '100%', textAlign: 'center', padding: '1rem', borderRadius: 'var(--radius-md)', backgroundColor: classification.status === 'RATIONAL' ? 'var(--success-light)' : 'var(--danger-light)' }}>
              {saveSuccess && (
                <div style={{ marginBottom: '1rem', padding: '0.5rem', backgroundColor: 'var(--success-color)', color: 'white', borderRadius: 'var(--radius-sm)', fontWeight: 'bold' }}>
                  ✅ Audit saved successfully! You can view it in your Dashboard.
                </div>
              )}
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: classification.status === 'RATIONAL' ? 'var(--success-color)' : 'var(--danger-color)' }}>
                FINAL CLASSIFICATION: {classification.status}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                Reason: {classification.reason}
              </div>
              <button className="btn btn-secondary" style={{ marginTop: '1rem' }} onClick={() => setClassification(null)}>
                Edit Audit
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
