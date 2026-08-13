package com.bilingo.radio.ui.screens

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Bitmap
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Handler
import android.os.Looper
import android.view.ViewGroup
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import android.content.BroadcastReceiver
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import kotlinx.coroutines.delay
import com.bilingo.radio.service.RadioForegroundService
import com.bilingo.radio.viewmodel.RadioSubtitleViewModel

class WebAppInterface(
    private val context: Context,
    private val onRetry: () -> Unit,
    private val onAppLoaded: () -> Unit
) {
    @JavascriptInterface
    fun retryConnection() {
        Handler(Looper.getMainLooper()).post {
            try {
                onRetry()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    @JavascriptInterface
    fun onPageReady() {
        Handler(Looper.getMainLooper()).post {
            try {
                onAppLoaded()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    @JavascriptInterface
    fun updatePlayerNotification(stationName: String, subtitleText: String, isPlaying: Boolean) {
        Handler(Looper.getMainLooper()).post {
            try {
                RadioForegroundService.updateNotificationInfo(
                    context,
                    stationName,
                    subtitleText,
                    isPlaying
                )
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
}

fun isNetworkAvailable(context: Context): Boolean {
    val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
        ?: return false
    val network = connectivityManager.activeNetwork ?: return false
    val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false
    return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun MainScreen(
    viewModel: RadioSubtitleViewModel
) {
    val context = LocalContext.current
    var isLoading by remember { mutableStateOf(true) }
    var isOfflineError by remember { mutableStateOf(false) }
    var webViewInstance by remember { mutableStateOf<WebView?>(null) }
    val localAppUrl = "file:///android_asset/www/index.html"
    val webAppUrl = "https://ais-pre-2ezjlg7ygolcgvkdlo7zla-290275720433.asia-northeast1.run.app"

    val handleConnectionRetry: () -> Unit = {
        try {
            if (isNetworkAvailable(context)) {
                Toast.makeText(context.applicationContext, "⚡ 網路已連線，正在載入 Live Bilingo...", Toast.LENGTH_SHORT).show()
                isOfflineError = false
                isLoading = true
                webViewInstance?.apply {
                    stopLoading()
                    settings.cacheMode = WebSettings.LOAD_DEFAULT
                    loadUrl(localAppUrl)
                }
            } else {
                Toast.makeText(context.applicationContext, "📡 目前仍未連線至網路，已為您載入離線學習主頁", Toast.LENGTH_SHORT).show()
                isOfflineError = false
                isLoading = false
                webViewInstance?.apply {
                    stopLoading()
                    loadUrl(localAppUrl)
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    LaunchedEffect(isLoading) {
        if (isLoading) {
            delay(1200)
            isLoading = false
        }
    }

    DisposableEffect(context, webViewInstance) {
        val receiver = object : BroadcastReceiver() {
            override fun onReceive(ctx: Context?, intent: Intent?) {
                val action = intent?.getStringExtra("action") ?: return
                webViewInstance?.post {
                    webViewInstance?.evaluateJavascript(
                        "window.postMessage({ type: 'ANDROID_MEDIA_CONTROL', action: '$action' }, '*');",
                        null
                    )
                }
            }
        }
        val filter = IntentFilter(RadioForegroundService.BROADCAST_MEDIA_ACTION)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            context.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            context.registerReceiver(receiver, filter)
        }
        onDispose {
            try {
                context.unregisterReceiver(receiver)
            } catch (e: Exception) {
                // ignore
            }
            try {
                webViewInstance?.loadUrl("about:blank")
                webViewInstance?.destroy()
                webViewInstance = null
            } catch (e: Exception) {
                // ignore
            }
        }
    }

    Box(modifier = Modifier.fillMaxSize().background(Color(0xFF0F172A))) {
        AndroidView(
            factory = { ctx ->
                WebView(ctx).apply {
                    layoutParams = ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    )
                    
                    setBackgroundColor(android.graphics.Color.parseColor("#0F172A"))
                    setLayerType(android.view.View.LAYER_TYPE_HARDWARE, null)
                    webChromeClient = object : WebChromeClient() {
                        override fun onConsoleMessage(consoleMessage: android.webkit.ConsoleMessage?): Boolean {
                            android.util.Log.d("WebViewConsole", "${consoleMessage?.message()} -- line ${consoleMessage?.lineNumber()} of ${consoleMessage?.sourceId()}")
                            return true
                        }
                    }

                    settings.apply {
                        javaScriptEnabled = true
                        domStorageEnabled = true
                        databaseEnabled = true
                        allowFileAccess = true
                        allowContentAccess = true
                        allowFileAccessFromFileURLs = true
                        allowUniversalAccessFromFileURLs = true
                        mediaPlaybackRequiresUserGesture = false
                        mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                        useWideViewPort = true
                        loadWithOverviewMode = true
                        setSupportZoom(false)
                        textZoom = 100
                        userAgentString = "$userAgentString AndroidApp/2.1.2"
                        cacheMode = WebSettings.LOAD_DEFAULT
                    }

                    addJavascriptInterface(WebAppInterface(ctx, handleConnectionRetry) { isLoading = false }, "AndroidBridge")

                    webViewClient = object : WebViewClient() {
                        override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                            super.onPageStarted(view, url, favicon)
                            if (url != null && !url.startsWith("data:")) {
                                isOfflineError = false
                            }
                            isLoading = true
                        }

                        override fun onPageFinished(view: WebView?, url: String?) {
                            super.onPageFinished(view, url)
                            isLoading = false
                        }

                        override fun onReceivedError(
                            view: WebView?,
                            request: WebResourceRequest?,
                            error: WebResourceError?
                        ) {
                            super.onReceivedError(view, request, error)
                            val reqUrl = request?.url?.toString() ?: ""
                            if (request?.isForMainFrame == true && (reqUrl.startsWith("http://") || reqUrl.startsWith("https://"))) {
                                isOfflineError = true
                                isLoading = false
                            }
                        }

                        override fun shouldOverrideUrlLoading(
                            view: WebView?,
                            request: WebResourceRequest?
                        ): Boolean {
                            return false
                        }
                    }

                    webViewInstance = this
                    loadUrl(localAppUrl)
                }
            },
            modifier = Modifier.fillMaxSize()
        )

        // Native Offline Overlay
        if (isOfflineError) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color(0xFF0F172A))
                    .padding(24.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Text(
                        text = "📡",
                        fontSize = 56.sp
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = "Live Bilingo 雙語電台",
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "目前為航空 / 離線模式（無網路連線）",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color(0xFFF87171)
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = "已進入離線學習模式！您可繼續檢視先前快取的歷史雙語字幕、學習筆記與字典。\n連上 Wi-Fi 或行動網路後將自動恢復線上廣播。",
                        fontSize = 14.sp,
                        color = Color(0xFF94A3B8),
                        textAlign = TextAlign.Center,
                        lineHeight = 20.sp
                    )
                    Spacer(modifier = Modifier.height(28.dp))
                    
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Button(
                            onClick = { handleConnectionRetry() },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0xFF0EA5E9),
                                contentColor = Color.White
                            ),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier
                                .height(48.dp)
                                .padding(horizontal = 16.dp)
                        ) {
                            Text(
                                text = "進入主畫面 (離線模式)",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        Button(
                            onClick = { handleConnectionRetry() },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0xFF334155),
                                contentColor = Color.White
                            ),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier
                                .height(44.dp)
                                .padding(horizontal = 16.dp)
                        ) {
                            Text(
                                text = "🔄 重新試圖連線",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                    }
                }
            }
        }

        if (isLoading && !isOfflineError) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color(0xFF0F172A)),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    CircularProgressIndicator(color = Color(0xFF38BDF8))
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = "正在連線至 Live Bilingo 電台...",
                        color = Color(0xFF94A3B8),
                        fontSize = 14.sp
                    )
                }
            }
        }
    }
}

fun getOfflineHtmlContent(): String {
    return """
    <!DOCTYPE html>
    <html lang="zh-TW">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <title>Live Bilingo 雙語電台 - 航空離線模式</title>
        <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
                background-color: #0b0f19;
                color: #f8fafc;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                padding: 16px;
                min-height: 100vh;
            }
            .banner {
                background: linear-gradient(135deg, #b91c1c 0%, #991b1b 100%);
                color: #ffffff;
                padding: 12px 16px;
                border-radius: 12px;
                font-size: 13px;
                font-weight: 600;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
                margin-bottom: 20px;
                box-shadow: 0 4px 12px rgba(185, 28, 28, 0.3);
            }
            .header {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 20px;
                padding-bottom: 12px;
                border-bottom: 1px solid #1e293b;
            }
            .logo {
                width: 40px;
                height: 40px;
                background: linear-gradient(135deg, #2563eb, #4f46e5);
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
            }
            .title-box h1 { font-size: 16px; font-weight: bold; color: #ffffff; }
            .title-box p { font-size: 12px; color: #94a3b8; }
            .card {
                background-color: #0f172a;
                border: 1px solid #1e293b;
                border-radius: 16px;
                padding: 18px;
                margin-bottom: 16px;
            }
            .card-title {
                font-size: 14px;
                font-weight: bold;
                color: #38bdf8;
                margin-bottom: 8px;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .card-desc {
                font-size: 13px;
                color: #94a3b8;
                line-height: 1.6;
            }
            .reload-btn {
                width: 100%;
                background-color: #0ea5e9;
                color: #ffffff;
                border: none;
                padding: 14px;
                border-radius: 12px;
                font-size: 14px;
                font-weight: bold;
                cursor: pointer;
                margin-top: 12px;
                transition: opacity 0.2s;
            }
            .reload-btn:active { opacity: 0.8; }
        </style>
    </head>
    <body>
        <div class="banner">
            <span>📡 航空 / 離線學習模式（網路未連線）</span>
        </div>
        <div class="header">
            <div class="logo">📻</div>
            <div class="title-box">
                <h1>Live Bilingo 雙語電台</h1>
                <p>已進入安全的離線主畫面</p>
            </div>
        </div>
        <div class="card">
            <div class="card-title">📖 離線學習模式已就緒</div>
            <div class="card-desc">
                您目前處於航空模式（未連線至網路）。<br><br>
                在離線狀態下，您仍可閱讀本機快取的歷史雙語字幕、語音筆記與單字庫。<br>
                當您重新連上網際網路（Wi-Fi 或行動數據）後，請點擊下方按鈕恢復線上雙語電台串流。
            </div>
        </div>
        <button class="reload-btn" onclick="handleOfflineRetry()">🔄 重新嘗試網路連線</button>
        <script>
            function handleOfflineRetry() {
                try {
                    if (window.AndroidBridge && window.AndroidBridge.retryConnection) {
                        window.AndroidBridge.retryConnection();
                    } else if (navigator.onLine) {
                        window.location.href = "https://ais-pre-2ezjlg7ygolcgvkdlo7zla-290275720433.asia-northeast1.run.app";
                    } else {
                        alert("📡 目前仍未連線至網路，請開啟 Wi-Fi 或行動數據後再試。");
                    }
                } catch(e) {
                    console.error("Retry error:", e);
                }
            }
        </script>
    </body>
    </html>
    """.trimIndent()
}
