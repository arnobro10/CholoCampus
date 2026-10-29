# choloCampus Android test app

This Android app packages the current React MVP using Capacitor. It is not a
Flutter build. The application ID is `com.nexasity.campuspool`.

## Install on a phone

1. Transfer `artifacts/choloCampus-test.apk` to your Android phone.
2. Open it from Files and allow that app to install unknown apps if Android asks.
3. Install choloCampus and open it. Android 7.0 or newer is required.

The interface, Poppins fonts, and Flaticon icons are bundled. Internet is needed
for Google login, shared rides/messages, and Mapbox maps. The app does not depend on the development server or your PC.

This is a debug-signed test build. Profiles, offers, requests, messages and preferred destinations use Supabase. Google sign-in requires an authorized university account and the provider setup in AUTH_SETUP.md. Rebuild the APK after changing the web app; previously installed APKs do not update automatically.

## Rebuild in Windows PowerShell

Java and Android command-line tools were downloaded into `.build-tools`, with a short Gradle cache at `D:\Ride Sharing App\.gradle-build`, leaving
the system Java installation unchanged. With the prepared tools and SDK packages:

```powershell
& .\scripts\build-apk.ps1
```

The script builds the web app, synchronizes Android assets, runs Gradle, and copies
the APK to `artifacts/choloCampus-test.apk`.

The public Mapbox token is bundled into the client. Configure its permitted web
origins for the Capacitor WebView origin (`https://localhost`) and the web preview.
Mapbox usage follows your account's plan and limits.
