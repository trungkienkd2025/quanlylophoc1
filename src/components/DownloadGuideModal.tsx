import React, { useState } from 'react';
import {
  X,
  Smartphone,
  Laptop,
  Download,
  Share2,
  ExternalLink,
  Check,
  Copy,
  Layers
} from 'lucide-react';

interface DownloadGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DownloadGuideModal: React.FC<DownloadGuideModalProps> = ({ isOpen, onClose }) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const currentUrl = window.location.href;

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Tải & Cài đặt QLLH.Pro</h3>
              <p className="text-xs text-slate-500">Cách cài ứng dụng lên điện thoại và máy tính</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Option 1: Install as Mobile App */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
              <Smartphone className="w-5 h-5" />
              <span>1. Cài đặt vào Điện thoại (Android & iPhone) như ứng dụng thật</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600 pt-1">
              {/* Android */}
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <p className="font-bold text-slate-800 mb-1">📱 Dành cho máy Android:</p>
                <ol className="list-decimal list-inside space-y-1 leading-relaxed">
                  <li>Mở link web này bằng <strong>Google Chrome</strong> hoặc <strong>Cốc Cốc</strong>.</li>
                  <li>Nhấn vào biểu tượng <strong>dấu 3 chấm (⋮)</strong> ở góc trên bên phải.</li>
                  <li>Chọn <strong>"Cài đặt ứng dụng"</strong> hoặc <strong>"Thêm vào Màn hình chính"</strong>.</li>
                  <li>Biểu tượng <strong>QLLH.Pro</strong> sẽ xuất hiện trên màn hình điện thoại!</li>
                </ol>
              </div>

              {/* iOS */}
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <p className="font-bold text-slate-800 mb-1">🍏 Dành cho iPhone / iPad:</p>
                <ol className="list-decimal list-inside space-y-1 leading-relaxed">
                  <li>Mở link web này bằng trình duyệt <strong>Safari</strong>.</li>
                  <li>Nhấn nút <strong>Chia sẻ (biểu tượng ô vuông có mũi tên ↑)</strong> ở thanh dưới.</li>
                  <li>Cuộn xuống chọn <strong>"Thêm vào MH chính" (Add to Home Screen)</strong>.</li>
                  <li>Nhấn <strong>Thêm</strong> để dùng như một ứng dụng độc lập!</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Option 2: Install on Laptop / PC */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
              <Laptop className="w-5 h-5" />
              <span>2. Cài đặt lên Máy tính (Laptop / PC Windows & Mac)</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Khi mở trang web trên trình duyệt <strong>Google Chrome</strong>, <strong>Microsoft Edge</strong> hoặc <strong>Cốc Cốc</strong> trên máy tính, bạn sẽ thấy <strong>biểu tượng máy tính có mũi tên tải xuống</strong> trên thanh nhập địa chỉ web (URL bar).
            </p>
            <p className="text-xs text-slate-600">
              Nhấn <strong>"Cài đặt QLLH.Pro"</strong> để ứng dụng chạy độc lập, toàn màn hình và có biểu tượng riêng trên màn hình Desktop của bạn.
            </p>
          </div>

          {/* Option 3: Direct Link */}
          <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-900 uppercase tracking-wide">
                🔗 Đường link truy cập trực tiếp
              </span>
              <button
                onClick={handleCopy}
                className="px-2.5 py-1 bg-white hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold flex items-center gap-1 border border-blue-200 transition-colors shadow-2xs"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Đã sao chép link' : 'Sao chép link'}</span>
              </button>
            </div>
            <p className="text-xs text-slate-600 break-all font-mono bg-white p-2.5 rounded-lg border border-blue-100 select-all">
              {currentUrl}
            </p>
            <p className="text-[11px] text-slate-500">
              Bạn có thể gửi link này qua Zalo, Messenger để mở trên bất kỳ điện thoại hoặc máy tính nào.
            </p>
          </div>

          {/* Option 4: Source code download */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
              <Layers className="w-4 h-4 text-slate-600" />
              <span>3. Tải toàn bộ mã nguồn (Source Code) về máy tính</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Nếu bạn muốn tải toàn bộ mã nguồn dự án về máy tính để phát triển thêm hoặc lưu trữ:
            </p>
            <div className="bg-slate-900 text-slate-200 p-3 rounded-xl font-mono text-xs space-y-1">
              <p className="text-slate-400"># Chạy ứng dụng trên máy cá nhân sau khi tải về:</p>
              <p><span className="text-emerald-400">npm</span> install</p>
              <p><span className="text-emerald-400">npm</span> run dev</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            Đã hiểu, đóng hướng dẫn
          </button>
        </div>
      </div>
    </div>
  );
};
