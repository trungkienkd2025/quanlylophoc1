@echo off
chcp 65001 > nul
title Khoi dong QLLH.Pro - Quan Ly Lop Hoc Thong Minh
echo ==============================================================
echo       HE THONG QUAN LY LOP HOC THONG MINH QLLH.PRO
echo ==============================================================
echo.
echo Dang kiem tra moi truong Node.js tren may tinh cua ban...

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo [CHUA CO NODE.JS]
    echo May tinh cua ban chua duoc cai dat Node.js de chay ma nguon React.
    echo.
    echo BAN CO 2 CACH DE SU DUNG NGAY:
    echo 1. Dung truc tiep tren trinh duyet (Khong can cai bat cu thu gi):
    echo    https://ais-pre-plc7vaqocozeh4xkmmqn3r-106567251807.asia-northeast1.run.app
    echo.
    echo 2. Tai va cai Node.js mien phi tu: https://nodejs.org (Chon ban LTS, bam Next de cai)
    echo    Sau khi cai xong Node.js, hay bam dup lai vao file nay!
    echo ==============================================================
    echo.
    pause
    exit /b
)

echo [OK] Da tim thay Node.js.
echo.
if not exist "node_modules\" (
    echo Dang cai dat thu vien lan dau tien (co the mat 1-2 phut, vui long cho)...
    call npm install
)

echo.
echo Dang khoi dong may chu ung dung...
start http://localhost:3000
call npm run dev
pause
