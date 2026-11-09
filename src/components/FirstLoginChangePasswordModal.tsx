import React, { useState } from 'react';
import { KeyRound, ShieldAlert, CheckCircle2, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { UserAccount } from '../types';
import { soundManager } from '../utils/audio';
import confetti from 'canvas-confetti';

interface FirstLoginChangePasswordModalProps {
  currentUser: UserAccount;
  onPasswordChanged: (newPassword: string) => void;
}

export const FirstLoginChangePasswordModal: React.FC<FirstLoginChangePasswordModalProps> = ({
  currentUser,
  onPasswordChanged,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 3) {
      setError('Mật khẩu mới phải có ít nhất 3 ký tự!');
      return;
    }

    if (newPassword === '123' || (currentUser.password && newPassword === currentUser.password)) {
      setError('Vui lòng chọn mật khẩu mới khác với mật khẩu mặc định/tạm thời (123)!');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Xác nhận mật khẩu không khớp. Vui lòng nhập lại!');
      return;
    }

    soundManager.playFanfare();
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.6 },
    });
    onPasswordChanged(newPassword);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header with security lock icon */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white p-6 text-center relative flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-3 shadow-inner">
            <KeyRound className="w-7 h-7 text-white" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full mb-1">
            Bảo mật tài khoản
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Đổi mật khẩu lần đầu
          </h2>
          <p className="text-xs text-white/90 font-medium mt-1">
            Xin chào <strong>{currentUser.fullName}</strong>! Tài khoản của bạn được cấp mật khẩu tạm thời. Vui lòng thiết lập mật khẩu mới để tiếp tục.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tên tài khoản của bạn
            </label>
            <input
              type="text"
              value={currentUser.username}
              disabled
              className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl bg-slate-100 text-slate-500 font-mono font-bold cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Mật khẩu mới của bạn <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới (khác 123)..."
                className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl pr-10 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                required
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Xác nhận mật khẩu mới <span className="text-rose-500">*</span>
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại chính xác mật khẩu mới..."
              className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80 text-amber-900 text-xs">
            <p className="leading-relaxed">
              💡 <strong>Lưu ý:</strong> Sau khi đổi mật khẩu thành công, bạn sẽ sử dụng mật khẩu mới này để đăng nhập cho những lần tiếp theo.
            </p>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-orange-500 to-rose-600 hover:from-orange-600 hover:to-rose-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-orange-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Lưu mật khẩu mới & Bắt đầu làm việc</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
