import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import { HiOutlineEnvelope, HiOutlineArrowLeft } from 'react-icons/hi2';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
      toast.success('Reset instructions sent!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-transparent px-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-10 h-52 w-52 rounded-full bg-cyan-300/25 blur-3xl" />
        <div className="absolute right-0 bottom-10 h-56 w-56 rounded-full bg-amber-300/20 blur-3xl" />
      </div>
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-600 to-sky-700 text-xl font-bold text-white">
            AI
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            {sent ? 'Check your email' : 'Forgot password?'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {sent
              ? 'We sent password reset instructions to your email.'
              : "Enter your email and we'll send you reset instructions."}
          </p>
        </div>

        {!sent ? (
          <form onSubmit={handleSubmit} className="rounded-3xl border border-white/80 bg-white/90 p-8 shadow-[0_16px_40px_rgba(2,40,58,0.1)] backdrop-blur">
            <div className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Email address</label>
                <div className="relative">
                  <HiOutlineEnvelope className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                    placeholder="you@example.com"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-sky-700 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 disabled:opacity-50"
              >
                {loading && (
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </div>
          </form>
        ) : (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <HiOutlineEnvelope className="h-7 w-7 text-green-600" />
            </div>
            <p className="text-sm text-green-700">
              If an account exists for <strong>{email}</strong>, you&apos;ll receive an email with instructions to reset your password.
            </p>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-700 hover:text-sky-600">
            <HiOutlineArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
