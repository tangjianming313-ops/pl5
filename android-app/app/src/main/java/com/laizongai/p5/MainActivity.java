package com.laizongai.p5;

import android.app.Activity;
import android.os.Bundle;
import android.os.Build;
import android.graphics.Color;
import android.view.WindowManager;
import android.content.Intent;
import android.net.Uri;
import android.view.View;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

public class MainActivity extends Activity {
    private static final String HOME = "https://tangjianming313-ops.github.io/pl5/";
    private WebView web;
    private ProgressBar loading;
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        // Keep WebView below the Android status bar instead of drawing edge-to-edge.
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
        getWindow().setStatusBarColor(Color.rgb(245, 246, 248));
        getWindow().setNavigationBarColor(Color.rgb(245, 246, 248));
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(true);
            getWindow().getDecorView().getWindowInsetsController().setSystemBarsAppearance(
                android.view.WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS | android.view.WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS,
                android.view.WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS | android.view.WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS);
        } else {
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
        }
        LinearLayout root = new LinearLayout(this); root.setOrientation(LinearLayout.VERTICAL);
        loading = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        loading.setMax(100); root.addView(loading, new LinearLayout.LayoutParams(-1, 5));
        web = new WebView(this); root.addView(web, new LinearLayout.LayoutParams(-1, 0, 1));
        setContentView(root);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true); settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false); settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if ("https".equals(u.getScheme()) && "tangjianming313-ops.github.io".equals(u.getHost()) && u.getPath() != null && u.getPath().startsWith("/pl5/")) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) {}
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public void onProgressChanged(WebView view, int progress) {
                loading.setProgress(progress); loading.setVisibility(progress == 100 ? View.GONE : View.VISIBLE);
            }
        });
        if (state == null) web.loadUrl(HOME); else web.restoreState(state);
    }
    @Override protected void onSaveInstanceState(Bundle out) { web.saveState(out); super.onSaveInstanceState(out); }
    @Override public void onBackPressed() { if (web != null && web.canGoBack()) web.goBack(); else super.onBackPressed(); }
    @Override protected void onDestroy() { if (web != null) { web.destroy(); web = null; } super.onDestroy(); }
}
