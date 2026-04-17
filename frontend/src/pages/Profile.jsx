import { useEffect, useState } from 'react';
import { getProfile, updateProfile, changePassword } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user, loginUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [fullName, setFullName] = useState('');
  const [saving, setSaving] = useState(false);

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNew, setConfirmNew] = useState('');
  const [changingPw, setChangingPw] = useState(false);

  useEffect(() => {
    getProfile()
      .then((data) => {
        setProfile(data);
        setFullName(data.fullName);
      })
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = await updateProfile(fullName);
      setProfile(data);
      loginUser({ fullName: data.fullName, email: data.email, role: data.role });
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmNew) {
      toast.error('New passwords do not match');
      return;
    }
    setChangingPw(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast.success('Password changed. Please log in again.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNew('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setChangingPw(false);
    }
  };

  if (loading) return <LoadingSpinner size="lg" message="Loading profile..." />;

  return (
    <div className="space-y-8">
      <div className="rounded-3xl bg-gradient-to-r from-sky-700 via-cyan-700 to-teal-600 px-6 py-7 text-white shadow-[0_16px_40px_rgba(2,40,58,0.22)] lg:px-8">
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="mt-1 text-sm text-cyan-50/90">Manage your account settings</p>
      </div>

      <div className="mx-auto max-w-2xl space-y-8">
        {/* Avatar + Info */}
        <div className="flex items-center gap-5 rounded-2xl border border-white/80 bg-white/90 p-6 shadow-[0_12px_30px_rgba(2,40,58,0.08)] backdrop-blur">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600 text-2xl font-bold text-white">
            {profile?.fullName?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-900">{profile?.fullName}</p>
            <p className="text-sm text-slate-500">{profile?.email}</p>
            <p className="text-xs text-slate-400">
              Joined {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '—'}
            </p>
          </div>
        </div>

        {/* Update Name */}
        <form onSubmit={handleUpdateProfile} className="rounded-2xl border border-white/80 bg-white/90 p-6 shadow-[0_12px_30px_rgba(2,40,58,0.08)] backdrop-blur">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Update Profile</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-gradient-to-r from-cyan-600 to-sky-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>

        {/* Change Password */}
        <form onSubmit={handleChangePassword} className="rounded-2xl border border-white/80 bg-white/90 p-6 shadow-[0_12px_30px_rgba(2,40,58,0.08)] backdrop-blur">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Change Password</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmNew}
                onChange={(e) => setConfirmNew(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
              />
            </div>
            <button
              type="submit"
              disabled={changingPw}
              className="rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
            >
              {changingPw ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
