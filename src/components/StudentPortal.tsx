import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  LogIn,
  Play,
  RotateCcw,
  Sparkles,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronRight,
  ChevronLeft,
  Trophy,
  Award,
  Video,
  Gamepad2,
  ArrowRight,
  Check,
  X,
  User,
  GraduationCap,
  FileSpreadsheet
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { QuizQuestion, QuizSubmission, Classroom, DigitalResource } from '../types';
import { soundManager } from '../utils/audio';
import { syncQuizSubmissionToFirestore } from '../firebase';

interface StudentPortalProps {
  roomCode: string;
  teacherUsername?: string;
  classrooms: Classroom[];
  quizzes: QuizQuestion[];
  resources: DigitalResource[];
  onOpenTeacherLogin: () => void;
  onRecordSubmission?: (sub: QuizSubmission) => void;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({
  roomCode,
  teacherUsername = 'trungkienkd2025',
  classrooms,
  quizzes,
  resources,
  onOpenTeacherLogin,
  onRecordSubmission,
}) => {
  // Navigation inside Student Portal:
  // 'code_entry' -> Image 1 (Landing code entry)
  // 'hub' -> Image 2 (Grade selection & hero card)
  // 'quiz_active' -> Doing the quiz
  // 'quiz_result' -> Quiz completed screen
  const [currentView, setCurrentView] = useState<'code_entry' | 'hub' | 'quiz_active' | 'quiz_result'>('code_entry');

  // Input code state
  const [enteredCode, setEnteredCode] = useState('');
  const [codeError, setCodeError] = useState('');

  // Selected grade in Hub (Khối 1 to 5)
  const [selectedGrade, setSelectedGrade] = useState<number>(4);

  // Student Info Modal for starting quiz
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');

  // Quiz Taking state
  const [activeQuizList, setActiveQuizList] = useState<QuizQuestion[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [studentAnswers, setStudentAnswers] = useState<Record<number, number>>({});
  const [timeRemaining, setTimeRemaining] = useState(900); // 15 mins = 900s
  const [startTime, setStartTime] = useState<number>(0);
  const [latestSubmission, setLatestSubmission] = useState<QuizSubmission | null>(null);

  // Digital resources & game preview modal
  const [activeResourceModal, setActiveResourceModal] = useState<DigitalResource | null>(null);
  const [isGameModalOpen, setIsGameModalOpen] = useState(false);
  const [isResourcesListOpen, setIsResourcesListOpen] = useState(false);

  // Validate room code
  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    setCodeError('');

    const trimmed = enteredCode.trim().toUpperCase();
    if (!trimmed) {
      setCodeError('Vui lòng nhập mã lớp học từ Giáo viên của em!');
      return;
    }

    // Accept teacher's current roomCode or standard default F08AF1
    if (trimmed === roomCode.toUpperCase() || trimmed === 'F08AF1' || trimmed === 'DEMO') {
      soundManager.playFanfare();
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.6 }
      });
      setCurrentView('hub');
    } else {
      soundManager.playTick();
      setCodeError(`Mã lớp "${trimmed}" chưa chính xác. Thử nhập mã: ${roomCode}`);
    }
  };

  // Open Name Input Modal
  const handlePrepareQuiz = () => {
    // Filter questions for this grade
    const gradeQuestions = quizzes.filter((q) => q.grade === selectedGrade);
    if (gradeQuestions.length === 0) {
      alert(`Hiện tại chưa có câu hỏi trắc nghiệm cho Khối ${selectedGrade}. Thầy cô có thể thêm trong phần quản trị!`);
      return;
    }
    soundManager.playStarSound();
    setIsNameModalOpen(true);
  };

  // Start the timed quiz
  const handleStartExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) return;

    const gradeQuestions = quizzes.filter((q) => q.grade === selectedGrade);
    setActiveQuizList(gradeQuestions);
    setCurrentQIndex(0);
    setStudentAnswers({});
    setTimeRemaining(900);
    setStartTime(Date.now());
    setIsNameModalOpen(false);
    setCurrentView('quiz_active');
    soundManager.playFanfare();
  };

  // Timer countdown during quiz
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (currentView === 'quiz_active' && timeRemaining > 0) {
      timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            handleSubmitExam();
            return 0;
          }
          if (prev <= 10) {
            soundManager.playTick();
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [currentView, timeRemaining]);

  // Submit the student's exam
  const handleSubmitExam = () => {
    const elapsedSeconds = Math.max(1, Math.round((Date.now() - startTime) / 1000));
    let correctCount = 0;

    const details = activeQuizList.map((q, idx) => {
      const chosen = studentAnswers[idx] ?? -1;
      const isCorrect = chosen === q.correctIndex;
      if (isCorrect) correctCount++;
      return {
        questionId: q.id,
        question: q.question,
        selectedOption: chosen,
        correctOption: q.correctIndex,
        isCorrect
      };
    });

    const total = activeQuizList.length || 1;
    // Điểm số trên thang điểm 10 làm tròn 1 chữ số thập phân
    const calculatedScore = Math.round((correctCount / total) * 10 * 10) / 10;

    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const submission: QuizSubmission = {
      id: `sub_${Date.now()}`,
      studentName: studentName.trim(),
      className: studentClass.trim() || 'Tự do',
      grade: selectedGrade,
      score: calculatedScore,
      totalQuestions: total,
      correctAnswers: correctCount,
      submittedAt: formattedDate,
      durationSeconds: elapsedSeconds,
      details
    };

    setLatestSubmission(submission);
    setCurrentView('quiz_result');

    // Sync to Firestore & Local
    syncQuizSubmissionToFirestore(submission);
    if (onRecordSubmission) {
      onRecordSubmission(submission);
    }

    soundManager.playFanfare();
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.5 }
    });
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Grade count for display badge
  const questionsInGrade = quizzes.filter((q) => q.grade === selectedGrade).length;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans">
      {/* ======================================================== */}
      {/* TOP HEADER (Identical to reference screenshot) */}
      {/* ======================================================== */}
      <header className="bg-white border-b border-slate-200/80 px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-40 shadow-xs">
        {/* Left: Logo & Slogan */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#0284c7] text-white flex items-center justify-center shadow-xs">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-[#0369a1] text-base sm:text-lg leading-tight">
              Kiến thức tin học
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Kết nối tri thức với cuộc sống
            </p>
          </div>
        </div>

        {/* Right Action buttons */}
        <div className="flex items-center gap-3">
          {currentView !== 'code_entry' && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full font-medium">
              <span>Lớp của:</span>
              <span className="font-bold text-slate-800">{teacherUsername}</span>
              <span className="text-slate-300">|</span>
              <button
                onClick={() => {
                  setCurrentView('code_entry');
                  setEnteredCode('');
                }}
                className="text-rose-600 hover:text-rose-700 font-bold hover:underline"
              >
                Đổi mã lớp
              </button>
            </div>
          )}

          <button
            onClick={onOpenTeacherLogin}
            className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 border border-blue-500/30 text-blue-700 bg-blue-50/60 hover:bg-blue-100 hover:text-blue-800 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-2xs cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Đăng nhập Giáo viên</span>
          </button>
        </div>
      </header>

      {/* ======================================================== */}
      {/* VIEW 1: LANDING CODE ENTRY (MATCHES IMAGE 1) */}
      {/* ======================================================== */}
      {currentView === 'code_entry' && (
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Blue Curved Header with Book Icon */}
            <div className="bg-[#0ea5e9] text-white p-7 text-center relative flex flex-col items-center">
              <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center mb-3 shadow-inner">
                <BookOpen className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Nhập mã lớp học
              </h2>
              <p className="text-xs sm:text-sm text-sky-950 font-medium mt-1 leading-snug">
                Nhập mã code từ Giáo viên của em để làm bài tập và xem bài giảng
              </p>
            </div>

            {/* White Body Form */}
            <form onSubmit={handleVerifyCode} className="p-6 sm:p-8 space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-2">
                  Mã code Giáo viên
                </label>
                <input
                  type="text"
                  value={enteredCode}
                  onChange={(e) => {
                    setEnteredCode(e.target.value.toUpperCase());
                    setCodeError('');
                  }}
                  placeholder="VÍ DỤ: A1B2C3"
                  className="w-full py-3.5 px-6 text-center text-lg sm:text-xl font-mono font-bold tracking-widest text-slate-800 placeholder-slate-400 bg-white border-2 border-sky-200 focus:border-sky-500 rounded-full focus:outline-hidden focus:ring-4 focus:ring-sky-100 transition-all uppercase"
                  autoFocus
                />
              </div>

              {codeError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold text-center animate-in shake">
                  {codeError}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3.5 px-6 bg-[#10b981] hover:bg-[#059669] text-white rounded-full font-bold text-base shadow-md shadow-emerald-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Vào lớp học</span>
                <span className="text-lg">🚀</span>
              </button>

              {/* Quick helper for students */}
              <div className="pt-2 text-center">
                <p className="text-xs text-slate-400">
                  Mã phòng học hiện tại của Thầy Kiên:{' '}
                  <button
                    type="button"
                    onClick={() => setEnteredCode(roomCode)}
                    className="font-mono font-bold text-sky-600 hover:underline bg-sky-50 px-2 py-0.5 rounded border border-sky-100"
                  >
                    {roomCode}
                  </button>
                </p>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 2: STUDENT HUB & GRADE PICKER (MATCHES IMAGE 2) */}
      {/* ======================================================== */}
      {currentView === 'hub' && (
        <div className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
          {/* Mobile switcher for teacher name & change code */}
          <div className="sm:hidden flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 text-xs">
            <span className="text-slate-500">
              Lớp: <strong className="text-slate-800">{teacherUsername}</strong>
            </span>
            <button
              onClick={() => setCurrentView('code_entry')}
              className="text-rose-600 font-bold hover:underline"
            >
              Đổi mã lớp
            </button>
          </div>

          {/* Grade Selector Container */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-center font-bold text-slate-800 text-sm sm:text-base flex items-center justify-center gap-2">
              <span className="text-lg">🎒</span>
              <span>Chọn Khối lớp của em để học và làm bài tập</span>
            </h3>

            {/* 5 Grade Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3">
              {[
                { grade: 1, label: 'Khối 1', icon: '🎒' },
                { grade: 2, label: 'Khối 2', icon: '✏️' },
                { grade: 3, label: 'Khối 3', icon: '📐' },
                { grade: 4, label: 'Khối 4', icon: '💻' },
                { grade: 5, label: 'Khối 5', icon: '🚀' },
              ].map((item) => {
                const isSelected = selectedGrade === item.grade;
                return (
                  <button
                    key={item.grade}
                    onClick={() => {
                      setSelectedGrade(item.grade);
                      soundManager.playStarSound();
                    }}
                    className={`py-3 px-4 rounded-full font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#0284c7] text-white shadow-md shadow-sky-500/25 scale-[1.03]'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Big Hero Card: Luyện tập trực tuyến (Rich blue gradient) */}
          <div className="relative rounded-3xl bg-gradient-to-r from-[#0ea5e9] via-[#0284c7] to-[#2563eb] text-white p-6 sm:p-10 shadow-xl overflow-hidden space-y-6">
            {/* Top pill badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>LUYỆN TẬP TRỰC TUYẾN</span>
            </div>

            {/* Headline & Description */}
            <div className="space-y-1.5">
              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                Bài tập Kiến thức tin học
              </h2>
              <p className="text-sky-100 text-sm sm:text-base font-medium">
                Học vui – Luyện tập dễ – Kiểm tra ngay!
              </p>
            </div>

            {/* Metadata Tags */}
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <div className="px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-xs flex items-center gap-1.5 text-white">
                <span>📚</span>
                <span>Môn: Tin học</span>
              </div>
              <div className="px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-xs flex items-center gap-1.5 text-white">
                <span>🎓</span>
                <span>Lớp: {selectedGrade}</span>
              </div>
              <div className="px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-xs flex items-center gap-1.5 text-white">
                <span>📖</span>
                <span>Sách: Kết nối tri thức</span>
              </div>
              <div className="px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-xs flex items-center gap-1.5 text-white">
                <span>📝</span>
                <span>Số câu: {questionsInGrade > 0 ? questionsInGrade : 10} câu</span>
              </div>
              <div className="px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-xs flex items-center gap-1.5 text-white">
                <span>⏱️</span>
                <span>Thời gian: 15 phút</span>
              </div>
            </div>

            {/* 3 Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {/* Start Quiz button (Vibrant Orange) */}
              <button
                onClick={handlePrepareQuiz}
                className="px-6 sm:px-8 py-3.5 bg-[#ea580c] hover:bg-[#c2410c] text-white rounded-full font-bold text-sm sm:text-base shadow-lg shadow-orange-600/30 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>Bắt đầu làm bài</span>
              </button>

              {/* Digital Resources button */}
              <button
                onClick={() => setIsResourcesListOpen(true)}
                className="px-5 sm:px-6 py-3.5 bg-white/20 hover:bg-white/30 text-white rounded-full font-bold text-xs sm:text-sm backdrop-blur-xs transition-all flex items-center gap-2 cursor-pointer"
              >
                <Video className="w-4 h-4" />
                <span>Học liệu số</span>
              </button>

              {/* Games button */}
              <button
                onClick={() => setIsGameModalOpen(true)}
                className="px-5 sm:px-6 py-3.5 bg-white/20 hover:bg-white/30 text-white rounded-full font-bold text-xs sm:text-sm backdrop-blur-xs transition-all flex items-center gap-2 cursor-pointer"
              >
                <Gamepad2 className="w-4 h-4" />
                <span>Giải trí</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: NHẬP TÊN & CHỌN LỚP TRƯỚC KHI BẮT ĐẦU */}
      {/* ======================================================== */}
      {isNameModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-sky-50 to-blue-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold">
                  📝
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">
                    Thông tin học sinh làm bài
                  </h3>
                  <p className="text-xs text-slate-500">
                    Bài thi trắc nghiệm Tin học - Khối {selectedGrade}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsNameModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleStartExam} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Họ và tên của em <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="Ví dụ: Nguyễn An Khang"
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Lớp của em</span>
                  <span className="text-slate-400 font-normal text-[11px]">(Có thể để trống)</span>
                </label>
                <div className="relative">
                  <GraduationCap className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={studentClass}
                    onChange={(e) => setStudentClass(e.target.value)}
                    placeholder="Ví dụ: 4A1 (hoặc để trống)"
                    list="classes-list"
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                  />
                  <datalist id="classes-list">
                    {classrooms.map((c) => (
                      <option key={c.id} value={c.name} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                <Sparkles className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <p>
                  Bài thi có <strong>15 phút</strong> làm bài. Điểm số của em sẽ tự động được gửi về bảng điểm của Thầy Cô!
                </p>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsNameModalOpen(false)}
                  className="flex-1 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={!studentName.trim()}
                  className="flex-1 py-2.5 bg-[#ea580c] hover:bg-[#c2410c] disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Vào thi ngay</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 3: ACTIVE QUIZ EXAM SCREEN */}
      {/* ======================================================== */}
      {currentView === 'quiz_active' && activeQuizList.length > 0 && (
        <div className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 space-y-4">
          {/* Top Bar with Timer & Progress */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs">
                K{selectedGrade}
              </div>
              <div>
                <p className="text-xs text-slate-400">Học sinh:</p>
                <p className="font-bold text-xs text-slate-800">
                  {studentName} {studentClass ? `(${studentClass})` : ''}
                </p>
              </div>
            </div>

            {/* Timer countdown */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-bold ${
                timeRemaining <= 60
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'bg-slate-900 text-emerald-400'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{formatTime(timeRemaining)}</span>
            </div>

            <button
              onClick={() => {
                if (confirm('Em có chắc chắn muốn nộp bài thi ngay bây giờ không?')) {
                  handleSubmitExam();
                }
              }}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-2xs cursor-pointer transition-colors"
            >
              Nộp bài thi
            </button>
          </div>

          {/* Question Card */}
          {activeQuizList[currentQIndex] && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-100 pb-3">
                <span className="font-semibold text-sky-600 bg-sky-50 px-2.5 py-1 rounded-md">
                  Câu hỏi {currentQIndex + 1} / {activeQuizList.length}
                </span>
                <span className="truncate max-w-[240px]">
                  {activeQuizList[currentQIndex].topic}
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-bold text-slate-900 leading-relaxed">
                {activeQuizList[currentQIndex].question}
              </h3>

              {/* Options */}
              <div className="space-y-3">
                {activeQuizList[currentQIndex].options.map((option, optIdx) => {
                  const letter = String.fromCharCode(65 + optIdx);
                  const isSelected = studentAnswers[currentQIndex] === optIdx;

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => {
                        setStudentAnswers((prev) => ({
                          ...prev,
                          [currentQIndex]: optIdx,
                        }));
                        soundManager.playTick();
                      }}
                      className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center gap-3.5 cursor-pointer ${
                        isSelected
                          ? 'border-sky-500 bg-sky-50/80 text-sky-950 font-semibold ring-2 ring-sky-200'
                          : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-sky-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {letter}
                      </div>
                      <span className="text-sm leading-snug">{option}</span>
                    </button>
                  );
                })}
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCurrentQIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentQIndex === 0}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-colors flex items-center gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Câu trước</span>
                </button>

                {/* Question index quick jump dots */}
                <div className="flex items-center gap-1.5">
                  {activeQuizList.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCurrentQIndex(idx)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                        currentQIndex === idx
                          ? 'bg-sky-600 text-white ring-2 ring-sky-300'
                          : studentAnswers[idx] !== undefined
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>

                {currentQIndex < activeQuizList.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentQIndex((prev) => Math.min(activeQuizList.length - 1, prev + 1))}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
                  >
                    <span>Câu sau</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmitExam}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs"
                  >
                    Nộp bài
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 4: QUIZ RESULT SCREEN */}
      {/* ======================================================== */}
      {currentView === 'quiz_result' && latestSubmission && (
        <div className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl text-center space-y-6 animate-in zoom-in-95 duration-200">
            {/* Trophy Icon */}
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-50 text-amber-500 border-4 border-amber-200 shadow-lg mx-auto">
              <Trophy className="w-10 h-10" />
            </div>

            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                Đã nộp bài thành công
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
                Chúc mừng em {latestSubmission.studentName}!
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Lớp {latestSubmission.className || 'Tự do'} · Môn Tin học Khối {latestSubmission.grade}
              </p>
            </div>

            {/* Score Showcase */}
            <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
              <div className="p-3 bg-white rounded-xl shadow-2xs">
                <p className="text-[11px] text-slate-400 font-medium">Điểm số</p>
                <p className="text-2xl sm:text-3xl font-black text-sky-600">
                  {latestSubmission.score}
                  <span className="text-xs text-slate-400 font-normal"> / 10</span>
                </p>
              </div>

              <div className="p-3 bg-white rounded-xl shadow-2xs">
                <p className="text-[11px] text-slate-400 font-medium">Số câu đúng</p>
                <p className="text-2xl sm:text-3xl font-black text-emerald-600">
                  {latestSubmission.correctAnswers}
                  <span className="text-xs text-slate-400 font-normal"> / {latestSubmission.totalQuestions}</span>
                </p>
              </div>

              <div className="p-3 bg-white rounded-xl shadow-2xs">
                <p className="text-[11px] text-slate-400 font-medium">Thời gian làm</p>
                <p className="text-xl sm:text-2xl font-black text-indigo-600 mt-1">
                  {formatTime(latestSubmission.durationSeconds)}
                </p>
              </div>
            </div>

            {/* Classification banner */}
            <div
              className={`p-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 ${
                latestSubmission.score >= 9
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : latestSubmission.score >= 5
                  ? 'bg-blue-50 text-blue-800 border border-blue-200'
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}
            >
              <Award className="w-5 h-5 shrink-0" />
              <span>
                {latestSubmission.score >= 9
                  ? 'Xếp loại: Hoàn thành Tốt (T) - Em học rất xuất sắc!'
                  : latestSubmission.score >= 5
                  ? 'Xếp loại: Hoàn thành (H) - Em làm bài rất tốt!'
                  : 'Xếp loại: Cần cố gắng hơn (C) - Em hãy ôn tập thêm nhé!'}
              </span>
            </div>

            {/* Answer Details Accordion */}
            {latestSubmission.details && (
              <div className="text-left space-y-3 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Chi tiết từng câu hỏi:
                </h4>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {latestSubmission.details.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border text-xs space-y-1 ${
                        item.isCorrect
                          ? 'bg-emerald-50/50 border-emerald-200'
                          : 'bg-rose-50/50 border-rose-200'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-slate-800">
                          Câu {idx + 1}: {item.question}
                        </span>
                        {item.isCorrect ? (
                          <span className="text-emerald-700 flex items-center gap-1 shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Đúng
                          </span>
                        ) : (
                          <span className="text-rose-600 flex items-center gap-1 shrink-0">
                            <XCircle className="w-3.5 h-3.5" /> Sai
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600 text-[11px]">
                        Em chọn:{' '}
                        <strong>
                          {item.selectedOption >= 0
                            ? String.fromCharCode(65 + item.selectedOption)
                            : 'Chưa chọn'}
                        </strong>{' '}
                        | Đáp án đúng:{' '}
                        <strong className="text-emerald-700">
                          {String.fromCharCode(65 + item.correctOption)}
                        </strong>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  setCurrentView('hub');
                }}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Về trang chủ học sinh
              </button>
              <button
                onClick={handlePrepareQuiz}
                className="flex-1 py-3 bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Luyện tập lại bài này</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: HỌC LIỆU SỐ DÀNH CHO HỌC SINH */}
      {/* ======================================================== */}
      {isResourcesListOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-sky-50">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-sky-600" />
                <h3 className="font-bold text-slate-800 text-base">
                  Kho Học liệu số Tin học - Khối {selectedGrade}
                </h3>
              </div>
              <button
                onClick={() => setIsResourcesListOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3">
              {resources.filter((r) => r.grade === selectedGrade).length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Chưa có video bài giảng nào cho Khối {selectedGrade}. Thầy cô sẽ tải lên sớm!
                </div>
              ) : (
                resources
                  .filter((r) => r.grade === selectedGrade)
                  .map((res) => (
                    <div
                      key={res.id}
                      className="p-4 rounded-2xl border border-slate-200 hover:border-sky-300 transition-all flex items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded">
                          {res.lessonNumber}
                        </span>
                        <h4 className="font-bold text-slate-800 text-sm">{res.title}</h4>
                        <p className="text-xs text-slate-500 line-clamp-1">{res.description}</p>
                      </div>
                      <button
                        onClick={() => setActiveResourceModal(res)}
                        className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 shadow-2xs"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Xem bài giảng</span>
                      </button>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Video Player Modal */}
      {activeResourceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h4 className="font-bold text-sm truncate">{activeResourceModal.title}</h4>
              <button
                onClick={() => setActiveResourceModal(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-slate-950 aspect-video flex items-center justify-center text-white">
              {activeResourceModal.youtubeId ? (
                <iframe
                  className="w-full h-full rounded-xl"
                  src={`https://www.youtube.com/embed/${activeResourceModal.youtubeId}?autoplay=1`}
                  title={activeResourceModal.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="text-center space-y-2">
                  <Play className="w-12 h-12 text-sky-400 mx-auto" />
                  <p className="text-xs text-slate-300">Video bài giảng tương tác</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mini Game Modal */}
      {isGameModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mx-auto text-2xl">
              🎮
            </div>
            <h3 className="font-bold text-slate-800 text-lg">Góc Giải Trí Tin Học</h3>
            <p className="text-xs text-slate-500">
              Các trò chơi luyện gõ 10 ngón phím, ghép chữ cái và thử thách trí tuệ máy tính vui nhộn!
            </p>
            <div className="p-4 bg-purple-50 rounded-2xl text-xs text-purple-800 font-medium">
              Thầy cô đã kích hoạt chế độ vừa học vừa chơi. Hãy hoàn thành các bài thi trắc nghiệm để nhận thêm sao thưởng nhé!
            </div>
            <button
              onClick={() => setIsGameModalOpen(false)}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Đã hiểu, quay lại học tập!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
