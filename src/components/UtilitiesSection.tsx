import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Clock,
  FileSpreadsheet,
  Users2,
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Minimize2,
  Check,
  Download,
  Upload,
  Sparkles,
  Shuffle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Classroom, Student, UserAccount } from '../types';
import { soundManager } from '../utils/audio';
import { StudentCommentsManager } from './StudentCommentsManager';
import { Award } from 'lucide-react';

interface UtilitiesSectionProps {
  classrooms: Classroom[];
  selectedClassId: string;
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  isAdmin?: boolean;
  currentUser?: UserAccount;
}

export const UtilitiesSection: React.FC<UtilitiesSectionProps> = ({
  classrooms,
  selectedClassId,
  students,
  setStudents,
  isAdmin = true,
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<'comments' | 'timer' | 'teams' | 'excel'>(() => {
    try {
      const saved = localStorage.getItem('qllh_utilities_subtab');
      if (saved === 'comments' || saved === 'timer' || saved === 'teams' || saved === 'excel') {
        return saved;
      }
    } catch {}
    return 'comments';
  });

  useEffect(() => {
    try {
      localStorage.setItem('qllh_utilities_subtab', activeTab);
    } catch {}
  }, [activeTab]);

  // Countdown timer state
  const [timerSeconds, setTimerSeconds] = useState(300); // 5 mins default
  const [initialSeconds, setInitialSeconds] = useState(300);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [customMinutes, setCustomMinutes] = useState(5);

  // Group generator state
  const [groupCount, setGroupCount] = useState(4);
  const [generatedGroups, setGeneratedGroups] = useState<{ name: string; members: Student[] }[]>([]);

  // Excel paste/import state
  const [excelText, setExcelText] = useState(
    `Nguyễn Gia Khiêm\tNam\t15/04/2016\nPhạm Quỳnh Chi\tNữ\t20/09/2016\nVũ Đức Minh\tNam\t08/11/2016\nLê Thùy Dung\tNữ\t02/03/2016`
  );
  const [importSuccess, setImportSuccess] = useState(false);

  const currentClass = classrooms.find((c) => c.id === selectedClassId) || classrooms[0];
  const classStudents = students.filter((s) => s.classId === selectedClassId);

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            soundManager.playAlarm();
            setIsTimerRunning(false);
            confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
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
  }, [isTimerRunning, timerSeconds]);

  const handleSetTimer = (secs: number) => {
    setIsTimerRunning(false);
    setTimerSeconds(secs);
    setInitialSeconds(secs);
  };

  const handleCustomMinuteChange = (mins: number) => {
    setCustomMinutes(mins);
    const secs = Math.max(1, mins) * 60;
    setTimerSeconds(secs);
    setInitialSeconds(secs);
  };

  // Group generator logic
  const groupNames = [
    '🦁 Nhóm Sư Tử Vàng',
    '🐬 Nhóm Cá Heo Xanh',
    '🦅 Nhóm Đại Bàng Lửa',
    '🚀 Nhóm Tên Lửa Sáng Tạo',
    '⭐ Nhóm Ngôi Sao Tri Thức',
    '💎 Nhóm Kim Cương Đoàn Kết',
  ];

  const handleGenerateGroups = () => {
    if (classStudents.length === 0) return;

    soundManager.playFanfare();
    const shuffled = [...classStudents].sort(() => Math.random() - 0.5);
    const groups: { name: string; members: Student[] }[] = Array.from(
      { length: groupCount },
      (_, i) => ({
        name: groupNames[i % groupNames.length],
        members: [],
      })
    );

    shuffled.forEach((student, index) => {
      const groupIdx = index % groupCount;
      groups[groupIdx].members.push(student);
    });

    setGeneratedGroups(groups);
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
    });
  };

  // Excel import logic
  const handleParseAndImport = () => {
    const lines = excelText.trim().split('\n');
    const newParsedStudents: Student[] = [];

    lines.forEach((line, index) => {
      const parts = line.split(/[\t,;]+/);
      if (parts.length >= 1 && parts[0].trim()) {
        const name = parts[0].trim();
        const gender: 'Nam' | 'Nữ' = parts[1]?.toLowerCase().includes('nữ') ? 'Nữ' : 'Nam';
        const dob = parts[2]?.trim() || '01/01/2016';

        newParsedStudents.push({
          id: `imp_${Date.now()}_${index}`,
          code: `HS${(classStudents.length + index + 1).toString().padStart(3, '0')}`,
          name,
          gender,
          dob,
          avatar: gender === 'Nam' ? '👦' : '👧',
          classId: selectedClassId,
          attendance: 'present',
          stars: 0,
          speeches: 0,
        });
      }
    });

    if (newParsedStudents.length > 0) {
      setStudents((prev) => [...prev, ...newParsedStudents]);
      setImportSuccess(true);
      soundManager.playFanfare();
      setTimeout(() => setImportSuccess(false), 3000);
    }
  };

  const handleDownloadSampleCsv = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,Họ và tên,Giới tính,Ngày sinh\nNguyễn Văn An,Nam,12/03/2016\nTrần Thị Mai,Nữ,05/06/2016\nLê Hoàng Long,Nam,18/08/2016';
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'mau_danh_sach_hoc_sinh.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0070F3] bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100">
              Hộp công cụ tiện ích
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500 font-medium">Hỗ trợ giảng dạy & Đánh giá</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 mt-1">Tiện ích giảng dạy</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Thẻ nhận xét học sinh tự động (Excel), đồng hồ đếm ngược, bốc thăm chia nhóm và nhập học sinh
          </p>
        </div>

        {/* Tab switchers - Thẻ Nhận xét (Excel) placed first and prominent */}
        <div className="flex items-center flex-wrap gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80">
          <button
            onClick={() => setActiveTab('comments')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'comments'
                ? 'bg-white text-[#0070F3] shadow-sm ring-2 ring-blue-100'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Award className="w-4 h-4 text-[#0070F3]" />
            <span>Thẻ Nhận xét (Excel)</span>
            <span className="text-[10px] bg-blue-100 text-[#0070F3] px-1.5 py-0.5 rounded-full font-black">
              Tự động
            </span>
          </button>
          <button
            onClick={() => setActiveTab('timer')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'timer'
                ? 'bg-white text-rose-600 shadow-sm ring-2 ring-rose-100'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Đồng hồ đếm ngược</span>
          </button>
          <button
            onClick={() => setActiveTab('teams')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'teams'
                ? 'bg-white text-blue-600 shadow-sm ring-2 ring-blue-100'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Users2 className="w-3.5 h-3.5" />
            <span>Chia nhóm học tập</span>
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab('excel')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'excel'
                  ? 'bg-white text-emerald-600 shadow-sm ring-2 ring-emerald-100'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Nhập danh sách Excel</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: COUNTDOWN TIMER */}
      {activeTab === 'timer' && (
        <div
          className={`bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xs flex flex-col items-center transition-all ${
            isFullscreen ? 'fixed inset-0 z-50 rounded-none border-none p-12 justify-center' : ''
          }`}
        >
          <div className="w-full flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">
              ĐỒNG HỒ ĐẾM NGƯỢC LỚP HỌC
            </span>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors flex items-center gap-1.5 text-xs font-medium"
              title={isFullscreen ? 'Thu nhỏ' : 'Chiếu toàn màn hình lên máy chiếu'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              <span>{isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình chiếu bảng'}</span>
            </button>
          </div>

          {/* Time Display */}
          <div className="my-6 flex flex-col items-center">
            <div
              className={`font-mono font-black tracking-tight select-none ${
                isFullscreen
                  ? 'text-7xl sm:text-9xl text-slate-900'
                  : 'text-6xl sm:text-7xl text-slate-900'
              } ${timerSeconds <= 10 && timerSeconds > 0 ? 'text-rose-600 animate-pulse' : ''}`}
            >
              {formatTime(timerSeconds)}
            </div>

            {timerSeconds === 0 && (
              <div className="mt-2 text-rose-600 font-bold text-lg animate-bounce">
                Hết giờ làm bài! ⏰
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              className={`px-8 py-3.5 rounded-2xl text-white font-bold text-base shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer ${
                isTimerRunning
                  ? 'bg-amber-500 hover:bg-amber-600'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {isTimerRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-white" />}
              <span>{isTimerRunning ? 'Tạm dừng' : 'Bắt đầu đếm'}</span>
            </button>

            <button
              onClick={() => {
                setIsTimerRunning(false);
                setTimerSeconds(initialSeconds);
              }}
              className="p-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors shadow-2xs"
              title="Đặt lại thời gian ban đầu"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>

          {/* Preset Buttons */}
          <div className="mt-8 pt-6 border-t border-slate-100 w-full max-w-xl">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider text-center mb-3">
              Thời gian cài đặt nhanh:
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                { label: '30 Giây', val: 30 },
                { label: '1 Phút', val: 60 },
                { label: '2 Phút', val: 120 },
                { label: '3 Phút', val: 180 },
                { label: '5 Phút', val: 300 },
                { label: '10 Phút', val: 600 },
                { label: '15 Phút', val: 900 },
              ].map((p) => (
                <button
                  key={p.val}
                  onClick={() => handleSetTimer(p.val)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    initialSeconds === p.val && !isTimerRunning
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-600">
              <span>Hoặc nhập số phút tùy ý:</span>
              <input
                type="number"
                min={1}
                max={120}
                value={customMinutes}
                onChange={(e) => handleCustomMinuteChange(Number(e.target.value))}
                className="w-16 px-2 py-1 text-center font-bold bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
              <span>phút</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GROUP GENERATOR */}
      {activeTab === 'teams' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                BỐC THĂM CHIA NHÓM
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-1">
                Chia nhóm học tập tự động cho {currentClass.name}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Chia đều {classStudents.length} học sinh thành các nhóm thảo luận công bằng và ngẫu nhiên
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="font-medium">Số nhóm:</span>
                <select
                  value={groupCount}
                  onChange={(e) => setGroupCount(Number(e.target.value))}
                  className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white font-bold text-slate-800"
                >
                  {[2, 3, 4, 5, 6].map((num) => (
                    <option key={num} value={num}>
                      {num} Nhóm
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleGenerateGroups}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2"
              >
                <Shuffle className="w-4 h-4" />
                <span>Bốc thăm chia nhóm</span>
              </button>
            </div>
          </div>

          {/* Group display */}
          {generatedGroups.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-2xl">
              <Users2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500">
                Nhấn "Bốc thăm chia nhóm" để hệ thống chia học sinh lớp {currentClass.name} vào các nhóm.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {generatedGroups.map((group, gIdx) => (
                <div
                  key={gIdx}
                  className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <h4 className="font-bold text-slate-800 text-sm">{group.name}</h4>
                    <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      {group.members.length} thành viên
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {group.members.map((member, mIdx) => (
                      <div
                        key={member.id}
                        className="bg-white px-3 py-2 rounded-xl border border-slate-100 flex items-center justify-between text-xs shadow-2xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 font-mono text-[11px] w-4">
                            {mIdx + 1}.
                          </span>
                          <span className="font-semibold text-slate-800">{member.name}</span>
                        </div>
                        <span className="text-slate-400 text-[11px]">{member.code}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: EXCEL IMPORT */}
      {activeTab === 'excel' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                NHẬP HỌC SINH TỪ EXCEL
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-1">
                Thêm danh sách học sinh vào {currentClass.name}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Sao chép các cột từ tệp Excel (Họ tên, Giới tính, Ngày sinh) và dán trực tiếp vào khung dưới
              </p>
            </div>

            <button
              onClick={handleDownloadSampleCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-semibold transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Tải file mẫu Excel (.CSV)</span>
            </button>
          </div>

          {/* Textarea for excel paste */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              Dán dữ liệu từ bảng tính (Mỗi dòng một học sinh):
            </label>
            <textarea
              rows={6}
              value={excelText}
              onChange={(e) => setExcelText(e.target.value)}
              placeholder="Nguyễn Văn A [Tab] Nam [Tab] 12/03/2016..."
              className="w-full p-3 font-mono text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
            />
            <p className="text-[11px] text-slate-400">
              Hệ thống tự động phân tích dấu Tab, dấu phẩy hoặc dấu chấm phẩy giữa các cột.
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-slate-500">
              Sẽ thêm vào: <strong className="text-slate-800">{currentClass.name}</strong>
            </div>

            <div className="flex items-center gap-3">
              {importSuccess && (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <Check className="w-4 h-4" />
                  Đã nhập thành công vào danh sách!
                </span>
              )}
              <button
                onClick={handleParseAndImport}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Nhập ngay vào lớp</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: STUDENT COMMENTS EXCEL MANAGER */}
      {activeTab === 'comments' && (
        <StudentCommentsManager currentUser={currentUser} />
      )}
    </div>
  );
};
