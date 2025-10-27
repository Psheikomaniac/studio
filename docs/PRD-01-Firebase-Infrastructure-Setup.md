# PRD-01: Firebase Infrastructure Setup & Configuration

**Product Requirements Document**
**Version:** 1.0
**Date:** 2025-10-27
**Owner:** Backend Team Lead
**Status:** Ready for Implementation
**Priority:** P0 (Critical)

---

## 1. OVERVIEW

### 1.1 Purpose
Establish and configure the Firebase infrastructure foundation for the balanceUp application, building upon the existing 70% complete Firebase setup to enable real-time data synchronization, offline support, and scalable cloud-based data storage.

### 1.2 Background
The application currently uses static data stored in `/src/lib/static-data.ts`. Firebase SDK is installed and configured (v11.9.1), with authentication and Firestore hooks implemented but not actively used. This PRD defines the work required to activate and properly configure the Firebase infrastructure.

### 1.3 Success Criteria
- ✅ Firebase services initialized and accessible throughout the application
- ✅ Environment variables properly configured for all environments
- ✅ Firestore persistence enabled with offline support
- ✅ Security rules deployed and tested
- ✅ Authentication flow functional for all user types
- ✅ Firebase monitoring and analytics operational

---

## 2. OBJECTIVES

### 2.1 Primary Objectives
1. **Environment Configuration**: Move hardcoded Firebase credentials to environment variables
2. **Service Layer Creation**: Build abstraction layer for Firebase operations
3. **Provider Integration**: Add Firebase provider to application root
4. **Persistence Setup**: Enable IndexedDB persistence for offline support
5. **Security Rules**: Update and deploy production-ready Firestore security rules
6. **Monitoring**: Set up Firebase Performance Monitoring and Analytics

### 2.2 Secondary Objectives
1. Feature flag implementation for gradual rollout
2. Error tracking integration
3. Development vs. production environment separation
4. Admin role infrastructure preparation

---

## 3. TECHNICAL REQUIREMENTS

### 3.1 Environment Configuration

**File:** `/Users/private/projects/studio/.env.local` (create new)

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDjhSxCRUhOsNZMiKxuZEAHwcLLIJU3Av4
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=studio-9498911553-e6834.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=studio-9498911553-e6834
NEXT_PUBLIC_FIREBASE_APP_ID=1:358916918755:web:3107a844f24c72d9e464d6
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=358916918755

# Feature Flags
NEXT_PUBLIC_USE_FIREBASE=false  # Set to true to enable Firebase
NEXT_PUBLIC_FIREBASE_PERSISTENCE=true

# Environment
NEXT_PUBLIC_ENV=development
```

**File:** `/Users/private/projects/studio/.env.production` (create new)

```bash
# Production Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=${FIREBASE_API_KEY}
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${FIREBASE_AUTH_DOMAIN}
NEXT_PUBLIC_FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID}
NEXT_PUBLIC_FIREBASE_APP_ID=${FIREBASE_APP_ID}
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${FIREBASE_MESSAGING_SENDER_ID}

# Feature Flags
NEXT_PUBLIC_USE_FIREBASE=true
NEXT_PUBLIC_FIREBASE_PERSISTENCE=true

# Environment
NEXT_PUBLIC_ENV=production
```

**Action Items:**
- [ ] Create `.env.local` file with development configuration
- [ ] Create `.env.production` file with production placeholders
- [ ] Add `.env*.local` to `.gitignore`
- [ ] Document environment variables in README

### 3.2 Update Firebase Configuration

**File:** `/Users/private/projects/studio/src/firebase/config.ts`

**Current Implementation:**
```typescript
export const firebaseConfig = {
  projectId: "studio-9498911553-e6834",
  appId: "1:358916918755:web:3107a844f24c72d9e464d6",
  apiKey: "AIzaSyDjhSxCRUhOsNZMiKxuZEAHwcLLIJU3Av4",
  authDomain: "studio-9498911553-e6834.firebaseapp.com",
  measurementId: "",
  messagingSenderId: "358916918755"
};
```

**Required Changes:**
```typescript
// Validate environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
];

const missingVars = requiredEnvVars.filter(
  varName => !process.env[varName]
);

if (missingVars.length > 0) {
  throw new Error(
    `Missing required Firebase environment variables: ${missingVars.join(', ')}`
  );
}

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "",
};

// Feature flags
export const useFirebase = process.env.NEXT_PUBLIC_USE_FIREBASE === 'true';
export const enablePersistence = process.env.NEXT_PUBLIC_FIREBASE_PERSISTENCE === 'true';
```

**Action Items:**
- [ ] Update `config.ts` to use environment variables
- [ ] Add validation for required environment variables
- [ ] Export feature flags
- [ ] Add TypeScript types for configuration

### 3.3 Enable Firestore Persistence

**File:** `/Users/private/projects/studio/src/firebase/index.ts`

**Add After Firestore Initialization:**
```typescript
import { enableIndexedDbPersistence } from 'firebase/firestore';
import { enablePersistence } from './config';

export function initializeFirestore(app: FirebaseApp): Firestore {
  const firestore = getFirestore(app);

  // Enable offline persistence
  if (enablePersistence && typeof window !== 'undefined') {
    enableIndexedDbPersistence(firestore, {
      cacheSizeBytes: 40 * 1024 * 1024, // 40MB cache
    }).catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn(
          'Firestore persistence failed: Multiple tabs open. ' +
          'Persistence can only be enabled in one tab at a time.'
        );
      } else if (err.code === 'unimplemented') {
        console.warn(
          'Firestore persistence not available in this browser.'
        );
      } else {
        console.error('Failed to enable Firestore persistence:', err);
      }
    });
  }

  return firestore;
}
```

**Action Items:**
- [ ] Add persistence logic to Firebase initialization
- [ ] Handle multi-tab scenarios gracefully
- [ ] Add browser compatibility checks
- [ ] Log persistence status for debugging

### 3.4 Add Firebase Provider to Root Layout

**File:** `/Users/private/projects/studio/src/app/layout.tsx`

**Current Implementation:**
```typescript
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.variable}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
```

**Required Changes:**
```typescript
import { FirebaseClientProvider } from '@/firebase/client-provider';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.variable}>
        <FirebaseClientProvider>
          {children}
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
```

**Action Items:**
- [ ] Import `FirebaseClientProvider`
- [ ] Wrap children with provider
- [ ] Verify provider works on all pages
- [ ] Test hot reload behavior

### 3.5 Create Service Layer Structure

**New Directory:** `/Users/private/projects/studio/src/services/`

**Create Base Service:**

**File:** `/Users/private/projects/studio/src/services/base.service.ts`
```typescript
import { Firestore } from 'firebase/firestore';
import { useFirestore } from '@/firebase';

/**
 * Base service class for Firebase operations
 * Provides common functionality for all services
 */
export abstract class BaseFirebaseService {
  protected firestore: Firestore;

  constructor(firestore: Firestore) {
    this.firestore = firestore;
  }

  /**
   * Generate a timestamp for created/updated fields
   */
  protected timestamp(): string {
    return new Date().toISOString();
  }

  /**
   * Generate a unique ID
   */
  protected generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Hook to get Firestore instance for services
 */
export function useFirestoreService() {
  return useFirestore();
}
```

**Create Service Interfaces:**

**File:** `/Users/private/projects/studio/src/services/types.ts`
```typescript
/**
 * Common result type for service operations
 */
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
}

/**
 * Options for collection queries
 */
export interface QueryOptions {
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  startAfter?: any;
}

/**
 * Pagination result
 */
export interface PaginatedResult<T> {
  data: T[];
  hasMore: boolean;
  lastDoc: any;
}
```

**Action Items:**
- [ ] Create `/src/services/` directory
- [ ] Implement base service class
- [ ] Create service type definitions
- [ ] Add service documentation

### 3.6 Update Security Rules

**File:** `/Users/private/projects/studio/firestore.rules`

**Required Updates:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ============================================
    // HELPER FUNCTIONS
    // ============================================

    function isSignedIn() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }

    function isAdmin() {
      // TODO: Implement admin check via custom claims or admin collection
      // For now, check if user exists in admins collection
      return isSignedIn() &&
             exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }

    // ============================================
    // USER PROFILES (Players)
    // ============================================

    match /users/{userId} {
      // Anyone authenticated can read all players (team visibility)
      allow get, list: if isSignedIn();

      // Only owner or admin can create/update
      allow create: if isOwner(userId) || isAdmin();
      allow update: if isOwner(userId) || isAdmin();

      // Only admin can delete
      allow delete: if isAdmin();

      // User's fines (nested subcollection)
      match /fines/{fineId} {
        allow get, list: if isSignedIn(); // Team-wide visibility
        allow create, update, delete: if isAdmin();
      }

      // User's payments (nested subcollection)
      match /payments/{paymentId} {
        allow get, list: if isSignedIn(); // Team-wide visibility
        allow create, update, delete: if isAdmin();
      }

      // User's beverage consumptions (nested subcollection)
      match /beverageConsumptions/{consumptionId} {
        allow get, list: if isSignedIn(); // Team-wide visibility
        allow create, update, delete: if isAdmin();
      }
    }

    // ============================================
    // DUES & DUE PAYMENTS
    // ============================================

    match /dues/{dueId} {
      allow get, list: if isSignedIn();
      allow create, update, delete: if isAdmin();
    }

    match /duePayments/{paymentId} {
      allow get, list: if isSignedIn();
      allow create, update, delete: if isAdmin();
    }

    // ============================================
    // CATALOG DATA
    // ============================================

    match /beverages/{beverageId} {
      allow get, list: if isSignedIn();
      allow create, update, delete: if isAdmin();
    }

    match /predefinedFines/{fineId} {
      allow get, list: if isSignedIn();
      allow create, update, delete: if isAdmin();
    }

    // ============================================
    // AUDIT LOGS
    // ============================================

    match /auditLogs/{logId} {
      allow get, list: if isAdmin();
      allow create: if isAdmin();
      allow update, delete: if false; // Audit logs are immutable
    }

    // ============================================
    // ADMIN MANAGEMENT
    // ============================================

    match /admins/{adminId} {
      allow read: if isSignedIn();
      allow write: if false; // Managed via Firebase Console or Admin SDK
    }
  }
}
```

**Action Items:**
- [ ] Update security rules with team-wide read access
- [ ] Add admin helper function
- [ ] Deploy rules to Firebase: `firebase deploy --only firestore:rules`
- [ ] Test rules with different user contexts
- [ ] Document rule design decisions

### 3.7 Enable Firebase Monitoring

**File:** `/Users/private/projects/studio/src/firebase/index.ts`

**Add Performance Monitoring:**
```typescript
import { getPerformance, trace } from 'firebase/performance';
import { getAnalytics, isSupported } from 'firebase/analytics';

export function initializeFirebase() {
  const app = initializeApp(firebaseConfig);

  // Initialize Performance Monitoring
  if (typeof window !== 'undefined') {
    try {
      const perf = getPerformance(app);
      console.log('Firebase Performance Monitoring enabled');

      // Initialize Analytics (only if supported)
      isSupported().then(supported => {
        if (supported) {
          const analytics = getAnalytics(app);
          console.log('Firebase Analytics enabled');
        }
      });
    } catch (error) {
      console.warn('Failed to initialize Firebase monitoring:', error);
    }
  }

  return app;
}
```

**Action Items:**
- [ ] Add Performance Monitoring SDK
- [ ] Add Analytics SDK
- [ ] Configure custom traces for critical operations
- [ ] Set up monitoring dashboard in Firebase Console

---

## 4. USER STORIES

### 4.1 As a Developer
```
AS A developer
I WANT Firebase services to be accessible via React hooks
SO THAT I can easily integrate Firestore queries in components
```

**Acceptance Criteria:**
- Can use `useFirestore()` in any component
- Can use `useAuth()` to access authentication
- Can use `useUser()` to get current user state
- All hooks return correct types

### 4.2 As a System Administrator
```
AS A system administrator
I WANT to configure Firebase credentials via environment variables
SO THAT I can deploy to different environments securely
```

**Acceptance Criteria:**
- No hardcoded credentials in source code
- Environment variables validated on startup
- Different configs for dev/staging/production
- Clear error messages for missing variables

### 4.3 As an End User
```
AS AN end user
I WANT the app to work offline
SO THAT I can view data without internet connection
```

**Acceptance Criteria:**
- App loads cached data when offline
- Offline indicator displays connection status
- Writes queue and sync when online
- No data loss during offline period

---

## 5. IMPLEMENTATION PLAN

### Phase 1: Environment Setup (Day 1-2)
**Estimated Time:** 4 hours

**Tasks:**
1. Create `.env.local` and `.env.production` files
2. Update `firebase/config.ts` to use environment variables
3. Add environment variable validation
4. Update `.gitignore` to exclude environment files
5. Document environment setup in README

**Deliverables:**
- ✅ Working environment configuration
- ✅ Documentation updated

### Phase 2: Firebase Initialization (Day 2-3)
**Estimated Time:** 4 hours

**Tasks:**
1. Add persistence logic to Firebase initialization
2. Add Firebase provider to root layout
3. Test provider on all pages
4. Add error boundaries for Firebase errors

**Deliverables:**
- ✅ Firebase services available throughout app
- ✅ Offline persistence enabled

### Phase 3: Service Layer (Day 3-5)
**Estimated Time:** 8 hours

**Tasks:**
1. Create `/src/services/` directory structure
2. Implement base service class
3. Create service type definitions
4. Document service architecture

**Deliverables:**
- ✅ Service layer foundation ready
- ✅ Architecture documentation

### Phase 4: Security Rules (Day 5-6)
**Estimated Time:** 4 hours

**Tasks:**
1. Update Firestore security rules
2. Deploy rules to Firebase
3. Test rules with Firestore emulator
4. Document security model

**Deliverables:**
- ✅ Production-ready security rules deployed
- ✅ Security documentation

### Phase 5: Monitoring Setup (Day 6-7)
**Estimated Time:** 2 hours

**Tasks:**
1. Enable Performance Monitoring
2. Enable Analytics (if needed)
3. Set up monitoring dashboard
4. Configure alerts

**Deliverables:**
- ✅ Monitoring operational
- ✅ Dashboard configured

---

## 6. TESTING REQUIREMENTS

### 6.1 Unit Tests

**Test Firebase Configuration:**
```typescript
describe('Firebase Configuration', () => {
  test('should load config from environment variables', () => {
    expect(firebaseConfig.apiKey).toBeDefined();
    expect(firebaseConfig.projectId).toBeDefined();
  });

  test('should throw error if required env vars missing', () => {
    // Mock missing env var
    delete process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

    expect(() => {
      require('./config');
    }).toThrow('Missing required Firebase environment variables');
  });
});
```

**Test Service Layer:**
```typescript
describe('BaseFirebaseService', () => {
  test('should generate valid timestamps', () => {
    const service = new TestService(mockFirestore);
    const timestamp = service.timestamp();

    expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test('should generate unique IDs', () => {
    const service = new TestService(mockFirestore);
    const id1 = service.generateId('test');
    const id2 = service.generateId('test');

    expect(id1).not.toEqual(id2);
    expect(id1).toContain('test-');
  });
});
```

### 6.2 Integration Tests

**Test Firebase Initialization:**
```typescript
describe('Firebase Initialization', () => {
  test('should initialize Firebase app', () => {
    const app = initializeFirebase();
    expect(app).toBeDefined();
    expect(app.name).toBe('[DEFAULT]');
  });

  test('should initialize Firestore with persistence', async () => {
    const firestore = initializeFirestore(app);
    expect(firestore).toBeDefined();

    // Verify persistence is enabled
    // Note: This requires browser environment
  });
});
```

**Test Security Rules:**
```bash
# Use Firebase Emulator for security rules testing
firebase emulators:start --only firestore

# Run security rules tests
npm run test:rules
```

```typescript
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';

describe('Firestore Security Rules', () => {
  let testEnv;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'studio-test',
      firestore: {
        rules: fs.readFileSync('firestore.rules', 'utf8'),
      },
    });
  });

  test('authenticated user can read all players', async () => {
    const db = testEnv.authenticatedContext('user1').firestore();
    await assertSucceeds(getDoc(doc(db, 'users/player1')));
  });

  test('unauthenticated user cannot read players', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'users/player1')));
  });

  test('non-admin cannot create fines', async () => {
    const db = testEnv.authenticatedContext('user1').firestore();
    await assertFails(
      setDoc(doc(db, 'users/player1/fines/fine1'), { amount: 5 })
    );
  });
});
```

### 6.3 E2E Tests

**Test Offline Behavior:**
```typescript
describe('Offline Support', () => {
  test('should load cached data when offline', async () => {
    // Load data while online
    await page.goto('/dashboard');
    await page.waitForSelector('[data-testid="player-list"]');

    // Go offline
    await page.setOfflineMode(true);

    // Reload page
    await page.reload();

    // Verify cached data loads
    const players = await page.$$('[data-testid="player-card"]');
    expect(players.length).toBeGreaterThan(0);
  });
});
```

---

## 7. SUCCESS METRICS

### 7.1 Technical Metrics
- **Firebase Initialization**: < 500ms on cold start
- **Persistence**: 90%+ of queries served from cache on repeat visits
- **Security Rules**: 100% of test scenarios pass
- **Error Rate**: < 0.1% of Firebase operations fail
- **Bundle Size**: Firebase adds < 250KB gzipped

### 7.2 Quality Metrics
- **Test Coverage**: > 80% for Firebase initialization code
- **Security Rules Coverage**: 100% of collections covered
- **Documentation**: All services documented with JSDoc
- **Type Safety**: Zero TypeScript errors related to Firebase

### 7.3 Operational Metrics
- **Monitoring**: 100% of critical paths traced
- **Alerting**: Alerts configured for errors and quota limits
- **Logging**: All Firebase errors logged with context
- **Uptime**: 99.9% Firebase service availability

---

## 8. DEPENDENCIES

### 8.1 Technical Dependencies
- Firebase SDK v11.9.1 (already installed)
- Next.js 15.3.3 (already installed)
- TypeScript 5.x (already installed)

### 8.2 External Dependencies
- Firebase project access (studio-9498911553-e6834)
- Firebase CLI installed locally
- Access to Firebase Console for rule deployment

### 8.3 Blockers
- ❌ None identified (all prerequisites met)

---

## 9. RISKS & MITIGATIONS

### 9.1 Risk: Environment Variable Misconfiguration
**Impact:** High
**Probability:** Medium
**Mitigation:**
- Add validation on startup
- Provide clear error messages
- Document setup in README
- Create setup script for automation

### 9.2 Risk: Persistence Not Supported in Browser
**Impact:** Low
**Probability:** Low
**Mitigation:**
- Graceful fallback to in-memory cache
- Log warning for user awareness
- Continue app functionality without persistence

### 9.3 Risk: Security Rules Too Restrictive
**Impact:** High
**Probability:** Medium
**Mitigation:**
- Test rules thoroughly with emulator
- Document access patterns
- Provide clear error messages for permission denied

---

## 10. ROLLOUT PLAN

### 10.1 Development Environment
1. Implement all changes in development branch
2. Test with Firebase emulator
3. Test with staging Firebase project
4. Code review and approval

### 10.2 Staging Environment
1. Deploy to staging environment
2. Test with staging Firebase project
3. Verify monitoring and alerts work
4. Performance testing

### 10.3 Production Environment
1. Deploy during low-traffic window
2. Monitor error rates closely
3. Verify persistence working
4. Check monitoring dashboard
5. Be ready to rollback if issues arise

---

## 11. DOCUMENTATION DELIVERABLES

### 11.1 Technical Documentation
- [ ] Environment setup guide
- [ ] Service layer architecture document
- [ ] Security rules explanation
- [ ] Firebase initialization flow diagram
- [ ] Error handling guide

### 11.2 Developer Documentation
- [ ] How to use Firebase hooks in components
- [ ] How to create new services
- [ ] How to test Firebase code
- [ ] Troubleshooting common issues

### 11.3 Operational Documentation
- [ ] Monitoring and alerting guide
- [ ] Firestore quota management
- [ ] Security rules deployment process
- [ ] Rollback procedures

---

## 12. APPENDIX

### 12.1 File Structure
```
/Users/private/projects/studio/
├── .env.local                          # Dev environment variables
├── .env.production                     # Production environment variables
├── src/
│   ├── firebase/
│   │   ├── config.ts                   # Updated with env vars
│   │   ├── index.ts                    # Updated with persistence
│   │   └── ...
│   ├── services/                       # NEW: Service layer
│   │   ├── base.service.ts
│   │   ├── types.ts
│   │   └── ...
│   └── app/
│       └── layout.tsx                  # Updated with provider
├── firestore.rules                     # Updated security rules
└── docs/
    └── firebase-setup.md               # Setup documentation
```

### 12.2 Configuration Reference
```typescript
// Complete firebaseConfig interface
interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  messagingSenderId: string;
  measurementId?: string;
}
```

### 12.3 Commands Reference
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Deploy security rules
firebase deploy --only firestore:rules

# Start emulator for testing
firebase emulators:start --only firestore

# Test security rules
npm run test:rules
```

---

**Document Status:** Ready for Implementation
**Approval Required:** Technical Lead, Product Owner
**Questions/Concerns:** Contact Backend Team Lead

**Next PRD:** PRD-02-Data-Service-Layer-Implementation.md