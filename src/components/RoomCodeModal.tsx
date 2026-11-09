import React, { useState } from 'react';
import { X, Copy, Check, RefreshCw, Share2, Users, ShieldCheck } from 'lucide-react';

interface RoomCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
  onRegenerateCode: () => void;
  teacherName: string;
}

export const RoomCodeModal: React.FC<RoomCodeModalProps> = ({
  isOpen,
  onClose,
  roomCode,
  onRegenerateCode,
  teacherName,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const joinUrl = `${window.location.origin}/join?code=${roomCode}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Phòng học trực tuyến</h3>
              <p className="text-xs text-slate-500">Dành cho học sinh kết nối trong lớp</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 text-center space-y-5">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Mã phòng học của {teacherName}
            </span>
            <div className="mt-2 flex items-center justify-center gap-3">
              <div className="px-6 py-2.5 bg-blue-50 border-2 border-blue-200 rounded-xl text-3xl font-mono font-extrabold text-blue-600 tracking-widest shadow-inner">
                {roomCode}
              </div>
              <button
                onClick={handleCopyCode}
                className="p-3 bg-white border border-slate-200 hover:border-blue-300 rounded-xl text-slate-600 hover:text-blue-600 transition-colors shadow-2xs"
                title="Sao chép mã"
              >
                {copied ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* QR Code Representation (SVG clean QR pattern) */}
          <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="bg-white p-3 rounded-lg shadow-xs border border-slate-200">
              <svg
                className="w-44 h-44 text-slate-800"
                viewBox="0 0 100 100"
                fill="currentColor"
              >
                {/* SVG QR Code Simulation */}
                <path d="M0 0h30v30H0zm6 6h18v18H6z" />
                <path d="M10 10h10v10H10z" />
                <path d="M70 0h30v30H70zm6 6h18v18H76z" />
                <path d="M80 10h10v10H80z" />
                <path d="M0 70h30v30H0zm6 6h18v18H6z" />
                <path d="M10 80h10v10H10z" />
                {/* Random QR clusters */}
                <rect x="36" y="8" width="6" height="6" />
                <rect x="48" y="14" width="8" height="6" />
                <rect x="42" y="24" width="10" height="6" />
                <rect x="8" y="38" width="14" height="6" />
                <rect x="28" y="44" width="8" height="8" />
                <rect x="44" y="40" width="12" height="12" />
                <rect x="62" y="38" width="8" height="6" />
                <rect x="78" y="42" width="16" height="6" />
                <rect x="36" y="62" width="10" height="6" />
                <rect x="52" y="60" width="8" height="12" />
                <rect x="68" y="68" width="6" height="6" />
                <rect x="80" y="60" width="14" height="8" />
                <rect x="42" y="78" width="12" height="10" />
                <rect x="64" y="82" width="12" height="6" />
                <rect x="84" y="78" width="10" height="14" />
              </svg>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Học sinh dùng điện thoại hoặc máy tính bảng quét mã để vào phòng
            </p>
          </div>

          {/* Action Row */}
          <div className="space-y-2">
            <button
              onClick={handleCopyLink}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-xs"
            >
              <Share2 className="w-4 h-4" />
              {copiedLink ? 'Đã sao chép link tham gia!' : 'Sao chép đường link cho học sinh'}
            </button>

            <button
              onClick={onRegenerateCode}
              className="w-full py-2 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
              Tạo mã phòng học ngẫu nhiên mới
            </button>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-emerald-600 bg-emerald-50 py-1.5 px-3 rounded-lg">
            <ShieldCheck className="w-4 h-4" />
            <span>Phòng học được bảo vệ, chỉ học sinh có mã mới tham gia được</span>
          </div>
        </div>
      </div>
    </div>
  );
};
