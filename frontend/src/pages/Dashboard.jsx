import { useEffect, useState } from 'react';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import ScoreCard from '../components/ScoreCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { getHistory, getTrends } from '../services/interviewService';
import { getMyResumes } from '../services/resumeService';
import { useAuth } from '../context/AuthContext';
import { onDataUpdated } from '../utils/dataEvents';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler);

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalInterviews: 0,
    averageScore: 0,
    atsScore: 0,
    recentSessions: [],
    scoreTrend: [],
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [history, trends, resumes] = await Promise.allSettled([
          getHistory(),
          getTrends(),
          getMyResumes(),
        ]);

        const h = history.status === 'fulfilled' ? history.value : {};
        const t = trends.status === 'fulfilled' ? trends.value : {};
        const r = resumes.status === 'fulfilled' ? resumes.value : [];
        const resumeList = Array.isArray(r) ? r : Array.isArray(r?.resumes) ? r.resumes : [];

        const latestAts = resumeList.length > 0 ? resumeList[0].atsScore : 0;
        const recentSessions = h.sessions || [];

        setStats({
          totalInterviews: h.completedSessions || 0,
          averageScore: t.overallAverageScore || 0,
          atsScore: latestAts,
          recentSessions: recentSessions.slice(0, 5),
          scoreTrend: (t.recentTrends || []).map((s) => ({
            label: new Date(s.date || s.createdAt || Date.now()).toLocaleDateString(),
            score: s.averageScore || 0,
          })),
        });
      } catch {
        // stats stay at defaults
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const unsubscribe = onDataUpdated(fetchData);
    return unsubscribe;
  }, []);

  if (loading) return <LoadingSpinner size="lg" message="Loading dashboard..." />;

  const lineData = {
    labels: stats.scoreTrend.map((s) => s.label),
    datasets: [
      {
        label: 'Interview Score',
        data: stats.scoreTrend.map((s) => s.score),
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const doughnutData = {
    labels: ['ATS Score', 'Remaining'],
    datasets: [
      {
        data: [stats.atsScore, 100 - stats.atsScore],
        backgroundColor: ['#6366f1', '#e2e8f0'],
        borderWidth: 0,
      },
    ],
  };

  return (
    <div className="space-y-8">
      <div className="rounded-3xl bg-gradient-to-r from-sky-700 via-cyan-700 to-teal-600 px-6 py-7 text-white shadow-[0_16px_40px_rgba(2,40,58,0.22)] lg:px-8">
        <h1 className="text-2xl font-bold">Welcome back, {user?.fullName}!</h1>
        <p className="mt-1 text-sm text-cyan-50/90">Your latest interview and resume momentum at a glance</p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <ScoreCard title="Interviews Completed" value={stats.totalInterviews} icon="🎯" color="indigo" />
        <ScoreCard title="Average Score" value={`${stats.averageScore.toFixed(1)}/10`} icon="📊" color="green" />
        <ScoreCard title="Resume ATS Score" value={`${stats.atsScore}%`} icon="📄" color="amber" />
        <ScoreCard
          title="Sessions This Month"
          value={stats.recentSessions.length}
          icon="🗓️"
          color="sky"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-white/80 bg-white/90 p-6 shadow-[0_12px_30px_rgba(2,40,58,0.08)] backdrop-blur">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Score Trend</h2>
          {stats.scoreTrend.length > 0 ? (
            <Line data={lineData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 10 } } }} />
          ) : (
            <p className="py-12 text-center text-sm text-slate-400">Complete interviews to see your score trend</p>
          )}
        </div>

        <div className="rounded-2xl border border-white/80 bg-white/90 p-6 shadow-[0_12px_30px_rgba(2,40,58,0.08)] backdrop-blur">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">ATS Score</h2>
          {stats.atsScore > 0 ? (
            <Doughnut
              data={doughnutData}
              options={{ cutout: '70%', plugins: { legend: { display: false } } }}
            />
          ) : (
            <p className="py-12 text-center text-sm text-slate-400">Upload a resume to see your ATS score</p>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-2xl border border-white/80 bg-white/90 p-6 shadow-[0_12px_30px_rgba(2,40,58,0.08)] backdrop-blur">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Recent Interview Activity</h2>
        {stats.recentSessions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500">
                  <th className="pb-3 font-medium">Role</th>
                  <th className="pb-3 font-medium">Difficulty</th>
                  <th className="pb-3 font-medium">Score</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {stats.recentSessions.map((s, i) => (
                  <tr key={i} className="text-slate-700">
                    <td className="py-3 font-medium">{s.role}</td>
                    <td className="py-3">{s.difficulty}</td>
                    <td className="py-3">{typeof s.averageScore === 'number' ? s.averageScore.toFixed(1) : '—'}/10</td>
                    <td className="py-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          s.status === 'Completed'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 text-slate-400">
                      {s.completedAt ? new Date(s.completedAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-slate-400">No interview sessions yet. Start your first one!</p>
        )}
      </div>
    </div>
  );
}
