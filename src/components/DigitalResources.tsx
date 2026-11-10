import React, { useState } from 'react';
import {
  Video,
  Play,
  FileText,
  Eye,
  Clock,
  Plus,
  ExternalLink,
  BookOpen,
  X,
  Share2
} from 'lucide-react';
import { DigitalResource } from '../types';
import { pushAllDataToFirestore } from '../firebase';

interface DigitalResourcesProps {
  resources: DigitalResource[];
  setResources: React.Dispatch<React.SetStateAction<DigitalResource[]>>;
  isAdmin?: boolean;
}

export const DigitalResources: React.FC<DigitalResourcesProps> = ({
  resources,
  setResources,
  isAdmin = true,
}) => {
  const [selectedGrade, setSelectedGrade] = useState<number | 'all'>('all');
  const [activeVideo, setActiveVideo] = useState<DigitalResource | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // New resource form state
  const [newTitle, setNewTitle] = useState('');
  const [newGrade, setNewGrade] = useState(3);
  const [newSubject, setNewSubject] = useState('Tin học 3 - Kết nối tri thức');
  const [newDuration, setNewDuration] = useState('15:00');
  const [newDescription, setNewDescription] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');

  const filteredResources = resources.filter(
    (res) => selectedGrade === 'all' || res.grade === selectedGrade
  );

  const handleAddResource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newRes: DigitalResource = {
      id: `res_${Date.now()}`,
      grade: newGrade,
      title: newTitle.trim(),
      lessonNumber: `Bài mới`,
      subject: newSubject,
      duration: newDuration || '10:00',
      videoUrl: newVideoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      description: newDescription || 'Video bài giảng minh họa phục vụ giảng dạy trên lớp.',
      thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80',
      views: 1,
      materialsCount: 2
    };

    const updated = [newRes, ...resources];
    setResources(updated);
    localStorage.setItem('qllh_digital_resources', JSON.stringify(updated));
    pushAllDataToFirestore().catch(() => {});

    setShowAddModal(false);
    setNewTitle('');
    setNewDescription('');
    setNewVideoUrl('');
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md">
              Kho học liệu điện tử
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500">Video bài giảng Khối 1 - 5</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mt-1">Học liệu số</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý liên kết video bài giảng, giáo án điện tử theo từng khối lớp
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm liên kết video mới</span>
          </button>
        )}
      </div>

      {/* Grade Selector Tabs */}
      <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-2xs overflow-x-auto">
        {(['all', 1, 2, 3, 4, 5] as const).map((grade) => (
          <button
            key={String(grade)}
            onClick={() => setSelectedGrade(grade)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              selectedGrade === grade
                ? 'bg-purple-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {grade === 'all' ? 'Tất cả các khối' : `Khối lớp ${grade}`}
          </button>
        ))}
        <span className="text-xs text-slate-400 ml-auto mr-3 hidden sm:inline">
          {filteredResources.length} video bài giảng
        </span>
      </div>

      {/* Resources Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredResources.map((res) => (
          <div
            key={res.id}
            className="group bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md hover:border-purple-300 transition-all overflow-hidden flex flex-col justify-between"
          >
            <div>
              {/* Thumbnail with overlay duration */}
              <div
                onClick={() => setActiveVideo(res)}
                className="relative aspect-video w-full bg-slate-900 overflow-hidden cursor-pointer"
              >
                <img
                  src={res.thumbnail}
                  alt={res.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-white/90 text-purple-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Play className="w-5 h-5 fill-purple-600 ml-0.5" />
                  </div>
                </div>
                <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded bg-black/70 text-white font-mono text-[11px] font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{res.duration}</span>
                </div>
                <div className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-purple-600/90 text-white text-[11px] font-bold">
                  Khối {res.grade}
                </div>
              </div>

              {/* Information */}
              <div className="p-4 space-y-2">
                <span className="text-[11px] font-medium text-purple-600">
                  {res.subject}
                </span>
                <h4
                  onClick={() => setActiveVideo(res)}
                  className="font-bold text-slate-900 text-sm line-clamp-1 hover:text-purple-600 cursor-pointer"
                >
                  {res.title}
                </h4>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {res.description}
                </p>
              </div>
            </div>

            {/* Bottom Meta */}
            <div className="px-4 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                <span>{res.views.toLocaleString()} lượt xem</span>
              </span>
              <button
                onClick={() => setActiveVideo(res)}
                className="text-purple-600 hover:text-purple-700 font-semibold flex items-center gap-1"
              >
                <span>Xem bài giảng</span>
                <Play className="w-3 h-3 fill-purple-600" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Video Player Modal */}
      {activeVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded bg-purple-600 text-xs font-bold">
                  Khối {activeVideo.grade}
                </span>
                <h3 className="font-bold text-sm sm:text-base truncate max-w-md">
                  {activeVideo.title}
                </h3>
              </div>
              <button
                onClick={() => setActiveVideo(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Player Frame */}
            <div className="aspect-video bg-black w-full flex items-center justify-center relative">
              {activeVideo.videoUrl ? (
                <video
                  src={activeVideo.videoUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-white text-center p-6">
                  <Play className="w-12 h-12 mx-auto mb-2 text-purple-400" />
                  <p>Trình phát video bài giảng đang kết nối...</p>
                </div>
              )}
            </div>

            {/* Video details & teacher attachments */}
            <div className="p-6 space-y-4 bg-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h4 className="font-bold text-slate-800 text-lg">{activeVideo.title}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{activeVideo.subject}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-medium">
                    {activeVideo.duration} phút
                  </span>
                  <span className="text-xs bg-purple-50 text-purple-700 px-3 py-1 rounded-full font-medium">
                    {activeVideo.materialsCount} tài liệu đính kèm
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {activeVideo.description}
              </p>

              {/* Lesson links / worksheets for students */}
              <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-purple-800 font-semibold">
                  <FileText className="w-4 h-4 text-purple-600" />
                  <span>Phiếu bài tập thực hành & Giáo án điện tử đính kèm</span>
                </div>
                <button
                  onClick={() => alert('Đang tải phiếu bài tập và slide bài giảng về máy tính...')}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                >
                  Tải tài liệu PDF / PowerPoint
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add New Resource Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold text-slate-800 text-base">Thêm video bài giảng mới</h3>
            <form onSubmit={handleAddResource} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Tên bài giảng</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Bài 3: Khám phá thế giới đa phương tiện"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Khối lớp</label>
                  <select
                    value={newGrade}
                    onChange={(e) => setNewGrade(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                  >
                    {[1, 2, 3, 4, 5].map((g) => (
                      <option key={g} value={g}>
                        Khối {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Thời lượng (phút)</label>
                  <input
                    type="text"
                    value={newDuration}
                    onChange={(e) => setNewDuration(e.target.value)}
                    placeholder="12:30"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Bộ môn / Bộ sách</label>
                <input
                  type="text"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Đường dẫn Video (URL)</label>
                <input
                  type="text"
                  placeholder="https://... hoặc link bài giảng"
                  value={newVideoUrl}
                  onChange={(e) => setNewVideoUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Tóm tắt nội dung bài học</label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Kiến thức trọng tâm..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Lưu học liệu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
