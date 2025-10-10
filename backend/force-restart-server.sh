#!/bin/bash

echo "🛑 Force stopping all Node.js processes..."
pkill -f "node server.js"
pkill -f "npm start"
pkill -f "npm run dev"
pkill -f "node monitor"
pkill -f "node check"

echo "⏳ Waiting 5 seconds..."
sleep 5

echo "🔍 Checking if any Node.js processes are still running..."
ps aux | grep node | grep -v grep

echo "🚀 Starting backend server with fixed code..."
cd /Users/anshikatrivedi/configurator-2/backend
PORT=3001 node server.js &

echo "⏳ Waiting 3 seconds for server to start..."
sleep 3

echo "🧪 Testing backend server..."
curl -s http://localhost:3001/api/sales/login -X POST -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"test"}' | head -3

echo "✅ Backend server restart complete!"
