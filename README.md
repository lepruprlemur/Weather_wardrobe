<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# WeatherWear AI

A smart fashion assistant that recommends the best outfit from your wardrobe based on real-time local weather data and image analysis. Powered by **GRS AI** (gemini-2.5-flash).

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Set the `GRSAI_API_KEY` in a `.env.local` file to your GRS AI API key:
   ```
   GRSAI_API_KEY=your_api_key_here
   ```
3. Run the app:
   `npm run dev`

## iOS Build (Capacitor)

**Prerequisites:** Node.js, Xcode, CocoaPods

1. Install dependencies:
   ```
   npm install
   ```
2. Build the web app:
   ```
   npm run build
   ```
3. Sync web assets to the iOS project:
   ```
   npx cap sync
   ```
4. Open in Xcode:
   ```
   npx cap open ios
   ```
5. Build and run from Xcode on a simulator or device.

## Android Build (Capacitor)

**Prerequisites:** Node.js, Android Studio

1. Install dependencies:
   ```
   npm install
   ```
2. Build the web app:
   ```
   npm run build
   ```
3. Sync web assets to the Android project:
   ```
   npx cap sync
   ```
4. Open in Android Studio:
   ```
   npx cap open android
   ```
5. Build and run from Android Studio on an emulator or device.
