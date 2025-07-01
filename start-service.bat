@echo off

cd /d "%~dp0"

echo "Activate Node.js project version..."
call nvm use 22.14.0

echo "Initialize NestJS application..."
call node dist/main.js
