@echo off
title Xelori Bot - Auto Restart
:start
echo [%date% %time%] Spoustim bota...
node index.js
echo [%date% %time%] Bot spadl nebo byl ukoncen. Restartuji za 5 sekund...
timeout /t 5
goto start
