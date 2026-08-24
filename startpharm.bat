@echo off
title Pharmacy Management System

cd /d C:\Users\PC\Desktop\admin-dashboard-fixed_6\admin-dashboard

echo Starting Pharmacy Management System...

start "" cmd /c "npm start"

timeout /t 8 /nobreak >nul

start "" http://localhost:3000

exit