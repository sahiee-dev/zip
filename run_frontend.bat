@echo off
echo Installing frontend dependencies...
cd frontend
npm install
echo Starting frontend server...
npm run dev
pause 