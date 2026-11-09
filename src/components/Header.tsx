import React, { useState } from 'react';
import { Menu, QrCode, Copy, Check, Download, ShieldCheck, Key, LogOut } from 'lucide-react';
import { UserAccount } from '../types';

interface HeaderProps {
  onToggleSidebar: () => void;
  roomCode: string;
  onOpenRoomModal: () => void;
  teacherName: string;
  onOpenDownloadGuide: () => void;
  currentUser?: UserAccount;
  isAdmin?: boolean;
  onOpenLogin?: () => void;
  onLogout?: () => void;
  onSwitchToStudentPortal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  roomCode,
  onOpenRoomModal,
  teacherName,
  onOpenDownloadGuide,
  currentUser,
  isAdmin = true,
  onOpenLogin,
  onLogout,
  onSwitchToStudentPortal,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="lg:hidden sticky top-0 z-30 h-16 bg-white border-b border-slate-200/90 px-4 flex items-center justify-between shadow-2xs">
      {/* Left: Hamburger and Logo */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
          title="Mở menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-1 select-none">
          <span className="text-xl font-extrabold tracking-tight text-[#1d4ed8]">
            QLLH<span className="text-[#f59e0b]">.Pro</span>
          </span>
        </div>
      </div>

      {/* Right: Quick Room Code Badge on Mobile */}
      <div className="flex items-center gap-2">
        <div
          onClick={onOpenRoomModal}
          className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 py-1 px-2.5 rounded-lg text-blue-700 cursor-pointer shadow-2xs"
        >
          <span className="text-[10px] font-bold text-blue-500 uppercase">MÃ:</span>
          <span className="text-xs font-mono font-extrabold tracking-wide">{roomCode}</span>
          <button
            type="button"
            onClick={handleCopyCode}
            className="p-0.5 text-blue-400 hover:text-blue-700"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>

        {onSwitchToStudentPortal && (
          <button
            onClick={onSwitchToStudentPortal}
            className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 text-xs font-bold hover:bg-sky-100 transition-colors"
            title="Xem giao diện Học sinh"
          >
            👁️ Học sinh
          </button>
        )}

        <div
          onClick={onOpenRoomModal}
          className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors"
          title="Xem QR phòng học"
        >
          <QrCode className="w-4 h-4" />
        </div>

        {onLogout ? (
          <button
            onClick={onLogout}
            className="px-2 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold hover:bg-rose-100 transition-colors flex items-center gap-1 cursor-pointer"
            title="Đăng xuất"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-600" />
            <span className="hidden xs:inline">Đăng xuất</span>
          </button>
        ) : onOpenLogin ? (
          <button
            onClick={onOpenLogin}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              isAdmin ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'
            }`}
            title="Đổi vai trò / Đăng nhập"
          >
            {currentUser?.avatar || (isAdmin ? '👨‍🏫' : '👦')}
          </button>
        ) : null}

        <button
          onClick={onOpenDownloadGuide}
          className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center cursor-pointer hover:bg-indigo-100 transition-colors"
          title="Tải & Cài đặt ứng dụng"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
