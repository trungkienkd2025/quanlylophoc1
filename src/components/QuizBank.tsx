import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Play,
  Plus,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  ArrowRight,
  ArrowLeft,
  X,
  Sparkles,
  BookOpen,
  FileSpreadsheet,
  Trash2,
  Search,
  Filter,
  Eye,
  Award,
  RefreshCw,
  Trophy,
  Check,
  Calendar
} from 'lucide-react';
import confetti from 'canvas-confetti';
import * as XLSX from 'xlsx';
import { QuizQuestion, QuizSubmission } from '../types';
import { soundManager } from '../utils/audio';
import { INITIAL_SUBMISSIONS } from '../data/mockData';
import { pushAllDataToFirestore } from '../firebase';

interface QuizBankProps {
  quizzes: QuizQuestion[];
  setQuizzes: React.Dispatch<React.SetStateAction<QuizQuestion[]>>;
  isAdmin?: boolean;
}

export const QuizBank: React.FC<QuizBankProps> = ({ quizzes, setQuizzes, isAdmin = true }) => {
  // Main sub-tabs in QuizBank: 'bank' (Ngân hàng câu hỏi) or 'scores' (Bảng điểm học sinh)
  const [activeSubTab, setActiveSubTab] = useState<'bank' | 'scores'>('bank');

  // Filter grade in bank: all or 1, 2, 3, 4, 5
  const [selectedGrade, setSelectedGrade] = useState<number | 'all'>('all');
  const [isPlayingMode, setIsPlayingMode] = useState(false);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(30);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Submissions State (Scores of students)
  const [submissions, setSubmissions] = useState<QuizSubmission[]>(() => {
    try {
      const saved = localStorage.getItem('qllh_quiz_submissions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Error reading quiz submissions:', e);
    }
    return INITIAL_SUBMISSIONS;
  });

  // Save submissions locally whenever updated
  useEffect(() => {
    localStorage.setItem('qllh_quiz_submissions', JSON.stringify(submissions));
  }, [submissions]);

  // Scores filter state
  const [scoreGradeFilter, setScoreGradeFilter] = useState<number | 'all'>('all');
  const [scoreClassFilter, setScoreClassFilter] = useState<string>('all');
  const [searchStudentName, setSearchStudentName] = useState('');
  const [selectedSubmissionDetail, setSelectedSubmissionDetail] = useState<QuizSubmission | null>(null);

  // New question form state
  const [newGrade, setNewGrade] = useState(4);
  const [newTopic, setNewTopic] = useState('Chủ đề: Kiến thức tin học');
  const [newQuestion, setNewQuestion] = useState('');
  const [newOptions, setNewOptions] = useState(['', '', '', '']);
  const [newCorrectIndex, setNewCorrectIndex] = useState(0);
  const [newExplanation, setNewExplanation] = useState('');

  const filteredQuizzes = quizzes.filter(
    (q) => selectedGrade === 'all' || q.grade === selectedGrade
  );

  const activeQuestion = filteredQuizzes[currentQuizIndex] || filteredQuizzes[0];

  // Timer countdown for classroom projector playing mode
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPlayingMode && isTimerActive && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            soundManager.playAlarm();
            setIsTimerActive(false);
            return 0;
          }
          if (prev <= 5) {
            soundManager.playTick();
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlayingMode, isTimerActive, timerSeconds]);

  const handleStartPlay = (startIndex = 0) => {
    setCurrentQuizIndex(startIndex);
    setSelectedOption(null);
    setIsAnswerRevealed(false);
    setTimerSeconds(30);
    setIsTimerActive(true);
    setIsPlayingMode(true);
  };

  const handleSelectOptionInPlay = (idx: number) => {
    if (isAnswerRevealed) return;
    setSelectedOption(idx);
  };

  const handleRevealAnswer = () => {
    setIsAnswerRevealed(true);
    setIsTimerActive(false);
    if (selectedOption === activeQuestion.correctIndex) {
      soundManager.playFanfare();
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });
    } else {
      soundManager.playTick();
    }
  };

  const handleNextQuestion = () => {
    if (currentQuizIndex < filteredQuizzes.length - 1) {
      setCurrentQuizIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswerRevealed(false);
      setTimerSeconds(30);
      setIsTimerActive(true);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuizIndex > 0) {
      setCurrentQuizIndex((prev) => prev - 1);
      setSelectedOption(null);
      setIsAnswerRevealed(false);
      setTimerSeconds(30);
      setIsTimerActive(true);
    }
  };

  const handleAddQuestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;

    const created: QuizQuestion = {
      id: `q_${Date.now()}`,
      grade: newGrade,
      subject: 'Tin học',
      topic: newTopic,
      question: newQuestion.trim(),
      options: newOptions.map((opt, i) => opt.trim() || `Đáp án ${String.fromCharCode(65 + i)}`),
      correctIndex: newCorrectIndex,
      explanation: newExplanation.trim() || 'Chúc mừng các em đã trả lời chính xác!'
    };

    setQuizzes((prev) => [created, ...prev]);
    setShowAddModal(false);
    setNewQuestion('');
    setNewOptions(['', '', '', '']);
    setNewExplanation('');
    soundManager.playFanfare();
  };

  const handleDeleteQuestion = (id: string) => {
    if (confirm('Thầy có chắc chắn muốn xóa câu hỏi này không?')) {
      setQuizzes((prev) => prev.filter((q) => q.id !== id));
      soundManager.playTick();
    }
  };

  // Delete a student's submission record
  const handleDeleteSubmission = (subId: string) => {
    if (confirm('Thầy có chắc chắn muốn xóa kết quả bài thi này của học sinh?')) {
      setSubmissions((prev) => prev.filter((s) => s.id !== subId));
      soundManager.playTick();
    }
  };

  // Filter student submissions
  const filteredSubmissions = submissions.filter((sub) => {
    if (scoreGradeFilter !== 'all' && sub.grade !== scoreGradeFilter) return false;
    if (scoreClassFilter !== 'all' && sub.className !== scoreClassFilter) return false;
    if (searchStudentName.trim()) {
      const q = searchStudentName.toLowerCase();
      if (!sub.studentName.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // Calculate distinct classes from submissions
  const availableClasses = Array.from(
    new Set(submissions.map((s) => s.className).filter(Boolean))
  );

  // Statistics
  const totalSubmissions = submissions.length;
  const avgScore =
    totalSubmissions > 0
      ? (submissions.reduce((acc, s) => acc + s.score, 0) / totalSubmissions).toFixed(1)
      : '0.0';
  const goodCount = submissions.filter((s) => s.score >= 9).length;
  const goodRate =
    totalSubmissions > 0 ? Math.round((goodCount / totalSubmissions) * 100) : 0;

  // Export submissions to Excel
  const handleExportToExcel = () => {
    if (filteredSubmissions.length === 0) {
      alert('Không có dữ liệu bài thi để xuất file!');
      return;
    }

    const exportRows = filteredSubmissions.map((sub, index) => {
      const classification =
        sub.score >= 9
          ? 'Hoàn thành Tốt (T)'
          : sub.score >= 5
          ? 'Hoàn thành (H)'
          : 'Chưa hoàn thành (C)';

      const mins = Math.floor(sub.durationSeconds / 60);
      const secs = sub.durationSeconds % 60;
      const durationStr = `${mins} phút ${secs} giây`;

      return {
        'STT': index + 1,
        'Họ và tên học sinh': sub.studentName,
        'Lớp': sub.className || 'Tự do',
        'Khối lớp': `Khối ${sub.grade}`,
        'Điểm số (Thang 10)': sub.score,
        'Số câu đúng': `${sub.correctAnswers}/${sub.totalQuestions}`,
        'Xếp loại': classification,
        'Thời gian làm bài': durationStr,
        'Thời gian nộp': sub.submittedAt
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ket_Qua_Trac_Nghiem');

    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `Bang_Diem_Trac_Nghiem_Tin_Hoc_${dateStr}.xlsx`);
    soundManager.playFanfare();
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Top Banner with Sub-Tab Navigation */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-md">
              Kiến thức tin học
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500 font-medium">Bộ sách Kết nối tri thức</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 mt-1 tracking-tight">
            Trắc nghiệm & Đánh giá học sinh
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý ngân hàng câu hỏi và theo dõi bảng điểm kiểm tra trực tuyến của học sinh
          </p>
        </div>

        {/* Sub-tab pills */}
        <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl gap-1 shrink-0">
          <button
            onClick={() => setActiveSubTab('bank')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'bank'
                ? 'bg-white text-emerald-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Ngân hàng câu hỏi ({quizzes.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('scores')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 relative ${
              activeSubTab === 'scores'
                ? 'bg-white text-sky-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>Bảng điểm học sinh thi</span>
            {submissions.length > 0 && (
              <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[10px] font-bold">
                {submissions.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SUB-TAB 1: NGÂN HÀNG CÂU HỎI TRẮC NGHIỆM */}
      {/* ======================================================== */}
      {activeSubTab === 'bank' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Action Bar & Grade filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
            {/* Grade selector buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {(['all', 1, 2, 3, 4, 5] as const).map((grade) => (
                <button
                  key={String(grade)}
                  onClick={() => {
                    setSelectedGrade(grade);
                    setCurrentQuizIndex(0);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    selectedGrade === grade
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {grade === 'all' ? 'Tất cả các khối' : `Khối lớp ${grade}`}
                </button>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleStartPlay(0)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Chiếu trắc nghiệm cho cả lớp</span>
              </button>

              {isAdmin && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm câu hỏi mới</span>
                </button>
              )}
            </div>
          </div>

          {/* Question Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredQuizzes.length === 0 ? (
              <div className="col-span-2 text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200">
                <p className="text-slate-400 text-sm">Chưa có câu hỏi nào cho khối lớp này.</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="mt-3 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl"
                >
                  + Thêm câu hỏi ngay
                </button>
              </div>
            ) : (
              filteredQuizzes.map((quiz, qIdx) => (
                <div
                  key={quiz.id}
                  className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs hover:border-emerald-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg">
                        Khối {quiz.grade}
                      </span>
                      <span className="truncate max-w-[200px] text-slate-500">{quiz.topic}</span>
                    </div>

                    <h4 className="font-bold text-slate-900 text-sm leading-snug">
                      <span className="text-emerald-600 mr-1.5">Câu {qIdx + 1}:</span>
                      {quiz.question}
                    </h4>

                    <div className="mt-3 space-y-1.5">
                      {quiz.options.map((opt, oIdx) => (
                        <div
                          key={oIdx}
                          className={`px-3 py-2 rounded-xl text-xs flex items-center justify-between ${
                            oIdx === quiz.correctIndex
                              ? 'bg-emerald-50/80 border border-emerald-300 text-emerald-900 font-semibold'
                              : 'bg-slate-50 text-slate-600'
                          }`}
                        >
                          <span>
                            <strong className="mr-2 text-slate-400">
                              {String.fromCharCode(65 + oIdx)}.
                            </strong>
                            {opt}
                          </span>
                          {oIdx === quiz.correctIndex && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-400 text-[11px] truncate max-w-[200px]">
                      {quiz.explanation}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleStartPlay(qIdx)}
                        className="text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Play className="w-3 h-3 fill-emerald-600" />
                        <span>Chiếu</span>
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteQuestion(quiz.id)}
                          className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                          title="Xóa câu hỏi"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 2: BẢNG ĐIỂM & LỊCH SỬ HỌC SINH THI TRẮC NGHIỆM */}
      {/* ======================================================== */}
      {activeSubTab === 'scores' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Tổng bài thi</span>
                <span className="p-2 rounded-xl bg-blue-50 text-blue-600">📝</span>
              </div>
              <p className="text-2xl font-black text-slate-900 mt-2">{totalSubmissions}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Lượt học sinh đã nộp</p>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Điểm trung bình</span>
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">🎯</span>
              </div>
              <p className="text-2xl font-black text-emerald-600 mt-2">{avgScore} / 10</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Thang điểm 10</p>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Đạt Tốt (T)</span>
                <span className="p-2 rounded-xl bg-amber-50 text-amber-600">🏆</span>
              </div>
              <p className="text-2xl font-black text-amber-600 mt-2">{goodRate}%</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{goodCount} học sinh đạt ≥ 9đ</p>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Đồng bộ đám mây</span>
                <span className="p-2 rounded-xl bg-sky-50 text-sky-600">☁️</span>
              </div>
              <p className="text-xs font-bold text-sky-700 mt-2">Firebase Firestore</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Tự động lưu & xem mọi máy</p>
            </div>
          </div>

          {/* Filter Bar & Export Excel */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Search Name */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm tên học sinh..."
                  value={searchStudentName}
                  onChange={(e) => setSearchStudentName(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-sky-500 w-44"
                />
              </div>

              {/* Grade Filter */}
              <select
                value={scoreGradeFilter}
                onChange={(e) =>
                  setScoreGradeFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
                }
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-700"
              >
                <option value="all">Tất cả Khối</option>
                <option value={1}>Khối 1</option>
                <option value={2}>Khối 2</option>
                <option value={3}>Khối 3</option>
                <option value={4}>Khối 4</option>
                <option value={5}>Khối 5</option>
              </select>

              {/* Class Filter */}
              {availableClasses.length > 0 && (
                <select
                  value={scoreClassFilter}
                  onChange={(e) => setScoreClassFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-700"
                >
                  <option value="all">Tất cả các lớp</option>
                  {availableClasses.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Export Excel Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportToExcel}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Xuất file Excel</span>
              </button>
            </div>
          </div>

          {/* Scores Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4 w-12 text-center">STT</th>
                    <th className="py-3 px-4">Họ và tên học sinh</th>
                    <th className="py-3 px-3 text-center">Lớp</th>
                    <th className="py-3 px-3 text-center">Khối</th>
                    <th className="py-3 px-3 text-center">Điểm số</th>
                    <th className="py-3 px-3 text-center">Số câu đúng</th>
                    <th className="py-3 px-3 text-center">Xếp loại</th>
                    <th className="py-3 px-3 text-center">Thời gian</th>
                    <th className="py-3 px-4">Ngày nộp</th>
                    <th className="py-3 px-3 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400">
                        Chưa có bài nộp nào phù hợp với bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    filteredSubmissions.map((sub, idx) => {
                      const isTop = sub.score >= 9;
                      const isPass = sub.score >= 5;

                      return (
                        <tr key={sub.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4 text-center text-slate-400 font-mono">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {sub.studentName}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                              {sub.className || 'Tự do'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="font-bold text-sky-700">Khối {sub.grade}</span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-lg font-black text-sm ${
                                isTop
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isPass
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {sub.score}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-semibold text-slate-700">
                            {sub.correctAnswers} / {sub.totalQuestions}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                                isTop
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : isPass
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {isTop ? 'Tốt (T)' : isPass ? 'Đạt (H)' : 'Chưa đạt (C)'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center text-slate-500 font-mono text-[11px]">
                            {Math.floor(sub.durationSeconds / 60)}p {sub.durationSeconds % 60}s
                          </td>
                          <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                            {sub.submittedAt}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {sub.details && (
                                <button
                                  onClick={() => setSelectedSubmissionDetail(sub)}
                                  className="p-1 rounded-lg text-sky-600 hover:bg-sky-50"
                                  title="Xem chi tiết bài làm"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteSubmission(sub.id)}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                title="Xóa kết quả này"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Classroom Live Projection Modal */}
      {isPlayingMode && activeQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Live Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 bg-emerald-500 text-white font-bold text-xs rounded-lg uppercase tracking-wider">
                  Trắc nghiệm Tin học {activeQuestion.grade}
                </span>
                <span className="text-xs text-slate-400">
                  Câu {currentQuizIndex + 1} / {filteredQuizzes.length}
                </span>
              </div>

              {/* Timer Pill */}
              <div className="flex items-center gap-4">
                <div
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold ${
                    timerSeconds <= 5
                      ? 'bg-rose-500 text-white animate-pulse'
                      : 'bg-slate-800 text-emerald-400'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{timerSeconds}s</span>
                </div>

                <button
                  onClick={() => setIsPlayingMode(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Question Screen */}
            <div className="p-8 overflow-y-auto space-y-6 flex-1">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
                  {activeQuestion.topic}
                </span>
                <h3 className="text-2xl font-black text-slate-900 mt-2 leading-relaxed">
                  {activeQuestion.question}
                </h3>
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                {activeQuestion.options.map((opt, oIdx) => {
                  const letter = String.fromCharCode(65 + oIdx);
                  const isCorrect = oIdx === activeQuestion.correctIndex;
                  const isChosen = selectedOption === oIdx;

                  let optClass = 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100 hover:border-slate-300';
                  if (isAnswerRevealed) {
                    if (isCorrect) {
                      optClass = 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold ring-2 ring-emerald-400';
                    } else if (isChosen) {
                      optClass = 'bg-rose-50 border-rose-300 text-rose-800';
                    }
                  } else if (isChosen) {
                    optClass = 'bg-blue-50 border-blue-400 text-blue-900 font-bold ring-2 ring-blue-300';
                  }

                  return (
                    <button
                      key={oIdx}
                      onClick={() => handleSelectOptionInPlay(oIdx)}
                      className={`p-4 rounded-2xl border-2 text-left text-sm transition-all flex items-start gap-3 cursor-pointer ${optClass}`}
                    >
                      <span className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-700 flex items-center justify-center font-extrabold text-xs shrink-0 shadow-2xs">
                        {letter}
                      </span>
                      <span className="leading-normal mt-0.5">{opt}</span>
                    </button>
                  );
                })}
              </div>

              {/* Explanation box when revealed */}
              {isAnswerRevealed && (
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-xs text-emerald-900 space-y-1 animate-in fade-in">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-700">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Giải thích đáp án chính xác:</span>
                  </div>
                  <p className="leading-relaxed pl-5">{activeQuestion.explanation}</p>
                </div>
              )}
            </div>

            {/* Live Controller Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <button
                onClick={handlePrevQuestion}
                disabled={currentQuizIndex === 0}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 disabled:opacity-30 transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Câu trước</span>
              </button>

              {!isAnswerRevealed ? (
                <button
                  onClick={handleRevealAnswer}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  Hiện đáp án đúng
                </button>
              ) : (
                <span className="text-xs font-bold text-emerald-600">Đã công bố kết quả 🎉</span>
              )}

              <button
                onClick={handleNextQuestion}
                disabled={currentQuizIndex === filteredQuizzes.length - 1}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-30 cursor-pointer"
              >
                <span>Câu tiếp theo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Submission Modal */}
      {selectedSubmissionDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-sky-50">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">
                  Bài thi của em: {selectedSubmissionDetail.studentName}
                </h3>
                <p className="text-xs text-slate-500">
                  Lớp {selectedSubmissionDetail.className || 'Tự do'} · Điểm:{' '}
                  <strong className="text-sky-700">{selectedSubmissionDetail.score} / 10</strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedSubmissionDetail(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3">
              {selectedSubmissionDetail.details?.map((d, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-2xl border text-xs space-y-1 ${
                    d.isCorrect
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : 'bg-rose-50/50 border-rose-200'
                  }`}
                >
                  <p className="font-bold text-slate-800">
                    Câu {i + 1}: {d.question}
                  </p>
                  <p className="text-slate-600">
                    Học sinh chọn:{' '}
                    <strong>
                      {d.selectedOption >= 0 ? String.fromCharCode(65 + d.selectedOption) : 'Chưa làm'}
                    </strong>{' '}
                    · Đáp án đúng:{' '}
                    <strong className="text-emerald-700">
                      {String.fromCharCode(65 + d.correctOption)}
                    </strong>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Question Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 w-full max-w-lg p-6 space-y-4">
            <h3 className="font-bold text-slate-800 text-base">Thêm câu hỏi trắc nghiệm Tin học</h3>

            <form onSubmit={handleAddQuestionSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Khối lớp</label>
                  <select
                    value={newGrade}
                    onChange={(e) => setNewGrade(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                  >
                    <option value={1}>Khối 1</option>
                    <option value={2}>Khối 2</option>
                    <option value={3}>Khối 3</option>
                    <option value={4}>Khối 4</option>
                    <option value={5}>Khối 5</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Chủ đề bài học</label>
                  <input
                    type="text"
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nội dung câu hỏi</label>
                <textarea
                  rows={2}
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder="Nhập câu hỏi trắc nghiệm..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-600">
                  4 Phương án trả lời (Chọn nút tròn để chỉ định đáp án đúng):
                </label>
                {newOptions.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correctChoice"
                      checked={newCorrectIndex === i}
                      onChange={() => setNewCorrectIndex(i)}
                      className="text-emerald-600"
                    />
                    <span className="text-xs font-bold text-slate-400 w-4">
                      {String.fromCharCode(65 + i)}:
                    </span>
                    <input
                      type="text"
                      placeholder={`Lựa chọn ${String.fromCharCode(65 + i)}`}
                      value={opt}
                      onChange={(e) => {
                        const copy = [...newOptions];
                        copy[i] = e.target.value;
                        setNewOptions(copy);
                      }}
                      className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
                      required
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Giải thích lời giải</label>
                <input
                  type="text"
                  placeholder="Lý do phương án này đúng..."
                  value={newExplanation}
                  onChange={(e) => setNewExplanation(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors cursor-pointer"
                >
                  Lưu câu hỏi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
