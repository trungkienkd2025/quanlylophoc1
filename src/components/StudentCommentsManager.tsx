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
  getSavedGradeComments,
  saveGradeCommentsPermanently,
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

// Built-in pedagogical comments for Tin học per Grade (Khối 1 -> Khối 5)
const DEFAULT_GRADE_COMMENTS_T: Record<string, string[]> = {
  '1': [
    'Em chăm ngoan, làm quen với máy tính nhanh và thao tác chuột khéo léo.',
    'Em thực hành tốt các bài tập sử dụng chuột và nhận biết các bộ phận máy tính.',
    'Biết cách cầm chuột đúng cách, nhấp chuột và kéo thả chính xác.',
    'Hào hứng học tập, nhận biết nhanh màn hình, bàn phím và thân máy.',
    'Thực hành vẽ và tô màu phần mềm Paint rất khéo léo, sáng tạo.',
    'Ngồi đúng tư thế khi ngồi trước máy tính, giữ gìn thiết bị tốt.',
    'Tiếp thu bài nhanh, làm quen với bàn phím và gõ phím cơ bản rất tốt.',
    'Thực hành tốt, tích cực tham gia các trò chơi học tập trên máy tính.',
  ],
  '2': [
    'Em gõ phím nhanh, rèn luyện tư thế gõ 10 ngón đúng vị trí.',
    'Sử dụng chuột và bàn phím thành thạo, hoàn thành tốt các bài luyện gõ.',
    'Em thao tác trên phần mềm học tập tự tin và chuẩn xác.',
    'Có ý thức học tập tốt, mở và lưu bài vẽ đúng theo hướng dẫn.',
    'Nhớ vị trí các phím chức năng cơ bản như Enter, Spacebar, Backspace.',
    'Thực hành luyện gõ từ ngữ nhanh và chính xác.',
    'Chăm chỉ luyện tập gõ phím, hoàn thành xuất sắc các yêu cầu bài học.',
    'Thực hành thành thạo các thao tác cơ bản trên máy tính.',
  ],
  '3': [
    'Em thao tác tệp và thư mục nhanh chóng, biết cách lưu bài gọn gàng.',
    'Gõ tiếng Việt có dấu thành thạo theo kiểu gõ Telex/Vni.',
    'Tạo và đổi tên thư mục đúng quy định, biết quản lý dữ liệu học tập.',
    'Sử dụng phần mềm Unikey tốt, gõ đúng chính tả tiếng Việt.',
    'Biết tìm kiếm tranh ảnh trên Internet phục vụ cho việc học tập.',
    'Thao tác sao chép, di chuyển tệp và thư mục rất thành thạo.',
    'Làm bài thực hành nhanh, giúp đỡ bạn bè cùng hoàn thành bài tập.',
    'Hiểu bài sâu sắc, có kỹ năng sử dụng máy tính và quản lý tệp tốt.',
  ],
  '4': [
    'Soạn thảo văn bản và chèn hình ảnh trên Word rất đẹp mắt và chuẩn xác.',
    'Biết định dạng phông chữ, cỡ chữ, màu sắc và căn lề văn bản đúng chuẩn.',
    'Tạo bài trình chiếu PowerPoint sinh động, biết chèn hình và tạo hiệu ứng.',
    'Sử dụng bảng biểu và chèn tranh ảnh vào văn bản một cách sáng tạo.',
    'Biết sử dụng Internet an toàn, tìm kiếm thông tin học tập hiệu quả.',
    'Thực hành soạn thảo nhanh, bố cục trang văn bản hài hòa, rõ ràng.',
    'Thuyết trình tự tin với các slide trình chiếu tự thiết kế.',
    'Kỹ năng tin học xuất sắc, sáng tạo trong các bài thực hành.',
  ],
  '5': [
    'Tư duy lập trình tốt, hoàn thành xuất sắc các dự án Scratch/Logo.',
    'Thiết kế bài trình chiếu đa phương tiện ấn tượng, bố cục chuyên nghiệp.',
    'Nắm vững thuật toán cơ bản, biết điều khiển nhân vật chuyển động sáng tạo.',
    'Sử dụng phần mềm bảng tính và lập công thức tính toán thành thạo.',
    'Có khả năng tự học và giải quyết các bài toán lập trình rất tốt.',
    'Kỹ năng công nghệ thông tin nổi bật, tư duy logic và sáng tạo cao.',
    'Tích cực trao đổi, sáng tạo nhiều sản phẩm tin học có tính ứng dụng cao.',
    'Thao tác máy tính điêu luyện, tự tin thuyết trình sản phẩm công nghệ.',
  ],
};

const DEFAULT_GRADE_COMMENTS_H: Record<string, string[]> = {
  '1': [
    'Em hoàn thành nội dung làm quen với máy tính theo yêu cầu.',
    'Đã biết cách cầm chuột và nhấp chuột, cần rèn thêm kỹ năng kéo thả.',
    'Nhận biết được các bộ phận cơ bản của máy tính, chăm chú nghe giảng.',
    'Hoàn thành bài thực hành tô màu trên máy, cần chú ý tư thế ngồi học.',
    'Biết thao tác bật/tắt máy theo hướng dẫn của thầy cô.',
    'Có cố gắng trong các tiết thực hành, cần tự tin hơn khi sử dụng chuột.',
    'Nhận biết được hàng phím cơ bản, cần rèn luyện thêm.',
    'Thực hiện được các yêu cầu cơ bản của giáo viên trong giờ học.',
  ],
  '2': [
    'Em hoàn thành các bài học rèn luyện gõ bàn phím theo yêu cầu.',
    'Biết vị trí các phím cơ bản, cần rèn thêm tốc độ gõ phím.',
    'Thao tác mở và đóng phần mềm học tập đạt yêu cầu.',
    'Cần tập trung hơn trong giờ thực hành để gõ phím chuẩn xác hơn.',
    'Hoàn thành bài tập luyện gõ, cần chú ý dùng đủ các ngón tay.',
    'Biết mở bài tập trên máy tính và lưu lại theo hướng dẫn.',
    'Có tinh thần học hỏi, cần tích cực luyện tập gõ từ ngữ thường xuyên.',
    'Thực hiện được các thao tác cơ bản với bàn phím và chuột.',
  ],
  '3': [
    'Hoàn thành nội dung bài học về quản lý tệp và thư mục.',
    'Biết tạo thư mục cá nhân, cần chú ý cách đặt tên thư mục không dấu.',
    'Gõ được tiếng Việt có dấu, cần luyện tập thêm quy tắc gõ Telex/Vni.',
    'Thao tác lưu bài đúng nơi quy định, cần rèn thêm tốc độ thao tác.',
    'Nắm được các bước tìm kiếm thông tin cơ bản trên Internet.',
    'Có cố gắng trong giờ thực hành, cần tự tin hơn khi quản lý dữ liệu.',
    'Hoàn thành bài tập tại lớp, cần chú ý nghe hướng dẫn của giáo viên.',
    'Thực hiện được các thao tác sao chép tệp đơn giản.',
  ],
  '4': [
    'Hoàn thành bài tập soạn thảo văn bản và chèn hình ảnh theo yêu cầu.',
    'Biết định dạng chữ cơ bản, cần rèn thêm kỹ năng căn lề và bố cục.',
    'Tạo được các trang chiếu PowerPoint cơ bản, cần luyện thêm cách tạo hiệu ứng.',
    'Biết tìm kiếm và lưu hình ảnh vào bài làm, cần chú ý chọn hình phù hợp.',
    'Có ý thức học tập, cần chú ý kiểm tra chính tả khi soạn thảo văn bản.',
    'Hoàn thành bài thực hành trình chiếu, cần tự tin hơn khi trình bày.',
    'Nắm được kiến thức bài học, cần rèn luyện thêm kỹ năng sử dụng phần mềm.',
    'Thực hiện được các yêu cầu thực hành của giáo viên.',
  ],
  '5': [
    'Hoàn thành các nội dung bài học lập trình và trình chiếu theo yêu cầu.',
    'Hiểu các lệnh cơ bản trong Scratch/Logo, cần rèn thêm tư duy giải thuật.',
    'Tạo được bài trình chiếu hoàn chỉnh, cần chú ý phối hợp màu sắc hài hòa.',
    'Biết nhập dữ liệu vào bảng tính, cần rèn thêm cách lập công thức tính.',
    'Có tinh thần cố gắng trong học tập, cần chủ động hơn khi giải quyết bài toán.',
    'Hoàn thành dự án học tập đúng hạn, cần rèn thêm kỹ năng gỡ lỗi chương trình.',
    'Nắm được kiến thức tin học cơ bản, cần luyện tập thêm trên máy tính.',
    'Thực hiện đạt yêu cầu các bài thực hành được giao.',
  ],
};

const DEFAULT_COMMENTS_T = DEFAULT_GRADE_COMMENTS_T['1'];
const DEFAULT_COMMENTS_H = DEFAULT_GRADE_COMMENTS_H['1'];

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

  // Menu Khối nạp nhận xét: Khối 1 đến 5 (theo yêu cầu người dùng)
  const [uploadGrade, setUploadGrade] = useState<'1' | '2' | '3' | '4' | '5'>('1');

  // Ngân hàng nhận xét phân bổ độc lập theo từng Khối (Khối 1 -> Khối 5)
  const [gradeCommentsT, setGradeCommentsT] = useState<Record<string, string[]>>(() => {
    const saved = getSavedGradeComments(currentUser, 'T');
    const result: Record<string, string[]> = {};
    for (const g of ['1', '2', '3', '4', '5']) {
      result[g] = saved[g] && saved[g].length > 0 ? saved[g] : [...DEFAULT_GRADE_COMMENTS_T[g]];
    }
    return result;
  });

  const [gradeCommentsH, setGradeCommentsH] = useState<Record<string, string[]>>(() => {
    const saved = getSavedGradeComments(currentUser, 'H');
    const result: Record<string, string[]> = {};
    for (const g of ['1', '2', '3', '4', '5']) {
      result[g] = saved[g] && saved[g].length > 0 ? saved[g] : [...DEFAULT_GRADE_COMMENTS_H[g]];
    }
    return result;
  });

  // Tên file đã nạp theo từng khối
  const [fileGradeTNames, setFileGradeTNames] = useState<Record<string, string>>(() => {
    try {
      const raw = localStorage.getItem('qllh_file_grade_t_names');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const [fileGradeHNames, setFileGradeHNames] = useState<Record<string, string>>(() => {
    try {
      const raw = localStorage.getItem('qllh_file_grade_h_names');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const fileTInputRef = useRef<HTMLInputElement>(null);
  const fileHInputRef = useRef<HTMLInputElement>(null);

  // Tự động chuyển Khối nạp nhận xét khi người dùng chọn Khối xuất ở Mục 1
  useEffect(() => {
    if (selectedGrade !== 'all' && ['1', '2', '3', '4', '5'].includes(selectedGrade)) {
      setUploadGrade(selectedGrade as '1' | '2' | '3' | '4' | '5');
    }
  }, [selectedGrade]);

  // Lưu tên file theo khối
  useEffect(() => {
    localStorage.setItem('qllh_file_grade_t_names', JSON.stringify(fileGradeTNames));
  }, [fileGradeTNames]);

  useEffect(() => {
    localStorage.setItem('qllh_file_grade_h_names', JSON.stringify(fileGradeHNames));
  }, [fileGradeHNames]);

  // Sync background data & sort order from Thẻ Điểm
  useEffect(() => {
    const handleSync = () => {
      try {
        setClassesList(getSavedClasses(currentUser));
        setStudentsList(getSavedStudents(currentUser));
        setGradeData(getSavedGrades(currentUser));
        const savedSort = getSavedGradeSortType(currentUser);
        setSortOrder(savedSort);

        const commTByGrade = getSavedGradeComments(currentUser, 'T');
        if (commTByGrade && Object.keys(commTByGrade).length > 0) {
          setGradeCommentsT((prev) => {
            const next = { ...prev };
            for (const g of ['1', '2', '3', '4', '5']) {
              if (commTByGrade[g] && commTByGrade[g].length > 0) {
                next[g] = commTByGrade[g];
              }
            }
            return next;
          });
        }

        const commHByGrade = getSavedGradeComments(currentUser, 'H');
        if (commHByGrade && Object.keys(commHByGrade).length > 0) {
          setGradeCommentsH((prev) => {
            const next = { ...prev };
            for (const g of ['1', '2', '3', '4', '5']) {
              if (commHByGrade[g] && commHByGrade[g].length > 0) {
                next[g] = commHByGrade[g];
              }
            }
            return next;
          });
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

  // Nhận xét hiện tại của Khối đang được chọn trên Menu nạp
  const currentCommentsT = (gradeCommentsT[uploadGrade] && gradeCommentsT[uploadGrade].length > 0)
    ? gradeCommentsT[uploadGrade]
    : (DEFAULT_GRADE_COMMENTS_T[uploadGrade] || DEFAULT_COMMENTS_T);

  const currentCommentsH = (gradeCommentsH[uploadGrade] && gradeCommentsH[uploadGrade].length > 0)
    ? gradeCommentsH[uploadGrade]
    : (DEFAULT_GRADE_COMMENTS_H[uploadGrade] || DEFAULT_COMMENTS_H);

  const currentFileTName = fileGradeTNames[uploadGrade] || '';
  const currentFileHName = fileGradeHNames[uploadGrade] || '';

  // Sao chép nhanh nhận xét của khối đang chọn sang toàn bộ các khối khác
  const handleApplyToAllGrades = () => {
    if (confirm(`Bạn có chắc chắn muốn sao chép bộ nhận xét của Khối ${uploadGrade} sang tất cả các khối (Khối 1, 2, 3, 4, 5)?`)) {
      const newGradeT: Record<string, string[]> = {};
      const newGradeH: Record<string, string[]> = {};
      const newFileT: Record<string, string> = {};
      const newFileH: Record<string, string> = {};

      for (const g of ['1', '2', '3', '4', '5']) {
        newGradeT[g] = [...currentCommentsT];
        newGradeH[g] = [...currentCommentsH];
        if (currentFileTName) newFileT[g] = `${currentFileTName} (áp dụng từ K${uploadGrade})`;
        if (currentFileHName) newFileH[g] = `${currentFileHName} (áp dụng từ K${uploadGrade})`;
      }

      setGradeCommentsT(newGradeT);
      setGradeCommentsH(newGradeH);
      setFileGradeTNames(newFileT);
      setFileGradeHNames(newFileH);

      saveGradeCommentsPermanently(newGradeT, currentUser, 'T');
      saveGradeCommentsPermanently(newGradeH, currentUser, 'H');

      alert(`✅ Đã áp dụng bộ nhận xét của Khối ${uploadGrade} cho toàn bộ Khối 1 đến 5!`);
    }
  };

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
            const updated = {
              ...gradeCommentsT,
              [uploadGrade]: parsedComments,
            };
            setGradeCommentsT(updated);
            setFileGradeTNames((prev) => ({ ...prev, [uploadGrade]: file.name }));
            saveGradeCommentsPermanently(updated, currentUser, 'T');
          } else {
            const updated = {
              ...gradeCommentsH,
              [uploadGrade]: parsedComments,
            };
            setGradeCommentsH(updated);
            setFileGradeHNames((prev) => ({ ...prev, [uploadGrade]: file.name }));
            saveGradeCommentsPermanently(updated, currentUser, 'H');
          }
          alert(`✅ Đã nạp thành công ${parsedComments.length} nhận xét loại ${type} cho Khối ${uploadGrade} từ file "${file.name}"!`);
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

  // Download Sample Template for T or H for the active Grade
  const handleDownloadSampleFile = (type: 'T' | 'H') => {
    const sampleList = type === 'T'
      ? (DEFAULT_GRADE_COMMENTS_T[uploadGrade] || DEFAULT_COMMENTS_T)
      : (DEFAULT_GRADE_COMMENTS_H[uploadGrade] || DEFAULT_COMMENTS_H);
    const rows = sampleList.map((cmt, idx) => ({
      STT: idx + 1,
      'nhận xét': cmt,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [{ wch: 8 }, { wch: 65 }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Nhan_Xet_Loai_${type}_Khoi_${uploadGrade}`);
    XLSX.writeFile(workbook, `Mau_Nhan_Xet_Loai_${type}_Khoi_${uploadGrade}.xlsx`);
  };

  // Reset to default sample comments for current Grade
  const handleResetDefaultComments = (type: 'T' | 'H') => {
    if (confirm(`Đặt lại danh sách nhận xét loại ${type} của Khối ${uploadGrade} về mẫu chuẩn ban đầu?`)) {
      if (type === 'T') {
        const defaultList = DEFAULT_GRADE_COMMENTS_T[uploadGrade] || DEFAULT_COMMENTS_T;
        const updated = { ...gradeCommentsT, [uploadGrade]: defaultList };
        setGradeCommentsT(updated);
        setFileGradeTNames((prev) => {
          const next = { ...prev };
          delete next[uploadGrade];
          return next;
        });
        saveGradeCommentsPermanently(updated, currentUser, 'T');
      } else {
        const defaultList = DEFAULT_GRADE_COMMENTS_H[uploadGrade] || DEFAULT_COMMENTS_H;
        const updated = { ...gradeCommentsH, [uploadGrade]: defaultList };
        setGradeCommentsH(updated);
        setFileGradeHNames((prev) => {
          const next = { ...prev };
          delete next[uploadGrade];
          return next;
        });
        saveGradeCommentsPermanently(updated, currentUser, 'H');
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

  // Perform Generation & Export Excel (Image 2 format) with Grade-specific comments
  const handleExecuteExport = () => {
    if (matchingClasses.length === 0) {
      alert(`Không tìm thấy lớp nào thuộc Khối ${selectedGrade} trong năm học ${currentYear}!`);
      return;
    }

    const workbook = XLSX.utils.book_new();
    const usedSheetNames = new Set<string>();
    let totalExportedStudents = 0;

    // Process each class as its own sheet
    for (const cls of matchingClasses) {
      // Xác định khối của lớp học (VD: Lớp 1/1 -> Khối 1; 2/2 -> Khối 2; 5/3 -> Khối 5)
      const clsCleanGrade = cls.grade ? String(cls.grade).replace(/[^0-9]/g, '') : '';
      const clsNameFirstChar = cls.name.trim().charAt(0);
      const clsGrade = clsCleanGrade || clsNameFirstChar || '1';

      // Lấy đúng ngân hàng nhận xét của khối tương ứng (theo đúng yêu cầu của người dùng)
      const clsCommentsT = (gradeCommentsT[clsGrade] && gradeCommentsT[clsGrade].length > 0)
        ? gradeCommentsT[clsGrade]
        : (DEFAULT_GRADE_COMMENTS_T[clsGrade] || DEFAULT_COMMENTS_T);

      const clsCommentsH = (gradeCommentsH[clsGrade] && gradeCommentsH[clsGrade].length > 0)
        ? gradeCommentsH[clsGrade]
        : (DEFAULT_GRADE_COMMENTS_H[clsGrade] || DEFAULT_COMMENTS_H);

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

        // Pick comment according to rank with cyclic wrap-around from that specific grade's bank
        let comment = '';
        if (rank === 'T') {
          comment = clsCommentsT[countT % clsCommentsT.length];
          countT++;
        } else {
          comment = clsCommentsH[countH % clsCommentsH.length];
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

        {/* 3. Nạp 2 file Excel nhận xét cho loại H và loại T theo từng Khối (1 -> 5) */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-800">
                3. Menu Khối nạp file Excel nhận xét loại H và loại T (Khối 1 đến 5):
              </label>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Nhấp chọn từng <strong>Khối (1, 2, 3, 4, 5)</strong> bên dưới để nạp nhận xét tương ứng. Khi xuất file Excel, mỗi lớp sẽ tự động lấy đúng nhận xét của khối đó.
              </p>
            </div>

            {/* Nút sao chép tiện ích */}
            <button
              type="button"
              onClick={handleApplyToAllGrades}
              className="text-[11px] font-bold text-[#0070F3] hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              title="Sao chép nhận xét của khối này sang toàn bộ 5 khối"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              <span>Dùng nhận xét Khối {uploadGrade} cho cả 5 Khối</span>
            </button>
          </div>

          {/* MENU KHỐI (1 ĐẾN 5) THEO ĐÚNG YÊU CẦU NGƯỜI DÙNG */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200 shadow-2xs">
            {(['1', '2', '3', '4', '5'] as const).map((g) => {
              const isActive = uploadGrade === g;
              const countT = (gradeCommentsT[g] && gradeCommentsT[g].length > 0)
                ? gradeCommentsT[g].length
                : (DEFAULT_GRADE_COMMENTS_T[g] || DEFAULT_COMMENTS_T).length;
              const countH = (gradeCommentsH[g] && gradeCommentsH[g].length > 0)
                ? gradeCommentsH[g].length
                : (DEFAULT_GRADE_COMMENTS_H[g] || DEFAULT_COMMENTS_H).length;
              const hasCustomT = !!fileGradeTNames[g];
              const hasCustomH = !!fileGradeHNames[g];

              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => setUploadGrade(g)}
                  className={`relative py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 border cursor-pointer ${
                    isActive
                      ? 'bg-white text-[#0070F3] border-[#0070F3] shadow-sm ring-2 ring-blue-100'
                      : 'bg-transparent text-slate-600 border-transparent hover:bg-white/70 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-black tracking-tight">Khối {g}</span>
                    {(hasCustomT || hasCustomH) && (
                      <span
                        className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white"
                        title="Đã nạp file Excel riêng cho khối này"
                      />
                    )}
                  </div>
                  <span className={`text-[10px] font-semibold ${isActive ? 'text-blue-600 font-bold' : 'text-slate-500'}`}>
                    {countH} câu H • {countT} câu T
                  </span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Box 1: File Nhận xét loại H */}
            <div className="p-4 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-700">
                  <span>Nhận xét loại H (Hoàn thành) — Khối {uploadGrade}</span>
                </span>
                <span className="text-xs font-bold text-slate-600">
                  Đang có {currentCommentsH.length} câu
                </span>
              </div>

              <p className="text-xs text-slate-600 line-clamp-2 italic">
                Ví dụ (K{uploadGrade}): "{currentCommentsH[0]}"
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => fileHInputRef.current?.click()}
                  className="px-3.5 py-2 bg-[#0070F3] hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Nạp file Excel nhận xét H Khối {uploadGrade}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadSampleFile('H')}
                  className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
                  title={`Tải file Excel mẫu loại H cho Khối ${uploadGrade}`}
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Tải mẫu H (K{uploadGrade})</span>
                </button>

                {currentFileHName && (
                  <button
                    type="button"
                    onClick={() => handleResetDefaultComments('H')}
                    className="p-2 text-slate-400 hover:text-rose-500 rounded-xl"
                    title={`Đặt lại câu nhận xét H Khối ${uploadGrade} về mặc định`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {currentFileHName ? (
                <p className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Đã nạp cho Khối {uploadGrade} từ file: {currentFileHName}
                </p>
              ) : (
                <p className="text-[11px] font-medium text-slate-500">
                  (Đang dùng bộ nhận xét mẫu chuẩn Tin học Khối {uploadGrade})
                </p>
              )}
            </div>

            {/* Box 2: File Nhận xét loại T */}
            <div className="p-4 rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-700">
                  <span>Nhận xét loại T (Hoàn thành Tốt) — Khối {uploadGrade}</span>
                </span>
                <span className="text-xs font-bold text-slate-600">
                  Đang có {currentCommentsT.length} câu
                </span>
              </div>

              <p className="text-xs text-slate-600 line-clamp-2 italic">
                Ví dụ (K{uploadGrade}): "{currentCommentsT[0]}"
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => fileTInputRef.current?.click()}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Nạp file Excel nhận xét T Khối {uploadGrade}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadSampleFile('T')}
                  className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
                  title={`Tải file Excel mẫu loại T cho Khối ${uploadGrade}`}
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Tải mẫu T (K{uploadGrade})</span>
                </button>

                {currentFileTName && (
                  <button
                    type="button"
                    onClick={() => handleResetDefaultComments('T')}
                    className="p-2 text-slate-400 hover:text-rose-500 rounded-xl"
                    title={`Đặt lại câu nhận xét T Khối ${uploadGrade} về mặc định`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {currentFileTName ? (
                <p className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Đã nạp cho Khối {uploadGrade} từ file: {currentFileTName}
                </p>
              ) : (
                <p className="text-[11px] font-medium text-slate-500">
                  (Đang dùng bộ nhận xét mẫu chuẩn Tin học Khối {uploadGrade})
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Ghi chú quy tắc tự động lặp lại nhận xét */}
        <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-medium">
          <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p>
            <strong>Cơ chế tự động theo Khối:</strong> Khi xuất file Excel, mỗi lớp (VD: 1/1, 2/2, 3/1, 4/3, 5/2...) sẽ tự động lấy câu nhận xét của đúng Khối tương ứng. Mỗi học sinh được gán 1 câu theo xếp loại T/H; nếu số nhận xét ít hơn số học sinh của lớp, hệ thống sẽ tự động quay vòng từ đầu đến cuối theo thứ tự.
          </p>
        </div>

        {/* Nút Thực hiện Xuất file Excel */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-100">
          <div className="text-xs text-slate-600 font-semibold">
            Sẽ xuất file Excel gồm <strong>{matchingClasses.length} Sheet</strong> (mỗi sheet là 1 lớp thuộc {selectedGrade === 'all' ? 'tất cả các khối' : `Khối ${selectedGrade}`}).
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

                    // Lấy nhận xét đúng theo khối của previewClass
                    const prevCleanGrade = previewClass.grade ? String(previewClass.grade).replace(/[^0-9]/g, '') : '';
                    const prevGrade = prevCleanGrade || previewClass.name.trim().charAt(0) || '1';
                    const prevCommentsT = (gradeCommentsT[prevGrade] && gradeCommentsT[prevGrade].length > 0)
                      ? gradeCommentsT[prevGrade]
                      : (DEFAULT_GRADE_COMMENTS_T[prevGrade] || DEFAULT_COMMENTS_T);
                    const prevCommentsH = (gradeCommentsH[prevGrade] && gradeCommentsH[prevGrade].length > 0)
                      ? gradeCommentsH[prevGrade]
                      : (DEFAULT_GRADE_COMMENTS_H[prevGrade] || DEFAULT_COMMENTS_H);

                    const cmt =
                      rank === 'T'
                        ? prevCommentsT[idx % prevCommentsT.length]
                        : prevCommentsH[idx % prevCommentsH.length];

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
