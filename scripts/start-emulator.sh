#!/bin/bash
#
# Firebase Emulator Start Script
# Starts Firestore and Auth emulators for integration testing
#

set -e

echo "🔥 Starting Firebase Emulators..."
echo ""
echo "Firestore Emulator: http://127.0.0.1:8080"
echo "Auth Emulator: http://127.0.0.1:9099"
echo "Emulator UI: http://127.0.0.1:4000"
echo ""

# Check if firebase-tools is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Installing globally..."
    npm install -g firebase-tools
fi

# Start emulators
firebase emulators:start --only firestore,auth,ui
