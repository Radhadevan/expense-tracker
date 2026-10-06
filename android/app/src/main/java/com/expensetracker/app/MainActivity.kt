package com.expensetracker.app

import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.os.Bundle
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.expensetracker.app.sms.AndroidSmsBridge

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var smsBridge: AndroidSmsBridge

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webView = WebView(this)
        setContentView(webView)

        val settings: WebSettings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        settings.loadWithOverviewMode = true
        settings.useWideViewPort = true
        settings.cacheMode = WebSettings.LOAD_DEFAULT

        webView.webViewClient = WebViewClient()
        webView.webChromeClient = WebChromeClient()

        // Bind Android native SMS bridge to JavaScript
        smsBridge = AndroidSmsBridge(this, webView)
        webView.addJavascriptInterface(smsBridge, "AndroidNativeSMS")

        // Load local application
        webView.loadUrl("file:///android_asset/index.html")
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            Toast.makeText(this, "SMS Permission Granted", Toast.LENGTH_SHORT).show()
            smsBridge.setReceiverEnabled(true)
            webView.evaluateJavascript(
                "if (window.AndroidSmsBridge) { window.AndroidSmsBridge.dispatchIncomingSms({ type: 'PERMISSION_GRANTED' }); }",
                null
            )
        } else {
            Toast.makeText(this, "SMS Tracking Permission Denied. You can add transactions manually.", Toast.LENGTH_LONG).show()
            smsBridge.setReceiverEnabled(false)
        }
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
