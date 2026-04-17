import { useState, useEffect } from 'react';
import ResumeUpload from '../components/ResumeUpload';
import LoadingSpinner from '../components/LoadingSpinner';
import { uploadResume, getMyResumes, getDetailedAnalysis } from '../services/resumeService';
import toast from 'react-hot-toast';
import { emitDataUpdated, onDataUpdated } from '../utils/dataEvents';

export default function ResumeAnalyzer() {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [loadingResumes, setLoadingResumes] = useState(true);
  const [detailedView, setDetailedView] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [selectedResumeId, setSelectedResumeId] = useState(null);

  useEffect(() => {
    const fetchResumes = () => {
      setLoadingResumes(true);
      getMyResumes()
        .then(setResumes)
        .catch(() => {})
        .finally(() => setLoadingResumes(false));
    };

    fetchResumes();
    const unsubscribe = onDataUpdated(fetchResumes);
    return unsubscribe;
  }, []);

  const handleUpload = async (file) => {
    setLoading(true);
    setAnalysis(null);
    try {
      const data = await uploadResume(file);
      setAnalysis(data);
      setResumes((prev) => [{ resumeId: data.resumeId, fileName: data.fileName, atsScore: data.atsScore, createdAt: data.createdAt }, ...prev]);
      emitDataUpdated('resume-upload');
      toast.success('Resume analyzed successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetailed = async (resumeId) => {
    setSelectedResumeId(resumeId);
    setDetailedView(null);
    setLoadingDetail(true);
    try {
      const data = await getDetailedAnalysis(resumeId);
      setDetailedView(data);
    } catch {
      toast.error('Failed to load detailed analysis');
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="rounded-3xl bg-gradient-to-r from-sky-700 via-cyan-700 to-teal-600 px-6 py-7 text-white shadow-[0_16px_40px_rgba(2,40,58,0.22)] lg:px-8">
        <h1 className="text-2xl font-bold">Resume Analyzer</h1>
        <p className="mt-1 text-sm text-cyan-50/90">Upload your resume for AI-powered ATS analysis and instant feedback</p>
      </div>

      <ResumeUpload onUpload={handleUpload} loading={loading} />

      {/* Analysis Results */}
      {analysis && (
        <div className="space-y-6">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/80 bg-white/90 p-6 text-center shadow-[0_12px_30px_rgba(2,40,58,0.08)] backdrop-blur">
              <p className="text-sm text-slate-500">ATS Score</p>
              <p className={`mt-1 text-4xl font-bold ${analysis.atsScore >= 70 ? 'text-green-600' : analysis.atsScore >= 40 ? 'text-amber-500' : 'text-rose-500'}`}>
                {analysis.atsScore}%
              </p>
            </div>
            <div className="rounded-2xl border border-white/80 bg-white/90 p-6 shadow-[0_12px_30px_rgba(2,40,58,0.08)] backdrop-blur sm:col-span-1 lg:col-span-3">
              <p className="text-sm font-medium text-slate-500">File</p>
              <p className="text-sm text-slate-700">{analysis.fileName}</p>
            </div>
          </div>

          {/* Strengths */}
          {analysis.strengthAreas?.length > 0 && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
              <h3 className="mb-3 text-sm font-semibold text-green-800">Strengths</h3>
              <ul className="space-y-1.5">
                {analysis.strengthAreas.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-green-700">
                    <span className="mt-0.5">✓</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Missing Skills */}
          {analysis.missingSkills?.length > 0 && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
              <h3 className="mb-3 text-sm font-semibold text-rose-800">Missing Skills</h3>
              <div className="flex flex-wrap gap-2">
                {analysis.missingSkills.map((s, i) => (
                  <span key={i} className="rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-700">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {analysis.improvementSuggestions?.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
              <h3 className="mb-3 text-sm font-semibold text-amber-800">Improvement Suggestions</h3>
              <ul className="space-y-1.5">
                {analysis.improvementSuggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-amber-700">
                    <span className="mt-0.5">💡</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Previous Resumes */}
      <div className="rounded-2xl border border-white/80 bg-white/90 p-6 shadow-[0_12px_30px_rgba(2,40,58,0.08)] backdrop-blur">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Previous Resumes</h2>
        {loadingResumes ? (
          <LoadingSpinner size="sm" />
        ) : resumes.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500">
                  <th className="pb-3 font-medium">File</th>
                  <th className="pb-3 font-medium">ATS Score</th>
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {resumes.map((r) => (
                  <tr key={r.resumeId} className="text-slate-700">
                    <td className="py-3 font-medium">{r.fileName}</td>
                    <td className="py-3">{r.atsScore}%</td>
                    <td className="py-3 text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td className="py-3">
                      <button
                        onClick={() => handleViewDetailed(r.resumeId)}
                        className="text-sky-700 hover:text-sky-600 text-xs font-medium"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-slate-400">No resumes uploaded yet</p>
        )}
      </div>

      {/* Detailed Analysis Modal */}
      {selectedResumeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-8 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Detailed Analysis</h2>
              <button
                onClick={() => {
                  setSelectedResumeId(null);
                  setDetailedView(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-xl"
              >
                ✕
              </button>
            </div>
            {loadingDetail ? (
              <LoadingSpinner />
            ) : (
              <div className="space-y-4 text-sm text-slate-700">
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="font-medium">Words:</span> {detailedView.wordCount}</div>
                  <div><span className="font-medium">Characters:</span> {detailedView.characterCount}</div>
                  <div><span className="font-medium">Sections:</span> {detailedView.sectionCount}</div>
                  <div><span className="font-medium">Format Score:</span> {detailedView.formatScore}%</div>
                  <div><span className="font-medium">Readability:</span> {detailedView.readabilityScore}%</div>
                  <div><span className="font-medium">Experience:</span> {detailedView.experienceLevel}</div>
                  <div><span className="font-medium">Action Verbs:</span> {detailedView.actionVerbCount}</div>
                  <div><span className="font-medium">Achievements:</span> {detailedView.quantifiableAchievementCount}</div>
                </div>
                {detailedView.recommendations?.length > 0 && (
                  <div>
                    <h3 className="mb-2 font-semibold text-slate-800">Recommendations</h3>
                    <ul className="list-disc space-y-1 pl-5">
                      {detailedView.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
