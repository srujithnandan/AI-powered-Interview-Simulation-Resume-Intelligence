import api from './api';

function normalizeListResponse(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.resumes)) return data.resumes;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

export const uploadResume = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('/resume/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const getMyResumes = async () => {
  const { data } = await api.get('/resume/my');
  return normalizeListResponse(data);
};

export const getDetailedAnalysis = async (resumeId) => {
  const { data } = await api.get(`/resume/${resumeId}/detailed-analysis`);
  return data;
};

export const getKeywordAnalysis = async (resumeId, keywords) => {
  const { data } = await api.post(`/resume/${resumeId}/keyword-analysis`, { keywords });
  return data;
};
