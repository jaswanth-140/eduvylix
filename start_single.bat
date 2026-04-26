@echo off
setlocal

cd /d "%~dp0"

set VITE_API_URL=/api

cd frontend
npm install
npm run build

cd ..
if exist backend\static rmdir /s /q backend\static
mkdir backend\static
xcopy /e /i /y frontend\dist\* backend\static\

cd backend
"%~dp0.venv\Scripts\python.exe" run.py
