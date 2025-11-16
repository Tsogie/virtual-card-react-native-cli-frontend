# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React Native mobile application implementing a digital Leap Card system with NFC tap-to-pay functionality. The app uses Android HCE (Host Card Emulation) to emulate a transit card and process fare deductions both online and offline with cryptographic authentication.

## Development Commands

### Running the app
```bash
# Start Metro bundler
npm start

# Run on Android (requires Android device/emulator with NFC)
npm run android

# Run on iOS
npm run ios
```

### Code quality
```bash
# Run linter
npm run lint

# Run tests
npm test
```

### iOS-specific setup (first time or after native dependency changes)
```bash
bundle install
bundle exec pod install
```

## Architecture Overview

### Key Architectural Patterns

**1. Hybrid Native/JS Architecture**
- React Native UI layer communicates with native Android modules via bridge
- `NFCModule.java` exposes native methods to JavaScript via React Native's `NativeModules`
- `LeapHostApduService.java` runs independently as Android HCE service, processing NFC APDUs
- Events flow from native → JS via `NativeEventEmitter` with event type: `NfcEvent`

**2. Offline-First Transaction System**
- Fare deduction happens locally first (optimistic update)
- Backend sync attempted immediately if online
- Failed syncs queued in SharedPreferences as JSON array (`tx_queue`)
- `OfflineSyncWorker.java` (WorkManager) retries queued transactions when network available
- Local balance stored in SharedPreferences using `Double.doubleToRawLongBits()`

**3. Device-Key Authentication (Not Token-Based)**
- Each device generates EC keypair in Android Keystore (hardware-backed when available)
- Private key never leaves device; public key registered with backend during login
- Transactions signed with `SHA256withECDSA` using device's private key
- Backend verifies signature against registered public key for deviceId
- JWT token used only for initial device registration API call

**4. Centralized State Management**
- `UserContext.tsx` is the single source of truth for user data and transaction state
- All NFC events handled centrally in UserContext via `NativeEventEmitter`
- Event types: `balanceUpdate` (local deduction), `transactionComplete` (backend confirmed), `failure`, `syncFailed`
- Components consume via `useUser()` hook

### Data Flow: NFC Tap Transaction

1. **NFC Reader taps phone** → `LeapHostApduService.processCommandApdu()` receives APDU
2. **Local deduction** → Balance checked and deducted in SharedPreferences
3. **Event to JS** → `NFCModule.sendEventToJS("balanceUpdate", newBalance)`
4. **Context updates UI** → UserContext listener updates user state → HomeScreen re-renders
5. **Sign transaction** → Create JSON payload, sign with Android Keystore private key
6. **Sync attempt** → If online: HTTP POST to `/api/wallet/redeem` with `{deviceId, payload, signature}`
7. **Backend response** → On success: `transactionComplete` event with confirmed balance
8. **Offline fallback** → If network unavailable: transaction queued, WorkManager scheduled

### Critical Files

- **App.tsx** - Root navigation structure (Stack Navigator)
- **context/UserContext.tsx** - Global state: user, balance, transaction status, NFC event handling
- **android/app/src/main/java/com/walla/LeapHostApduService.java** - HCE service, APDU processing, cryptographic signing, offline queue management
- **android/app/src/main/java/com/walla/NFCModule.java** - React Native bridge module for NFC operations, Keystore key generation, SharedPreferences access
- **android/app/src/main/java/com/walla/OfflineSyncWorker.java** - Background worker for syncing queued offline transactions

## Important Implementation Details

### Native Module Communication
All communication with native Android code goes through `NFCModule`:
```typescript
import { NativeModules, NativeEventEmitter } from 'react-native';
const { NFCModule } = NativeModules;

// Call native methods (returns Promise)
await NFCModule.saveJwtToken(token);
const balance = await NFCModule.getLocalBalance();

// Listen to native events
const eventEmitter = new NativeEventEmitter(NFCModule);
const subscription = eventEmitter.addListener('NfcEvent', (event) => {
  // event.type: 'balanceUpdate' | 'transactionComplete' | 'failure' | 'syncFailed'
  // event.message: string (may be JSON)
});
```

### SharedPreferences Keys
Used by native code for persistent storage:
- `jwt_token` - JWT for backend auth (initial registration only)
- `key_alias` - Android Keystore alias for device keypair
- `device_id` - Device ID from backend registration
- `local_balance` - Stored as long bits via `Double.doubleToRawLongBits()`
- `tx_queue` - JSON array of offline transactions awaiting sync

### Cryptographic Implementation
- Keypair algorithm: EC (secp256r1)
- Signature algorithm: SHA256withECDSA
- Keystore: AndroidKeyStore with StrongBox when available
- Transaction payload: `{txId: UUID, fare: number, timestamp: number}`
- Signature sent to backend as Base64 (NO_WRAP flag)

### Backend API Endpoints
Base URL currently hardcoded: `http://172.20.10.13:3000`

- `POST /api/login` - Body: username (text/plain), Returns: JWT token
- `POST /api/device/register` - Body: `{alias, publicKey}`, Returns: `{deviceId, message}`
- `GET /api/userinfo` - Headers: `Authorization: Bearer <token>`, Returns: `{username, cardId, balance}`
- `POST /api/wallet/redeem` - Body: `{deviceId, payload, signature}`, Returns: `{status, newBalance, fareDeducted}`

### Navigation Structure
```
Stack Navigator (App.tsx)
├── Welcome
├── Sign (signup)
├── Login
├── Main → BottomTabs.tsx
│   ├── Home (HomeScreen)
│   ├── TopUp (TopUpScreen)
│   └── Transactions (TransactionsScreen)
├── Profile (ProfileScreen)
└── CardDetails (CardDetailsScreen)
```

### Android-Specific Considerations
- Requires physical NFC-enabled Android device for testing (emulator won't work)
- HCE service runs independently from React Native lifecycle
- `LeapHostApduService` must be declared in AndroidManifest.xml with HCE intent-filter
- APDU AID must match reader expectations (currently uses SELECT AID check)
- SharedPreferences accessed from both JS bridge and HCE service (thread-safe via synchronized blocks)

## Development Workflow

### Making changes to native Android code
1. Edit `.java` files in `android/app/src/main/java/com/walla/`
2. Rebuild: `npm run android` (or build from Android Studio)
3. Native modules are cached - may need to uninstall app and reinstall for bridge changes

### Testing offline functionality
1. Enable Airplane Mode after login
2. Tap NFC reader - transaction queued locally
3. Re-enable network - WorkManager automatically syncs queue
4. Check Logcat for `[OfflineSyncWorker]` logs

### Debugging native code
Use Android Studio Logcat with filters:
- `LeapHCE` - HCE service APDU processing
- `NFCModule` - React Native bridge calls
- `UserContext` - JS-side NFC event handling
- `OfflineSyncWorker` - Background sync operations

### Updating API base URL
Search for `http://172.20.10.13:3000` across:
- `context/UserContext.tsx`
- `screens/LoginScreen.tsx`
- `android/app/src/main/java/com/walla/LeapHostApduService.java`
- `android/app/src/main/java/com/walla/OfflineSyncWorker.java`
