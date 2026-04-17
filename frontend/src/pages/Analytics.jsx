import { useEffect, useState } from 'react';
import { Bar, Radar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  RadialLinearScale,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import LoadingSpinner from '../components/LoadingSpinner';
import { getTrends, getReadiness } from '../services/interviewService';
import { getMyResumes } from '../services/resumeService';
import { onDataUpdated } from '../utils/dataEvents';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, RadialLinearScale, Tooltip, Legend, Filler);

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [trends, setTrends] = useState(null);
  const [readiness, setReadiness] = useState(null);
  const [resumes, setResumes] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [t, r, rs] = await Promise.allSettled([getTrends(), getReadiness(), getMyResumes()]);
        if (t.status === 'fulfilled') setTrends(t.value);
        if (r.status === 'fulfilled') setReadiness(r.value);
        if (rs.status === 'fulfilled') setResumes(rs.value || []);
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    };
    load();
    const unsubscribe = onDataUpdated(load);
    return unsubscribe;
  }, []);

  if (loading) return <LoadingSpinner size="lg" message="Loading analytics..." />;

  const latestResume = resumes[0] || null;
  const avgAtsScore = resumes.length > 0
    ? resumes.reduce((sum, r) => sum + (r.atsScore || 0), 0) / resumes.length
    : 0;

  // Performance by Role bar chart
  const roleData = {
    labels: (trends?.performanceByRole || []).map((r) => r.role),
    datasets: [
      {
        label: 'Avg Score',
        data: (trends?.performanceByRole || []).map((r) => r.averageScore),
        backgroundColor: '#818cf8',
        borderRadius: 6,
      },
    ],
  };

  // Score trend line chart
  const trendData = {
    labels: (trends?.recentTrends || []).map((t) =>
      new Date(t.date || t.createdAt || Date.now()).toLocaleDateString()
    ),
    datasets: [
      {
        label: 'Score',
        data: (trends?.recentTrends || []).map((t) => t.averageScore || 0),
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  // Skill gaps radar
  const skillLabels = (trends?.performanceByRole || []).map((s) => s.role || 'Unknown');
  const skillScores = (trends?.performanceByRole || []).map((s) => s.averageScore || 0);
  const radarData = {
    labels: skillLabels.length > 0 ? skillLabels : ['N/A'],
    datasets: [
      {
        label: 'Skill Level',
        data: skillScores.length > 0 ? skillScores : [0],
        backgroundColor: 'rgba(99,102,241,0.2)',
        borderColor: '#6366f1',
        pointBackgroundColor: '#6366f1',
      },
    ],
  };

  const resumeTrendData = {
    labels: [...resumes]
      .reverse()
      .map((r) => new Date(r.createdAt).toLocaleDateString()),
    datasets: [
      {
        label: 'ATS Score',
        data: [...resumes].reverse().map((r) => r.atsScore || 0),
        borderColor: '#0f766e',
        backgroundColor: 'rgba(15,118,110,0.12)',
        tension: 0.35,
        fill: true,
      },
    ],
  };

  const resumeStrengths = readiness?.resume?.keyStrengths || [];
  const resumeMissing = readiness?.resume?.topMissingSkills || [];

  return (
    <div className="space-y-8">
      <div className="rounded-2xl bg-gradient-to-r from-indigo-600 via-sky-600 to-teal-600 p-6 text-white shadow-lg lg:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">Performance Control Center</p>
        <h1 className="mt-2 text-3xl font-extrabold">Analytics</h1>
        <p className="mt-2 text-sm text-white/90">
          Interview and resume intelligence in one place. Your session data and ATS progress stay connected.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-6">
        <SummaryCard label="Total Sessions" value={trends?.totalSessions ?? 0} accent="indigo" />
        <SummaryCard label="Questions" value={trends?.totalQuestionsAnswered ?? 0} accent="sky" />
        <SummaryCard label="Avg Interview" value={`${(trends?.overallAverageScore ?? 0).toFixed(1)}/10`} accent="violet" />
        <SummaryCard label="Resume Count" value={resumes.length} accent="teal" />
        <SummaryCard label="Latest ATS" value={latestResume ? `${latestResume.atsScore}%` : '—'} accent="emerald" />
        <SummaryCard label="Readiness" value={readiness?.readinessLevel ?? '—'} accent="amber" />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        <ChartCard title="Score Trend">
          {(trends?.recentTrends?.length || 0) > 0 ? (
            <Line data={trendData} options={{ responsive: true, scales: { y: { min: 0, max: 10 } }, plugins: { legend: { display: false } } }} />
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        <ChartCard title="ATS Trend">
          {resumes.length > 0 ? (
            <Line data={resumeTrendData} options={{ responsive: true, scales: { y: { min: 0, max: 100 } }, plugins: { legend: { display: false } } }} />
          ) : (
            <EmptyChart message="Upload a resume to see ATS trend" />
          )}
        </ChartCard>

        <ChartCard title="Performance by Role">
          {(trends?.performanceByRole?.length || 0) > 0 ? (
            <Bar data={roleData} options={{ responsive: true, scales: { y: { min: 0, max: 10 } }, plugins: { legend: { display: false } } }} />
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        <ChartCard title="Resume Snapshot">
          {latestResume ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Latest File</p>
                <p className="mt-1 line-clamp-1 text-sm font-medium text-slate-700">{latestResume.fileName}</p>
                <p className="mt-2 text-3xl font-extrabold text-teal-700">{latestResume.atsScore}%</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-emerald-50 p-3 text-center">
                  <p className="text-xs text-emerald-700">Best ATS</p>
                  <p className="text-xl font-bold text-emerald-800">{Math.max(...resumes.map((r) => r.atsScore || 0))}%</p>
                </div>
                <div className="rounded-lg bg-cyan-50 p-3 text-center">
                  <p className="text-xs text-cyan-700">Average ATS</p>
                  <p className="text-xl font-bold text-cyan-800">{avgAtsScore.toFixed(0)}%</p>
                </div>
              </div>
            </div>
          ) : (
            <EmptyChart message="No resume results yet" />
          )}
        </ChartCard>

        <ChartCard title="Skill Gaps">
          {skillLabels.length > 0 && skillLabels[0] !== 'N/A' ? (
            <Radar data={radarData} options={{ responsive: true, scales: { r: { min: 0, max: 10 } } }} />
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h3 className="mb-4 text-lg font-semibold text-slate-800">Interview Readiness</h3>
          {readiness ? (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-5xl font-bold text-indigo-600">{readiness.overallReadinessScore}%</p>
                <p className="mt-1 text-sm text-slate-500">{readiness.readinessLevel}</p>
              </div>
              <p className="text-sm text-slate-600">{readiness.summary}</p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                  <p className="text-xs font-semibold text-green-700">Top Strengths</p>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-green-700">
                    {(readiness.topStrengths || []).slice(0, 4).map((s, i) => (
                      <li key={i}>{s.detail || s.area || 'Strength identified'}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
                  <p className="text-xs font-semibold text-rose-700">Critical Gaps</p>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-rose-700">
                    {(readiness.criticalGaps || []).slice(0, 4).map((s, i) => (
                      <li key={i}>{s.detail || s.area || 'Gap identified'}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-teal-200 bg-teal-50 p-4">
                  <p className="text-xs font-semibold text-teal-700">Resume Strength Areas</p>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-teal-700">
                    {resumeStrengths.length > 0 ? resumeStrengths.slice(0, 5).map((s, i) => <li key={i}>{s}</li>) : <li>No resume strengths yet</li>}
                  </ul>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-semibold text-amber-700">Missing Skills</p>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-amber-700">
                    {resumeMissing.length > 0 ? resumeMissing.slice(0, 5).map((s, i) => <li key={i}>{s}</li>) : <li>No missing skills detected</li>}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <EmptyChart message="Complete interviews and upload a resume to see readiness" />
          )}
        </div>
      </div>

      {/* Recommendations */}
      {trends?.recommendations?.length > 0 && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-6">
          <h3 className="mb-3 text-sm font-semibold text-indigo-800">AI Recommendations</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-indigo-700">
            {trends.recommendations.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, accent = 'indigo' }) {
  const accentMap = {
    indigo: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    sky: 'border-sky-200 bg-sky-50 text-sky-700',
    violet: 'border-violet-200 bg-violet-50 text-violet-700',
    teal: 'border-teal-200 bg-teal-50 text-teal-700',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
  };

  return (
    <div className={`rounded-xl border p-5 shadow-sm ${accentMap[accent] || accentMap.indigo}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-extrabold">{value}</p>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-slate-800">{title}</h3>
      {children}
    </div>
  );
}

function EmptyChart({ message = 'Not enough data yet' }) {
  return <p className="py-12 text-center text-sm text-slate-400">{message}</p>;
}
