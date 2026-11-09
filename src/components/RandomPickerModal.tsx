import React, { useState, useEffect } from 'react';
import { X, Shuffle, Star, Trophy, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Student } from '../types';
import { soundManager } from '../utils/audio';

interface RandomPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  onRewardStudent: (id: string) => void;
}

export const RandomPickerModal: React.FC<RandomPickerModalProps> = ({
  isOpen,
  onClose,
  students,
  onRewardStudent,
}) => {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [displayIndex, setDisplayIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setSelectedStudent(null);
      setIsSpinning(false);
      setDisplayIndex(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePickRandom = () => {
    if (students.length === 0 || isSpinning) return;

    setIsSpinning(true);
    setSelectedStudent(null);

    let counter = 0;
    const totalFlips = 25;
    const intervalTime = 60;

    const interval = setInterval(() => {
      counter++;
      const randomIdx = Math.floor(Math.random() * students.length);
      setDisplayIndex(randomIdx);
      soundManager.playTick();

      if (counter >= totalFlips) {
        clearInterval(interval);
        const finalStudent = students[randomIdx];
        setSelectedStudent(finalStudent);
        setIsSpinning(false);
        soundManager.playFanfare();

        confetti({
          particleCount: 70,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6'],
        });
      }
    }, intervalTime);
  };

  const currentDisplay = students[displayIndex] || students[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
              <Shuffle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Gọi tên ngẫu nhiên</h3>
              <p className="text-xs text-slate-500">Bốc thăm học sinh trả lời hoặc lên bảng</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Picker Arena */}
        <div className="p-8 text-center flex flex-col items-center">
          {/* Display Card */}
          <div
            className={`w-64 h-56 rounded-2xl flex flex-col items-center justify-center p-6 border-2 transition-all ${
              selectedStudent
                ? 'bg-gradient-to-b from-amber-50 to-yellow-100 border-amber-300 shadow-lg scale-105'
                : isSpinning
                ? 'bg-blue-50/70 border-blue-300 animate-pulse'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <span className="text-5xl mb-3 select-none">
              {selectedStudent ? selectedStudent.avatar : currentDisplay?.avatar || '🎓'}
            </span>

            <h4
              className={`font-black tracking-tight text-center ${
                selectedStudent
                  ? 'text-2xl text-slate-900 font-extrabold'
                  : 'text-xl text-slate-700'
              }`}
            >
              {selectedStudent ? selectedStudent.name : currentDisplay?.name || 'Sẵn sàng'}
            </h4>

            <p className="text-xs text-slate-500 mt-1 font-mono">
              {selectedStudent
                ? `${selectedStudent.code} · ${selectedStudent.stars} ⭐`
                : students.length === 0
                ? 'Lớp chưa có học sinh'
                : 'Nhấn nút để bốc thăm'}
            </p>

            {selectedStudent && (
              <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-200/60 px-3 py-1 rounded-full">
                <Trophy className="w-3.5 h-3.5 text-amber-600" />
                <span>Chúc mừng em!</span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="mt-6 w-full space-y-2">
            <button
              onClick={handlePickRandom}
              disabled={isSpinning || students.length === 0}
              className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 text-white rounded-xl font-bold text-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Shuffle className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} />
              <span>{isSpinning ? 'Đang quay...' : students.length === 0 ? 'Lớp chưa có học sinh' : 'Quay ngẫu nhiên'}</span>
            </button>

            {selectedStudent && (
              <button
                onClick={() => {
                  onRewardStudent(selectedStudent.id);
                  onClose();
                }}
                className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Star className="w-4 h-4 fill-white" />
                <span>Khen thưởng +1 Sao thi đua cho {selectedStudent.name}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
