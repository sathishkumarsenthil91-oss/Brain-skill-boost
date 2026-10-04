param([ValidateSet('Debug','Release','Unsigned','All')][string]$Mode='All')
$ErrorActionPreference='Stop'
$mobileDirectory=$PSScriptRoot
$javaDirectory=Join-Path $mobileDirectory '.tools/java17/jdk-17.0.20.1+1'
if(!(Test-Path -LiteralPath $javaDirectory)){throw 'Install JDK 17 and set the Java directory as described in mobile/README.md.'}
$env:JAVA_HOME=$javaDirectory
$env:ANDROID_HOME=Join-Path $mobileDirectory '.tools/android-sdk'
$env:PATH=(Join-Path $javaDirectory 'bin')+';'+$env:PATH
$env:GRADLE_USER_HOME=Join-Path $mobileDirectory '.tools/gradle-cache'
try {
    $env:BRAINBOOST_SIGNING_PASSWORD=$null
    if($Mode -in @('Release','All')) {
        $protectedPassword=(Get-Content (Join-Path $mobileDirectory '.signing/password.dpapi') -Raw).Trim() | ConvertTo-SecureString
        $env:BRAINBOOST_SIGNING_PASSWORD=[System.Net.NetworkCredential]::new('', $protectedPassword).Password
    }
    Push-Location (Join-Path $mobileDirectory 'android')
    try {
        $buildTasks=switch($Mode){'Debug'{@('assembleDebug')};'Release'{@('assembleRelease','bundleRelease')};'Unsigned'{@('assembleRelease','bundleRelease')};'All'{@('assembleDebug','assembleRelease','bundleRelease')}}
        & .\gradlew.bat @buildTasks --no-daemon --console=plain
        if($LASTEXITCODE -ne 0){throw 'Android build failed. See the build output.'}
    } finally {Pop-Location}
} finally {$env:BRAINBOOST_SIGNING_PASSWORD=$null}

