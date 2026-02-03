# WebRTC Video Chat Setup Guide

## Firebase Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select existing project
3. Follow the setup wizard

### 2. Enable Firestore Database

1. In Firebase Console, go to **Firestore Database**
2. Click "Create database"
3. Choose "Start in test mode" (for development)
4. Select a location and click "Enable"

### 3. Get Firebase Configuration

1. Go to **Project Settings** (gear icon)
2. Scroll to "Your apps" section
3. Click the web icon `</>`
4. Register your app (give it a nickname)
5. Copy the `firebaseConfig` object values

### 4. Update Environment Variables

Edit `.env.local` with your Firebase credentials:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key-here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### 5. Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

Or manually copy rules from `firestore.rules` to Firebase Console > Firestore Database > Rules

## How to Use the App

### Person A (Caller):

1. Click **"Start Webcam"** to enable camera/microphone
2. Click **"Create Call"**
3. Copy the generated Call ID from the display
4. Share the Call ID with Person B

### Person B (Answerer):

1. Click **"Start Webcam"** to enable camera/microphone
2. Paste the Call ID into the input field
3. Click **"Answer Call"**

### Both users should now see each other's video!

### To End Call:

- Click **"Hang Up"** to disconnect

## How It Works

**Firebase Firestore** acts as the signaling server:

- Stores WebRTC offer/answer SDP (Session Description Protocol)
- Stores ICE candidates for peer connection establishment
- Real-time listeners sync connection data between peers

**WebRTC** handles peer-to-peer video/audio:

- Direct connection between browsers (P2P)
- Uses Google STUN servers for NAT traversal
- Minimal server involvement after connection established

## Troubleshooting

**No video showing:**

- Check camera/microphone permissions in browser
- Ensure HTTPS or localhost (required for getUserMedia)

**Connection fails:**

- Check if both users completed the webcam step
- Verify Firestore rules allow read/write
- Check browser console for errors

**Firestore permission denied:**

- Deploy/update firestore.rules
- Ensure rules allow public read/write for development

## Production Considerations

For production, you should:

1. Add authentication (Firebase Auth)
2. Secure Firestore rules with user authentication
3. Consider using TURN servers for restrictive networks
4. Add error handling and user feedback
5. Implement call cleanup (delete old call documents)
