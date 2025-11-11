# TeamXV IT Mobile Setup

## Running on Mobile Devices

TeamXV IT supports native mobile features including WiFi Direct and Bluetooth through Capacitor.

### Prerequisites

- Node.js installed
- For iOS: Mac with Xcode installed
- For Android: Android Studio installed

### Setup Steps

1. **Clone and Install**
   ```bash
   # Transfer project to your GitHub (use "Export to Github" button in Lovable)
   git pull
   npm install
   ```

2. **Add Mobile Platforms**
   ```bash
   # For iOS (Mac only)
   npx cap add ios
   npx cap update ios
   
   # For Android
   npx cap add android
   npx cap update android
   ```

3. **Build the Project**
   ```bash
   npm run build
   ```

4. **Sync to Native Platforms**
   ```bash
   npx cap sync
   ```

5. **Run on Device/Emulator**
   ```bash
   # For iOS (opens in Xcode)
   npx cap run ios
   
   # For Android (opens in Android Studio or runs on connected device)
   npx cap run android
   ```

### Permissions

The app will request the following permissions on mobile:

- **Camera**: For QR code scanning and video calls
- **Storage**: To save and access shared files
- **Bluetooth**: For nearby device connections
- **Location**: Required for WiFi Direct device discovery
- **Notifications**: To notify you of messages and transfers

### Features Available on Mobile

- ✅ Internet-based P2P (WebRTC) - Works everywhere
- ✅ WiFi Direct - Native mobile only
- ✅ Bluetooth - Native mobile only
- ✅ File sharing with progress tracking
- ✅ Background notifications
- ✅ Native file system access

### Development

For live reload during development, the app is configured to connect to:
`https://52556923-8077-4f75-a40e-24d46bb5da74.lovableproject.com`

After making changes in Lovable and pulling from GitHub, run `npx cap sync` to update native apps.

### Troubleshooting

1. **Build errors**: Make sure all dependencies are installed with `npm install`
2. **Sync errors**: Try `npx cap update [platform]` before syncing
3. **Permission issues**: Check platform-specific permission settings in `AndroidManifest.xml` (Android) or `Info.plist` (iOS)
