# Novelly App: Mac to Android Setup Guide

This guide is for developers using a **Mac** who want to build and run the Novelly app natively on a physical **Android phone** (or Android Emulator). 

Since Novelly uses custom native code (via `expo run:android`), you **cannot** just use the Expo Go app. You must compile the app directly onto your device.

---

## Step 1: Install Mac Prerequisites
You will need Node.js and Watchman installed on your Mac. The easiest way to do this is using [Homebrew](https://brew.sh/).

1. Open your Mac **Terminal**.
2. Run the following commands:
   ```bash
   brew install node
   brew install watchman
   ```
3. Verify Node is installed:
   ```bash
   node -v
   ```

## Step 2: Install Android Studio
To compile Android apps on a Mac, you need the Android SDK.

1. Download and install [Android Studio for Mac](https://developer.android.com/studio).
2. Open Android Studio, and follow the setup wizard to install the standard **Android SDK**, **Android SDK Command-line Tools**, and **Android SDK Build-Tools**.
3. **Configure your Mac's Environment Variables**:
   Open your terminal profile (`~/.zshrc` or `~/.bash_profile`) and add the following lines to the bottom:
   ```bash
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```
4. Run `source ~/.zshrc` (or restart your terminal) to apply the changes.

---

## Step 3: Prepare Your Android Phone
You need to enable your phone to accept development apps via USB.

1. On your Android phone, go to **Settings > About Phone**.
2. Tap on **"Build Number"** 7 times until you see a message saying "You are now a developer!".
3. Go back to the main Settings menu and find **Developer Options** (usually under System).
4. Turn on **USB Debugging**.
5. Connect your phone to your Mac using a USB cable. 
6. *Important:* A prompt will appear on your phone asking "Allow USB Debugging from this computer?". Check "Always allow" and tap **OK**.

### Verify the Connection
In your Mac terminal, type:
```bash
adb devices
```
You should see your device listed (e.g., `RF8N123456 device`). If it says `unauthorized`, you missed the prompt on your phone screen!

---

## Step 4: Set Up the Project
1. Open your terminal and navigate to where you want the project folder, then clone the repository:
   ```bash
   git clone <repository_url>
   cd Novelly
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up the Environment Variables:
   - Create a file named `.env` in the root of the `Novelly` folder.
   - Ask your team for the required API Keys and add them to the file:
     ```env
     PERPLEXITY_API_KEY=your_key_here
     PERPLEXITY_MODEL=sonar
     SUPABASE_URL=your_supabase_url
     SUPABASE_ANON_KEY=your_supabase_key
     ```

---

## Step 5: Run the App on Your Phone!
Ensure your phone is plugged in and unlocked.

Run the following command in your terminal from the root `Novelly` folder:
```bash
npm run android
```

### What happens next?
1. The Metro Bundler (the local development server) will start in your terminal.
2. Expo will invoke Gradle to compile the raw Java/Kotlin code into an `.apk`. This can take **5-10 minutes** the very first time you do it!
3. Once compiled, it will push the app to your Android phone via USB and automatically launch it.

### Troubleshooting
- **Build failed?** Make sure you do not have another Metro bundler running in the background. You can clear the cache and force a fresh build using: `npm run android -- --reset-cache`
- **Phone disconnected?** If you accidentally unplug the USB cable, the Metro terminal might lose its connection. Replug the phone, go to the Metro terminal, and press `a` (to open Android) or `r` (to reload) to re-establish the bridge.
