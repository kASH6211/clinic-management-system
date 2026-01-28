import React from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const UserForm = () => {
  const { user } = useAuth();
  const { register, handleSubmit, formState: { errors }, reset } = useForm();

  const onSubmit = async (data) => {
    try {
      const payload = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        phone: data.phone,
        role: data.role,
      };
      await authAPI.register(payload);
      toast.success('User created successfully');
      reset();
    } catch (e) {
      const msg = e.response?.data?.message || 'Failed to create user';
      toast.error(msg);
      console.error('Create user error:', e);
    }
  };

  if (user?.role !== 'admin') {
    return <div className="card"><p className="text-red-600">Access denied. Admins only.</p></div>;
  }

  return (
    <div className="card max-w-2xl">
      <h1 className="text-xl font-semibold text-gray-900 mb-4">Create User</h1>
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">First Name</label>
            <input className="input-field" {...register('firstName', { required: 'Required' })} />
            {errors.firstName && <p className="text-sm text-red-600">{errors.firstName.message}</p>}
          </div>
          <div>
            <label className="form-label">Last Name</label>
            <input className="input-field" {...register('lastName', { required: 'Required' })} />
            {errors.lastName && <p className="text-sm text-red-600">{errors.lastName.message}</p>}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Email</label>
            <input type="email" className="input-field" {...register('email', { required: 'Required' })} />
            {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
          </div>
          <div>
            <label className="form-label">Phone</label>
            <input className="input-field" {...register('phone', { required: 'Required' })} />
            {errors.phone && <p className="text-sm text-red-600">{errors.phone.message}</p>}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Password</label>
            <input type="password" className="input-field" {...register('password', { required: 'Required', minLength: { value: 6, message: 'Min 6 chars' } })} />
            {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
          </div>
          <div>
            <label className="form-label">Role</label>
            <select className="input-field" {...register('role', { required: 'Required' })}>
              <option value="receptionist">Receptionist</option>
              <option value="doctor">Doctor</option>
              <option value="chemist">Chemist</option>
              <option value="admin">Admin</option>
            </select>
            {errors.role && <p className="text-sm text-red-600">{errors.role.message}</p>}
          </div>
        </div>
        <button type="submit" className="btn-primary">Create User</button>
      </form>
    </div>
  );
};

export default UserForm;
