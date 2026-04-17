import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QuestionCard from '../components/QuestionCard';
import EvaluationCard from '../components/EvaluationCard';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  startSession,
  submitSimulatorAnswer,
  getActiveSession,
  getSessionReport,
  endSession,
} from '../services/interviewService';
import toast from 'react-hot-toast';
import { emitDataUpdated } from '../utils/dataEvents';

const ROLES = [
  {
    key: 'Backend Developer',
    label: 'Backend Developer',
    icon: '⚙️',
    desc: 'APIs, databases, server-side logic',
  },
  {
    key: 'Java Developer',
    label: 'Java Developer',
    icon: '☕',
    desc: 'Spring Boot, JVM, enterprise Java',
  },
  {
    key: 'Python Developer',
    label: 'Python Developer',
    icon: '🐍',
    desc: 'FastAPI, MongoDB, async APIs',
  },
  {
    key: 'Full Stack Developer',
    label: 'Full Stack Developer',
    icon: '🚀',
    desc: 'Frontend + Backend + DevOps',
  },
];

export default function Interview() {
  const navigate = useNavigate();

  // Phase: 'select' | 'answering' | 'evaluation' | 'results'
  const [phase, setPhase] = useState('select');

  // Session data
  const [selectedRole, setSelectedRole] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [restoringSession, setRestoringSession] = useState(true);

  // Per-question evaluation
  const [submitting, setSubmitting] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [loadingResults, setLoadingResults] = useState(false);

  // All results for summary
  const [results, setResults] = useState([]);
  const [report, setReport] = useState(null);

  useEffect(() => {
    const restore = async () => {
      try {
        const active = await getActiveSession();
        if (active?.sessionId && active?.currentQuestion) {
          setSessionId(active.sessionId);
          setSelectedRole(active.role || 'Interview Session');
          setCurrentQuestion(active.currentQuestion);
          setCurrentIndex(active.currentQuestionIndex || 0);
          setTotalQuestions(active.totalQuestions || 0);
          setPhase('answering');
          toast('Resumed your active interview session', { icon: '🔄' });
        }
      } catch {
        // No active session is fine.
      } finally {
        setRestoringSession(false);
      }
    };

    restore();
  }, []);

  // ── Role Selection ──
  const handleSelectRole = async (role) => {
    setSelectedRole(role);
    setLoadingQuestions(true);
    try {
      const data = await startSession(role, 5, 'Medium', 'Mixed');
      setSessionId(data.sessionId);
      setCurrentQuestion(data.firstQuestion || '');
      setTotalQuestions(data.totalQuestions || 5);
      setCurrentIndex(0);
      setReport(null);
      setResults([]);
      setPhase('answering');
      toast.success(`Starting ${role} interview`);
    } catch {
      toast.error('Could not start interview session');
    } finally {
      setLoadingQuestions(false);
    }
  };

  // ── Submit Answer ──
  const handleSubmitAnswer = async (answer) => {
    setSubmitting(true);
    try {
      const data = await submitSimulatorAnswer(sessionId, answer);
      setEvaluation(data);
      setResults((prev) => [
        ...prev,
        {
          question: data.question,
          score: data.score,
          technicalAccuracy: data.technicalAccuracy,
          communicationClarity: data.communicationClarity,
          depthOfKnowledge: data.depthOfKnowledge,
          suggestions: data.suggestions,
          exampleImprovement: data.exampleImprovement,
          userAnswer: answer,
        },
      ]);
      emitDataUpdated('interview-answer');
      setPhase('evaluation');
    } catch {
      toast.error('Failed to evaluate answer. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Next Question or Results ──
  const handleNext = async () => {
    if (evaluation?.isSessionComplete) {
      setLoadingResults(true);
      try {
        const sessionReport = await getSessionReport(sessionId);
        setReport(sessionReport);
      } catch {
        // Keep local results fallback.
      } finally {
        setLoadingResults(false);
        setPhase('results');
      }
      return;
    }

    setCurrentIndex((i) => i + 1);
    setCurrentQuestion(evaluation?.nextQuestion || '');
    setEvaluation(null);
    setPhase('answering');
  };

  // ── Restart ──
  const resetState = () => {
    setPhase('select');
    setSelectedRole('');
    setSessionId('');
    setCurrentQuestion('');
    setTotalQuestions(0);
    setCurrentIndex(0);
    setEvaluation(null);
    setResults([]);
    setReport(null);
  };

  const handleRestart = async () => {
    if (sessionId) {
      try {
        await endSession(sessionId);
        emitDataUpdated('interview-ended');
      } catch {
        // Ignore end errors on manual reset.
      }
    }
    resetState();
  };

  // ── Summary calculations ──
  const normalizedResults = report?.questionResults?.length
    ? report.questionResults.map((r) => ({
        question: r.question,
        score: r.score,
        technicalAccuracy: r.technicalAccuracy,
        communicationClarity: r.communicationClarity,
        depthOfKnowledge: r.depthOfKnowledge,
        suggestions: r.suggestions,
      }))
    : results;

  const totalScore = normalizedResults.reduce((sum, r) => sum + (r.score || 0), 0);
  const avgScore = normalizedResults.length > 0
    ? (report?.overallScore ?? (totalScore / normalizedResults.length))
    : 0;
  const strongAnswers = normalizedResults.filter((r) => r.score >= 7);
  const weakAnswers = normalizedResults.filter((r) => r.score < 5);

  if (restoringSession) {
    return <LoadingSpinner size="lg" message="Restoring interview session..." />;
  }

  // ── PHASE: Role Selection ──
  if (phase === 'select') {
    return (
      <div className="space-y-8">
        <div className="rounded-3xl bg-gradient-to-r from-sky-700 via-cyan-700 to-teal-600 px-6 py-7 text-white shadow-[0_16px_40px_rgba(2,40,58,0.22)] lg:px-8">
          <h1 className="text-2xl font-bold">Interview Simulator</h1>
          <p className="mt-1 text-sm text-cyan-50/90">
            Select a role to start your interview session
          </p>
        </div>

        {loadingQuestions ? (
          <LoadingSpinner size="lg" message="Generating interview questions..." />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {ROLES.map((r) => (
              <button
                key={r.key}
                onClick={() => handleSelectRole(r.key)}
                className="group rounded-3xl border border-white/80 bg-white/90 p-6 text-left shadow-[0_12px_30px_rgba(2,40,58,0.08)] transition-all hover:border-cyan-300 hover:shadow-md"
              >
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-50 text-2xl transition-colors group-hover:bg-cyan-100">
                  {r.icon}
                </div>
                <h3 className="text-lg font-semibold text-slate-800 group-hover:text-sky-700">
                  {r.label}
                </h3>
                <p className="mt-1 text-sm text-slate-500">{r.desc}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── PHASE: Question Answering ──
  if (phase === 'answering') {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Interview in Progress</h1>
            <p className="mt-1 text-sm text-slate-500">{selectedRole}</p>
          </div>
          <button
            onClick={handleRestart}
            className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
          >
            End Interview
          </button>
        </div>

        <QuestionCard
          key={currentIndex}
          questionNumber={currentIndex + 1}
          totalQuestions={totalQuestions}
          question={currentQuestion}
          onSubmit={handleSubmitAnswer}
          loading={submitting}
        />
      </div>
    );
  }

  // ── PHASE: Evaluation ──
  if (phase === 'evaluation') {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Answer Evaluation</h1>
          <p className="mt-1 text-sm text-slate-500">
            Question {currentIndex + 1} of {totalQuestions} · {selectedRole}
          </p>
        </div>

        {/* Show the question that was answered */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-5">
          <p className="text-sm font-medium text-slate-500">Question</p>
          <p className="mt-1 text-base font-medium text-slate-800">
            {evaluation?.question || currentQuestion}
          </p>
        </div>

        <EvaluationCard
          score={evaluation.score}
          technicalAccuracy={evaluation.technicalAccuracy}
          communicationClarity={evaluation.communicationClarity}
          depthOfKnowledge={evaluation.depthOfKnowledge}
          suggestions={evaluation.suggestions}
          exampleImprovement={evaluation.exampleImprovement}
          onNext={handleNext}
          isLastQuestion={!!evaluation?.isSessionComplete}
        />
      </div>
    );
  }

  // ── PHASE: Results Summary ──
  if (loadingResults) {
    return <LoadingSpinner size="lg" message="Preparing session report..." />;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-900">Interview Complete! 🎉</h1>
        <p className="mt-2 text-sm text-slate-500">
          {selectedRole} · {normalizedResults.length} questions answered
        </p>
      </div>

      {report?.overallFeedback && (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5 text-sm text-sky-800">
          {report.overallFeedback}
        </div>
      )}

      {/* Score overview */}
      <div className="grid gap-5 sm:grid-cols-3">
        <div className="rounded-3xl border border-white/80 bg-white/90 p-6 text-center shadow-[0_12px_30px_rgba(2,40,58,0.08)] backdrop-blur">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Total Score</p>
          <p className="mt-2 text-4xl font-extrabold text-indigo-600">{totalScore}</p>
          <p className="text-sm text-slate-400">out of {normalizedResults.length * 10}</p>
        </div>
        <div className="rounded-3xl border border-white/80 bg-white/90 p-6 text-center shadow-[0_12px_30px_rgba(2,40,58,0.08)] backdrop-blur">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Average Score</p>
          <p className={`mt-2 text-4xl font-extrabold ${avgScore >= 7 ? 'text-green-600' : avgScore >= 4 ? 'text-amber-500' : 'text-rose-500'}`}>
            {avgScore.toFixed(1)}
          </p>
          <p className="text-sm text-slate-400">out of 10</p>
        </div>
        <div className="rounded-3xl border border-white/80 bg-white/90 p-6 text-center shadow-[0_12px_30px_rgba(2,40,58,0.08)] backdrop-blur">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Performance</p>
          <p className="mt-2 text-4xl font-extrabold text-indigo-600">
            {avgScore >= 8 ? 'A' : avgScore >= 6 ? 'B' : avgScore >= 4 ? 'C' : 'D'}
          </p>
          <p className="text-sm text-slate-400">grade</p>
        </div>
      </div>

      {/* Strength areas */}
      {strongAnswers.length > 0 && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-green-800">
            <span>💪</span> Strength Areas ({strongAnswers.length})
          </h3>
          <ul className="space-y-2">
            {strongAnswers.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-green-700">
                <span className="mt-0.5 font-bold">{r.score}/10</span>
                <span className="line-clamp-1">{r.question}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Weak areas */}
      {weakAnswers.length > 0 && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-rose-800">
            <span>📚</span> Areas to Improve ({weakAnswers.length})
          </h3>
          <ul className="space-y-2">
            {weakAnswers.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-rose-700">
                <span className="mt-0.5 font-bold">{r.score}/10</span>
                <span className="line-clamp-1">{r.question}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Question-by-question breakdown */}
      <div className="rounded-2xl border border-white/80 bg-white/90 p-6 shadow-[0_12px_30px_rgba(2,40,58,0.08)] backdrop-blur">
        <h3 className="mb-4 text-lg font-semibold text-slate-800">Question Breakdown</h3>
        <div className="space-y-3">
          {normalizedResults.map((r, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700">
                  {i + 1}
                </span>
                <span className="line-clamp-1 text-sm text-slate-700">{r.question}</span>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  r.score >= 7
                    ? 'bg-green-100 text-green-700'
                    : r.score >= 4
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-rose-100 text-rose-700'
                }`}
              >
                {r.score}/10
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-4">
        <button
          onClick={handleRestart}
          className="flex-1 rounded-xl bg-gradient-to-r from-cyan-600 to-sky-700 py-3 text-sm font-semibold text-white transition hover:brightness-105"
        >
          Start New Interview
        </button>
        <button
          onClick={() => navigate('/dashboard')}
          className="flex-1 rounded-lg border border-slate-300 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
}
