import { useState, useEffect } from 'react';
import InterviewQuestion from '../components/InterviewQuestion';
import LoadingSpinner from '../components/LoadingSpinner';
import { startSession, submitAnswer, getActiveSession, endSession } from '../services/interviewService';
import toast from 'react-hot-toast';

const ROLES = ['Java', '.NET', 'Backend', 'Fullstack', 'Frontend', 'DevOps'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

export default function Interview() {
  const [phase, setPhase] = useState('setup'); // setup | active | report
  const [role, setRole] = useState('Backend');
  const [difficulty, setDifficulty] = useState('Medium');
  const [questionCount, setQuestionCount] = useState(5);
  const [starting, setStarting] = useState(false);

  // Active session state
  const [session, setSession] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentNumber, setCurrentNumber] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(5);
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  // Report state
  const [report, setReport] = useState(null);

  // Check for active session on mount
  useEffect(() => {
    getActiveSession()
      .then((data) => {
        if (data && data.sessionId) {
          setSession(data);
          setCurrentQuestion(data.currentQuestion);
          setCurrentNumber(data.currentQuestionIndex + 1);
          setTotalQuestions(data.totalQuestions);
          setPhase('active');
        }
      })
      .catch(() => {});
  }, []);

  const handleStart = async () => {
    setStarting(true);
    try {
      const data = await startSession(role, questionCount, difficulty);
      setSession(data);
      setCurrentQuestion(data.firstQuestion);
      setCurrentNumber(1);
      setTotalQuestions(data.totalQuestions);
      setPhase('active');
      toast.success('Interview started!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start session');
    } finally {
      setStarting(false);
    }
  };

  const handleSubmitAnswer = async () => {
    setSubmitting(true);
    try {
      const data = await submitAnswer(session.sessionId, answer);
      setResult(data);

      if (data.isSessionComplete) {
        setTimeout(() => {
          setReport({
            sessionId: session.sessionId,
            overallScore: data.score,
            technicalAccuracy: data.technicalAccuracy,
            communicationClarity: data.communicationClarity,
            suggestions: data.suggestions,
          });
          setPhase('report');
        }, 2000);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit answer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    if (result?.nextQuestion) {
      setCurrentQuestion(result.nextQuestion);
      setCurrentNumber((n) => n + 1);
      setAnswer('');
      setResult(null);
    }
  };

  const handleEnd = async () => {
    try {
      const data = await endSession(session.sessionId);
      setReport(data);
      setPhase('report');
    } catch {
      toast.error('Failed to end session');
    }
  };

  const handleNewSession = () => {
    setPhase('setup');
    setSession(null);
    setCurrentQuestion('');
    setAnswer('');
    setResult(null);
    setReport(null);
    setCurrentNumber(1);
  };

  // ── Setup Phase ──
  if (phase === 'setup') {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Interview Simulator</h1>
          <p className="mt-1 text-sm text-slate-500">Practice with AI-powered technical interviews</p>
        </div>

        <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="mb-6 text-lg font-semibold text-slate-800">Configure Your Interview</h2>
          <div className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Select Role</label>
              <div className="grid grid-cols-3 gap-2">
                {ROLES.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRole(r)}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      role === r
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Difficulty</label>
              <div className="grid grid-cols-3 gap-2">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      difficulty === d
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Number of Questions: {questionCount}
              </label>
              <input
                type="range"
                min={3}
                max={15}
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
              <div className="flex justify-between text-xs text-slate-400">
                <span>3</span>
                <span>15</span>
              </div>
            </div>

            <button
              onClick={handleStart}
              disabled={starting}
              className="w-full rounded-lg bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {starting ? 'Generating Questions...' : 'Start Interview'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Active Phase ──
  if (phase === 'active') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Interview in Progress</h1>
            <p className="mt-1 text-sm text-slate-500">
              {session?.role} · {session?.difficulty || difficulty}
            </p>
          </div>
          <button
            onClick={handleEnd}
            className="rounded-lg border border-rose-200 px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50"
          >
            End Session
          </button>
        </div>

        <InterviewQuestion
          questionNumber={currentNumber}
          totalQuestions={totalQuestions}
          question={currentQuestion}
          answer={answer}
          onAnswerChange={setAnswer}
          onSubmit={handleSubmitAnswer}
          loading={submitting}
          result={result}
        />

        {result && !result.isSessionComplete && (
          <div className="flex justify-end">
            <button
              onClick={handleNext}
              className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Next Question →
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Report Phase ──
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Interview Complete!</h1>
        <p className="mt-1 text-sm text-slate-500">Here's your performance summary</p>
      </div>

      {report ? (
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Overall Score */}
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-slate-500">Overall Score</p>
            <p className={`mt-2 text-6xl font-bold ${
              (report.overallScore || 0) >= 7 ? 'text-green-600' : (report.overallScore || 0) >= 4 ? 'text-amber-500' : 'text-rose-500'
            }`}>
              {report.overallScore?.toFixed?.(1) || '—'}<span className="text-2xl text-slate-400">/10</span>
            </p>
            {report.performanceGrade && (
              <span className="mt-3 inline-block rounded-full bg-indigo-100 px-4 py-1 text-sm font-semibold text-indigo-700">
                Grade: {report.performanceGrade}
              </span>
            )}
          </div>

          {/* Details */}
          {report.strengthAreas?.length > 0 && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-6">
              <h3 className="mb-2 text-sm font-semibold text-green-800">Strengths</h3>
              <ul className="list-disc space-y-1 pl-5 text-sm text-green-700">
                {report.strengthAreas.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}

          {report.improvementAreas?.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
              <h3 className="mb-2 text-sm font-semibold text-amber-800">Areas to Improve</h3>
              <ul className="list-disc space-y-1 pl-5 text-sm text-amber-700">
                {report.improvementAreas.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}

          {report.overallFeedback && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-2 text-sm font-semibold text-slate-800">Overall Feedback</h3>
              <p className="text-sm text-slate-600">{report.overallFeedback}</p>
            </div>
          )}

          <button
            onClick={handleNewSession}
            className="w-full rounded-lg bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Start New Interview
          </button>
        </div>
      ) : (
        <LoadingSpinner message="Loading report..." />
      )}
    </div>
  );
}
