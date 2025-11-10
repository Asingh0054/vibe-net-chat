# Building Android APK via GitHub Actions from Termux

## Prerequisites
1. Install Termux from F-Droid (not Play Store)
2. Install required packages in Termux:
```bash
pkg update && pkg upgrade
pkg install git openssh
```

## Steps to Build

### 1. Fork/Clone Repository
```bash
# Clone your repository
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME
```

### 2. Trigger GitHub Action Build

#### Option A: Using GitHub CLI (Recommended)
```bash
# Install GitHub CLI in Termux
pkg install gh

# Login to GitHub
gh auth login

# Trigger workflow
gh workflow run "Android APK Builder"

# Check workflow status
gh run list
```

#### Option B: Using GitHub Web Interface
1. Open your repository on GitHub in Termux browser
2. Go to "Actions" tab
3. Select "Android APK Builder (Java 21 Clean Build)"
4. Click "Run workflow" → "Run workflow"

#### Option C: Push to main branch
```bash
# Any push to main branch will trigger build automatically
git add .
git commit -m "Trigger build"
git push origin main
```

### 3. Download APK
Once the build completes (check Actions tab):
1. Go to the completed workflow run
2. Download the "VibeNetChat-debug" artifact
3. Extract the ZIP file
4. Install the APK: `VibeNetChat-debug.apk`

## Build Workflows

### Main Branch Auto-Build
- Workflow: `.github/workflows/build-apk-main.yml`
- Triggers: Automatic on push to `main` branch
- Java Version: 17
- Output: `VibeNetChat-builds/*.apk`

### Manual Build
- Workflow: `.github/workflows/android-apk.yml`
- Triggers: Manual via workflow_dispatch
- Java Version: 17
- Output: `VibeNetChat-debug/*.apk`

## Configuration Details

### App Information
- **App ID**: `com.asingh.vibenetchat`
- **App Name**: VibeNet Chat
- **Package**: `com.asingh.vibenetchat`

### Build Settings
- **Min SDK**: 23 (Android 6.0)
- **Target SDK**: 35 (Android 15)
- **Compile SDK**: 35
- **Java Version**: 17
- **Gradle**: 8.11.1

## Troubleshooting

### Build Failed
- Check Actions logs on GitHub
- Ensure all dependencies are properly configured
- Verify Java version consistency (17)

### Can't Install APK
- Enable "Install from Unknown Sources" in Android settings
- Check if old version is installed and uninstall first

### GitHub CLI Issues in Termux
```bash
# If gh command not found
pkg reinstall gh

# If authentication fails
gh auth logout
gh auth login
```

## Local Development (Optional)

For local builds on your computer:

```bash
# Install dependencies
npm install

# Build web app
npm run build

# Sync Capacitor
npx cap sync android

# Build APK (requires Android Studio)
cd android
./gradlew assembleDebug
```

APK will be in: `android/app/build/outputs/apk/debug/`
