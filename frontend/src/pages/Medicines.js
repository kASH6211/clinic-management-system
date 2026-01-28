import React, { useEffect, useState } from 'react';
import { medicinesAPI } from '../services/api';
import toast from 'react-hot-toast';

const Medicines = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [salt, setSalt] = useState('');
  const [form, setForm] = useState('');
  const [active, setActive] = useState('true');

  const [editId, setEditId] = useState(null);
  const [payload, setPayload] = useState({ name: '', salt: '', strength: '', form: '', costPrice: '', sellingPrice: '', stock: '', minStock: '' });

  const fetchList = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (salt) params.salt = salt;
      if (form) params.form = form;
      if (active) params.active = active;
      const res = await medicinesAPI.getAll(params);
      setList(res.data.data || []);
    } catch (e) {
      toast.error('Failed to load medicines');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      const body = {
        name: payload.name,
        salt: payload.salt,
        strength: payload.strength,
        form: payload.form,
        costPrice: Number(payload.costPrice || 0),
        sellingPrice: Number(payload.sellingPrice || 0),
        stock: Number(payload.stock || 0),
        minStock: Number(payload.minStock || 0),
      };
      if (editId) {
        const res = await medicinesAPI.update(editId, body);
        toast.success('Medicine updated');
        setEditId(null);
        setPayload({ name: '', salt: '', strength: '', form: '', costPrice: '', sellingPrice: '', stock: '', minStock: '' });
      } else {
        const res = await medicinesAPI.create(body);
        toast.success('Medicine created');
        setPayload({ name: '', salt: '', strength: '', form: '', costPrice: '', sellingPrice: '', stock: '', minStock: '' });
      }
      fetchList();
    } catch (e) {
      const msg = e.response?.data?.message || 'Save failed';
      toast.error(msg);
    }
  };

  const onEdit = (m) => {
    setEditId(m._id);
    setPayload({
      name: m.name || '',
      salt: m.salt || '',
      strength: m.strength || '',
      form: m.form || '',
      costPrice: m.costPrice || '',
      sellingPrice: m.sellingPrice || '',
      stock: m.stock || '',
      minStock: m.minStock || '',
    });
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <h1 className="text-xl font-semibold text-gray-900 mb-4">Medicines</h1>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
          <input className="input-field" placeholder="Search name/salt" value={search} onChange={(e) => setSearch(e.target.value)} />
          <input className="input-field" placeholder="Salt" value={salt} onChange={(e) => setSalt(e.target.value)} />
          <input className="input-field" placeholder="Form" value={form} onChange={(e) => setForm(e.target.value)} />
          <select className="input-field" value={active} onChange={(e) => setActive(e.target.value)}>
            <option value="">All</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
          <button className="btn-primary" onClick={fetchList} disabled={loading}>{loading ? 'Loading...' : 'Search'}</button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salt</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Strength</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Form</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min Level</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {list.map((m) => (
                <tr key={m._id}>
                  <td className="px-6 py-4 text-sm text-gray-900">{m.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{m.salt}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{m.strength}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{m.form}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{Number(m.costPrice || 0).toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{Number(m.sellingPrice || 0).toFixed(2)}</td>
                  <td className={`px-6 py-4 text-sm font-medium ${m.stock <= (m.minStock || 0) ? 'text-red-600' : 'text-gray-600'}`}>{m.stock}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{m.minStock || 0}</td>
                  <td className="px-6 py-4 text-right">
                    <button className="btn-secondary" onClick={() => onEdit(m)}>Edit</button>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-6 py-6 text-center text-gray-500">No medicines</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card max-w-3xl">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{editId ? 'Edit Medicine' : 'Add Medicine'}</h2>
        <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={onSubmit}>
          <div>
            <label className="form-label">Name</label>
            <input className="input-field" value={payload.name} onChange={(e) => setPayload(p => ({ ...p, name: e.target.value }))} required />
          </div>
          <div>
            <label className="form-label">Salt</label>
            <input className="input-field" value={payload.salt} onChange={(e) => setPayload(p => ({ ...p, salt: e.target.value }))} />
          </div>
          <div>
            <label className="form-label">Strength</label>
            <input className="input-field" value={payload.strength} onChange={(e) => setPayload(p => ({ ...p, strength: e.target.value }))} />
          </div>
          <div>
            <label className="form-label">Form</label>
            <input className="input-field" value={payload.form} onChange={(e) => setPayload(p => ({ ...p, form: e.target.value }))} />
          </div>
          <div>
            <label className="form-label">Cost Price</label>
            <input type="number" className="input-field" value={payload.costPrice} onChange={(e) => setPayload(p => ({ ...p, costPrice: e.target.value }))} />
          </div>
          <div>
            <label className="form-label">Selling Price</label>
            <input type="number" className="input-field" value={payload.sellingPrice} onChange={(e) => setPayload(p => ({ ...p, sellingPrice: e.target.value }))} />
          </div>
          <div>
            <label className="form-label">Stock Qty</label>
            <input type="number" className="input-field" value={payload.stock} onChange={(e) => setPayload(p => ({ ...p, stock: e.target.value }))} />
          </div>
          <div>
            <label className="form-label">Min Stock Level</label>
            <input type="number" className="input-field" value={payload.minStock} onChange={(e) => setPayload(p => ({ ...p, minStock: e.target.value }))} />
          </div>
          <div className="md:col-span-2 flex justify-end gap-2">
            {editId && (
              <button type="button" className="btn-secondary" onClick={() => { setEditId(null); setPayload({ name: '', salt: '', strength: '', form: '', costPrice: '', sellingPrice: '', stock: '', minStock: '' }); }}>Cancel</button>
            )}
            <button type="submit" className="btn-primary">{editId ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Medicines;
