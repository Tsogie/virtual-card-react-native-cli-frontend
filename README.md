# Virtual Leap Card - NFC Mobile Transit Payment

Mobile contactless payment app for Irish public transport using Android Host Card Emulation (HCE). Addresses the gap where only physical Leap Cards are currently supported.

## Features

- **Offline-first transactions** - Instant local fare deduction with background sync
- **Hardware-backed security** - ECDSA cryptographic signatures using Android KeyStore
- **318ms NFC tap speed** - Optimized async architecture meets <500ms industry standard
- **Production-ready testing** - 85% code coverage with hardware NFC validation

## Download

**[Download APK (Latest Release)](https://github.com/Tsogie/virtual_card_react_native_cli_frontend/releases/latest/download/app-release.apk)**

**Requirements:**
- Android 9+ with NFC
- Enable "Install from unknown sources" in Settings

**Note:** Backend server required for full functionality (https://github.com/Tsogie/virtual_card_spring_boot_backend). 

## Architecture

### Hybrid Native/JavaScript Design
- React Native UI layer with TypeScript
- Native Android modules bridged via `NativeModules` API
- `LeapHostApduService.java` - HCE service for NFC APDU processing
- `NFCModule.java` - React Native bridge for native operations
- Event-driven communication via `NativeEventEmitter`

### Offline-First Transaction Flow
1. **NFC tap received** → `LeapHostApduService` processes APDU
2. **Local deduction** → Balance checked and deducted in `EncryptedSharedPreferences`
3. **Sign transaction** → Payload signed with device private key (SHA256withECDSA)
4. **Sync attempt** → HTTP POST to backend (if online) or queue (if offline)
5. **Background retry** → `WorkManager` syncs queued transactions when network available

### Security Implementation
- **Device keypair generation** in Android KeyStore (StrongBox when available)
- **ECDSA signatures** (SHA256withECDSA) for all transactions
- **Private key never leaves device** - only public key registered with backend
- **AES-256-GCM encryption** for sensitive data in SharedPreferences
- **JWT authentication** for initial device registration

## Tech Stack

**Frontend:** React Native, TypeScript, React Navigation  
**Backend:** Spring Boot, MySQL (https://github.com/Tsogie/virtual_card_spring_boot_backend)  
**Security:** Android KeyStore, ECDSA, AES-256-GCM, JWT  
**Testing:** JUnit 5, Mockito, Python (pyscard/ACR122U hardware testing)

## Installation

### Prerequisites
- Node.js 18+
- Android device with NFC (emulator won't work)
- Android SDK 28+

### Setup
```bash
# Install dependencies
npm install

# iOS-specific (if testing on iOS)
cd ios
bundle install
bundle exec pod install
cd ..

# Run on Android
npm run android

# Run on iOS
npm run ios
```

## Project Structure
```
├── App.tsx                              # Root navigation (Stack Navigator)
├── context/
│   └── UserContext.tsx                  # Global state management
├── screens/
│   ├── HomeScreen.tsx                   # Main screen with NFC status
│   ├── TopUpScreen.tsx                  # Balance top-up
│   └── TransactionsScreen.tsx           # Transaction history
├── android/app/src/main/java/com/walla/
│   ├── LeapHostApduService.java        # HCE service, APDU processing
│   ├── NFCModule.java                   # React Native bridge
│   ├── OfflineSyncWorker.java          # Background sync (WorkManager)
│   └── SecureStorage.java               # EncryptedSharedPreferences helper
```

## Testing

### Unit Tests
```bash
npm test
```

**Coverage:** 85% average (96% on critical services)

### Hardware Testing
Python-based NFC reader simulator using ACR122U-A9 reader:
```bash
cd testing
python transit_gate_simulator.py
```

## Performance

- **NFC transaction time:** 318ms average (target: <500ms)
- **Test coverage:** 85% (70 unit tests)
- **Offline sync reliability:** 100%

## Backend API

**Base URL:** `https://walletappbackend-production-1557.up.railway.app`

Key endpoints:
- `POST /api/login` - User authentication
- `POST /api/device/register` - Register device public key
- `GET /api/userinfo` - Get user balance and card info
- `POST /api/wallet/redeem` - Process signed transaction

## Development

### Running Metro Bundler
```bash
npm start
```

### Debugging
- Android Logcat filters: `LeapHCE`, `NFCModule`, `OfflineSyncWorker`
- React Native Debugger for JS debugging
- Android Studio for native code debugging

### Making Changes to Native Code
1. Edit `.java` files in `android/app/src/main/java/com/walla/`
2. Rebuild: `npm run android`
3. For bridge changes, may need to uninstall and reinstall app

## Known Limitations

- Requires physical Android device with NFC (emulator not supported)
- iOS does not support Host Card Emulation (Android only)
- Manual testing requires a physical NFC reader. During development, the ACR122U-A9 reader was used for testing

## Related

- [Backend Repository](https://github.com/Tsogie/virtual_card_spring_boot_backend) - Spring Boot REST API