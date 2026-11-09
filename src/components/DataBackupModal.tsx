import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Download,
  Upload,
  Cloud,
  CloudUpload,
  CloudDownload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileJson,
  Database,
  Lock,
  Layers,
  Sparkles,
  Calendar,
  Users,
  X,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundManager } from '../utils/audio';
import {
  exportFullBackupFile,
  restoreFromBackupData,
  getSavedClasses,
  getSavedStudents,
  getSavedGrades,
  debounceCloudSync,
} from '../utils/dbStorage';
import { pushAllDataToFirestore, fetchAllDataFromFirestore, isFirebaseConfigured } from '../firebase';

import { UserAccount } from '../types';
import { filterClassesForUser, getUserScopeId } from '../utils/userScope';

interface DataBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserAccount;
}

export const DataBackupModal: React.FC<DataBackupModalProps> = ({ isOpen, onClose, currentUser }) => {
  const [currentYear, setCurrentYear] = useState('2026-2027');
  const [classesCount, setClassesCount] = useState(0);
  const [studentsCount, setStudentsCount] = useState(0);
  const [yearsList, setYearsList] = useState<string[]>([]);
  const [cloudStatus, setCloudStatus] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadCurrentStats = () => {
    try {
      const cy = localStorage.getItem('qllh_current_year') || '2026-2027';
      setCurrentYear(cy);
      const years = JSON.parse(localStorage.getItem('qllh_years') || '["2026-2027", "2025-2026"]');
      setYearsList(years);
      const classes = getSavedClasses(currentUser);
      const userClasses = filterClassesForUser(classes, currentUser);
      setClassesCount(userClasses.length);
      const userClassIds = new Set(userClasses.map((c) => c.id));
      const stds = getSavedStudents(currentUser).filter((s) => userClassIds.has(s.classId));
      setStudentsCount(stds.length);

      const lastSync = localStorage.getItem('qllh_last_cloud_sync');
      if (lastSync) {
        const d = new Date(lastSync);
        setCloudStatus(`Đã lưu đám mây: ${d.toLocaleTimeString('vi-VN')} ${d.toLocaleDateString('vi-VN')}`);
      } else {
        setCloudStatus('Chưa đồng bộ lên đám mây');
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadCurrentStats();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExportBackup = () => {
    exportFullBackupFile(currentUser);
    soundManager.playFanfare();
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    setToastMessage({
      text: 'Đã xuất file sao lưu cơ sở dữ liệu của tài khoản! Bạn có thể lưu giữ file này an toàn.',
      type: 'success',
    });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        const ok = restoreFromBackupData(parsed, currentUser);
        if (ok) {
          loadCurrentStats();
          soundManager.playFanfare();
          confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
          setToastMessage({
            text: 'Khôi phục cơ sở dữ liệu thành công! Đang tải lại dữ liệu...',
            type: 'success',
          });
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
      } catch (err: any) {
        setToastMessage({
          text: 'File sao lưu không hợp lệ hoặc bị lỗi định dạng!',
          type: 'error',
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handlePushCloud = async () => {
    setIsSyncing(true);
    try {
      await pushAllDataToFirestore(getUserScopeId(currentUser));
      const now = new Date();
      const str = `Đã lưu đám mây: ${now.toLocaleTimeString('vi-VN')} ${now.toLocaleDateString('vi-VN')}`;
      localStorage.setItem('qllh_last_cloud_sync', now.toISOString());
      setCloudStatus(str);
      soundManager.playFanfare();
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      setToastMessage({
        text: 'Đã sao lưu cơ sở dữ liệu tài khoản lên đám mây Firebase (khohoclieuso-afa3c)!',
        type: 'success',
      });
      setTimeout(() => setToastMessage(null), 4000);
    } catch (e: any) {
      setToastMessage({
        text: 'Lỗi đồng bộ đám mây: ' + (e.message || 'Kiểm tra kết nối mạng'),
        type: 'error',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePullCloud = async () => {
    if (!confirm('Tải dữ liệu từ đám mây về máy này? Dữ liệu hiện tại của tài khoản sẽ được cập nhật đồng bộ với đám mây.')) {
      return;
    }
    setIsSyncing(true);
    try {
      const data = await fetchAllDataFromFirestore(getUserScopeId(currentUser));
      if (data) {
        loadCurrentStats();
        window.dispatchEvent(new Event('qllh_data_updated'));
        soundManager.playFanfare();
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
        setToastMessage({
          text: 'Đã tải thành công cơ sở dữ liệu từ đám mây về máy!',
          type: 'success',
        });
        setTimeout(() => setToastMessage(null), 4000);
      } else {
        setToastMessage({
          text: 'Chưa tìm thấy bản ghi dữ liệu nào trên đám mây của tài khoản này để tải về.',
          type: 'error',
        });
      }
    } catch (e: any) {
      setToastMessage({
        text: 'Lỗi tải dữ liệu: ' + (e.message || 'Vui lòng thử lại'),
        type: 'error',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".json"
        className="hidden"
        onChange={handleFileSelect}
      />

      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl relative border border-slate-100 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-2xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  BẢO MẬT & BẢO TOÀN DỮ LIỆU
                </span>
                <span className="text-[11px] text-slate-400">·</span>
                <span className="text-[11px] font-semibold text-slate-500">Lưu trữ qua từng năm</span>
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
                Trung tâm Quản lý & Sao lưu Dữ liệu
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast Alert */}
        {toastMessage && (
          <div
            className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 animate-fadeIn ${
              toastMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* Current Database Summary Box */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-[#0070F3]" />
              Cơ sở dữ liệu đang lưu trong hệ thống:
            </span>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
              ✓ Đang lưu an toàn
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
              <p className="text-[11px] text-slate-500 font-semibold">Năm học</p>
              <p className="text-base font-black text-slate-900 mt-0.5">{currentYear}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">({yearsList.length} niên khóa)</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
              <p className="text-[11px] text-slate-500 font-semibold">Tổng số lớp</p>
              <p className="text-base font-black text-[#0070F3] mt-0.5">{classesCount} lớp</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Tất cả các khối</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
              <p className="text-[11px] text-slate-500 font-semibold">Tổng học sinh</p>
              <p className="text-base font-black text-emerald-600 mt-0.5">{studentsCount} em</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Kèm điểm & nhận xét</p>
            </div>
          </div>
        </div>

        {/* Action 1: Tải file sao lưu về máy tính & Khôi phục từ file */}
        <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileJson className="w-4 h-4 text-blue-600" />
              <h4 className="text-sm font-bold text-slate-900">Sao lưu & Khôi phục bằng File (.JSON)</h4>
            </div>
            <span className="text-[11px] font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
              Khuyên dùng
            </span>
          </div>
          <p className="text-xs text-slate-600">
            Xuất toàn bộ học sinh, lớp học, điểm số của tất cả các năm học ra 1 file duy nhất để lưu trữ vào máy tính hoặc Google Drive cá nhân. Khi chuyển máy tính hoặc đổi trình duyệt, bạn chỉ cần nạp file này để phục hồi 100%.
          </p>

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleExportBackup}
              className="px-4 py-2.5 bg-[#0070F3] hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Tải file sao lưu về máy (.json)</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Upload className="w-4 h-4 text-slate-500" />
              <span>Khôi phục từ file sao lưu</span>
            </button>
          </div>
        </div>

        {/* Action 2: Đám mây Firebase */}
        <div className="p-4 rounded-2xl border border-orange-200 bg-orange-50/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-orange-600" />
              <h4 className="text-sm font-bold text-slate-900">Đồng bộ đám mây Firebase (Tự động)</h4>
            </div>
            <span className="text-[11px] font-semibold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
              Dự án khohoclieuso-afa3c
            </span>
          </div>

          <p className="text-xs text-slate-600">
            Hệ thống tự động đồng bộ dữ liệu của Thầy lên cơ sở dữ liệu Firebase đám mây. Bạn cũng có thể bấm nút bên dưới để lưu ngay lập tức hoặc tải về máy mới.
          </p>

          <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>{cloudStatus}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              type="button"
              disabled={isSyncing}
              onClick={handlePushCloud}
              className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <CloudUpload className="w-4 h-4" />
              <span>{isSyncing ? 'Đang lưu...' : 'Lưu lên đám mây ngay'}</span>
            </button>

            <button
              type="button"
              disabled={isSyncing}
              onClick={handlePullCloud}
              className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <CloudDownload className="w-4 h-4 text-slate-500" />
              <span>Tải từ đám mây về máy</span>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            Cơ chế bảo vệ dữ liệu chống ghi đè khi cập nhật tính năng mới đã được kích hoạt.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
