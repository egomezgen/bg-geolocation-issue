# Background Geolocation Minimal Repro

A minimal React Native app to reproduce and debug **react-native-background-geolocation** behaviour on Android. It shows a list of received positions (from both foreground and background), permission status, and basic actions (request permissions, get current position, get state).

## Before running

You **must** replace the placeholder application ID and license key:

1. **Application ID**  
   In `android/app/build.gradle`, replace `YOUR.APPLICATION.ID` with your real Android application ID in:
   - `namespace "YOUR.APPLICATION.ID"`
   - `applicationId "YOUR.APPLICATION.ID"`

2. **License key**  
   In `android/app/src/main/AndroidManifest.xml`, replace `YOUR_LICENSE_KEY` in the meta-data:
   ```xml
   <meta-data android:name="com.transistorsoft.locationmanager.license" android:value="YOUR_LICENSE_KEY" />
   ```
   Use a valid license from [Transistor Software](https://www.transistorsoft.com/).

## Running the app

```bash
yarn install
yarn android
```

Grant **location** (including “allow all the time” / background) and **motion** (activity recognition) when prompted so background tracking can work.

## Known issue: positions stop after kill → reopen → background

**Steps to reproduce:**

1. Open the app.
2. Grant location (background) and motion permissions when asked.
3. Confirm that positions are received (list updates, console logs).
4. **Force-kill the app** (swipe away from recents / quit from app switcher).
5. Open the app again.
6. Send the app to **background** (home or switch to another app).
7. **Observed:** position updates stop; no new entries in the list and no relevant logs.

**Expected:** Background geolocation should continue delivering positions after reopening and going to background, as it does on the first run before the app is killed.

This repo exists to isolate and debug that behaviour (e.g. headless task, `ready()`/`start()` on relaunch, or Android/iOS lifecycle handling).
