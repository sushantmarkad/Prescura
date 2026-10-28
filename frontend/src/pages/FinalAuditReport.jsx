import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { calculateNABHMetrics } from '../utils/scoring';
import { generateNABHFinalReportPDF } from '../utils/pdfGenerator';

export default function FinalAuditReport() {
  const { currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // If passed from batch upload or state
  const stateAudits = location.state?.audits || null;

  const [audits, setAudits] = useState(stateAudits || []);
  const [loading, setLoading] = useState(!stateAudits);
  const [selectedDept, setSelectedDept] = useState(location.state?.department || 'Medicine');
  const [selectedSetting, setSelectedSetting] = useState('OPD'); // OPD | IPD | ICU
  const [auditMonth, setAuditMonth] = useState(() => {
    return new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  });

  const [customNonConformity, setCustomNonConformity] = useState('');
  const [customObservations, setCustomObservations] = useState([
    'Generic prescribing compliance below target due to branded formulation habits in outpatient clinics.',
    'Missing documentation of patient weight and allergy status on handwritten slips.',
    'Dangerous abbreviations (e.g. U for units, QD for once daily) noted in handwritten medication orders.'
  ]);

  const [correctiveActions, setCorrectiveActions] = useState([
    { id: 1, action: 'Prescriber training', description: 'Conduct clinical audit briefing & generic prescribing workshop', status: 'In Progress', owner: 'Clinical Pharmacologist', targetDate: 'Next 14 Days' },
    { id: 2, action: 'Reminder circular', description: 'Issue notice regarding high-alert medication documentation & dangerous abbreviations', status: 'Completed', owner: 'Quality Manager', targetDate: 'Issued' },
    { id: 3, action: 'EMR modification', description: 'Enforce mandatory fields for allergy status, diagnosis, and duration in EMR', status: 'Planned', owner: 'IT / EMR Head', targetDate: '30 Days' },
    { id: 4, action: 'Re-audit after one month', description: 'Target re-audit scheduled in 30 days to measure corrective compliance', status: 'Scheduled', owner: 'PTC Committee', targetDate: 'Next Month' }
  ]);

  const [teamMembers, setTeamMembers] = useState([
    { role: 'Clinical Pharmacologist', name: 'Dr. A. Sharma, MD', signed: true },
    { role: 'Clinical Pharmacist', name: 'Dr. R. Patel, PharmD', signed: true },
    { role: 'Quality Manager', name: 'Mrs. S. Kulkarni', signed: true },
    { role: 'Nursing Representative', name: 'Sister M. Joseph', signed: true },
    { role: 'Concerned Clinician', name: 'Dr. V. Deshmukh (Dept Head)', signed: true }
  ]);

  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const reportPrintRef = useRef(null);

  // Fetch audits from backend if not provided in location state
  useEffect(() => {
    if (stateAudits && stateAudits.length > 0) {
      setAudits(stateAudits);
      setLoading(false);
      return;
    }

    const fetchAudits = async () => {
      try {
        setLoading(true);
        const apiUrl = import.meta.env.VITE_API_URL || 'https://prescura-smif.onrender.com';
        const res = await fetch(`${apiUrl}/api/user/audits/${currentUser?.uid}`);
        const data = await res.json();
        if (data.success && data.audits) {
          setAudits(data.audits);
        }
      } catch (err) {
        console.error('Failed to load audits for report:', err);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser?.uid) {
      fetchAudits();
    }
  }, [currentUser, stateAudits]);

  // Compute NABH Metrics dynamically based on selected filters
  const reportMetrics = useMemo(() => {
    return calculateNABHMetrics(audits, {
      department: selectedDept,
      month: auditMonth,
      setting: selectedSetting
    });
  }, [audits, selectedDept, auditMonth, selectedSetting]);

  const handleAddObservation = (e) => {
    e.preventDefault();
    if (customNonConformity.trim()) {
      setCustomObservations(prev => [...prev, customNonConformity.trim()]);
      setCustomNonConformity('');
    }
  };

  const handleRemoveObservation = (idx) => {
    setCustomObservations(prev => prev.filter((_, i) => i !== idx));
  };

  const handleExportExcel = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'https://prescura-smif.onrender.com';
    const params = new URLSearchParams({
      uid: currentUser?.uid || '',
      department: selectedDept,
      month: auditMonth,
      setting: selectedSetting
    });
    window.location.href = `${apiUrl}/api/export?${params.toString()}`;
  };

  const handleDownloadPDF = () => {
    setIsExportingPdf(true);
    try {
      generateNABHFinalReportPDF(reportMetrics);
    } catch (err) {
      console.error('Vector PDF generation error:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '60vh', flexDirection: 'column' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '4px solid var(--primary-color)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ marginTop: '1.25rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Generating NABH Prescription Audit Final Report...</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  const { meta, scoring, sectionCompliance, keyQualityIndicators, nonConformities } = reportMetrics;

  return (
    <div className="far-root animate-fade-in">
      <style>{`
        .far-root { max-width: 1140px; margin: 0 auto; padding-bottom: 3rem; }
        
        /* Navigation & Actions */
        .far-top-bar { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem; }
        .far-back-btn { background: none; border: none; color: var(--text-secondary); cursor: pointer; display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.9rem; font-weight: 600; padding: 0.4rem 0; transition: color 0.2s; }
        .far-back-btn:hover { color: var(--text-primary); }
        .far-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; }
        .far-btn-excel { background: #059669; color: #fff; border: none; padding: 0.6rem 1.1rem; border-radius: 10px; font-weight: 600; font-size: 0.85rem; cursor: pointer; display: inline-flex; align-items: center; gap: 0.4rem; box-shadow: 0 2px 10px rgba(5,150,105,0.25); transition: all 0.2s; }
        .far-btn-excel:hover { background: #047857; transform: translateY(-1px); }
        .far-btn-pdf { background: linear-gradient(135deg, var(--primary-color), #6366f1); color: #fff; border: none; padding: 0.6rem 1.2rem; border-radius: 10px; font-weight: 600; font-size: 0.85rem; cursor: pointer; display: inline-flex; align-items: center; gap: 0.4rem; box-shadow: 0 2px 12px rgba(14,165,233,0.3); transition: all 0.2s; }
        .far-btn-pdf:hover { transform: translateY(-1px); }

        /* Filter Ribbon */
        .far-filter-card { background: var(--surface-color); border: 1px solid var(--border-color); border-radius: 16px; padding: 1.25rem 1.5rem; margin-bottom: 2rem; box-shadow: var(--shadow-sm); display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap; }
        .far-filter-item { display: flex; flex-direction: column; gap: 0.3rem; min-width: 160px; }
        .far-filter-label { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 700; color: var(--text-secondary); }
        .far-select { padding: 0.5rem 0.8rem; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-color); color: var(--text-primary); font-size: 0.88rem; font-weight: 500; outline: none; }
        .far-select:focus { border-color: var(--primary-color); }
        .far-sample-badge { margin-left: auto; display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.9rem; border-radius: 10px; font-size: 0.82rem; font-weight: 600; }
        .far-sample-badge.ok { background: rgba(16,185,129,0.12); color: #059669; border: 1px solid rgba(16,185,129,0.25); }
        .far-sample-badge.warn { background: rgba(245,158,11,0.12); color: #d97706; border: 1px solid rgba(245,158,11,0.25); }

        /* Printable Container Styling */
        .far-report-paper { background: var(--surface-color); border: 1px solid var(--border-color); border-radius: 20px; padding: 2.5rem; box-shadow: var(--shadow-md); }
        
        /* Report Header */
        .far-rep-header { border-bottom: 2.5px solid var(--primary-color); padding-bottom: 1.25rem; margin-bottom: 1.75rem; text-align: center; }
        .far-rep-org { font-size: 0.82rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-secondary); font-weight: 700; margin-bottom: 0.3rem; }
        .far-rep-title { font-size: 1.7rem; font-weight: 800; color: var(--text-primary); letter-spacing: -0.03em; margin: 0 0 0.4rem; }
        .far-rep-sub { font-size: 0.88rem; color: var(--primary-color); font-weight: 600; margin: 0; }

        /* Meta Box */
        .far-meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; background: var(--bg-color); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.1rem 1.25rem; margin-bottom: 2rem; }
        .far-meta-cell h4 { margin: 0; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-secondary); }
        .far-meta-cell p { margin: 0.25rem 0 0; font-size: 1.05rem; font-weight: 700; color: var(--text-primary); }

        /* Executive Scorecard */
        .far-scorecard { display: grid; grid-template-columns: 300px 1fr; gap: 1.5rem; margin-bottom: 2.5rem; background: linear-gradient(135deg, rgba(14,165,233,0.04), rgba(99,102,241,0.04)); border: 1.5px solid var(--border-color); border-radius: 18px; padding: 1.5rem; }
        .far-score-dial { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; border-right: 1px solid var(--border-color); padding-right: 1.5rem; }
        .far-score-num { font-size: 3.5rem; font-weight: 900; letter-spacing: -0.05em; line-height: 1; }
        .far-grade-chip { display: inline-block; padding: 0.35rem 1rem; border-radius: 999px; font-weight: 800; font-size: 0.85rem; letter-spacing: 0.04em; text-transform: uppercase; margin-top: 0.6rem; }
        .far-grades-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; align-content: center; }
        .far-grade-box { background: var(--surface-color); border: 1px solid var(--border-color); border-radius: 12px; padding: 0.85rem; text-align: center; }
        .far-grade-box-count { font-size: 1.5rem; font-weight: 800; }
        .far-grade-box-lbl { font-size: 0.72rem; font-weight: 600; color: var(--text-secondary); margin-top: 0.2rem; }

        /* Section Headings */
        .far-sec-title { font-size: 1.15rem; font-weight: 800; color: var(--text-primary); margin: 2rem 0 0.85rem; display: flex; align-items: center; gap: 0.6rem; }
        .far-sec-title::before { content: ''; width: 4px; height: 18px; background: var(--primary-color); border-radius: 2px; }

        /* Tables */
        .far-table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; font-size: 0.875rem; }
        .far-table th { background: var(--bg-color); color: var(--text-secondary); font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; padding: 0.75rem 1rem; text-align: left; border-bottom: 1.5px solid var(--border-color); border-top: 1px solid var(--border-color); }
        .far-table td { padding: 0.75rem 1rem; border-bottom: 1px solid var(--border-color); color: var(--text-primary); vertical-align: middle; }
        .far-table tr:last-child td { border-bottom: none; }
        .far-progress-bg { width: 100%; height: 7px; background: var(--border-color); border-radius: 999px; overflow: hidden; margin-top: 0.35rem; }
        .far-progress-fill { height: 100%; border-radius: 999px; transition: width 0.3s; }

        /* Non-Conformities & CAPA */
        .far-card-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem; }
        .far-panel { background: var(--bg-color); border: 1px solid var(--border-color); border-radius: 14px; padding: 1.25rem; }
        .far-panel-title { font-size: 0.95rem; font-weight: 700; color: var(--text-primary); margin: 0 0 0.85rem; display: flex; align-items: center; justify-content: space-between; }
        .far-nc-item { display: flex; gap: 0.6rem; margin-bottom: 0.75rem; font-size: 0.85rem; line-height: 1.45; }
        .far-nc-num { font-weight: 700; color: #ef4444; flex-shrink: 0; }
        .far-ca-item { background: var(--surface-color); border: 1px solid var(--border-color); border-radius: 10px; padding: 0.75rem; margin-bottom: 0.6rem; font-size: 0.82rem; }
        .far-ca-head { display: flex; justify-content: space-between; font-weight: 700; color: var(--text-primary); margin-bottom: 0.2rem; }

        /* Sign-off grid */
        .far-team-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.75rem; margin-top: 1.5rem; }
        .far-team-card { background: var(--bg-color); border: 1px solid var(--border-color); border-radius: 10px; padding: 0.85rem; text-align: center; }
        .far-team-role { font-size: 0.72rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 0.4rem; height: 32px; display: flex; align-items: center; justify-content: center; }
        .far-team-name { font-size: 0.85rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.5rem; }
        .far-team-sign { font-size: 0.72rem; color: #059669; font-weight: 600; display: inline-flex; align-items: center; gap: 0.2rem; }

        @media (max-width: 860px) {
          .far-scorecard { grid-template-columns: 1fr; }
          .far-score-dial { border-right: none; border-bottom: 1px solid var(--border-color); padding-right: 0; padding-bottom: 1.25rem; }
          .far-meta-grid { grid-template-columns: 1fr 1fr; }
          .far-card-grid { grid-template-columns: 1fr; }
          .far-team-grid { grid-template-columns: 1fr 1fr; }
        }
      `}</style>

      {/* Top Navigation & Action Controls */}
      <div className="far-top-bar">
        <button className="far-back-btn" onClick={() => navigate('/dashboard')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          Back to Dashboard
        </button>
        <div className="far-actions">
          <button className="far-btn-excel" onClick={handleExportExcel} title="Download Excel Checklist with automatic calculations">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="16" y2="17" /></svg>
            Excel Checklist (.xlsx)
          </button>
          <button className="far-btn-pdf" onClick={handleDownloadPDF} disabled={isExportingPdf} title="Generate official NABH PDF Report">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            {isExportingPdf ? 'Exporting PDF...' : 'Export NABH PDF'}
          </button>
        </div>
      </div>

      {/* Dynamic Filter Controls */}
      <div className="far-filter-card">
        <div className="far-filter-item">
          <span className="far-filter-label">Clinical Department</span>
          <select className="far-select" value={selectedDept} onChange={e => setSelectedDept(e.target.value)}>
            <option value="Medicine">Medicine</option>
            <option value="Surgery">Surgery</option>
            <option value="Pediatrics">Pediatrics</option>
            <option value="Obstetrics & Gynecology">Obstetrics & Gynecology</option>
            <option value="Orthopedics">Orthopedics</option>
            <option value="Cardiology">Cardiology</option>
            <option value="Emergency Medicine">Emergency Medicine</option>
            <option value="Hospital-wide">Hospital-wide (All Specialties)</option>
          </select>
        </div>

        <div className="far-filter-item">
          <span className="far-filter-label">Audit Setting</span>
          <select className="far-select" value={selectedSetting} onChange={e => setSelectedSetting(e.target.value)}>
            <option value="OPD">OPD (Outpatient Department)</option>
            <option value="IPD">IPD (Inpatient Case Sheets)</option>
            <option value="ICU">ICU (Intensive Care Medication Charts)</option>
          </select>
        </div>

        <div className="far-filter-item">
          <span className="far-filter-label">Audit Month / Period</span>
          <input
            type="text"
            className="far-select"
            value={auditMonth}
            onChange={e => setAuditMonth(e.target.value)}
            placeholder="e.g. October 2026"
          />
        </div>

        <div className={`far-sample-badge ${meta.isSampleAdequate ? 'ok' : 'warn'}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            {meta.isSampleAdequate
              ? <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14 M22 4L12 14.01l-3-3" />
              : <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01" />
            }
          </svg>
          <div>
            <div>Sample Size: <strong>{meta.totalAudited} Prescriptions</strong></div>
            <div style={{ fontSize: '0.72rem', opacity: 0.85 }}>NABH Benchmark: {meta.sampleRequirement} ({meta.isSampleAdequate ? 'Target Met' : 'Under Target'})</div>
          </div>
        </div>
      </div>

      {/* Official Report Document Container (Printable for PDF export) */}
      <div className="far-report-paper" ref={reportPrintRef}>

        {/* Document Header */}
        <div className="far-rep-header">
          <div className="far-rep-org">National Accreditation Board for Hospitals & Healthcare Providers (NABH)</div>
          <h1 className="far-rep-title">Prescription Audit Final Report</h1>
          <p className="far-rep-sub">Continuous Quality Improvement & Patient Safety — Management of Medication (MOM 6th Ed)</p>
        </div>

        {/* Audit Metadata Summary Grid */}
        <div className="far-meta-grid">
          <div className="far-meta-cell">
            <h4>Department</h4>
            <p>{meta.department}</p>
          </div>
          <div className="far-meta-cell">
            <h4>Audit Period</h4>
            <p>{meta.month}</p>
          </div>
          <div className="far-meta-cell">
            <h4>Clinical Setting</h4>
            <p>{meta.setting}</p>
          </div>
          <div className="far-meta-cell">
            <h4>Total Audited</h4>
            <p>{meta.totalAudited} Prescriptions</p>
          </div>
        </div>

        {/* Executive Score & NABH Grading Box */}
        <div className="far-scorecard">
          <div className="far-score-dial">
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, color: 'var(--text-secondary)' }}>Overall Compliance Score</span>
            <div className="far-score-num" style={{ color: scoring.overallGradeColor }}>
              {scoring.overallCompliance}%
            </div>
            <span
              className="far-grade-chip"
              style={{ background: scoring.overallGradeBg, color: scoring.overallGradeColor }}
            >
              NABH Grade: {scoring.overallGrade}
            </span>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              Formula: (Total "Yes" / Applicable Parameters) × 100
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              Prescription Grading Breakdown (N = {meta.totalAudited})
            </div>
            <div className="far-grades-grid">
              <div className="far-grade-box" style={{ borderTop: '3px solid #10b981' }}>
                <div className="far-grade-box-count" style={{ color: '#10b981' }}>{scoring.gradeCounts.excellent}</div>
                <div className="far-grade-box-lbl">&gt;=95% Excellent</div>
              </div>
              <div className="far-grade-box" style={{ borderTop: '3px solid #0ea5e9' }}>
                <div className="far-grade-box-count" style={{ color: '#0ea5e9' }}>{scoring.gradeCounts.good}</div>
                <div className="far-grade-box-lbl">90-94% Good</div>
              </div>
              <div className="far-grade-box" style={{ borderTop: '3px solid #f59e0b' }}>
                <div className="far-grade-box-count" style={{ color: '#f59e0b' }}>{scoring.gradeCounts.needsImprovement}</div>
                <div className="far-grade-box-lbl">80-89% Needs Impr.</div>
              </div>
              <div className="far-grade-box" style={{ borderTop: '3px solid #ef4444' }}>
                <div className="far-grade-box-count" style={{ color: '#ef4444' }}>{scoring.gradeCounts.nonCompliant}</div>
                <div className="far-grade-box-lbl">&lt;80% Non-compliant</div>
              </div>
            </div>
            <div style={{ marginTop: '1rem', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              NABH expects medication-use evaluation and prescription audits as part of continuous quality improvement. Prescriptions achieving &lt;80% compliance require mandatory prescriber re-education and re-audit.
            </div>
          </div>
        </div>

        {/* SUGGESTED AUDIT REPORT FORMAT (NABH Section Compliance Table) */}
        <h3 className="far-sec-title">Suggested Audit Report Format (Section Compliance)</h3>
        <table className="far-table">
          <thead>
            <tr>
              <th style={{ width: '40%' }}>Indicator Section</th>
              <th style={{ width: '20%' }}>Total "Yes"</th>
              <th style={{ width: '20%' }}>Applicable Criteria</th>
              <th style={{ width: '20%' }}>Compliance (%)</th>
            </tr>
          </thead>
          <tbody>
            {sectionCompliance.map(sec => {
              const color = sec.compliance >= 95 ? '#10b981' : sec.compliance >= 90 ? '#0ea5e9' : sec.compliance >= 80 ? '#f59e0b' : '#ef4444';
              return (
                <tr key={sec.sectionKey}>
                  <td><strong>{sec.name}</strong></td>
                  <td>{sec.totalYes}</td>
                  <td>{sec.totalApplicable}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 700, color }}>
                      <span>{sec.compliance}%</span>
                    </div>
                    <div className="far-progress-bg">
                      <div className="far-progress-fill" style={{ width: `${sec.compliance}%`, backgroundColor: color }}></div>
                    </div>
                  </td>
                </tr>
              );
            })}
            <tr style={{ background: 'var(--bg-color)', fontWeight: 800 }}>
              <td>Overall Compliance</td>
              <td>{sectionCompliance.reduce((s, i) => s + i.totalYes, 0)}</td>
              <td>{sectionCompliance.reduce((s, i) => s + i.totalApplicable, 0)}</td>
              <td style={{ color: scoring.overallGradeColor, fontSize: '1.05rem' }}>
                {scoring.overallCompliance}% ({scoring.overallGrade})
              </td>
            </tr>
          </tbody>
        </table>

        {/* 10 KEY QUALITY INDICATORS TO REPORT */}
        <h3 className="far-sec-title">Key Quality Indicators to Report (NABH MOM Chapter)</h3>
        <table className="far-table">
          <thead>
            <tr>
              <th style={{ width: '5%' }}>Sr</th>
              <th style={{ width: '45%' }}>Quality Indicator</th>
              <th style={{ width: '15%' }}>Target Benchmark</th>
              <th style={{ width: '15%' }}>Current Compliance</th>
              <th style={{ width: '20%' }}>NABH Status</th>
            </tr>
          </thead>
          <tbody>
            {keyQualityIndicators.map(qi => (
              <tr key={qi.id}>
                <td style={{ fontWeight: 600 }}>{qi.id}</td>
                <td><strong>{qi.name}</strong></td>
                <td style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{qi.target}</td>
                <td>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{qi.actual}%</span>
                </td>
                <td>
                  <span
                    className="badge"
                    style={{
                      backgroundColor: qi.status === 'Compliant' ? 'rgba(16,185,129,0.12)' : qi.status === 'Critical' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
                      color: qi.status === 'Compliant' ? '#059669' : qi.status === 'Critical' ? '#dc2626' : '#d97706'
                    }}
                  >
                    {qi.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Non-Conformities & Corrective Actions Grid */}
        <div className="far-card-grid">
          {/* Non-Conformities Observed */}
          <div className="far-panel">
            <h4 className="far-panel-title">
              <span>Non-Conformities Observed</span>
              <span className="badge badge-irrational" style={{ fontSize: '0.65rem' }}>Deficiency Log</span>
            </h4>

            {nonConformities.length > 0 ? (
              nonConformities.slice(0, 5).map((nc, i) => (
                <div key={nc.id} className="far-nc-item">
                  <span className="far-nc-num">{i + 1}.</span>
                  <div>
                    <strong>[{nc.id}] {nc.question}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {nc.noCount} prescriptions non-compliant ({nc.failureRate}% failure rate) in {nc.sectionName}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No automated non-conformities identified.</div>
            )}

            <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '0.75rem', paddingTop: '0.75rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                Clinical Auditor Observations
              </div>
              {customObservations.map((obs, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.4rem', fontSize: '0.82rem' }}>
                  <span>• {obs}</span>
                  <button
                    onClick={() => handleRemoveObservation(idx)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem' }}
                    title="Remove observation"
                  >×</button>
                </div>
              ))}
              <form onSubmit={handleAddObservation} style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
                <input
                  type="text"
                  value={customNonConformity}
                  onChange={e => setCustomNonConformity(e.target.value)}
                  placeholder="Add specific observation..."
                  className="far-select"
                  style={{ flex: 1, fontSize: '0.8rem', padding: '0.35rem 0.6rem' }}
                />
                <button type="submit" className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}>Add</button>
              </form>
            </div>
          </div>

          {/* Corrective Actions (CAPA) */}
          <div className="far-panel">
            <h4 className="far-panel-title">
              <span>Corrective Actions (CAPA)</span>
              <span className="badge badge-rational" style={{ fontSize: '0.65rem' }}>Quality Action Plan</span>
            </h4>

            {correctiveActions.map(ca => (
              <div key={ca.id} className="far-ca-item">
                <div className="far-ca-head">
                  <span>{ca.id}. {ca.action}</span>
                  <span style={{ color: ca.status === 'Completed' ? '#059669' : ca.status === 'In Progress' ? '#d97706' : '#6366f1' }}>
                    {ca.status}
                  </span>
                </div>
                <div style={{ color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>{ca.description}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-secondary)', borderTop: '1px dashed var(--border-color)', paddingTop: '0.25rem' }}>
                  <span>Owner: <strong>{ca.owner}</strong></span>
                  <span>Timeline: <strong>{ca.targetDate}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Audit Team Sign-Off Section */}
        <h3 className="far-sec-title">NABH Audit Team Verification & Sign-off</h3>
        <div className="far-team-grid">
          {teamMembers.map((member, i) => (
            <div key={i} className="far-team-card">
              <div className="far-team-role">{member.role}</div>
              <div className="far-team-name">{member.name}</div>
              <div className="far-team-sign">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                Verified & Signed
              </div>
            </div>
          ))}
        </div>

        {/* Per-Prescription Audit Registry */}
        <h3 className="far-sec-title">Prescription Audit Registry (N = {meta.totalAudited})</h3>
        <table className="far-table">
          <thead>
            <tr>
              <th style={{ width: '8%' }}>Sr No</th>
              <th style={{ width: '22%' }}>Audit / File ID</th>
              <th style={{ width: '25%' }}>Patient & Prescriber</th>
              <th style={{ width: '15%' }}>Applicable Criteria</th>
              <th style={{ width: '15%' }}>Compliance (%)</th>
              <th style={{ width: '15%' }}>NABH Grade</th>
            </tr>
          </thead>
          <tbody>
            {reportMetrics.audits.map((a, idx) => {
              const pData = a.prescriptionData || a.extractedData || {};
              const patient = pData.patientName?.value || pData.patientName || 'Patient';
              const doctor = pData.doctorName?.value || pData.doctorName || 'Doctor';
              const s = a.scoreInfo;
              return (
                <tr key={a.id || idx}>
                  <td>#{idx + 1}</td>
                  <td>
                    <span
                      style={{ color: 'var(--primary-color)', cursor: 'pointer', fontWeight: 600 }}
                      onClick={() => navigate(`/audit-review/${a.id || a.auditId}`)}
                      title="Click to inspect audit"
                    >
                      {a.id || a.auditId}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{patient}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{doctor}</div>
                  </td>
                  <td>{s.yesCount} / {s.totalApplicable} Yes</td>
                  <td style={{ fontWeight: 700, color: s.gradeColor }}>
                    {s.complianceScore}%
                  </td>
                  <td>
                    <span
                      className="badge"
                      style={{ backgroundColor: s.gradeBg, color: s.gradeColor }}
                    >
                      {s.grade}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Accreditation Footer */}
        <div style={{ marginTop: '2.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          <div>Generated by Prescura Medical Systems — NABH Accreditation MOM Quality Audit Engine</div>
          <div>Report Timestamp: {new Date().toLocaleString('en-IN')}</div>
        </div>

      </div>
    </div>
  );
}
