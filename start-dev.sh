#!/bin/bash

# Start the Next.js app
echo "Starting Next.js app..."
npm run dev &
NEXTJS_PID=$!

# Change to the frontend directory and start the Vite app
echo "Starting Vite app..."
cd frontend && npm run dev &
VITE_PID=$!

# Function to handle exit and cleanup
cleanup() {
  echo "Shutting down..."
  kill $NEXTJS_PID
  kill $VITE_PID
  exit 0
}

# Set up trap to catch exit signals
trap cleanup SIGINT SIGTERM

# Keep the script running
echo "Development servers are running..."
echo "Next.js: http://localhost:3000"
echo "Vite: http://localhost:5173"
echo "Press Ctrl+C to stop both servers"
wait 