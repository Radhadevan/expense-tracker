# Android Native Build Guide — Expense Tracker

This guide covers building debug and release APK / Android App Bundles (AAB) with native SMS auto-tracking capabilities.

---

## 1. Prerequisites

- **Android Studio Iguana | 2023.2.1** or newer (or Hedgehog / Giraffe)
- **Android SDK:** Platform 34 (Android 14) installed
- **Build Tools:** 34.0.0
- **JDK:** Version 17 (recommended: Android Studio embedded JDK)

---

## 2. Project Architecture

The project supports both standalone WebView integration and Capacitor runtime:
- `android/`: Native Android Studio project with Kotlin source code and BroadcastReceiver.
- `sms-parser.js`: On-device modular parsing engine.
- `sms-bridge.js`: Clean JavaScript interface communicating with the native layer.
- `index.html`, `app.js`, `style.css`: Mobile-first UI.

---

## 3. Option A: Building with Android Studio (Recommended)

1. **Open Android Studio:**
   - Launch Android Studio and choose **Open**.
   - Navigate to `r:/projects/daily-expense/android` and select the `android` folder.

2. **Sync Gradle:**
   - Android Studio will automatically resolve Gradle dependencies (`androidx.appcompat`, `androidx.webkit`, `kotlinx-coroutines`).

3. **Copy Assets:**
   - Ensure the web assets (`index.html`, `app.js`, `sms-parser.js`, `sms-bridge.js`, `style.css`, `icon.svg`, `manifest.json`) are present in `android/app/src/main/assets/` (or synced via Capacitor).

4. **Run on Device or Emulator:**
   - Select a physical Android device (recommended for real SMS testing) or emulator.
   - Click **Run** (`Shift + F10`).

---

## 4. Option B: Building via Command Line (Gradle Wrapper)

In PowerShell, navigate to the `android` directory:

```powershell
cd r:\projects\daily-expense\android

# Generate Debug APK
.\gradlew assembleDebug

# Output APK path:
# android/app/build/outputs/apk/debug/app-debug.apk
```

To build a release Android App Bundle (AAB) for Google Play:

```powershell
# Generate Release AAB
.\gradlew bundleRelease

# Output Bundle path:
# android/app/build/outputs/bundle/release/app-release.aab
```

---

## 5. Testing Native SMS Reception on an Emulator

Using Android Studio's **Extended Controls**:
1. Start an Android Virtual Device (AVD).
2. Open the emulator's three-dots menu (**Extended Controls** `...`).
3. Select **Phone** in the left sidebar.
4. In the **SMS message** field, paste a test fixture:
   ```
   Your A/c XX1234 is debited by Rs.500 at ABC PETROL PUMP via UPI. Ref 453829102
   ```
5. Click **Send Message**.
6. The native `SmsReceiver` intercepts the alert, parses the transaction, and prompts for confirmation in the app!

---

## 6. Testing via In-App Developer Simulator (Zero Permissions Required)

If running in a browser, PWA, or test environment without an Android phone:
1. Open the app.
2. Tap **More** in the bottom navigation.
3. Select **Developer SMS Simulator**.
4. Tap any of the 10 quick test buttons (e.g. `Fuel ₹500`, `Salary ₹25k`, `Refund ₹450`).
5. Tap **PARSE SMS** to inspect all extracted fields, confidence score, and duplicate detection.
6. Tap **Create Test Transaction** to test adding it directly to your transaction ledger!
