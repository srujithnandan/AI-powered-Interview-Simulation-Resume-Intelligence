import { useCallback, useState } from 'react';
import { HiOutlineCloudArrowUp, HiOutlineDocument } from 'react-icons/hi2';

export default function ResumeUpload({ onUpload, loading }) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFile = useCallback(
    (file) => {
      const allowed = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      if (!allowed.includes(file.type)) {
        alert('Please upload a PDF or DOCX file.');
        return;
      }
      setSelectedFile(file);
    },
    []
  );

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = () => {
    if (selectedFile && onUpload) onUpload(selectedFile);
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 transition-colors ${
          dragOver ? 'border-cyan-400 bg-cyan-50' : 'border-slate-300 bg-white/75'
        }`}
      >
        <HiOutlineCloudArrowUp className="mb-3 h-10 w-10 text-slate-500" />
        <p className="text-sm font-medium text-slate-600">Drag & drop your resume here</p>
        <p className="mb-4 text-xs text-slate-400">PDF or DOCX up to 10 MB</p>
        <label className="cursor-pointer rounded-xl bg-gradient-to-r from-cyan-600 to-sky-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:brightness-105">
          Browse Files
          <input
            type="file"
            accept=".pdf,.docx"
            className="hidden"
            onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
          />
        </label>
      </div>

      {selectedFile && (
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <HiOutlineDocument className="h-6 w-6 text-cyan-600" />
            <div>
              <p className="text-sm font-medium text-slate-700">{selectedFile.name}</p>
              <p className="text-xs text-slate-400">{(selectedFile.size / 1024).toFixed(1)} KB</p>
            </div>
          </div>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="rounded-xl bg-gradient-to-r from-cyan-600 to-sky-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:brightness-105 disabled:opacity-50"
          >
            {loading ? 'Analyzing...' : 'Analyze Resume'}
          </button>
        </div>
      )}
    </div>
  );
}
