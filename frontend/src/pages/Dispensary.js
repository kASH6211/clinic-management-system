import React, { useEffect, useRef, useState } from 'react';
import { dispensaryAPI, appointmentAPI, medicinesAPI, patientAPI } from '../services/api';
import toast from 'react-hot-toast';
import { Search, Plus, Trash, Printer, FileText, User, Calendar } from 'lucide-react';

const emptyItem = { name: '', quantity: 1, unitPrice: 0 };

const Dispensary = () => {
  const [mode, setMode] = useState('today'); // 'today' | 'history' | 'direct' | 'past'
  const [date, setDate] = useState('');
  const [token, setToken] = useState('');
  const [patientId, setPatientId] = useState('');
  const [items, setItems] = useState([{ ...emptyItem }]);
  const [tax, setTax] = useState('0');
  const [discount, setDiscount] = useState('');
  const [loading, setLoading] = useState(false);

  // Patient Search
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState([]);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientLoading, setPatientLoading] = useState(false);

  // Medicine Search
  const [searchIndex, setSearchIndex] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [queryDate, setQueryDate] = useState('');
  const [queryToken, setQueryToken] = useState('');
  const [queryPatientId, setQueryPatientId] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const billRef = useRef(null);
  const [queryLoading, setQueryLoading] = useState(false);

  // Reports
  const [reportStart, setReportStart] = useState(new Date().toISOString().slice(0, 10));
  const [reportEnd, setReportEnd] = useState(new Date().toISOString().slice(0, 10));
  const [reportStats, setReportStats] = useState({ totalBilled: 0, totalCollected: 0, count: 0 });
  const [reportList, setReportList] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);

  // Appointment filter/prefill
  const todayStr = new Date().toISOString().slice(0, 10);
  const [apptDate, setApptDate] = useState(todayStr);
  const [apptStatus, setApptStatus] = useState('prescription dispensed'); // Default to show those ready for dispensing? Or 'completed'?
  const [apptLoading, setApptLoading] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [selectedAppt, setSelectedAppt] = useState(null);

  // Alternatives search by salt per item index
  const [altIdx, setAltIdx] = useState(null);
  const [altSalt, setAltSalt] = useState('');
  const [altList, setAltList] = useState([]);
  const [altLoading, setAltLoading] = useState(false);

  // Patient Search Handler
  const handlePatientSearch = async (val) => {
    setPatientSearch(val);
    if (val.length < 2) {
      setPatientResults([]);
      return;
    }
    try {
      setPatientLoading(true);
      // Use backend search
      const res = await patientAPI.getAll({ search: val, limit: 20 });
      setPatientResults(res.data.data || []);
      setShowPatientDropdown(true);
    } catch (e) {
      console.error(e);
    } finally {
      setPatientLoading(false);
    }
  };

  const selectPatient = (p) => {
    setSelectedPatient(p);
    setPatientId(p._id);
    setPatientSearch(`${p.firstName} ${p.lastName}`);
    setShowPatientDropdown(false);

    // If in past mode, set the query filter
    if (mode === 'past') {
      setQueryPatientId(p._id);
    }
  };

  // Medicine Search Handler
  const handleMedicineSearch = async (idx, val) => {
    updateItem(idx, 'name', val);
    setSearchIndex(idx);
    setSearchText(val);
    if (val.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      setSearchLoading(true);
      const res = await medicinesAPI.getAll({ search: val, limit: 10 });
      setSearchResults(res.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setSearchLoading(false);
    }
  };

  const pickMedicine = (m) => {
    if (searchIndex === null) return;
    updateItem(searchIndex, 'name', m.name);
    updateItem(searchIndex, 'strength', m.strength || '');
    updateItem(searchIndex, 'form', m.form || '');
    updateItem(searchIndex, 'unitPrice', m.sellingPrice || 0);
    setSearchResults([]);
    setSearchText('');
    setSearchIndex(null);
  };

  const loadLatestPrescription = async () => {
    if (!selectedPatient) return toast.error('Select a patient first');
    try {
      setLoading(true);
      const res = await dispensaryAPI.prefill({ patientId: selectedPatient._id });
      const pre = res.data.data || [];
      if (pre.length === 0) return toast('No recent prescription found');

      setItems(pre.map(x => ({
        name: x.name,
        strength: x.strength || '',
        form: x.form || '',
        duration: x.duration || '',
        quantity: x.quantity || 1,
        unitPrice: x.unitPrice || 0,
        notes: x.notes || '',
        days: '',
        doses: ''
      })));
      toast.success('Loaded latest prescription');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to load prescription');
    } finally {
      setLoading(false);
    }
  };

  const updateItem = (idx, field, value) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  };

  // Auto-load today's scheduled appointments on mount
  useEffect(() => {
    onQueryAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Appointments search for chemist
  const onQueryAppointments = async () => {
    try {
      setApptLoading(true);
      const params = {};
      if (apptDate) params.date = apptDate;
      if (apptStatus) params.status = apptStatus;
      const res = await appointmentAPI.getAll(params);
      setAppointments(res.data.data || []);
      setSelectedAppt(null);
    } catch (e) {
      const msg = e.response?.data?.message || 'Failed to fetch appointments';
      toast.error(msg);
    } finally {
      setApptLoading(false);
    }
  };

  const onChooseAppointment = async (appt) => {
    setSelectedAppt(appt);
    setSelectedPatient(appt.patient); // Set selected patient context
    try {
      const res = await dispensaryAPI.prefill({ appointmentId: appt._id });
      const pre = res.data.data || [];
      if (pre.length === 0) toast('No prescription found for this appointment');
      setItems(pre.map(x => ({ name: x.name, strength: x.strength || '', form: x.form || '', duration: x.duration || '', quantity: x.quantity || 1, unitPrice: x.unitPrice || 0, notes: x.notes || '' })));

      // Auto-switch to dispense creation view if we want, or stay in list?
      // Let's scroll to top or just set mode to 'today' (already is) and populate form
      setDate(appt.appointmentDay ? new Date(appt.appointmentDay).toISOString().slice(0, 10) : '');
      setToken(appt.dailyToken || '');
      setPatientId(appt.patient._id);
    } catch (e) {
      const msg = e.response?.data?.message || 'Failed to prefill from prescription';
      toast.error(msg);
    }
  };

  // Alternatives by salt
  const onSearchAlternatives = async (idx) => {
    try {
      if (!altSalt) return toast.error('Enter salt to search alternatives');
      setAltLoading(true);
      setAltIdx(idx);
      const res = await medicinesAPI.getAll({ salt: altSalt, limit: 10 });
      setAltList(res.data.data || []);
    } catch (e) {
      setAltList([]);
    } finally {
      setAltLoading(false);
    }
  };
  const onPickAlternative = (m) => {
    if (altIdx === null) return;
    updateItem(altIdx, 'name', m.name || '');
    updateItem(altIdx, 'unitPrice', m.sellingPrice || 0);
    setAltIdx(null);
    setAltSalt('');
    setAltList([]);
  };

  const addItem = () => setItems(prev => [...prev, { ...emptyItem }]);
  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));

  const computeSubtotal = () => items.reduce((sum, it) => sum + (Number(it.quantity || 0) * Number(it.unitPrice || 0)), 0);
  const subtotal = computeSubtotal();
  const total = subtotal + Number(tax || 0);

  // Quantity helpers
  const setDays = (idx, days) => {
    updateItem(idx, 'days', days);
    const qty = Number(days || 0) * Number(items[idx].doses || 0 || 1);
    updateItem(idx, 'quantity', qty);
  };
  const setDoses = (idx, doses) => {
    updateItem(idx, 'doses', doses);
    const qty = Number(doses || 0) * Number(items[idx].days || 0 || 1);
    updateItem(idx, 'quantity', qty);
  };

  const onEditDispense = (d) => {
    setSelected(d);
    setItems(d.items.map(i => ({ ...i, unitPrice: i.unitPrice, stock: 999 })));
    setTax(d.tax || '');
    setDiscount(d.discount || '');
    setMode('direct');
    // We use 'direct' mode UI for editing, but we need to know we are editing 'selected'
    // The save function will check if 'selected' exists and has an ID
  };

  const onCancelDispense = async (d) => {
    if (!window.confirm('Are you sure you want to cancel this dispense? Items will be returned to stock.')) return;
    try {
      const res = await dispensaryAPI.cancelDispense(d._id);
      if (res.data.success) {
        toast.success('Dispense cancelled');
        onQuery(); // Refresh list
        if (selected?._id === d._id) setSelected(null);
      }
    } catch (e) {
      console.error('Cancel error:', e);
      const msg = e.response?.data?.message || (e.response?.data?.errors ? JSON.stringify(e.response.data.errors) : e.message) || 'Error cancelling dispense';
      toast.error(msg);
    }
  };

  const onSaveDispense = async () => {
    if (items.length === 0) return toast.error('No items to dispense');

    const payload = {
      items: items.map(i => ({
        name: i.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        strength: i.strength,
        form: i.form,
        duration: i.duration,
        notes: i.notes
      })),
      tax: Number(tax || 0),
      discount: Number(discount || 0),
    };

    try {
      setLoading(true);
      if (selected && selected._id && mode === 'direct') {
        // Update existing
        const res = await dispensaryAPI.updateDispense(selected._id, payload);
        if (res.data.success) {
          toast.success('Dispense updated');
          setSelected(res.data.data);
          // Auto-fill refund if applicable?
          const newTotal = res.data.data.total;
          const paid = res.data.data.paidAmount || 0;
          if (paid > newTotal) {
            setPayAmount((newTotal - paid).toFixed(2)); // Negative amount for refund
            toast('Refund due: ' + (paid - newTotal).toFixed(2), { icon: 'ℹ️' });
          }
        }
      } else {
        // Create new
        if (mode === 'today' && selectedAppt) {
          payload.date = selectedAppt.appointmentDay;
          payload.token = selectedAppt.dailyToken;
        } else if (selectedPatient) {
          payload.patient = selectedPatient._id;
        } else if (mode === 'token') { // Legacy support if needed, or remove
          if (!date || !token) return toast.error('Provide date and token');
          payload.date = date;
          payload.token = Number(token);
        } else {
          return toast.error('No patient selected');
        }

        const res = await dispensaryAPI.create(payload);
        toast.success('Dispense created');
        try {
          // ensure we have full object
          if (res.data && res.data.data) {
            setSelected(res.data.data);
          }
        } catch (_) { }

        // Reset form
        setItems([{ ...emptyItem }]);
        setTax('0');
        setDiscount('');
        if (mode === 'today') {
          onQueryAppointments();
        }
      }
    } catch (e) {
      console.error('Save dispense error:', e);
      const msg = e.response?.data?.message || (e.response?.data?.errors ? JSON.stringify(e.response.data.errors) : e.message) || 'Failed to save dispense';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const onSelect = (d) => {
    setSelected(d);
    setPayAmount('');
  };

  const onPay = async () => {
    if (!selected?._id) return toast.error('Select a dispense first');
    if (!payAmount || Number(payAmount) === 0) return toast.error('Enter valid amount');
    try {
      const res = await dispensaryAPI.pay(selected._id, { amount: Number(payAmount) });
      toast.success('Payment recorded');
      setSelected(res.data.data);
      // refresh list entry
      setResults(prev => prev.map(x => x._id === res.data.data._id ? res.data.data : x));
      setPayAmount('');
    } catch (e) {
      console.error('Payment error:', e);
      const msg = e.response?.data?.message || (e.response?.data?.errors ? JSON.stringify(e.response.data.errors) : e.message) || 'Payment failed';
      toast.error(msg);
    }
  };

  const onPrint = () => {
    if (!billRef.current) return;
    const printContents = billRef.current.innerHTML;
    const win = window.open('', '', 'width=800,height=600');
    win.document.write('<html><head><title>Bill</title>');
    win.document.write(`
      <style>
        body { font-family: 'Inter', sans-serif; padding: 40px; color: #1f2937; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .text-sm { font-size: 0.875rem; }
        .text-xs { font-size: 0.75rem; }
        .text-gray-500 { color: #6b7280; }
        .mb-6 { margin-bottom: 1.5rem; }
        .flex { display: flex; }
        .justify-between { justify-content: space-between; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; }
        th { text-align: left; padding: 0.5rem; border-bottom: 2px solid #e5e7eb; color: #4b5563; font-weight: 600; }
        td { padding: 0.5rem; border-bottom: 1px solid #f3f4f6; }
        th.text-right, td.text-right { text-align: right; }
        th.text-center, td.text-center { text-align: center; }
        .border-t { border-top: 1px solid #e5e7eb; }
        .pt-2 { padding-top: 0.5rem; }
        .w-48 { width: 12rem; }
        .space-y-2 > * + * { margin-top: 0.5rem; }
      </style>
    `);
    win.document.write('</head><body>');
    win.document.write(printContents);
    win.document.write('</body></html>');
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  const onQuery = async () => {
    try {
      setQueryLoading(true);
      const params = {};

      // If reports mode, use date range
      if (mode === 'reports') {
        params.startDate = reportStart;
        params.endDate = reportEnd;
      } else {
        if (queryPatientId) params.patientId = queryPatientId;
        if (queryDate && queryToken) {
          params.date = queryDate;
          params.token = queryToken;
        }
        if (!params.patientId && !params.date) return toast.error('Provide patientId or date+token');
      }

      const res = await dispensaryAPI.getAll(params);
      if (mode === 'reports') {
        setReportList(res.data.data || []);
      } else {
        setResults(res.data.data || []);
      }
      setSelected(null);
    } catch (e) {
      const msg = e.response?.data?.message || 'Failed to fetch dispenses';
      toast.error(msg);
      console.error('Query dispenses error:', e);
    } finally {
      setQueryLoading(false);
    }
  };

  const onGenerateReport = async () => {
    try {
      setReportLoading(true);
      // Fetch stats
      const statsRes = await dispensaryAPI.getStats({ startDate: reportStart, endDate: reportEnd });
      setReportStats(statsRes.data.data);
      // Fetch list
      onQuery();
    } catch (e) {
      toast.error('Failed to generate report');
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dispensary</h1>
        <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setMode('today')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'today' ? 'bg-white text-blue-600 shadow' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Today's Visits
          </button>
          <button
            onClick={() => setMode('history')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'history' ? 'bg-white text-blue-600 shadow' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Patient History
          </button>
          <button
            onClick={() => setMode('direct')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'direct' ? 'bg-white text-blue-600 shadow' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Direct Dispense
          </button>
          <button
            onClick={() => setMode('past')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'past' ? 'bg-white text-blue-600 shadow' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Past Dispenses
          </button>
          <button
            onClick={() => setMode('reports')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'reports' ? 'bg-white text-blue-600 shadow' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Reports
          </button>
        </div>
      </div>

      {/* Mode: Today's Visits - List */}
      {mode === 'today' && (
        <div className="card">
          {/* ... existing Today's Visits content ... */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Scheduled Appointments</h2>
            <div className="flex gap-2">
              <input type="date" className="input-field w-auto" value={apptDate} onChange={(e) => setApptDate(e.target.value)} />
              <select className="input-field w-auto" value={apptStatus} onChange={(e) => setApptStatus(e.target.value)}>
                <option value="">All Status</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="prescription dispensed">Dispensed</option>
              </select>
              <button className="btn-secondary" onClick={onQueryAppointments} disabled={apptLoading}>Refresh</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Token</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {appointments.map((a) => (
                  <tr key={a._id} className={selectedAppt?._id === a._id ? 'bg-blue-50' : ''}>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      <div className="font-medium">{a.patient?.firstName} {a.patient?.lastName}</div>
                      <div className="text-xs text-gray-500">{a.patient?.phone}</div>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">{typeof a.dailyToken !== 'undefined' ? a.dailyToken : '-'}</td>
                    <td className="px-4 py-2 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${a.status === 'prescription dispensed' ? 'bg-green-100 text-green-800' : a.status === 'completed' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button className="btn-sm btn-secondary" onClick={() => onChooseAppointment(a)}>Select</button>
                    </td>
                  </tr>
                ))}
                {appointments.length === 0 && <tr><td colSpan="4" className="px-4 py-4 text-center text-gray-500">No appointments found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Patient Search (for History, Direct, Past) */}
      {(mode === 'history' || mode === 'direct' || mode === 'past') && (
        <div className="card">
          {/* ... existing Patient Search content ... */}
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Patient</h2>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="input-field pl-10"
              placeholder="Search patient by name or phone..."
              value={patientSearch}
              onChange={(e) => handlePatientSearch(e.target.value)}
              onFocus={() => setShowPatientDropdown(true)}
            />
            {showPatientDropdown && patientResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                {patientResults.map(p => (
                  <button
                    key={p._id}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b last:border-b-0"
                    onClick={() => selectPatient(p)}
                  >
                    <div className="font-medium text-gray-900">{p.firstName} {p.lastName}</div>
                    <div className="text-sm text-gray-500">Ph: {p.phone} | Reg: {p.regNo}</div>
                  </button>
                ))}
              </div>
            )}
            {patientLoading && <div className="absolute right-3 top-2 text-sm text-gray-400">Searching...</div>}
          </div>

          {selectedPatient && (
            <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-100 flex justify-between items-center">
              <div>
                <div className="font-medium text-blue-900">{selectedPatient.firstName} {selectedPatient.lastName}</div>
                <div className="text-sm text-blue-700">{selectedPatient.phone}</div>
              </div>
              {mode === 'history' && (
                <button className="btn-secondary flex items-center gap-2" onClick={loadLatestPrescription} disabled={loading}>
                  <FileText className="h-4 w-4" />
                  Load Latest Prescription
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Dispense Form (Visible in Today, History, Direct) */}
      {(mode === 'today' || mode === 'history' || mode === 'direct') && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Dispense Items</h2>
            <div className="text-sm text-gray-500">
              {mode === 'token' ? `Token: ${token || '-'}` : selectedPatient ? `Patient: ${selectedPatient.firstName}` : 'No patient selected'}
            </div>
          </div>

          <div className="space-y-4">
            {items.map((it, idx) => (
              <div key={idx} className="p-4 border rounded-lg bg-gray-50 relative">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-4 relative">
                    <label className="form-label">Medicine</label>
                    <input
                      className="input-field"
                      placeholder="Type to search..."
                      value={it.name}
                      onChange={(e) => handleMedicineSearch(idx, e.target.value)}
                    />
                    {searchIndex === idx && searchText && (
                      <div className="absolute z-50 w-full mt-1 border rounded bg-white max-h-40 overflow-auto shadow-lg">
                        {searchLoading && <div className="p-2 text-sm text-gray-500">Searching...</div>}
                        {(!searchLoading && searchResults.length === 0) && <div className="p-2 text-sm text-gray-500">No matches</div>}
                        {searchResults.map((r) => (
                          <button type="button" key={r._id} className="block w-full text-left px-3 py-2 hover:bg-gray-50" onClick={() => pickMedicine(r)}>
                            <div className="font-medium">{r.name}</div>
                            <div className="text-xs text-gray-500">{r.strength} {r.form} • Rs.{r.sellingPrice}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <label className="form-label">Strength</label>
                    <input className="input-field" value={it.strength || ''} onChange={(e) => updateItem(idx, 'strength', e.target.value)} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="form-label">Qty</label>
                    <input type="number" className="input-field" value={it.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="form-label">Price</label>
                    <input type="number" className="input-field" value={it.unitPrice} onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)} />
                  </div>
                  <div className="md:col-span-2 flex items-end justify-end">
                    <div className="font-medium text-gray-900">{(Number(it.quantity || 0) * Number(it.unitPrice || 0)).toFixed(2)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mt-2">
                  <div className="md:col-span-6">
                    <label className="form-label">Instructions/Notes</label>
                    <input className="input-field" value={it.notes || ''} onChange={(e) => updateItem(idx, 'notes', e.target.value)} placeholder="Dosage instructions..." />
                  </div>
                  <div className="md:col-span-4 flex items-end gap-2">
                    <input className="input-field" placeholder="Search Alt (Salt)" value={altIdx === idx ? altSalt : ''} onChange={(e) => { setAltIdx(idx); setAltSalt(e.target.value); }} />
                    <button className="btn-secondary whitespace-nowrap" onClick={() => onSearchAlternatives(idx)}>Find Alt</button>
                  </div>
                  <div className="md:col-span-2 flex items-end justify-end">
                    <button className="text-red-600 hover:text-red-800 p-2" onClick={() => removeItem(idx)}><Trash className="h-5 w-5" /></button>
                  </div>
                </div>

                {altIdx === idx && (altList.length > 0 || altLoading) && (
                  <div className="mt-2 border rounded p-2 bg-white">
                    {altLoading && <div className="text-sm text-gray-500">Searching alternatives...</div>}
                    {altList.map((m) => (
                      <button key={m._id} type="button" className="block w-full text-left px-3 py-1 hover:bg-gray-50 flex justify-between" onClick={() => onPickAlternative(m)}>
                        <span>{m.name} <span className="text-gray-500 text-xs">({m.strength} {m.form})</span></span>
                        <span className="font-medium">Rs. {Number(m.sellingPrice || 0).toFixed(2)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <button className="btn-secondary w-full py-3 border-dashed border-2 flex justify-center items-center gap-2" onClick={addItem}>
              <Plus className="h-4 w-4" /> Add Item
            </button>
          </div>

          <div className="mt-6 border-t pt-4">
            <div className="flex justify-end space-y-1 flex-col items-end">
              <div className="flex gap-4 text-gray-600">
                <span>Subtotal:</span>
                <span className="font-medium w-24 text-right">{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex gap-4 items-center">
                <span className="text-gray-600">Tax:</span>
                <input type="number" className="input-field w-24 text-right py-1" value={tax} onChange={(e) => setTax(e.target.value)} />
              </div>
              <div className="flex gap-4 items-center">
                <span className="text-gray-600">Discount:</span>
                <input type="number" className="input-field w-24 text-right py-1" value={discount} onChange={(e) => setDiscount(e.target.value)} />
              </div>
              <div className="flex gap-4 text-lg font-bold text-gray-900 mt-2">
                <span>Total:</span>
                <span className="w-24 text-right">{(subtotal + Number(tax || 0) - Number(discount || 0)).toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button className="btn-primary px-8" onClick={onSaveDispense} disabled={loading}>
                {loading ? 'Processing...' : (selected && selected._id && mode === 'direct' ? 'Update Dispense' : 'Create Dispense & Bill')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dispense History / Find Dispenses (Only in Past Dispenses mode) */}
      {mode === 'past' && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Search Past Dispenses</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* ID is handled by patient search above, but we keep this hidden or read-only if needed, or remove it to avoid confusion */}
            <div>
              <label className="form-label">Patient</label>
              <input type="text" className="input-field bg-gray-100" value={selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : (queryPatientId || '')} readOnly placeholder="Search above..." />
            </div>
            <div>
              <label className="form-label">Date</label>
              <input type="date" className="input-field" value={queryDate} onChange={(e) => setQueryDate(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Token</label>
              <input type="number" className="input-field" value={queryToken} onChange={(e) => setQueryToken(e.target.value)} />
            </div>
            <div className="flex items-end">
              <button className="btn-primary" onClick={onQuery} disabled={queryLoading}>{queryLoading ? 'Searching...' : 'Search Records'}</button>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date/Token</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {results.map(d => (
                  <tr key={d._id} className={selected?._id === d._id ? 'bg-blue-50' : ''}>
                    <td className="px-4 py-2 text-sm text-gray-900">{d.patient?.firstName} {d.patient?.lastName}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      <div>{d.appointmentDay ? new Date(d.appointmentDay).toLocaleDateString() : '-'}</div>
                      <div className="text-xs text-gray-500">Token: {d.dailyToken ?? '-'}</div>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">{Number(d.total).toFixed(2)}</td>
                    <td className="px-4 py-2 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${d.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : d.paymentStatus === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {d.paymentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right space-x-2">
                      <button className="btn-sm btn-secondary" onClick={() => onEditDispense(d)} disabled={d.paymentStatus === 'cancelled'}>Edit</button>
                      <button className="btn-sm btn-danger text-red-600 hover:text-red-800" onClick={() => onCancelDispense(d)} disabled={d.paymentStatus === 'cancelled'}>Cancel</button>
                      <button className="btn-sm btn-secondary" onClick={() => onSelect(d)}>View Bill</button>
                    </td>
                  </tr>
                ))}
                {results.length === 0 && <tr><td colSpan="5" className="px-4 py-4 text-center text-gray-500">No records found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reports Mode */}
      {mode === 'reports' && (
        <div className="space-y-6">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Financial Reports</h2>
            <div className="flex gap-4 items-end">
              <div>
                <label className="form-label">From Date</label>
                <input type="date" className="input-field" value={reportStart} onChange={(e) => setReportStart(e.target.value)} />
              </div>
              <div>
                <label className="form-label">To Date</label>
                <input type="date" className="input-field" value={reportEnd} onChange={(e) => setReportEnd(e.target.value)} />
              </div>
              <button className="btn-primary" onClick={onGenerateReport} disabled={reportLoading}>Generate Report</button>
            </div>
          </div>

          {!reportLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
                <div className="text-sm font-medium text-gray-500 uppercase">Total Sales (Billed)</div>
                <div className="mt-2 text-3xl font-bold text-gray-900">Rs. {reportStats.totalBilled.toFixed(2)}</div>
                <div className="text-sm text-gray-500 mt-1">{reportStats.count} Transactions</div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
                <div className="text-sm font-medium text-gray-500 uppercase">Total Collected (Settled)</div>
                <div className="mt-2 text-3xl font-bold text-gray-900">Rs. {reportStats.totalCollected.toFixed(2)}</div>
                <div className="text-sm text-gray-500 mt-1">Net Received</div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow border-l-4 border-orange-500">
                <div className="text-sm font-medium text-gray-500 uppercase">Total Pending</div>
                <div className="mt-2 text-3xl font-bold text-gray-900">Rs. {reportStats.totalPending?.toFixed(2) || '0.00'}</div>
                <div className="text-sm text-gray-500 mt-1">To be collected</div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-500">
                <div className="text-sm font-medium text-gray-500 uppercase">Total Refunds</div>
                <div className="mt-2 text-3xl font-bold text-gray-900">Rs. {reportStats.totalRefunds?.toFixed(2) || '0.00'}</div>
                <div className="text-sm text-gray-500 mt-1">To be returned</div>
              </div>
            </div>
          )}

          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Transactions</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Billed</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportList.map(d => (
                    <tr key={d._id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm text-gray-900">{new Date(d.createdAt).toLocaleDateString()} <span className="text-xs text-gray-500">{new Date(d.createdAt).toLocaleTimeString()}</span></td>
                      <td className="px-4 py-2 text-sm text-gray-900">{d.patient?.firstName} {d.patient?.lastName}</td>
                      <td className="px-4 py-2 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs ${d.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : d.paymentStatus === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {d.paymentStatus}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">{Number(d.total).toFixed(2)}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{Number(d.paidAmount || 0).toFixed(2)}</td>
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">{(Number(d.total) - Number(d.paidAmount || 0)).toFixed(2)}</td>
                    </tr>
                  ))}
                  {reportList.length === 0 && <tr><td colSpan="6" className="px-4 py-4 text-center text-gray-500">No transactions in this period</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )
      }

      {
        selectedAppt && (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Selected Appointment</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
              <div><strong>Patient:</strong> {selectedAppt.patient?.firstName} {selectedAppt.patient?.lastName}</div>
              <div><strong>Doctor:</strong> Dr. {selectedAppt.doctor?.user?.firstName} {selectedAppt.doctor?.user?.lastName}</div>
              <div><strong>Token:</strong> {typeof selectedAppt.dailyToken !== 'undefined' ? selectedAppt.dailyToken : '-'}</div>
              <div><strong>Date:</strong> {selectedAppt.appointmentDate ? new Date(selectedAppt.appointmentDate).toLocaleDateString() : '-'}</div>
              <div><strong>Status:</strong> {selectedAppt.status}</div>
            </div>
          </div>
        )
      }

      {/* Payment and Bill */}
      {
        selected && (
          <div className="card border-t-4 border-blue-500">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Invoice & Payment</h2>
                <div className="text-sm text-gray-500">Manage payment and print bill for this dispense</div>
              </div>
              <button className="text-gray-400 hover:text-gray-600" onClick={() => setSelected(null)}><Trash className="h-5 w-5" /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className={`bg-gray-50 p-4 rounded-lg ${Number(selected.paidAmount || 0) > Number(selected.total) ? 'border-l-4 border-orange-500' : ''}`}>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {Number(selected.paidAmount || 0) > Number(selected.total) ? 'Refund Due' : 'Amount Due'}
                </label>
                <div className={`text-2xl font-bold mt-1 ${Number(selected.paidAmount || 0) > Number(selected.total) ? 'text-orange-600' : 'text-gray-900'}`}>
                  Rs. {Math.abs(Number(selected.total) - Number(selected.paidAmount || 0)).toFixed(2)}
                </div>
                <div className="text-sm text-gray-500 mt-1">Total: {Number(selected.total).toFixed(2)} | Paid: {Number(selected.paidAmount || 0).toFixed(2)}</div>
              </div>

              <div className="md:col-span-2 flex items-end gap-4">
                <div className="flex-grow">
                  <label className="form-label">Payment Amount</label>
                  <div className="flex gap-2">
                    <input type="number" className="input-field" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="Enter amount..." />
                    <button className="btn-primary whitespace-nowrap" onClick={onPay}>Record Payment</button>
                  </div>
                </div>
                <div>
                  <button className="btn-secondary h-[42px] flex items-center gap-2" onClick={onPrint} disabled={!selected.billNumber && selected.paymentStatus !== 'paid'}>
                    <Printer className="h-4 w-4" /> Print Bill
                  </button>
                </div>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-100 px-4 py-2 border-b font-medium text-gray-700">Bill Preview</div>
              <div ref={billRef} className="bg-white p-8" id="printable-bill">
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-bold text-gray-900">CLINIC NAME</h1>
                  <div className="text-sm text-gray-500">123 Health Street, Medical District</div>
                  <div className="text-sm text-gray-500">Phone: (123) 456-7890</div>
                </div>

                <div className="flex justify-between mb-6 text-sm">
                  <div>
                    <div className="text-gray-500">Bill To:</div>
                    <div className="font-bold text-gray-900">{selected.patient?.firstName} {selected.patient?.lastName}</div>
                    <div>{selected.patient?.phone}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-gray-500">Bill Details:</div>
                    <div><span className="font-medium">No:</span> {selected.billNumber || 'Pending'}</div>
                    <div><span className="font-medium">Date:</span> {new Date(selected.createdAt).toLocaleDateString()}</div>
                    <div><span className="font-medium">Token:</span> {selected.dailyToken ?? '-'}</div>
                  </div>
                </div>

                <table className="w-full mb-6 text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left py-2 font-semibold text-gray-600">Item</th>
                      <th className="text-center py-2 font-semibold text-gray-600">Qty</th>
                      <th className="text-right py-2 font-semibold text-gray-600">Price</th>
                      <th className="text-right py-2 font-semibold text-gray-600">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selected.items?.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-2">
                          <div className="font-medium text-gray-900">{it.name}</div>
                          <div className="text-xs text-gray-500">{it.strength} {it.form}</div>
                        </td>
                        <td className="text-center py-2">{it.quantity}</td>
                        <td className="text-right py-2">{Number(it.unitPrice).toFixed(2)}</td>
                        <td className="text-right py-2">{(Number(it.quantity) * Number(it.unitPrice)).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex justify-end">
                  <div className="w-48 space-y-2 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal:</span>
                      <span>{Number(selected.subtotal).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Tax:</span>
                      <span>{Number(selected.tax).toFixed(2)}</span>
                    </div>
                    {selected.discount > 0 && (
                      <div className="flex justify-between text-gray-600">
                        <span>Discount:</span>
                        <span>-{Number(selected.discount).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg text-gray-900 border-t pt-2">
                      <span>Total:</span>
                      <span>{Number(selected.total).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600 pt-1">
                      <span>Paid:</span>
                      <span>{Number(selected.paidAmount || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-medium text-gray-900 border-t pt-1">
                      <span>Balance:</span>
                      <span>{Math.max(0, Number(selected.total) - Number(selected.paidAmount || 0)).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 text-center text-xs text-gray-400">
                  Thank you for your visit. Get well soon!
                </div>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default Dispensary;
