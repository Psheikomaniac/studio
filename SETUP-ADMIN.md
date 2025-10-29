# Admin User Setup Guide

After implementing PRD-01, you need to create at least one admin user to enable write operations.

## Why Admin Setup is Required

The updated security rules restrict all write operations (create, update, delete) to users with admin privileges. Without an admin user, you won't be able to:
- Create fines
- Add payments
- Manage players
- Create dues
- Add any data to Firestore

## Step-by-Step Instructions

### Option 1: Firebase Console (Recommended - Easiest)

1. **Open Firebase Console**
   - Go to https://console.firebase.google.com/
   - Select your project: `studio-9498911553-e6834`

2. **Navigate to Firestore Database**
   - Click "Firestore Database" in the left sidebar
   - Click "Start collection" (if no collections exist)

3. **Create Admins Collection**
   - Collection ID: `admins`
   - Click "Next"

4. **Add Your Admin Document**
   - Document ID: Use your Firebase Auth UID
     - To find your UID: Go to Authentication > Users > Your email > Copy UID
   - Add fields:
     ```
     email: "your-email@example.com" (string)
     name: "Your Name" (string)
     createdAt: "2025-10-27T12:00:00Z" (string)
     role: "admin" (string)
     ```
   - Click "Save"

5. **Verify**
   - You should now see the `admins` collection with your document
   - Your UID should be the document ID

### Option 2: Firebase Admin SDK (For Automation)

If you want to automate admin user creation:

```typescript
// scripts/create-admin.ts
import * as admin from 'firebase-admin';

// Initialize Admin SDK (requires service account key)
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

async function createAdmin(uid: string, email: string, name: string) {
  const db = admin.firestore();
  
  await db.collection('admins').doc(uid).set({
    email,
    name,
    createdAt: new Date().toISOString(),
    role: 'admin',
  });
  
  console.log(`✅ Admin user created: ${email}`);
}

// Get UID from Authentication
const uid = 'YOUR_FIREBASE_AUTH_UID';
const email = 'your-email@example.com';
const name = 'Your Name';

createAdmin(uid, email, name).catch(console.error);
```

Run with:
```bash
npx ts-node scripts/create-admin.ts
```

### Option 3: Firebase CLI

Using Firebase CLI with Firestore:

```bash
# Login to Firebase
npx firebase-tools login

# Add admin document
npx firebase-tools firestore:set admins/YOUR_UID '{"email":"your@email.com","name":"Your Name","createdAt":"2025-10-27T12:00:00Z","role":"admin"}'
```

## How to Find Your Firebase Auth UID

### If you're already authenticated in the app:

1. Open your app in the browser
2. Open Developer Console (F12)
3. Run:
   ```javascript
   firebase.auth().currentUser.uid
   ```
4. Copy the UID

### If you're not authenticated yet:

1. Go to Firebase Console
2. Navigate to Authentication > Users
3. Find your email in the list
4. Click on it to see details
5. Copy the "User UID"

### If no users exist:

1. Go to Firebase Console > Authentication
2. Click "Add user"
3. Enter email and password
4. Click "Add user"
5. Copy the UID from the newly created user

## Verification

After creating the admin user:

1. **Check Firestore Database**
   - Go to Firebase Console > Firestore Database
   - Verify `admins` collection exists
   - Verify your document exists with correct UID

2. **Test in Application**
   - Enable Firebase: Update `.env.local` set `NEXT_PUBLIC_USE_FIREBASE=true`
   - Restart dev server: `npm run dev`
   - Sign in with your admin account
   - Try creating a fine or payment
   - Should work without permission errors

3. **Check Browser Console**
   - Look for Firebase initialization messages
   - No permission errors should appear

## Troubleshooting

### "Permission denied" when creating data
- Verify admin document exists in Firestore
- Verify document ID matches your auth UID exactly
- Check you're signed in with the correct account
- Check browser console for detailed error messages

### Can't find my UID
- Make sure you've created an account in Authentication
- Try signing out and back in
- Check Authentication > Users in Firebase Console

### Admin document exists but still getting errors
- Check document ID matches auth UID exactly (case-sensitive)
- Verify you're signed in with that account
- Clear browser cache and try again
- Check security rules are deployed: `npx firebase-tools deploy --only firestore:rules`

## Multiple Admins

To add more admin users, repeat the process:

1. Get their Firebase Auth UID
2. Create a new document in `admins` collection
3. Document ID = their UID
4. Add same fields (email, name, createdAt, role)

## Security Considerations

- Admin documents can only be created via Firebase Console or Admin SDK
- Client apps cannot modify the `admins` collection (by design)
- Keep the list of admins small (only trusted team members)
- All admin actions are logged in the application
- Consider adding an audit trail for admin user management

## Next Steps

After setting up your admin user:

1. ✅ Deploy security rules (already done)
2. ✅ Create admin user (follow steps above)
3. Enable Firebase in your app
4. Test creating a fine/payment
5. Proceed with PRD-02 implementation

---

**Important:** Do not share your Firebase Admin SDK service account keys or credentials in version control!


## Firestore connection troubleshooting (development)

If you see console errors like:

- "Fetch API cannot load ... Firestore/Listen/channel ... due to access control checks"
- network or CORS errors shortly after the page loads

This is a common issue with Firestore's default WebChannel transport in some dev environments (proxies, Safari, ad blockers). The app now automatically switches to long-polling in development and on Safari, which usually resolves it.

What "due to access control checks" means:
- This message comes from the browser’s CORS enforcement, not from your Firestore security rules.
- The browser blocked a network request before it could complete because the transport (Google WebChannel used by Firestore’s real‑time listener) didn’t pass the environment’s CORS restrictions (often on Safari, corporate proxies/VPNs, privacy extensions, or ad blockers).
- It does not necessarily mean you lack Firestore permissions. It’s usually a networking/transport quirk in dev.

Why clicking the Listen/channel URL shows "400 Unknown SID":
- The URL you see is an internal, session‑bound streaming endpoint used by Firestore’s WebChannel. It includes a temporary session ID (SID) and other parameters.
- That endpoint is only valid within the XHR session the SDK opened. Opening it directly in a new tab is a different context (no valid session), so Google’s servers respond with 400 Unknown SID. This is expected and not an app bug.

Quick checklist to resolve/verify:
- Let the app pick the safer transport automatically (we enable long‑polling in development and on Safari).
- Or force long‑polling explicitly by setting in `.env.local`:
  - `NEXT_PUBLIC_FIREBASE_FORCE_LONG_POLLING=true` (then restart `npm run dev`).
- Temporarily disable ad blockers/privacy extensions for localhost.
- If behind a proxy/VPN, try without it or with a different network.
- Try a different browser (Chrome/Firefox) to compare behavior; Safari is more prone to WebChannel issues.

Advanced notes:
- We keep `experimentalAutoDetectLongPolling` enabled and preserve already‑loaded UI data if a transient network/CORS error occurs, so the page won’t flash empty.
- If you also see missing index links in the console, follow them to create required Firestore indexes; the UI will continue to show cached data until indexes are available.
