import React, { useState, useRef, useEffect } from 'react';
import {
  Gamepad2,
  Gift,
  RotateCw,
  Sparkles,
  Trophy,
  Music,
  Activity,
  Smile,
  CheckCircle2,
  Volume2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { PRIZE_WHEEL_ITEMS } from '../data/mockData';
import { soundManager } from '../utils/audio';

export const GamesSection: React.FC = () => {
  const [activeGame, setActiveGame] = useState<'wheel' | 'mysteryBox' | 'brainBreak'>('wheel');

  // Lucky Wheel state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelWinner, setWheelWinner] = useState<string | null>(null);
  const rotationAngleRef = useRef(0);

  // Mystery Box state
  const [openedBoxes, setOpenedBoxes] = useState<number[]>([]);
  const mysteryRewards = [
    { title: '🌟 +3 Sao thi đua!', desc: 'Phần thưởng xuất sắc cho bạn may mắn nhất!' },
    { title: '🎁 1 Chiếc Sticker siêu cấp', desc: 'Nhận ngay sticker đáng yêu từ thầy cô!' },
    { title: '👏 Cả lớp dành 1 tràng pháo tay', desc: 'Âm thanh rộn ràng cổ vũ tinh thần học tập!' },
    { title: '👑 Quyền năng Trưởng nhóm hôm nay', desc: 'Em được chọn bạn cùng nhóm trong hoạt động tới!' },
    { title: '🎵 Bài hát tự chọn yêu thích', desc: 'Cả lớp cùng nghe giai điệu em yêu thích trong giờ ra chơi!' },
    { title: '⭐ +2 Sao chăm ngoan', desc: 'Một món quà bất ngờ tiếp thêm động lực!' },
  ];

  // Brain Break state
  const [breakSeconds, setBreakSeconds] = useState(120);
  const [isBreakRunning, setIsBreakRunning] = useState(false);
  const [exerciseIndex, setExerciseIndex] = useState(0);

  const exercises = [
    { title: 'Vươn vai hít thở sâu', desc: 'Hai tay đưa lên cao, hít vào thật sâu rồi từ từ thở ra 5 lần', icon: '🧘' },
    { title: 'Xoay cổ tay và khớp vai', desc: 'Xoay tròn cổ tay 10 vòng để thư giãn sau khi gõ bàn phím', icon: '🤸' },
    { title: 'Vỗ tay theo nhịp điệu vui nhộn', desc: 'Vỗ tay 1 - 2 - 3, cười thật tươi cùng các bạn trong bàn!', icon: '👏' },
    { title: 'Chớp mắt và nhìn xa 20 giây', desc: 'Nhìn ra ngoài cửa sổ để thư giãn mắt sau bài học trên màn hình', icon: '👀' },
  ];

  // Draw wheel on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = width / 2 - 12;

    const numSlices = PRIZE_WHEEL_ITEMS.length;
    const sliceAngle = (2 * Math.PI) / numSlices;

    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotationAngleRef.current);

    // Draw slices
    PRIZE_WHEEL_ITEMS.forEach((item, i) => {
      const angle = i * sliceAngle;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, angle, angle + sliceAngle);
      ctx.fillStyle = item.color;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // Text
      ctx.save();
      ctx.rotate(angle + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px Plus Jakarta Sans, sans-serif';
      ctx.fillText(item.text, radius - 20, 5);
      ctx.restore();
    });

    ctx.restore();

    // Center pin
    ctx.beginPath();
    ctx.arc(centerX, centerY, 22, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#f59e0b';
    ctx.stroke();

    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = '#1e293b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎯', centerX, centerY);
  }, [rotationAngleRef.current]);

  const handleSpinWheel = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setWheelWinner(null);

    const spinDuration = 3500;
    const startTime = performance.now();
    const startAngle = rotationAngleRef.current;
    const randomRotations = 5 + Math.random() * 4;
    const totalRotate = randomRotations * 2 * Math.PI;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / spinDuration, 1);
      // easeOutCubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const currentAngle = startAngle + totalRotate * ease;

      rotationAngleRef.current = currentAngle;

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const width = canvas.width;
          const height = canvas.height;
          const centerX = width / 2;
          const centerY = height / 2;
          const radius = width / 2 - 12;
          const numSlices = PRIZE_WHEEL_ITEMS.length;
          const sliceAngle = (2 * Math.PI) / numSlices;

          ctx.clearRect(0, 0, width, height);
          ctx.save();
          ctx.translate(centerX, centerY);
          ctx.rotate(currentAngle);

          PRIZE_WHEEL_ITEMS.forEach((item, i) => {
            const angle = i * sliceAngle;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, radius, angle, angle + sliceAngle);
            ctx.fillStyle = item.color;
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();

            ctx.save();
            ctx.rotate(angle + sliceAngle / 2);
            ctx.textAlign = 'right';
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 13px Plus Jakarta Sans, sans-serif';
            ctx.fillText(item.text, radius - 20, 5);
            ctx.restore();
          });

          ctx.restore();

          // Center pin
          ctx.beginPath();
          ctx.arc(centerX, centerY, 22, 0, 2 * Math.PI);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.lineWidth = 4;
          ctx.strokeStyle = '#f59e0b';
          ctx.stroke();
          ctx.font = 'bold 14px sans-serif';
          ctx.fillStyle = '#1e293b';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🎯', centerX, centerY);
        }
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);
        // Calculate winning slice
        const normalizedAngle = (2 * Math.PI - (currentAngle % (2 * Math.PI))) % (2 * Math.PI);
        const sliceAngle = (2 * Math.PI) / PRIZE_WHEEL_ITEMS.length;
        const winnerIndex = Math.floor(normalizedAngle / sliceAngle);
        const winner = PRIZE_WHEEL_ITEMS[winnerIndex] || PRIZE_WHEEL_ITEMS[0];
        setWheelWinner(winner.text);
        soundManager.playFanfare();

        confetti({
          particleCount: 80,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#F59E0B', '#3B82F6', '#10B981', '#EC4899']
        });
      }
    };

    requestAnimationFrame(animate);
  };

  const handleOpenBox = (boxIdx: number) => {
    if (openedBoxes.includes(boxIdx)) return;
    setOpenedBoxes([...openedBoxes, boxIdx]);
    soundManager.playFanfare();
    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.7 }
    });
  };

  // Brain break timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isBreakRunning && breakSeconds > 0) {
      interval = setInterval(() => {
        setBreakSeconds((prev) => {
          if (prev <= 1) {
            soundManager.playAlarm();
            setIsBreakRunning(false);
            return 0;
          }
          if (prev % 30 === 0) {
            setExerciseIndex((i) => (i + 1) % exercises.length);
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isBreakRunning, breakSeconds]);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
              Khu vui chơi & Thư giãn
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500">Hoạt động trong lớp học</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mt-1">Giải trí lớp học</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Không gian trò chơi, vòng quay khen thưởng và hoạt động thư giãn sau giờ học
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveGame('wheel')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeGame === 'wheel' ? 'bg-white text-amber-700 shadow-2xs' : 'text-slate-600'
            }`}
          >
            Vòng quay may mắn
          </button>
          <button
            onClick={() => setActiveGame('mysteryBox')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeGame === 'mysteryBox' ? 'bg-white text-purple-700 shadow-2xs' : 'text-slate-600'
            }`}
          >
            Hộp quà bí mật
          </button>
          <button
            onClick={() => setActiveGame('brainBreak')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeGame === 'brainBreak' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600'
            }`}
          >
            Vận động 2 phút
          </button>
        </div>
      </div>

      {/* GAME 1: LUCKY WHEEL */}
      {activeGame === 'wheel' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xs flex flex-col items-center">
          <div className="text-center mb-6">
            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">
              VÒNG QUAY MAY MẮN
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              Quay thưởng khen thưởng học sinh
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Nhấn nút quay để chọn phần quà hoặc nhiệm vụ bất ngờ cho học sinh
            </p>
          </div>

          {/* Wheel Container with Pointer */}
          <div className="relative flex flex-col items-center justify-center my-4">
            {/* Top Pointer arrow */}
            <div className="absolute -top-3 z-20 w-0 h-0 border-x-8 border-x-transparent border-t-[18px] border-t-rose-600 drop-shadow-md" />

            <canvas
              ref={canvasRef}
              width={340}
              height={340}
              className="rounded-full shadow-lg border-4 border-white"
            />
          </div>

          {/* Winner announcement */}
          {wheelWinner && (
            <div className="my-3 px-6 py-3 bg-gradient-to-r from-amber-50 to-yellow-100 border border-amber-300 rounded-2xl text-center animate-in zoom-in-95">
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                Kết quả quay thưởng
              </span>
              <p className="text-2xl font-black text-slate-900 mt-1">{wheelWinner}</p>
            </div>
          )}

          {/* Spin Trigger Button */}
          <div className="mt-4 flex flex-col items-center gap-3">
            <button
              onClick={handleSpinWheel}
              disabled={isSpinning}
              className="px-8 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 text-white rounded-2xl font-black text-base shadow-lg transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <RotateCw className={`w-5 h-5 ${isSpinning ? 'animate-spin' : ''}`} />
              <span>{isSpinning ? 'Đang quay vòng...' : 'Quay thưởng ngay!'}</span>
            </button>
            <span className="text-xs text-slate-400">
              Có thể tùy chỉnh các ô thưởng trong tiện ích
            </span>
          </div>
        </div>
      )}

      {/* GAME 2: MYSTERY BOXES */}
      {activeGame === 'mysteryBox' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xs">
          <div className="text-center mb-6">
            <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">
              HỘP QUÀ BÍ MẬT
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              Chọn 1 hộp quà may mắn
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Cho học sinh phát biểu chọn một số từ 1 đến 6 và mở quà
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {mysteryRewards.map((reward, i) => {
              const isOpened = openedBoxes.includes(i);
              return (
                <div
                  key={i}
                  onClick={() => handleOpenBox(i)}
                  className={`h-44 rounded-2xl border-2 p-4 flex flex-col items-center justify-center text-center transition-all cursor-pointer relative overflow-hidden ${
                    isOpened
                      ? 'bg-gradient-to-b from-purple-50 to-indigo-50 border-purple-300 shadow-sm'
                      : 'bg-gradient-to-b from-slate-50 to-slate-100 hover:from-purple-50 hover:to-purple-100 border-slate-200 hover:border-purple-300 shadow-2xs hover:scale-102'
                  }`}
                >
                  <div className="absolute top-2.5 left-3 text-xs font-extrabold text-slate-400 font-mono">
                    #{i + 1}
                  </div>

                  {isOpened ? (
                    <div className="animate-in zoom-in-90 duration-200 space-y-1">
                      <span className="text-3xl block">🎉</span>
                      <p className="font-extrabold text-purple-900 text-sm">{reward.title}</p>
                      <p className="text-[11px] text-slate-500 leading-tight">{reward.desc}</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center space-y-2">
                      <div className="w-14 h-14 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md">
                        <Gift className="w-7 h-7" />
                      </div>
                      <span className="text-xs font-bold text-slate-700">Chạm để mở</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => setOpenedBoxes([])}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Đặt lại tất cả các hộp quà
            </button>
          </div>
        </div>
      )}

      {/* GAME 3: BRAIN BREAK 2 MINUTES */}
      {activeGame === 'brainBreak' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xs flex flex-col items-center text-center">
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
            GIỜ GIẢI LAO NĂNG ĐỘNG
          </span>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            Vận động thư giãn 2 phút
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Giúp học sinh thư giãn mắt, cột sống và nạp lại năng lượng cho bài học tiếp theo
          </p>

          {/* Big Timer */}
          <div className="my-8 flex flex-col items-center">
            <div className="w-48 h-48 rounded-full border-8 border-emerald-100 flex flex-col items-center justify-center bg-emerald-50/40 relative shadow-inner">
              <span className="text-4xl font-mono font-black text-emerald-700 tracking-wider">
                {Math.floor(breakSeconds / 60)}:
                {(breakSeconds % 60).toString().padStart(2, '0')}
              </span>
              <span className="text-xs text-slate-500 mt-1 font-medium">
                {isBreakRunning ? 'Đang đếm ngược' : 'Sẵn sàng'}
              </span>
            </div>
          </div>

          {/* Active Exercise Guidance */}
          <div className="max-w-md w-full p-5 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-left flex items-start gap-3">
            <span className="text-3xl select-none">{exercises[exerciseIndex].icon}</span>
            <div>
              <h4 className="font-bold text-emerald-900 text-sm">
                Động tác: {exercises[exerciseIndex].title}
              </h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {exercises[exerciseIndex].desc}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={() => setIsBreakRunning(!isBreakRunning)}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Activity className="w-4 h-4" />
              <span>{isBreakRunning ? 'Tạm dừng vận động' : 'Bắt đầu 2 phút vận động'}</span>
            </button>

            <button
              onClick={() => {
                setIsBreakRunning(false);
                setBreakSeconds(120);
              }}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
            >
              Đặt lại 2 phút
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
