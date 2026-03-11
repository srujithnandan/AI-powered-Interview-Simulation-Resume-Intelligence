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

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, RadialLinearScale, Tooltip, Legend, Filler);

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [trends, setTrends] = useState(null);
  const [readiness, setReadiness] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [t, r] = await Promise.allSettled([getTrends(), getReadiness()]);
        if (t.status === 'fulfilled') setTrends(t.value);
        if (r.status === 'fulfilled') setReadiness(r.value);
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <LoadingSpinner size="lg" message="Loading analytics..." />;

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
      new Date(t.completedAt).toLocaleDateString()
    ),
    datasets: [
      {
        label: 'Score',
        data: (trends?.recentTrends || []).map((t) => t.overallScore),
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  // Skill gaps radar
  const skillLabels = (trends?.skillGaps || []).map((s) => s.skill || s.area || 'Unknown');
  const skillScores = (trends?.skillGaps || []).map((s) => s.score || s.averageScore || 0);
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        <p className="mt-1 text-sm text-slate-500">Track your interview performance and identify areas for growth</p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Total Sessions" value={trends?.totalSessions ?? 0} />
        <SummaryCard label="Questions Answered" value={trends?.totalQuestionsAnswered ?? 0} />
        <SummaryCard label="Average Score" value={`${(trends?.overallAverageScore ?? 0).toFixed(1)}/10`} />
        <SummaryCard label="Readiness" value={readiness?.readinessLevel ?? '—'} />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Score Trend">
          {(trends?.recentTrends?.length || 0) > 0 ? (
            <Line data={trendData} options={{ responsive: true, scales: { y: { min: 0, max: 10 } }, plugins: { legend: { display: false } } }} />
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        <ChartCard title="Performance by Role">
          {(trends?.performanceByRole?.length || 0) > 0 ? (
            <Bar data={roleData} options={{ responsive: true, scales: { y: { min: 0, max: 10 } }, plugins: { legend: { display: false } } }} />
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        <ChartCard title="Skill Gaps">
          {skillLabels.length > 0 && skillLabels[0] !== 'N/A' ? (
            <Radar data={radarData} options={{ responsive: true, scales: { r: { min: 0, max: 10 } } }} />
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        {/* Readiness Summary */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-slate-800">Interview Readiness</h3>
          {readiness ? (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-5xl font-bold text-indigo-600">{readiness.overallReadinessScore}%</p>
                <p className="mt-1 text-sm text-slate-500">{readiness.readinessLevel}</p>
              </div>
              <p className="text-sm text-slate-600">{readiness.summary}</p>
              {readiness.topStrengths?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-green-700">Strengths</p>
                  <ul className="mt-1 list-disc pl-4 text-sm text-green-600">
                    {readiness.topStrengths.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
              {readiness.criticalGaps?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-rose-700">Gaps</p>
                  <ul className="mt-1 list-disc pl-4 text-sm text-rose-600">
                    {readiness.criticalGaps.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
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

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
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
