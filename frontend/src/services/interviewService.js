import api from './api';

// ── Interview Questions API (GET /api/interview/questions) ──

export const getQuestions = async (role, count = 5) => {
  const { data } = await api.get('/interview/questions', { params: { role, count } });
  return data;
};

export const submitAnswer = async (sessionId, question, answer) => {
  const { data } = await api.post('/interview/answer', { sessionId, question, answer });
  return data;
};

// ── Interview Simulator API ──

export const startSession = async (role, questionCount = 5, difficulty = 'Medium', category = 'Mixed') => {
  const { data } = await api.post('/interview/simulator/start', {
    role,
    questionCount,
    difficulty,
    category,
  });
  return data;
};

export const submitSimulatorAnswer = async (sessionId, answer) => {
  const { data } = await api.post('/interview/simulator/submit', { sessionId, answer });
  return data;
};

export const getActiveSession = async () => {
  const { data } = await api.get('/interview/simulator/active');
  return data;
};

export const getSessionReport = async (sessionId) => {
  const { data } = await api.get(`/interview/simulator/session/${sessionId}/report`);
  return data;
};

export const endSession = async (sessionId) => {
  const { data } = await api.post(`/interview/simulator/session/${sessionId}/end`);
  return data;
};

export const getHistory = async () => {
  const { data } = await api.get('/interview/simulator/history');
  return data;
};

export const getTrends = async () => {
  const { data } = await api.get('/interview/simulator/trends');
  return data;
};

export const getAnalytics = async () => {
  const { data } = await api.get('/interview/analytics');
  return data;
};

export const getReadiness = async () => {
  const { data } = await api.get('/interview/readiness');
  return data;
};
