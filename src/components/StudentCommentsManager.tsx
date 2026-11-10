import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  Download,
  Upload,
  FileSpreadsheet,
  Check,
  AlertCircle,
  Award,
  Sparkles,
  FileText,
  HelpCircle,
  RotateCcw,
} from 'lucide-react';

import { UserAccount } from '../types';
import { isClassVisibleForUser } from '../utils/userScope';
import {
  getSavedClasses,
  getSavedStudents,
  getSavedGrades,
  getSavedCurrentYear,
  getSavedCustomComments,
  saveCustomCommentsPermanently,
  getSavedGradeSortType,
  saveGradeSortTypePermanently,
} from '../utils/dbStorage';

interface ClassItem {
  id: string;
  year: string;
  name: string;
  grade: string;
  bg?: string;
  createdBy?: string;
  createdByName?: string;
}

interface StudentRecord {
  id: string;
  classId: string;
  code: string;
  name: string;
  dob?: string;
  gender?: string;
  note?: string;
  orderIndex?: number;
}

interface GradeRecord {
  lt: string;
  th: string;
  total: string;
  rank: string;
}

// Function to sort students exactly matching Thẻ Điểm (Grade Tab)
export const sortStudentsLikeGradeTab = (
  students: StudentRecord[],
  sortType: 'default' | 'alphabet' | 'code'
): StudentRecord[] => {
  return [...students].sort((a, b) => {
    if (sortType === 'alphabet') {
      const nameA = a.name.trim().split(' ').pop() || '';
      const nameB = b.name.trim().split(' ').pop() || '';
      const cmp = nameA.localeCompare(nameB, 'vi');
      if (cmp !== 0) return cmp;
      return a.name.localeCompare(b.name, 'vi');
    }
    if (sortType === 'code') {
      return a.code.localeCompare(b.code, 'vi', { numeric: true });
    }
    // 'default' (Chuẩn): Thứ tự chuẩn ban đầu khi đưa vào danh sách từ file mẫu
    if (a.orderIndex !== undefined && b.orderIndex !== undefined) {
      return a.orderIndex - b.orderIndex;
    }
    return 0;
  });
};

// Built-in high quality pedagogical comments for Tin học (Computer Science)
const DEFAULT_COMMENTS_T = [
  'Em học giỏi, tiếp thu bài nhanh và thực hành tốt.',
  'Em làm bài tốt, tích cực tham gia xây dựng bài học.',
  'Thao tác máy tính thành thạo, hoàn thành xuất sắc các bài tập.',
  'Nắm vững kiến thức bài học, sáng tạo trong các bài thực hành.',
  'Kỹ năng tin học tốt, nhiệt tình giúp đỡ bạn bè cùng tiến bộ.',
  'Chăm chỉ, hoàn thành bài tập nhanh và chuẩn xác.',
  'Hiểu bài sâu sắc, thao tác máy chuẩn và tư duy tốt.',
  'Thực hiện tốt các yêu cầu của giáo viên, năng nổ trong học tập.',
];

const DEFAULT_COMMENTS_H = [
  'Em hoàn thành các nội dung bài học theo yêu cầu.',
  'Có cố gắng trong giờ học, thao tác máy tính cơ bản đạt yêu cầu.',
  'Hoàn thành bài tập thực hành, cần chú ý rèn thêm tốc độ gõ phím.',
  'Nắm được kiến thức cơ bản, cần tự tin hơn khi thực hành trên máy.',
  'Có tinh thần học tập, cần tập trung hơn trong giờ thực hành.',
  'Hoàn thành bài học, tích cực luyện tập thêm các thao tác cơ bản.',
  'Thực hiện được các bài tập, cần rèn luyện thêm kỹ năng sử dụng phần mềm.',
  'Hoàn thành nội dung môn học, chú ý lắng nghe giáo viên hướng dẫn.',
];

interface StudentCommentsManagerProps {
  isModal?: boolean;
  onCloseModal?: () => void;
  currentUser?: UserAccount;
}

export const StudentCommentsManager: React.FC<StudentCommentsManagerProps> = ({
  isModal = false,
  onCloseModal,
  currentUser,
}) => {
  // Current academic year
  const [currentYear] = useState<string>(() => {
    return localStorage.getItem('qllh_current_year') || '2026-2027';
  });

  // Sort order synced with Thẻ Điểm ('default' = Chuẩn, 'alphabet', 'code')
  const [sortOrder, setSortOrder] = useState<'default' | 'alphabet' | 'code'>(() => getSavedGradeSortType(currentUser));

  // Classes list
  const [classesList, setClassesList] = useState<ClassItem[]>(() => getSavedClasses(currentUser));

  // Students list
  const [studentsList, setStudentsList] = useState<StudentRecord[]>(() => getSavedStudents(currentUser));

  // Grades data: { [studentId_term]: { lt, th, total, rank } }
  const [gradeData, setGradeData] = useState<Record<string, GradeRecord>>(() => getSavedGrades(currentUser));

  // Selection states
  const [selectedGrade, setSelectedGrade] = useState<string>('1'); // '1' | '2' | '3' | '4' | '5' | 'all'
  const [selectedTerm, setSelectedTerm] = useState<'hk1' | 'hk2'>('hk1');

  // Comments state
  const [commentsT, setCommentsT] = useState<string[]>(() => {
    const saved = getSavedCustomComments(currentUser, 'T');
    return saved.length > 0 ? saved : DEFAULT_COMMENTS_T;
  });

  const [commentsH, setCommentsH] = useState<string[]>(() => {
    const saved = getSavedCustomComments(currentUser, 'H');
    return saved.length > 0 ? saved : DEFAULT_COMMENTS_H;
  });

  const [fileTName, setFileTName] = useState<string>(() => {
    return localStorage.getItem('qllh_custom_comments_t_name') || '';
  });

  const [fileHName, setFileHName] = useState<string>(() => {
    return localStorage.getItem('qllh_custom_comments_h_name') || '';
  });

  const fileTInputRef = useRef<HTMLInputElement>(null);
  const fileHInputRef = useRef<HTMLInputElement>(null);

  // Sync comments changes to user-scoped storage
  useEffect(() => {
    saveCustomCommentsPermanently(commentsT, currentUser, 'T');
  }, [commentsT, currentUser?.id]);

  useEffect(() => {
    saveCustomCommentsPermanently(commentsH, currentUser, 'H');
  }, [commentsH, currentUser?.id]);

  useEffect(() => {
    localStorage.setItem('qllh_custom_comments_t_name', fileTName);
  }, [fileTName]);

  useEffect(() => {
    localStorage.setItem('qllh_custom_comments_h_name', fileHName);
  }, [fileHName]);

  // Sync background data & sort order from Thẻ Điểm
  useEffect(() => {
    const handleSync = () => {
      try {
        setClassesList(getSavedClasses(currentUser));
        setStudentsList(getSavedStudents(currentUser));
        setGradeData(getSavedGrades(currentUser));
        const savedSort = getSavedGradeSortType(currentUser);
        setSortOrder(savedSort);
        const commT = getSavedCustomComments(currentUser, 'T');
        if (commT && commT.length > 0) {
          setCommentsT((prev) => (JSON.stringify(prev) === JSON.stringify(commT) ? prev : commT));
        }
        const commH = getSavedCustomComments(currentUser, 'H');
        if (commH && commH.length > 0) {
          setCommentsH((prev) => (JSON.stringify(prev) === JSON.stringify(commH) ? prev : commH));
        }
      } catch {}
    };

    const handleSortChanged = (e: any) => {
      if (e?.detail) {
        setSortOrder(e.detail);
      } else {
        const savedSort = getSavedGradeSortType(currentUser);
        setSortOrder(savedSort);
      }
    };

    handleSync();
    window.addEventListener('qllh_data_updated', handleSync);
    window.addEventListener('qllh_grade_sort_changed', handleSortChanged);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('qllh_data_updated', handleSync);
      window.removeEventListener('qllh_grade_sort_changed', handleSortChanged);
      window.removeEventListener('storage', handleSync);
    };
  }, [currentUser?.id, currentUser?.username]);

  const handleSortOrderChange = (newOrder: 'default' | 'alphabet' | 'code') => {
    setSortOrder(newOrder);
    saveGradeSortTypePermanently(newOrder, currentUser);
    window.dispatchEvent(new CustomEvent('qllh_grade_sort_changed', { detail: newOrder }));
  };

  // Filter classes belonging to selected grade and current year AND current user
  const matchingClasses = useMemo(() => {
    const yearFiltered = classesList.filter(
      (c) => c.year === currentYear && isClassVisibleForUser(c, currentUser)
    );
    if (selectedGrade === 'all') {
      return yearFiltered.sort((a, b) => a.name.localeCompare(b.name, 'vi', { numeric: true }));
    }

    return yearFiltered
      .filter((c) => {
        const gradeClean = c.grade ? String(c.grade).replace(/[^0-9]/g, '') : '';
        const nameFirstChar = c.name.trim().charAt(0);
        return gradeClean === selectedGrade || nameFirstChar === selectedGrade;
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'vi', { numeric: true }));
  }, [classesList, currentYear, selectedGrade, currentUser]);

  // Read uploaded Excel comment file (Image 1 format)
  const handleImportCommentsFile = (file: File, type: 'T' | 'H') => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        if (!buffer) return;

        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });

        if (!rawRows || rawRows.length === 0) {
          alert('File Excel trống, không tìm thấy nhận xét nào!');
          return;
        }

        const parsedComments: string[] = [];
        for (const row of rawRows) {
          const keys = Object.keys(row);
          // Look for 'nhận xét', 'danh gia', 'comment', or take column 2/1
          const matchedKey =
            keys.find((k) => {
              const lower = k.toLowerCase().trim();
              return (
                lower.includes('nhận xét') ||
                lower.includes('nhan xet') ||
                lower.includes('đánh giá') ||
                lower.includes('danh gia') ||
                lower.includes('comment')
              );
            }) || keys[1] || keys[0];

          const val = row[matchedKey] ? String(row[matchedKey]).trim() : '';
          // Ignore header label or purely numeric values (like STT)
          if (
            val &&
            isNaN(Number(val)) &&
            !val.toLowerCase().startsWith('nhận xét') &&
            !val.toLowerCase().startsWith('nhan xet')
          ) {
            parsedComments.push(val);
          }
        }

        // Fallback: check all cells if none matched
        if (parsedComments.length === 0) {
          for (const row of rawRows) {
            for (const val of Object.values(row)) {
              const str = String(val).trim();
              if (str && isNaN(Number(str)) && str.length > 3) {
                parsedComments.push(str);
                break;
              }
            }
          }
        }

        if (parsedComments.length > 0) {
          if (type === 'T') {
            setCommentsT(parsedComments);
            setFileTName(file.name);
          } else {
            setCommentsH(parsedComments);
            setFileHName(file.name);
          }
          alert(`✅ Đã nạp thành công ${parsedComments.length} nhận xét loại ${type} từ file ${file.name}!`);
        } else {
          alert('Không tìm thấy nhận xét hợp lệ! File cần có cột "nhận xét" (như ảnh 1).');
        }
      } catch (err) {
        console.error('Import comments error:', err);
        alert('Lỗi đọc file Excel! Vui lòng chọn file .xlsx hoặc .xls đúng định dạng.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Download Sample Template for T or H (Image 1 format)
  const handleDownloadSampleFile = (type: 'T' | 'H') => {
    const sampleList = type === 'T' ? DEFAULT_COMMENTS_T : DEFAULT_COMMENTS_H;
    const rows = sampleList.map((cmt, idx) => ({
      STT: idx + 1,
      'nhận xét': cmt,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [{ wch: 8 }, { wch: 60 }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Nhan_Xet_Loai_${type}`);
    XLSX.writeFile(workbook, `Mau_Nhan_Xet_Loai_${type}.xlsx`);
  };

  // Reset to default sample comments
  const handleResetDefaultComments = (type: 'T' | 'H') => {
    if (confirm(`Đặt lại danh sách nhận xét loại ${type} về mẫu chuẩn ban đầu?`)) {
      if (type === 'T') {
        setCommentsT(DEFAULT_COMMENTS_T);
        setFileTName('');
      } else {
        setCommentsH(DEFAULT_COMMENTS_H);
        setFileHName('');
      }
    }
  };

  // Helper to sanitize Excel sheet names (max 31 chars, no invalid chars /\?*[]:)
  const sanitizeSheetName = (name: string, existing: Set<string>): string => {
    let clean = name.replace(/[\/\\?*\[\]:]/g, '-').trim();
    if (!clean) clean = 'Lop';
    if (clean.length > 28) clean = clean.substring(0, 28);

    let finalName = clean;
    let counter = 1;
    while (existing.has(finalName.toLowerCase())) {
      finalName = `${clean.substring(0, 24)} (${counter})`;
      counter++;
    }
    existing.add(finalName.toLowerCase());
    return finalName;
  };

  // Perform Generation & Export Excel (Image 2 format)
  const handleExecuteExport = () => {
    if (matchingClasses.length === 0) {
      alert(`Không tìm thấy lớp nào thuộc Khối ${selectedGrade} trong năm học ${currentYear}!`);
      return;
    }

    if (commentsT.length === 0 || commentsH.length === 0) {
      alert('Vui lòng đảm bảo đã có danh sách nhận xét cho cả loại T và loại H!');
      return;
    }

    const workbook = XLSX.utils.book_new();
    const usedSheetNames = new Set<string>();
    let totalExportedStudents = 0;

    // Process each class as its own sheet
    for (const cls of matchingClasses) {
      // Sort students strictly matching Thẻ Điểm (Chuẩn / Alphabet / Mã HS)
      const rawClassStudents = studentsList.filter((s) => s.classId === cls.id);
      const classStudents = sortStudentsLikeGradeTab(rawClassStudents, sortOrder);

      let countT = 0;
      let countH = 0;

      // Exact layout as in Image 2:
      // STT | Mã HS | Họ và tên | Xếp Loại | Tổng Điểm | đánh giá
      const sheetRows = classStudents.map((st, idx) => {
        totalExportedStudents++;
        const key = `${st.id}_${selectedTerm}`;
        const keyCode = st.code ? `${st.code}_${selectedTerm}` : '';
        const rec = gradeData[key] || (keyCode ? gradeData[keyCode] : null) || { lt: '', th: '', total: '', rank: '' };

        // Determine rank and total score from grade data
        let rank = (rec.rank || '').trim().toUpperCase();
        const totalNum = rec.total !== '' ? Number(rec.total) : NaN;

        if (!rank) {
          if (!isNaN(totalNum)) {
            rank = totalNum >= 9 ? 'T' : 'H';
          } else {
            rank = 'H'; // Default to H if not graded yet
          }
        }

        // Pick comment according to rank with cyclic wrap-around
        let comment = '';
        if (rank === 'T') {
          comment = commentsT[countT % commentsT.length];
          countT++;
        } else {
          comment = commentsH[countH % commentsH.length];
          countH++;
        }

        return {
          STT: idx + 1,
          'Mã HS': st.code,
          'Họ và tên': st.name,
          'Xếp Loại': rank,
          'Tổng Điểm': rec.total !== '' ? Number(rec.total) : '',
          'đánh giá': comment,
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(
        sheetRows.length > 0
          ? sheetRows
          : [
              {
                STT: '',
                'Mã HS': '',
                'Họ và tên': '(Lớp chưa có học sinh)',
                'Xếp Loại': '',
                'Tổng Điểm': '',
                'đánh giá': '',
              },
            ]
      );

      // Set column widths matching Image 2
      worksheet['!cols'] = [
        { wch: 8 },  // STT
        { wch: 16 }, // Mã HS
        { wch: 26 }, // Họ và tên
        { wch: 14 }, // Xếp Loại
        { wch: 14 }, // Tổng Điểm
        { wch: 55 }, // đánh giá
      ];

      const sheetTitle = sanitizeSheetName(cls.name, usedSheetNames);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetTitle);
    }

    if (totalExportedStudents === 0) {
      alert(`Các lớp thuộc Khối ${selectedGrade} hiện chưa có học sinh nào!`);
      return;
    }

    const termSlug = selectedTerm === 'hk1' ? 'Hoc_Ky_1' : 'Ca_Nam';
    const gradeLabel = selectedGrade === 'all' ? 'Tat_Ca_Khoi' : `Khoi_${selectedGrade}`;
    const fileName = `Danh_Gia_Nhan_Xet_${gradeLabel}_${termSlug}.xlsx`;

    XLSX.writeFile(workbook, fileName);
    alert(
      `🎉 Xuất thành công file đánh giá cho ${matchingClasses.length} lớp (${totalExportedStudents} học sinh)! Mỗi lớp là 1 sheet theo đúng định dạng.`
    );
  };

  // Preview data for the first matching class
  const previewClass = matchingClasses[0] || null;
  const previewStudents = useMemo(() => {
    if (!previewClass) return [];
    const rawClassStudents = studentsList.filter((s) => s.classId === previewClass.id);
    return sortStudentsLikeGradeTab(rawClassStudents, sortOrder).slice(0, 8);
  }, [previewClass, studentsList, sortOrder]);

  return (
    <div className={`space-y-6 ${isModal ? 'p-2' : ''}`}>
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={fileTInputRef}
        accept=".xlsx, .xls"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImportCommentsFile(file, 'T');
          e.target.value = '';
        }}
      />

      <input
        type="file"
        ref={fileHInputRef}
        accept=".xlsx, .xls"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImportCommentsFile(file, 'H');
          e.target.value = '';
        }}
      />

      {/* Main Container Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-6">
        {/* Header Row */}
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                <Award className="w-5 h-5" />
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Chức năng nhận xét học sinh tự động (Excel)
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              Tự động phân bổ câu nhận xét theo xếp loại T / H từ thẻ điểm, xuất file Excel mỗi lớp là 1 sheet chuẩn theo ảnh mẫu.
            </p>
          </div>

          {isModal && onCloseModal && (
            <button
              onClick={onCloseModal}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl"
            >
              Đóng
            </button>
          )}
        </div>

        {/* Configuration Row: Khối lớp, Kỳ đánh giá & Thứ tự sắp xếp học sinh (Đồng bộ Thẻ Điểm) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          {/* 1. Chọn Khối Lớp */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              1. Khối lớp xuất nhận xét:
            </label>
            <div className="flex items-center gap-2">
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-[#0070F3] outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer shadow-2xs h-[38px]"
              >
                <option value="1">Khối 1 (Các lớp Khối 1)</option>
                <option value="2">Khối 2 (Các lớp Khối 2)</option>
                <option value="3">Khối 3 (Các lớp Khối 3)</option>
                <option value="4">Khối 4 (Các lớp Khối 4)</option>
                <option value="5">Khối 5 (Các lớp Khối 5)</option>
                <option value="all">Tất cả các khối (Khối 1 đến 5)</option>
              </select>
            </div>
            <p className="text-[11px] font-semibold text-slate-500 mt-1.5 truncate">
              Tìm thấy <strong className="text-slate-800">{matchingClasses.length} lớp</strong>: {matchingClasses.map((c) => c.name).join(', ') || 'Chưa có lớp'}
            </p>
          </div>

          {/* 2. Chọn Học kỳ */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              2. Kỳ đánh giá (Lấy điểm & xếp loại):
            </label>
            <div className="flex items-center gap-2 h-[38px]">
              <button
                type="button"
                onClick={() => setSelectedTerm('hk1')}
                className={`flex-1 h-full rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  selectedTerm === 'hk1'
                    ? 'bg-[#0070F3] text-white border-[#0070F3] shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                Học kỳ 1
              </button>
              <button
                type="button"
                onClick={() => setSelectedTerm('hk2')}
                className={`flex-1 h-full rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  selectedTerm === 'hk2'
                    ? 'bg-[#0070F3] text-white border-[#0070F3] shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                Cả năm
              </button>
            </div>
            <p className="text-[11px] font-semibold text-slate-500 mt-1.5">
              Lấy điểm tổng và xếp loại T / H từ thẻ Điểm
            </p>
          </div>

          {/* 3. Thứ tự sắp xếp học sinh (Đồng bộ Thẻ Điểm) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-800">
                3. Thứ tự học sinh:
              </label>
              <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-black">
                ✓ Khớp Thẻ Điểm
              </span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={sortOrder}
                onChange={(e) => handleSortOrderChange(e.target.value as 'default' | 'alphabet' | 'code')}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-[#0070F3] outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer shadow-2xs h-[38px]"
              >
                <option value="default">Chuẩn (Thứ tự ban đầu khi đưa vào)</option>
                <option value="alphabet">Alphabet (Theo tên A - Z)</option>
                <option value="code">Mã HS (Theo mã học sinh)</option>
              </select>
            </div>
            <p className="text-[11px] font-semibold text-slate-500 mt-1.5">
              {sortOrder === 'default'
                ? 'Đang xếp Chuẩn (giữ nguyên thứ tự ban đầu khi đưa vào).'
                : sortOrder === 'alphabet'
                ? 'Đang xếp Alphabet theo tên gọi học sinh.'
                : 'Đang xếp theo thứ tự mã số học sinh.'}
            </p>
          </div>
        </div>

        {/* 2 Nút Add File Excel (Ảnh 1 format) */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-3">
            3. Nạp 2 file Excel nhận xét cho loại H và loại T (như ảnh 1):
          </label>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Box 1: File Nhận xét loại H */}
            <div className="p-4 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-700">
                  <span>Nhận xét loại H (Hoàn thành)</span>
                </span>
                <span className="text-xs font-bold text-slate-600">
                  Đang có {commentsH.length} câu
                </span>
              </div>

              <p className="text-xs text-slate-600 line-clamp-2 italic">
                Ví dụ: "{commentsH[0]}"
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => fileHInputRef.current?.click()}
                  className="px-3.5 py-2 bg-[#0070F3] hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Nạp file Excel nhận xét H</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadSampleFile('H')}
                  className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
                  title="Tải file Excel mẫu loại H như ảnh 1"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Tải mẫu H</span>
                </button>

                {fileHName && (
                  <button
                    type="button"
                    onClick={() => handleResetDefaultComments('H')}
                    className="p-2 text-slate-400 hover:text-rose-500 rounded-xl"
                    title="Đặt lại câu nhận xét mặc định"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {fileHName && (
                <p className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Đã nạp từ file: {fileHName}
                </p>
              )}
            </div>

            {/* Box 2: File Nhận xét loại T */}
            <div className="p-4 rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-700">
                  <span>Nhận xét loại T (Hoàn thành Tốt)</span>
                </span>
                <span className="text-xs font-bold text-slate-600">
                  Đang có {commentsT.length} câu
                </span>
              </div>

              <p className="text-xs text-slate-600 line-clamp-2 italic">
                Ví dụ: "{commentsT[0]}"
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => fileTInputRef.current?.click()}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Nạp file Excel nhận xét T</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadSampleFile('T')}
                  className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
                  title="Tải file Excel mẫu loại T như ảnh 1"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Tải mẫu T</span>
                </button>

                {fileTName && (
                  <button
                    type="button"
                    onClick={() => handleResetDefaultComments('T')}
                    className="p-2 text-slate-400 hover:text-rose-500 rounded-xl"
                    title="Đặt lại câu nhận xét mặc định"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {fileTName && (
                <p className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Đã nạp từ file: {fileTName}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Ghi chú quy tắc tự động lặp lại nhận xét */}
        <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-medium">
          <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p>
            <strong>Cơ chế tự động:</strong> Mỗi học sinh được gán 1 câu nhận xét. Nếu số lượng nhận xét trong file ít hơn số học sinh của lớp, hệ thống sẽ tự động quay vòng lấy lại các nhận xét phía trên từ đầu đến cuối theo đúng thứ tự.
          </p>
        </div>

        {/* Nút Thực hiện Xuất file Excel */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-100">
          <div className="text-xs text-slate-600 font-semibold">
            Sẽ xuất file Excel gồm <strong>{matchingClasses.length} Sheet</strong> (mỗi sheet là 1 lớp).
          </div>

          <button
            type="button"
            onClick={handleExecuteExport}
            className="w-full sm:w-auto px-7 py-3 bg-[#0070F3] hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Thực hiện & Xuất file Excel đánh giá</span>
          </button>
        </div>

        {/* Live Preview Section (Khớp bố cục ảnh 2) */}
        {previewClass && previewStudents.length > 0 && (
          <div className="border border-slate-200 rounded-2xl overflow-hidden mt-6">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#0070F3]" />
                Xem trước bố cục xuất file (Mẫu lớp {previewClass.name} - Ảnh 2):
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                  Thứ tự: {sortOrder === 'default' ? 'Chuẩn (như thẻ điểm)' : sortOrder === 'alphabet' ? 'Alphabet' : 'Mã HS'}
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  Hiển thị trước {previewStudents.length} học sinh
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 text-[11px] uppercase tracking-wider font-bold">
                    <th className="p-3 w-12 text-center border-r border-slate-200">STT</th>
                    <th className="p-3 w-28 border-r border-slate-200">Mã HS</th>
                    <th className="p-3 border-r border-slate-200">Họ và tên</th>
                    <th className="p-3 text-center w-24 border-r border-slate-200">Xếp Loại</th>
                    <th className="p-3 text-center w-24 border-r border-slate-200">Tổng Điểm</th>
                    <th className="p-3">đánh giá</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {previewStudents.map((st, idx) => {
                    const key = `${st.id}_${selectedTerm}`;
                    const keyCode = st.code ? `${st.code}_${selectedTerm}` : '';
                    const rec = gradeData[key] || (keyCode ? gradeData[keyCode] : null) || { lt: '', th: '', total: '', rank: '' };
                    let rank = (rec.rank || '').trim().toUpperCase();
                    if (!rank) {
                      rank = rec.total !== '' && Number(rec.total) >= 9 ? 'T' : 'H';
                    }
                    const cmt =
                      rank === 'T'
                        ? commentsT[idx % commentsT.length]
                        : commentsH[idx % commentsH.length];

                    return (
                      <tr key={st.id} className="hover:bg-slate-50">
                        <td className="p-3 text-center font-mono text-slate-400 font-bold border-r border-slate-100">
                          {idx + 1}
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-700 border-r border-slate-100">
                          {st.code}
                        </td>
                        <td className="p-3 font-bold text-blue-900 border-r border-slate-100">
                          {st.name}
                        </td>
                        <td className="p-3 text-center border-r border-slate-100">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-xs font-black ${
                              rank === 'T'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {rank}
                          </span>
                        </td>
                        <td className="p-3 text-center font-bold text-slate-800 border-r border-slate-100">
                          {rec.total !== '' ? rec.total : '-'}
                        </td>
                        <td className="p-3 text-slate-700 font-medium">
                          {cmt}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
