package com.brainboost.app;

import android.Manifest;
import android.app.Activity;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

public class MainActivity extends Activity {
    private static final String APP_URL = "https://backboost-skill1.vercel.app/";
    private static final String APP_HOST = "backboost-skill1.vercel.app";
    private static final int FILE_CHOOSER_REQUEST = 1001;
    private static final int MICROPHONE_PERMISSION_REQUEST = 1002;
    private static final int NOTIFICATION_PERMISSION_REQUEST = 1003;
    private static final int RUNNING_NOTIFICATION_ID = 2201;
    private static final String NOTIFICATION_CHANNEL_ID = "brainboost_running";

    private WebView webView;
    private View splashView;
    private ValueCallback<Uri[]> filePathCallback;
    private PermissionRequest pendingWebPermissionRequest;
    private int safeTopDp = 0;
    private int safeBottomDp = 0;
    private boolean notificationPermissionRequested = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        configureEdgeToEdgeWindow();
        createNotificationChannel();

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(7, 11, 26));

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(248, 250, 252));
        webView.setAlpha(0f);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setVerticalScrollBarEnabled(false);
        webView.setHorizontalScrollBarEnabled(false);
        webView.setNestedScrollingEnabled(true);
        webView.setFocusable(true);
        webView.setFocusableInTouchMode(true);
        root.addView(
                webView,
                new FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT));

        splashView = buildSplashView();
        root.addView(
                splashView,
                new FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT));

        setContentView(root);
        captureSystemBarInsets(root);
        configureWebView();

        if (savedInstanceState == null) {
            if (!handleDeepLinkIntent(getIntent())) {
                webView.loadUrl(APP_URL);
            }
        } else {
            webView.restoreState(savedInstanceState);
            dismissSplash();
        }
    }

    private void configureEdgeToEdgeWindow() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            getWindow().setStatusBarColor(Color.TRANSPARENT);
            getWindow().getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
        }
        getWindow().setNavigationBarColor(Color.WHITE);
    }

    private View buildSplashView() {
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setGravity(Gravity.CENTER);
        layout.setBackgroundColor(Color.rgb(7, 11, 26));
        layout.setPadding(dp(28), dp(28), dp(28), dp(28));

        ImageView logo = new ImageView(this);
        logo.setImageResource(com.brainboost.app.R.drawable.brainboost_icon);
        logo.setScaleType(ImageView.ScaleType.FIT_CENTER);
        LinearLayout.LayoutParams logoParams = new LinearLayout.LayoutParams(dp(112), dp(112));
        logoParams.bottomMargin = dp(18);
        layout.addView(logo, logoParams);

        TextView title = new TextView(this);
        title.setText("Brain boost");
        title.setTextColor(Color.WHITE);
        title.setTextSize(24f);
        title.setGravity(Gravity.CENTER);
        title.setTypeface(title.getTypeface(), android.graphics.Typeface.BOLD);
        layout.addView(
                title,
                new LinearLayout.LayoutParams(
                        ViewGroup.LayoutParams.WRAP_CONTENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT));

        TextView subtitle = new TextView(this);
        subtitle.setText("AI Career & Learning Acceleration");
        subtitle.setTextColor(Color.rgb(148, 163, 184));
        subtitle.setTextSize(12f);
        subtitle.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams subtitleParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT);
        subtitleParams.topMargin = dp(6);
        layout.addView(subtitle, subtitleParams);

        return layout;
    }

    private void captureSystemBarInsets(View root) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            root.setOnApplyWindowInsetsListener((view, insets) -> {
                int topPx = insets.getSystemWindowInsetTop();
                int bottomPx = insets.getSystemWindowInsetBottom();
                float density = getResources().getDisplayMetrics().density;
                safeTopDp = Math.max(0, Math.round(topPx / density));
                safeBottomDp = Math.max(0, Math.round(bottomPx / density));
                pushSafeAreaToWeb();
                return insets;
            });
            root.requestApplyInsets();
        }
    }

    private void pushSafeAreaToWeb() {
        if (webView == null) return;
        final int top = safeTopDp;
        final int bottom = safeBottomDp;
        webView.post(() -> webView.evaluateJavascript(
                "(function(){" +
                        "var d=document.documentElement;" +
                        "d.style.setProperty('--native-safe-top','" + top + "px');" +
                        "d.style.setProperty('--native-safe-bottom','" + bottom + "px');" +
                        "})();",
                null));
    }

    private int dp(int value) {
        float density = getResources().getDisplayMetrics().density;
        return Math.round(value * density);
    }

    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setUseWideViewPort(false);
        settings.setLoadWithOverviewMode(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setSupportZoom(false);
        settings.setTextZoom(100);
        settings.setUserAgentString(settings.getUserAgentString() + " BrainBoostAndroid/3.0");

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        }

        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            cookieManager.setAcceptThirdPartyCookies(webView, true);
        }

        webView.addJavascriptInterface(new NativeBridge(), "BrainBoostNative");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                pushSafeAreaToWeb();
                installNativeThemeBridge();
                dismissSplash();
                ensureRunningNotification();
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return handleUri(request.getUrl());
            }

            @SuppressWarnings("deprecation")
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return handleUri(Uri.parse(url));
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(
                    WebView webView,
                    ValueCallback<Uri[]> filePath,
                    FileChooserParams fileChooserParams) {
                if (filePathCallback != null) {
                    filePathCallback.onReceiveValue(null);
                }
                filePathCallback = filePath;

                Intent chooserIntent;
                try {
                    chooserIntent = fileChooserParams.createIntent();
                    chooserIntent.addCategory(Intent.CATEGORY_OPENABLE);
                } catch (Exception e) {
                    filePathCallback = null;
                    return false;
                }

                try {
                    startActivityForResult(
                            Intent.createChooser(chooserIntent, "Choose file"),
                            FILE_CHOOSER_REQUEST);
                    return true;
                } catch (ActivityNotFoundException e) {
                    filePathCallback = null;
                    return false;
                }
            }

            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> handleWebPermissionRequest(request));
            }
        });
    }

    private void installNativeThemeBridge() {
        if (webView == null) return;
        String script =
                "(function(){" +
                        "if(window.__brainBoostNativeThemeObserver)return;" +
                        "var d=document.documentElement;" +
                        "var send=function(){try{BrainBoostNative.setDarkMode(d.classList.contains('dark'));}catch(e){}};" +
                        "window.__brainBoostNativeThemeObserver=new MutationObserver(send);" +
                        "window.__brainBoostNativeThemeObserver.observe(d,{attributes:true,attributeFilter:['class']});" +
                        "send();" +
                        "})();";
        webView.evaluateJavascript(script, null);
    }

    private class NativeBridge {
        @JavascriptInterface
        public void setDarkMode(boolean darkMode) {
            runOnUiThread(() -> applySystemBarTheme(darkMode));
        }
    }

    private void applySystemBarTheme(boolean darkMode) {
        int flags = View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN;
        if (!darkMode && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
        }
        if (!darkMode && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
        }
        getWindow().getDecorView().setSystemUiVisibility(flags);
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(
                darkMode ? Color.rgb(7, 11, 26) : Color.WHITE);
    }

    private void dismissSplash() {
        if (webView != null && webView.getAlpha() == 0f) {
            webView.animate().alpha(1f).setDuration(180).start();
        }
        if (splashView != null) {
            View currentSplash = splashView;
            splashView = null;
            currentSplash.animate()
                    .alpha(0f)
                    .setDuration(220)
                    .withEndAction(() -> {
                        ViewGroup parent = (ViewGroup) currentSplash.getParent();
                        if (parent != null) parent.removeView(currentSplash);
                    })
                    .start();
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    NOTIFICATION_CHANNEL_ID,
                    "Brain boost activity",
                    NotificationManager.IMPORTANCE_LOW);
            channel.setDescription("Shows when Brain boost is active");
            channel.setSound(null, null);
            channel.enableVibration(false);
            NotificationManager manager =
                    (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) manager.createNotificationChannel(channel);
        }
    }

    private void ensureRunningNotification() {
        if (Build.VERSION.SDK_INT >= 33
                && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
            if (!notificationPermissionRequested) {
                notificationPermissionRequested = true;
                requestPermissions(
                        new String[]{Manifest.permission.POST_NOTIFICATIONS},
                        NOTIFICATION_PERMISSION_REQUEST);
            }
            return;
        }
        showRunningNotification();
    }

    private void showRunningNotification() {
        Intent openAppIntent = new Intent(this, MainActivity.class);
        openAppIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this,
                0,
                openAppIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Notification.Builder builder;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder = new Notification.Builder(this, NOTIFICATION_CHANNEL_ID);
        } else {
            builder = new Notification.Builder(this);
            builder.setPriority(Notification.PRIORITY_LOW);
        }

        Notification notification = builder
                .setSmallIcon(android.R.drawable.ic_media_play)
                .setContentTitle("Brain boost is running")
                .setContentText("Tap to return to your learning dashboard")
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setAutoCancel(false)
                .setCategory(Notification.CATEGORY_STATUS)
                .setVisibility(Notification.VISIBILITY_PRIVATE)
                .build();

        NotificationManager manager =
                (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) manager.notify(RUNNING_NOTIFICATION_ID, notification);
    }

    private void cancelRunningNotification() {
        NotificationManager manager =
                (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) manager.cancel(RUNNING_NOTIFICATION_ID);
    }

    private boolean handleUri(Uri uri) {
        if (uri == null) return false;

        String scheme = uri.getScheme();
        String host = uri.getHost();

        if ("brainboost".equalsIgnoreCase(scheme)) {
            return handleDeepLink(uri);
        }

        if (("https".equalsIgnoreCase(scheme) || "http".equalsIgnoreCase(scheme))
                && APP_HOST.equalsIgnoreCase(host)) {
            return false;
        }

        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
            startActivity(intent);
            return true;
        } catch (ActivityNotFoundException e) {
            return false;
        }
    }

    private boolean handleDeepLinkIntent(Intent intent) {
        if (intent == null) return false;
        return handleDeepLink(intent.getData());
    }

    private boolean handleDeepLink(Uri uri) {
        if (uri == null) return false;
        if (!"brainboost".equalsIgnoreCase(uri.getScheme())) return false;
        if (!"auth-callback".equalsIgnoreCase(uri.getHost())) return false;

        StringBuilder target = new StringBuilder(APP_URL);
        if (uri.getEncodedQuery() != null && !uri.getEncodedQuery().isEmpty()) {
            target.append("?").append(uri.getEncodedQuery());
        }
        if (uri.getEncodedFragment() != null && !uri.getEncodedFragment().isEmpty()) {
            target.append("#").append(uri.getEncodedFragment());
        }

        if (webView != null) {
            webView.loadUrl(target.toString());
            return true;
        }
        return false;
    }

    private void handleWebPermissionRequest(PermissionRequest request) {
        boolean asksForMicrophone = false;
        for (String resource : request.getResources()) {
            if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) {
                asksForMicrophone = true;
                break;
            }
        }

        if (!asksForMicrophone) {
            request.deny();
            return;
        }

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M
                || checkSelfPermission(Manifest.permission.RECORD_AUDIO)
                == PackageManager.PERMISSION_GRANTED) {
            request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
            return;
        }

        pendingWebPermissionRequest = request;
        requestPermissions(
                new String[]{Manifest.permission.RECORD_AUDIO},
                MICROPHONE_PERMISSION_REQUEST);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleDeepLinkIntent(intent);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode == FILE_CHOOSER_REQUEST && filePathCallback != null) {
            Uri[] results = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
            filePathCallback.onReceiveValue(results);
            filePathCallback = null;
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);

        if (requestCode == MICROPHONE_PERMISSION_REQUEST && pendingWebPermissionRequest != null) {
            if (grantResults.length > 0
                    && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                pendingWebPermissionRequest.grant(
                        new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
            } else {
                pendingWebPermissionRequest.deny();
            }
            pendingWebPermissionRequest = null;
        }

        if (requestCode == NOTIFICATION_PERMISSION_REQUEST) {
            if (grantResults.length > 0
                    && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                showRunningNotification();
            }
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        cancelRunningNotification();
        if (webView != null) {
            webView.stopLoading();
            webView.removeJavascriptInterface("BrainBoostNative");
            webView.setWebChromeClient(null);
            webView.setWebViewClient(null);
            webView.destroy();
        }
        super.onDestroy();
    }
}
