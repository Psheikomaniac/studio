#!/bin/bash
#
# Integration Test Runner Script
# Starts Firebase Emulators and runs integration tests
#

set -e

echo "🧪 Running Integration Tests with Firebase Emulator..."
echo ""

# Check if emulator is already running
if curl -s http://127.0.0.1:8080 > /dev/null 2>&1; then
    echo "✅ Emulator already running, proceeding with tests..."
    npm run test tests/integration
else
    echo "🔥 Starting Firebase Emulator..."
    # Start emulator in background
    firebase emulators:exec --only firestore,auth "npm run test tests/integration"
fi

echo ""
echo "✅ Integration tests completed!"
