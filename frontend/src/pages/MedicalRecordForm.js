import React, { useEffect, useState, useRef, useMemo } from 'react';
import { ArrowLeft, Plus, Trash, Info, X, Copy, Printer } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { medicalRecordAPI, medicinesAPI, patientAPI, doctorAPI, appointmentAPI } from '../services/api';

const emptyMed = { name: '', strength: '', form: '', dosage: '', frequency: '', duration: '', instructions: '' };

const MedicalRecordForm = () => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const location = useLocation();

  // Basic record fields
  const [patient, setPatient] = useState('');
  const [doctor, setDoctor] = useState('');
  const [appointment, setAppointment] = useState('');
  const [patientInfo, setPatientInfo] = useState(null);
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [appointmentInfo, setAppointmentInfo] = useState(null);
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [primaryDx, setPrimaryDx] = useState('');
  const [secondaryDx, setSecondaryDx] = useState('');
  const [notes, setNotes] = useState('');

  // Vitals & Follow-up
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [bpSystolic, setBpSystolic] = useState('');
  const [bpDiastolic, setBpDiastolic] = useState('');
  const [nextVisitDate, setNextVisitDate] = useState('');

  const bmi = useMemo(() => {
    if (!weight || !height) return '';
    const hM = Number(height) / 100;
    return (Number(weight) / (hM * hM)).toFixed(2);
  }, [weight, height]);

  // Prefill from query params and fetch patient history
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [prefilled, setPrefilled] = useState(false);
  const [showPrefillBanner, setShowPrefillBanner] = useState(false);
  const [userCleared, setUserCleared] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const qpPatient = params.get('patientId');
    const qpDoctor = params.get('doctorId');
    const qpAppointment = params.get('appointmentId');
    if (qpPatient) setPatient(qpPatient);
    if (qpDoctor) setDoctor(qpDoctor);
    if (qpAppointment) setAppointment(qpAppointment);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  // Load display info for patient/doctor/appointment
  useEffect(() => {
    const load = async () => {
      try {
        if (patient) {
          const p = await patientAPI.getById(patient);
          setPatientInfo(p.data.data);
        } else { setPatientInfo(null); }
        if (doctor) {
          const d = await doctorAPI.getById(doctor);
          setDoctorInfo(d.data.data);
        } else { setDoctorInfo(null); }
        if (appointment) {
          const a = await appointmentAPI.getById(appointment);
          setAppointmentInfo(a.data.data);
        } else { setAppointmentInfo(null); }
      } catch (e) {
        // ignore
      }
    };
    load();
  }, [patient, doctor, appointment]);

  useEffect(() => {
    const loadHistory = async () => {
      if (!patient) { setHistory([]); return; }
      try {
        setHistoryLoading(true);
        const res = await medicalRecordAPI.getByPatient(patient, { limit: 5 });
        setHistory(res.data.data || []);
      } catch (e) {
        setHistory([]);
      } finally {
        setHistoryLoading(false);
      }
    };
    loadHistory();
  }, [patient]);


  // Auto-prefill from latest record
  useEffect(() => {
    if (prefilled || userCleared || !history || history.length === 0) return;

    const latestRecord = history[0];
    if (!latestRecord) return;

    // Only prefill if form is currently empty
    const formIsEmpty = !chiefComplaint && !primaryDx && !secondaryDx && !notes;
    if (!formIsEmpty) return;

    // Auto-prefill from latest record
    prefillFromRecord(latestRecord);
  }, [history, prefilled, chiefComplaint, primaryDx, secondaryDx, notes]);

  // Prescription composer
  const [meds, setMeds] = useState([{ ...emptyMed }]);
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchIndex, setSearchIndex] = useState(null); // which med row we are populating
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (!searchText) { setSearchResults([]); return; }
      try {
        setSearchLoading(true);
        const res = await medicinesAPI.getAll({ search: searchText, limit: 10 });
        setSearchResults(res.data.data || []);
      } catch (e) {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    };
    const t = setTimeout(run, 300);
    return () => clearTimeout(t);
  }, [searchText]);

  const addMed = () => setMeds(prev => [...prev, { ...emptyMed }]);
  const removeMed = (idx) => setMeds(prev => prev.filter((_, i) => i !== idx));
  const updateMed = (idx, field, val) => setMeds(prev => prev.map((m, i) => i === idx ? { ...m, [field]: val } : m));

  // Function to prefill form from a specific medical record
  const prefillFromRecord = (record) => {
    if (!record) return;

    // Prefill basic fields
    if (record.chiefComplaint) {
      setChiefComplaint(record.chiefComplaint);
    }
    if (record.diagnosis?.primary) {
      setPrimaryDx(record.diagnosis.primary);
    }
    if (record.diagnosis?.secondary && record.diagnosis.secondary.length > 0) {
      setSecondaryDx(record.diagnosis.secondary[0]);
    }
    setNotes(record.notes);

    if (record.vitalSigns) {
      setWeight(record.vitalSigns.weight || '');
      setHeight(record.vitalSigns.height || '');
      if (record.vitalSigns.bloodPressure) {
        setBpSystolic(record.vitalSigns.bloodPressure.systolic || '');
        setBpDiastolic(record.vitalSigns.bloodPressure.diastolic || '');
      }
    }
    if (record.nextVisitDate) {
      setNextVisitDate(new Date(record.nextVisitDate).toISOString().slice(0, 10));
    }

    // Prefill medications if available
    if (record.prescription?.medications && record.prescription.medications.length > 0) {
      const prefilledMeds = record.prescription.medications.map(med => ({
        name: med.name || '',
        strength: med.strength || '',
        form: med.form || '',
        dosage: med.dosage || '',
        frequency: med.frequency || '',
        duration: med.duration || '',
        instructions: med.instructions || '',
      }));
      setMeds(prefilledMeds);
    }

    setPrefilled(true);
    setShowPrefillBanner(true);
    setUserCleared(false);
  };

  const clearPrefillData = () => {
    setChiefComplaint('');
    setPrimaryDx('');
    setSecondaryDx('');
    setNotes('');
    setWeight('');
    setHeight('');
    setBpSystolic('');
    setBpDiastolic('');
    setNextVisitDate('');
    setMeds([{ ...emptyMed }]);
    setShowPrefillBanner(false);
    setPrefilled(false);
    setUserCleared(true);
  };

  const onPickSearch = (m) => {
    if (searchIndex === null) return;
    updateMed(searchIndex, 'name', m.name || '');
    updateMed(searchIndex, 'strength', m.strength || '');
    updateMed(searchIndex, 'form', m.form || '');
    setSearchResults([]);
    setSearchText('');
    setSearchIndex(null);
  };

  const calculateAge = (dob) => {
    if (!dob) return '';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const printRef = useRef(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [savedRecordData, setSavedRecordData] = useState(null);

  const executePrint = (onComplete) => {
    if (!printRef.current) return;
    const printContents = printRef.current.innerHTML;
    const win = window.open('', '', 'width=800,height=600');
    win.document.write(`<html><head><title>Prescription</title>
      <style>
        @media print {
            @page { margin: 0.5cm; }
            body { -webkit-print-color-adjust: exact; }
        }
        body { font-family: 'Times New Roman', serif; padding: 20px; color: #000; font-size: 14px; line-height: 1.4; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
        .doc-info { width: 30%; }
        .doc-name { font-size: 18px; font-weight: bold; }
        .logo { width: 40%; text-align: center; }
        .hospital-info { width: 30%; text-align: right; color: #000080; }
        .hospital-name { font-size: 18px; font-weight: bold; color: #0000CD; }
        
        .patient-bar { display: flex; justify-content: space-between; flex-wrap: wrap; margin-bottom: 15px; font-weight: bold; font-size: 15px; }
        .vitals-bar { margin-bottom: 10px; font-size: 14px; }
        
        .section-cols { display: flex; border-top: 1px solid #000; border-bottom: 1px solid #000; margin-bottom: 15px; }
        .col { flex: 1; padding: 5px; }
        .col:first-child { border-right: 1px solid #000; }
        .sec-title { font-weight: bold; text-decoration: underline; margin-bottom: 5px; }
        
        .rx-header { font-weight: bold; font-size: 16px; margin-bottom: 5px; }
        .rx-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .rx-table th, .rx-table td { border-bottom: 1px solid #ccc; padding: 8px 4px; text-align: left; vertical-align: top; }
        .rx-table th { border-bottom: 2px solid #000; font-weight: bold; }
        
        .footer-section { margin-top: 20px; }
        .footer-item { margin-bottom: 10px; }
        .label { font-weight: bold; }
        
        .bottom-note { text-align: center; font-size: 10px; margin-top: 30px; color: #555; }
      </style>
    </head><body>`);
    win.document.write(printContents);
    win.document.write('</body></html>');
    win.document.close();
    setTimeout(() => {
      win.focus();
      win.print();
      win.close();
      if (onComplete) onComplete();
    }, 250);
  };

  const handlePrintCurrent = () => {
    executePrint(() => {
      setShowPrintModal(false);
      navigate('/appointments');
    });
  };

  const handlePrintHistory = (rec) => {
    // Format vitals for print
    let vitalsStr = {};
    if (rec.vitalSigns) {
      vitalsStr = {
        weight: rec.vitalSigns.weight,
        height: rec.vitalSigns.height,
        bmi: rec.vitalSigns.bmi,
        bp: rec.vitalSigns.bloodPressure ?
          (rec.vitalSigns.bloodPressure.systolic && rec.vitalSigns.bloodPressure.diastolic ?
            `${rec.vitalSigns.bloodPressure.systolic}/${rec.vitalSigns.bloodPressure.diastolic}` : '') : ''
      };
    }

    setSavedRecordData({
      patient: rec.patient || patientInfo,
      doctor: rec.doctor || doctorInfo,
      date: new Date(rec.visitDate),
      chiefComplaint: rec.chiefComplaint,
      diagnosis: rec.diagnosis,
      notes: rec.notes,
      medications: rec.prescription?.medications || [],
      vitals: vitalsStr,
      nextVisitDate: rec.nextVisitDate
    });

    // Wait for state update then print
    setTimeout(() => {
      executePrint();
    }, 100);
  };

  const onSave = async () => {
    if (!patient || !doctor || !chiefComplaint || !primaryDx) {
      return toast.error('Patient, Doctor, Chief Complaint and Primary Diagnosis are required');
    }
    setSaving(true);
    try {
      const payload = {
        patient,
        doctor,
        appointment: appointment || undefined,
        chiefComplaint,
        diagnosis: { primary: primaryDx, secondary: secondaryDx ? [secondaryDx] : [] },
        notes,
        vitalSigns: {
          weight: weight ? Number(weight) : undefined,
          height: height ? Number(height) : undefined,
          bmi: bmi ? Number(bmi) : undefined,
          bloodPressure: (bpSystolic || bpDiastolic) ? {
            systolic: bpSystolic ? Number(bpSystolic) : undefined,
            diastolic: bpDiastolic ? Number(bpDiastolic) : undefined
          } : undefined
        },
        nextVisitDate: nextVisitDate || undefined
      };

      const created = await medicalRecordAPI.create(payload);
      const recordId = created.data?.data?._id;
      if (!recordId) throw new Error('Record not created');

      // Build prescription payload
      const medications = meds
        .filter(m => m.name)
        .map(m => ({
          name: m.name,
          strength: m.strength,
          form: m.form,
          dosage: m.dosage,
          frequency: m.frequency,
          duration: m.duration,
          instructions: m.instructions,
        }));
      if (medications.length) {
        await medicalRecordAPI.addPrescription(recordId, {
          medications,
          prescribedBy: doctor,
        });
      }

      // Prepare data for print
      setSavedRecordData({
        patient: patientInfo,
        doctor: doctorInfo,
        date: new Date(),
        chiefComplaint,
        diagnosis: { primary: primaryDx, secondary: secondaryDx },
        notes,
        medications,
        vitals: { weight, height, bmi, bp: (bpSystolic && bpDiastolic) ? `${bpSystolic}/${bpDiastolic}` : '' },
        nextVisitDate
      });

      toast.success('Medical record saved');
      setShowPrintModal(true);
    } catch (e) {
      const msg = e.response?.data?.message || 'Save failed';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center">
        <button onClick={() => navigate('/medical-records')} className="mr-4 p-2 text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add Medical Record</h1>
          <p className="text-gray-600">Enter diagnosis, remarks and compose prescription</p>
        </div>
      </div>

      {/* Prefill Banner */}
      {showPrefillBanner && history.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start justify-between">
          <div className="flex items-start">
            <Info className="h-5 w-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-blue-900 font-medium">
                Form prefilled from latest visit on {new Date(history[0].visitDate).toLocaleDateString()}
              </p>
              <p className="text-sm text-blue-700 mt-1">
                You can modify any values before saving.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 ml-4">
            <button
              onClick={clearPrefillData}
              className="text-sm text-blue-700 hover:text-blue-900 underline whitespace-nowrap"
            >
              Clear All
            </button>
            <button
              onClick={() => setShowPrefillBanner(false)}
              className="text-blue-600 hover:text-blue-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Previous medical history (expandable) */}
      <div className="card">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Previous medical history</h2>
          <button className="btn-secondary" onClick={() => setHistoryOpen(v => !v)}>{historyOpen ? 'Hide' : 'Show'}</button>
        </div>
        {historyOpen && (
          <div className="mt-4 space-y-3">
            {historyLoading && <div className="text-sm text-gray-500">Loading history...</div>}
            {!historyLoading && history.length === 0 && (
              <div className="text-sm text-gray-500">No previous records found.</div>
            )}
            {history.map((rec, index) => (
              <div key={rec._id} className="border rounded p-3 relative">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-700">Visit: {rec.visitDate ? new Date(rec.visitDate).toLocaleString() : '-'}</div>
                    <div className="text-sm text-gray-700">Doctor: {rec.doctor?.user?.firstName} {rec.doctor?.user?.lastName}</div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handlePrintHistory(rec)}
                      className="btn-secondary flex items-center text-sm"
                      title="Print this record"
                    >
                      <Printer className="h-4 w-4 mr-1" />
                      Print
                    </button>
                    <button
                      onClick={() => prefillFromRecord(rec)}
                      className="btn-secondary flex items-center text-sm"
                      title="Prefill form with this record"
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Prefill
                    </button>
                  </div>
                </div>
                <div className="mt-1 text-sm"><strong>Chief Complaint:</strong> {rec.chiefComplaint}</div>
                <div className="mt-1 text-sm"><strong>Diagnosis:</strong> {rec.diagnosis?.primary}{rec.diagnosis?.secondary && rec.diagnosis.secondary.length ? `; Secondary: ${rec.diagnosis.secondary.join(', ')}` : ''}</div>
                {rec.prescription?.medications?.length > 0 && (
                  <div className="mt-2">
                    <div className="text-sm font-medium">Prescription:</div>
                    <ul className="list-disc ml-5 text-sm">
                      {rec.prescription.medications.map((m, i) => (
                        <li key={i}>{m.name} {m.strength ? `(${m.strength})` : ''} {m.form ? `- ${m.form}` : ''} — {m.dosage} {m.frequency} {m.duration}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {rec.notes && <div className="mt-2 text-sm text-gray-700"><strong>Notes:</strong> {rec.notes}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Diagnosis & Vitals</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="form-label">Patient</label>
            <div className="input-field bg-gray-50">
              {patientInfo ? `${patientInfo.firstName} ${patientInfo.lastName}` : (patient || '-')}
            </div>
          </div>
          <div>
            <label className="form-label">Doctor</label>
            <div className="input-field bg-gray-50">
              {doctorInfo ? `Dr. ${doctorInfo.user?.firstName} ${doctorInfo.user?.lastName}` : (doctor || '-')}
            </div>
          </div>
          <div>
            <label className="form-label">Token</label>
            <div className="input-field bg-gray-50">
              {typeof appointmentInfo?.dailyToken !== 'undefined' ? appointmentInfo.dailyToken : '-'}
            </div>
          </div>
        </div>

        {/* Vitals Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 p-3 bg-gray-50 rounded border">
          <div>
            <label className="form-label text-xs uppercase text-gray-500">Weight (kg)</label>
            <input type="number" className="input-field" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </div>
          <div>
            <label className="form-label text-xs uppercase text-gray-500">Height (cm)</label>
            <input type="number" className="input-field" value={height} onChange={(e) => setHeight(e.target.value)} />
          </div>
          <div>
            <label className="form-label text-xs uppercase text-gray-500">BP (Systolic/Diastolic)</label>
            <div className="flex gap-2">
              <input type="number" className="input-field" placeholder="120" value={bpSystolic} onChange={(e) => setBpSystolic(e.target.value)} />
              <span className="self-center">/</span>
              <input type="number" className="input-field" placeholder="80" value={bpDiastolic} onChange={(e) => setBpDiastolic(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="form-label text-xs uppercase text-gray-500">BMI</label>
            <div className="input-field bg-gray-100 text-gray-700">{bmi || '-'}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="form-label">Chief Complaint <span className="text-red-500">*</span></label>
            <input className="input-field" value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)} placeholder="e.g. Fever, Headache" />
          </div>
          <div>
            <label className="form-label">Primary Diagnosis <span className="text-red-500">*</span></label>
            <input className="input-field" value={primaryDx} onChange={(e) => setPrimaryDx(e.target.value)} placeholder="e.g. Viral Fever" />
          </div>
          <div>
            <label className="form-label">Clinical Findings (Secondary Dx)</label>
            <textarea className="input-field h-20" value={secondaryDx} onChange={(e) => setSecondaryDx(e.target.value)} placeholder="Examination details..." />
          </div>
          <div>
            <label className="form-label">Notes / Advice</label>
            <textarea className="input-field h-20" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Rest advice, diet restrictions..." />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Prescription</h2>
          <button className="btn-secondary" onClick={addMed}><Plus className="h-4 w-4 mr-1" />Add</button>
        </div>
        <div className="space-y-4">
          {meds.map((m, idx) => (
            <div key={idx} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
              <div className="md:col-span-2 relative">
                <label className="form-label">Medicine</label>
                <input className="input-field" value={m.name} onChange={(e) => { updateMed(idx, 'name', e.target.value); setSearchIndex(idx); setSearchText(e.target.value); }} placeholder="Type to search..." />
                {searchIndex === idx && searchText && (
                  <div className="absolute z-50 w-full mt-1 border rounded bg-white max-h-40 overflow-auto shadow-lg">
                    {searchLoading && <div className="p-2 text-sm text-gray-500">Searching...</div>}
                    {(!searchLoading && searchResults.length === 0) && <div className="p-2 text-sm text-gray-500">No matches. Will auto-create on save.</div>}
                    {searchResults.map((r) => (
                      <button type="button" key={r._id} className="block w-full text-left px-3 py-2 hover:bg-gray-50" onClick={() => onPickSearch(r)}>
                        {r.name} {r.strength ? `(${r.strength})` : ''} {r.form ? `- ${r.form}` : ''}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="form-label">Strength</label>
                <input className="input-field" value={m.strength} onChange={(e) => updateMed(idx, 'strength', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Form</label>
                <input className="input-field" value={m.form} onChange={(e) => updateMed(idx, 'form', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Dosage</label>
                <input className="input-field" value={m.dosage} onChange={(e) => updateMed(idx, 'dosage', e.target.value)} placeholder="e.g., 1 tablet" />
              </div>
              <div>
                <label className="form-label">Frequency</label>
                <input className="input-field" value={m.frequency} onChange={(e) => updateMed(idx, 'frequency', e.target.value)} placeholder="e.g., twice daily" />
              </div>
              <div>
                <label className="form-label">Duration</label>
                <input className="input-field" value={m.duration} onChange={(e) => updateMed(idx, 'duration', e.target.value)} placeholder="e.g., 5 days" />
              </div>
              <div className="md:col-span-2">
                <label className="form-label">Instructions</label>
                <input className="input-field" value={m.instructions} onChange={(e) => updateMed(idx, 'instructions', e.target.value)} />
              </div>
              <div className="text-right">
                <button type="button" className="btn-danger" onClick={() => removeMed(idx)}><Trash className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button className="btn-primary" onClick={onSave} disabled={saving}>{saving ? 'Saving...' : 'Save & Print Prescription'}</button>
      </div>

      {/* Print Modal */}
      {showPrintModal && savedRecordData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Prescription Created</h2>
              <button
                onClick={() => navigate('/appointments')}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="bg-gray-50 p-4 border rounded mb-6">
              <p className="text-gray-600 mb-2">The medical record has been saved successfully.</p>
              <p className="font-medium">Would you like to print the doctor's slip?</p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                className="btn-secondary"
                onClick={() => { setShowPrintModal(false); navigate('/appointments'); }}
              >
                Skip & Close
              </button>
              <button
                className="btn-primary flex items-center gap-2"
                onClick={handlePrintCurrent}
              >
                <Printer className="h-4 w-4" />
                Print Prescription
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Printable Content - Redesigned */}
      {savedRecordData && (
        <div className="hidden">
          <div ref={printRef} className="bg-white">
            {/* Header */}
            <div className="header">
              <div className="doc-info">
                <div className="doc-name">Dr. {savedRecordData.doctor?.user?.firstName} {savedRecordData.doctor?.user?.lastName}</div>
                <div>{savedRecordData.doctor?.qualification || 'M.D. PSYCHIATRY'}</div>
                {savedRecordData.doctor?.regNumber && <div>Reg. No: {savedRecordData.doctor.regNumber}</div>}
              </div>
              <div className="logo" style={{ textAlign: 'center' }}>
                <img src="/doctor_logo.png" alt="Doctor Symbol" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
              </div>
              <div className="hospital-info">
                <div className="hospital-name">DR. SHAZIA PSYCHIATRY</div>
                <div>Near Electricity Board, Railway Road</div>
                <div>Contact: (+91) 9417054621</div>
                <div>Timing: 10:00 AM - 02:00 PM</div>
                <div>Closed: Sunday</div>
              </div>
            </div>

            {/* Top Bar: ID, Date */}
            <div className="flex justify-between font-bold mb-2">
              <div>ID: {savedRecordData.patient?.regNo || savedRecordData.patient?._id?.slice(-6).toUpperCase()}</div>
              <div>Date: {new Date(savedRecordData.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
            </div>

            {/* Patient Info Bar */}
            <div className="patient-bar">
              <div>PATIENT: {savedRecordData.patient?.firstName} {savedRecordData.patient?.lastName} ({savedRecordData.patient?.gender?.charAt(0).toUpperCase()}) / {calculateAge(savedRecordData.patient?.dateOfBirth) || savedRecordData.patient?.age || '-'} Y</div>
              <div>Mob. No.: {savedRecordData.patient?.phone}</div>
            </div>
            <div className="vitals-bar">
              {savedRecordData.vitals?.weight && <span>Weight (Kg): {savedRecordData.vitals.weight}, </span>}
              {savedRecordData.vitals?.height && <span>Height (Cm): {savedRecordData.vitals.height} </span>}
              {savedRecordData.vitals?.bmi && <span>(B.M.I. = {savedRecordData.vitals.bmi}), </span>}
              {savedRecordData.vitals?.bp && <span>BP: {savedRecordData.vitals.bp} mmHg</span>}
            </div>

            {/* Split Section: Complaints & Findings */}
            <div className="section-cols">
              <div className="col">
                <div className="sec-title">Chief Complaints</div>
                <ul className="list-disc pl-4">
                  {savedRecordData.chiefComplaint?.split(',').map((c, i) => <li key={i}>{c.trim()}</li>)}
                </ul>
              </div>
              <div className="col">
                <div className="sec-title">Clinical Findings</div>
                <p style={{ whiteSpace: 'pre-line' }}>{savedRecordData.diagnosis?.secondary}</p>
              </div>
            </div>

            {/* Diagnosis */}
            <div className="mb-4">
              <div className="sec-title">Diagnosis:</div>
              <div className="font-bold pl-2">* {savedRecordData.diagnosis?.primary}</div>
            </div>

            {/* Rx Header */}
            <div className="rx-header">R</div>

            {/* Rx Table */}
            <table className="rx-table">
              <thead>
                <tr>
                  <th style={{ width: '40%' }}>Medicine Name</th>
                  <th style={{ width: '30%' }}>Dosage</th>
                  <th style={{ width: '30%' }}>Duration</th>
                </tr>
              </thead>
              <tbody>
                {savedRecordData.medications.map((m, idx) => (
                  <tr key={idx}>
                    <td>
                      <div className="font-bold">{idx + 1}) {m.form ? (m.form.startsWith('Tab') || m.form.startsWith('Cap') ? m.form.toUpperCase() + '. ' : m.form + ' ') : ''}{m.name.toUpperCase()}</div>
                      <div className="text-xs">{m.strength}</div>
                    </td>
                    <td>
                      <div className="font-bold">{m.frequency}</div>
                      <div className="text-xs">{m.instructions}</div>
                    </td>
                    <td>
                      <div className="font-bold">{m.duration}</div>
                      {/* Quick calc for total tabs if structured? Skipping for now as it needs parsable input */}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Footer Advice */}
            {savedRecordData.notes && (
              <div className="footer-section">
                <div className="label">Advice:</div>
                <ul className="list-disc pl-4">
                  {savedRecordData.notes.split('\n').map((n, i) => <li key={i}>{n}</li>)}
                </ul>
              </div>
            )}

            {/* Follow Up */}
            {savedRecordData.nextVisitDate && (
              <div className="footer-section font-bold" style={{ marginTop: '15px' }}>
                Follow Up: {new Date(savedRecordData.nextVisitDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </div>
            )}

            {/* Bottom Disclaimer */}
            <div className="bottom-note">
              Substitute with equivalent Generics as required.
            </div>
          </div>
        </div>
      )
      }
    </div >
  );
};

export default MedicalRecordForm;

