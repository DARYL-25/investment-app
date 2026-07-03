@echo off
rem Dev launcher: puts the portable Node.js on PATH, then starts Next.js.
set "PATH=C:\Users\daryl\tools\node;%PATH%"
cd /d "%~dp0"
npm run dev
