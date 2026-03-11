import { useState } from 'react';

export default function QuestionCard({
  questionNumber,
  totalQuestions,
  question,
  onSubmit,
  loading,
}) {
  const [answer, setAnswer] = useState('');

  const handleSubmit = () => {
    if (!answer.trim()) return;
    onSubmit(answer);
  };

  const progress = (questionNumber / totalQuestions) * 100;

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-indigo-600">
          Question {questionNumber} / {totalQuestions}
        </span>
        <span className="text-xs text-slate-400">
          {Math.round(progress)}% complete
        </span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-slate-200">
        <div
          className="h-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Question card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-2 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-sm font-bold text-indigo-700">
            Q{questionNumber}
          </span>
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
            Interview Question
          </span>
        </div>
        <p className="text-lg font-semibold leading-relaxed text-slate-800">
          {question}
        </p>
      </div>

      {/* Answer textarea */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-slate-700">
          Your Answer
        </label>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={8}
          placeholder="Type your answer here... Be detailed and include examples where possible."
          className="w-full resize-none rounded-xl border border-slate-300 bg-white p-4 text-sm leading-relaxed text-slate-700 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {answer.length} characters
          </span>
          <button
            onClick={handleSubmit}
            disabled={loading || !answer.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Evaluating...
              </>
            ) : (
              'Submit Answer'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
