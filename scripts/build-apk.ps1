$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
$jdkDirectory = Get-ChildItem -LiteralPath "$projectRoot\.build-tools\jdk" -Directory | Select-Object -First 1
if (-not $jdkDirectory) { throw 'Run python scripts/prepare-android.py first.' }
$env:JAVA_HOME = $jdkDirectory.FullName
$env:ANDROID_HOME = "$projectRoot\.build-tools\android-sdk"
$env:GRADLE_USER_HOME = [IO.Path]::GetFullPath("$projectRoot\..\..\.gradle-build")

$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
$env:TEMP = [IO.Path]::GetFullPath("$projectRoot\..\..\.android-tmp")
$env:TMP = $env:TEMP
New-Item -ItemType Directory -Path $env:TEMP -Force | Out-Null
& npm.cmd run build
if ($LASTEXITCODE -ne 0) { throw 'Web build failed.' }
& npx.cmd cap sync android
if ($LASTEXITCODE -ne 0) { throw 'Android sync failed.' }
Push-Location -LiteralPath "$projectRoot\android"
try {
    & .\gradlew.bat --no-daemon --no-watch-fs --max-workers=2 '-Dorg.gradle.internal.instrumentation.agent=false' --console=plain assembleDebug
    if ($LASTEXITCODE -ne 0) { throw 'APK build failed.' }
} finally { Pop-Location }
New-Item -ItemType Directory -Path "$projectRoot\artifacts" -Force | Out-Null
Copy-Item -LiteralPath "$projectRoot\android\app\build\outputs\apk\debug\app-debug.apk" -Destination "$projectRoot\artifacts\choloCampus-test.apk" -Force
Write-Output "Test APK: $projectRoot\artifacts\choloCampus-test.apk"
