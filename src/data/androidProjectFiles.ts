import { AndroidFile } from '../types';

export const androidProjectFiles: AndroidFile[] = [
  {
    path: 'android/app/build.gradle.kts',
    name: 'build.gradle.kts',
    category: 'gradle',
    language: 'kotlin',
    content: `plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
}

android {
    namespace = "com.bilingo.radio"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.bilingo.radio"
        minSdk = 24
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"
    }

    buildFeatures {
        compose = true
        buildConfig = false
        resValues = false
    }
    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
            excludes += "META-INF/DEPENDENCIES"
        }
    }
}

dependencies {
    // AndroidX & Jetpack Compose Material 3
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.activity:activity-compose:1.9.0")
    implementation(platform("androidx.compose:compose-bom:2024.06.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-core")

    // AndroidX Media3 (ExoPlayer for Live Bilingo Radio)
    implementation("androidx.media3:media3-exoplayer:1.3.1")

    // OkHttp WebSocket (Deepgram Speech-to-Text)
    implementation("com.squareup.okhttp3:okhttp:4.12.0")

    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")

    // Google Mobile Ads (AdMob Non-Intrusive Banner Ads)
    implementation("com.google.android.gms:play-services-ads:23.1.0")
}`
  },
  {
    path: 'android/app/src/main/AndroidManifest.xml',
    name: 'AndroidManifest.xml',
    category: 'manifest',
    language: 'xml',
    content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="Live Bilingo 雙語電台"
        android:theme="@style/Theme.BilingoRadio">

        <!-- Google AdMob Application ID -->
        <meta-data
            android:name="com.google.android.gms.ads.APPLICATION_ID"
            android:value="ca-app-pub-7732369001198376~9508349578"/>
        
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:label="Live Bilingo 雙語電台">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>

</manifest>`
  },
  {
    path: 'android/app/src/main/java/com/bilingo/radio/MainActivity.kt',
    name: 'MainActivity.kt',
    category: 'ui',
    language: 'kotlin',
    content: `package com.bilingo.radio

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import com.bilingo.radio.ui.screens.MainScreen
import com.bilingo.radio.ui.theme.BilingoRadioTheme
import com.bilingo.radio.viewmodel.RadioSubtitleViewModel

class MainActivity : ComponentActivity() {

    private val viewModel: RadioSubtitleViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            BilingoRadioTheme {
                MainScreen(viewModel = viewModel)
            }
        }
    }
}`
  },
  {
    path: 'android/app/src/main/java/com/bilingo/radio/player/RadioPlayerManager.kt',
    name: 'RadioPlayerManager.kt',
    category: 'player',
    language: 'kotlin',
    content: `package com.bilingo.radio.player

import android.content.Context
import android.net.Uri
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

enum class PlaybackState { IDLE, BUFFERING, PLAYING, PAUSED, ERROR }

class RadioPlayerManager(private val context: Context) {
    private var exoPlayer: ExoPlayer? = null
    val defaultStreamUrl = "https://npr-ice.streamguys1.com/live.mp3"
    private val _playbackState = MutableStateFlow(PlaybackState.IDLE)
    val playbackState: StateFlow<PlaybackState> = _playbackState

    fun initializePlayer() {
        if (exoPlayer == null) {
            exoPlayer = ExoPlayer.Builder(context).build().apply {
                val mediaItem = MediaItem.fromUri(Uri.parse(defaultStreamUrl))
                setMediaItem(mediaItem)
                prepare()
                addListener(object : Player.Listener {
                    override fun onIsPlayingChanged(isPlaying: Boolean) {
                        _playbackState.value = if (isPlaying) PlaybackState.PLAYING else PlaybackState.PAUSED
                    }
                })
            }
        }
    }

    fun play() {
        initializePlayer()
        exoPlayer?.playWhenReady = true
        exoPlayer?.play()
    }

    fun pause() {
        exoPlayer?.pause()
    }

    fun release() {
        exoPlayer?.release()
        exoPlayer = null
    }
}`
  },
  {
    path: 'android/app/src/main/java/com/bilingo/radio/stt/DeepgramWebSocketClient.kt',
    name: 'DeepgramWebSocketClient.kt',
    category: 'stt',
    language: 'kotlin',
    content: `package com.bilingo.radio.stt

import okhttp3.*
import org.json.JSONObject
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow

class DeepgramWebSocketClient(
    private val apiKey: String = "26c44e288a84756af4f80d41436af0bf7cc10715"
) {
    private val client = OkHttpClient()
    private var webSocket: WebSocket? = null
    private val _transcriptFlow = MutableSharedFlow<String>(extraBufferCapacity = 64)
    val transcriptFlow: SharedFlow<String> = _transcriptFlow

    fun connect() {
        val url = "wss://api.deepgram.com/v1/listen?model=nova-2&language=en-US&smart_format=true&interim_results=true"
        val request = Request.Builder()
            .url(url)
            .addHeader("Authorization", "Token $apiKey")
            .build()

        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onMessage(webSocket: WebSocket, text: String) {
                try {
                    val json = JSONObject(text)
                    if (json.optBoolean("is_final")) {
                        val transcript = json.optJSONObject("channel")
                            ?.optJSONArray("alternatives")
                            ?.optJSONObject(0)
                            ?.optString("transcript", "")
                        if (!transcript.isNullOrBlank()) {
                            _transcriptFlow.tryEmit(transcript)
                        }
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        })
    }

    fun disconnect() {
        webSocket?.close(1000, "Disconnected")
        webSocket = null
    }
}`
  },
  {
    path: 'android/app/src/main/java/com/bilingo/radio/translation/GeminiTranslationRepository.kt',
    name: 'GeminiTranslationRepository.kt',
    category: 'stt',
    language: 'kotlin',
    content: `package com.bilingo.radio.translation

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject

class GeminiTranslationRepository(
    private val apiKey: String = "YOUR_GEMINI_API_KEY"
) {
    private val client = OkHttpClient()

    suspend fun translateToTraditionalChinese(englishText: String): String = withContext(Dispatchers.IO) {
        val url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=$apiKey"
        val prompt = "Translate this public radio transcript to Traditional Chinese (繁體中文). Return ONLY translated text: $englishText"
        
        val json = JSONObject().apply {
            put("contents", JSONArray().apply {
                put(JSONObject().apply {
                    put("parts", JSONArray().apply {
                        put(JSONObject().apply { put("text", prompt) })
                    })
                })
            })
        }

        val request = Request.Builder()
            .url(url)
            .post(json.toString().toRequestBody("application/json".toMediaType()))
            .build()

        val response = client.newCall(request).execute()
        val body = response.body?.string() ?: ""
        
        return@withContext parseGeminiResponse(body)
    }

    private fun parseGeminiResponse(body: String): String {
        return try {
            JSONObject(body)
            .getJSONArray("candidates")
            .getJSONObject(0)
            .getJSONObject("content")
            .getJSONArray("parts")
            .getJSONObject(0)
            .getString("text").trim()
        } catch (e: Exception) {
            "（翻譯中...）"
        }
    }
}`
  },
  {
    path: 'android/app/src/main/java/com/bilingo/radio/ui/screens/MainScreen.kt',
    name: 'MainScreen.kt',
    category: 'ui',
    language: 'kotlin',
    content: `package com.bilingo.radio.ui.screens

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Bitmap
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.view.ViewGroup
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
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
import androidx.compose.runtime.LaunchedEffect
import kotlinx.coroutines.delay
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
import com.bilingo.radio.viewmodel.RadioSubtitleViewModel

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
    val webAppUrl = "https://ais-pre-2ezjlg7ygolcgvkdlo7zla-290275720433.asia-northeast1.run.app"

    LaunchedEffect(isLoading) {
        if (isLoading) {
            delay(1200)
            isLoading = false
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
                    
                    setLayerType(android.view.View.LAYER_TYPE_HARDWARE, null)
                    webChromeClient = WebChromeClient()

                    settings.apply {
                        javaScriptEnabled = true
                        domStorageEnabled = true
                        databaseEnabled = true
                        allowFileAccess = true
                        allowContentAccess = true
                        mediaPlaybackRequiresUserGesture = false
                        mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                        useWideViewPort = false
                        loadWithOverviewMode = false
                        setSupportZoom(false)
                        textZoom = 100
                        userAgentString = "$userAgentString AndroidApp/1.6.0"
                        
                        if (isNetworkAvailable(ctx)) {
                            cacheMode = WebSettings.LOAD_DEFAULT
                        } else {
                            cacheMode = WebSettings.LOAD_CACHE_ELSE_NETWORK
                        }
                    }

                    webViewClient = object : WebViewClient() {
                        override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                            super.onPageStarted(view, url, favicon)
                            isOfflineError = false
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
                            if (request?.isForMainFrame == true) {
                                isOfflineError = true
                                isLoading = false
                                view?.loadUrl("about:blank")
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
                    loadUrl(webAppUrl)
                }
            },
            modifier = Modifier.fillMaxSize()
        )

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
                        text = "網路連線已中斷",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color(0xFFF87171)
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = "目前處於離線狀態，無法載入線上電台與即時雙語字幕。\\n請檢查您的 Wi-Fi 或行動網路連線。",
                        fontSize = 14.sp,
                        color = Color(0xFF94A3B8),
                        textAlign = TextAlign.Center,
                        lineHeight = 20.sp
                    )
                    Spacer(modifier = Modifier.height(28.dp))
                    Button(
                        onClick = {
                            isOfflineError = false
                            isLoading = true
                            webViewInstance?.apply {
                                settings.cacheMode = if (isNetworkAvailable(context)) {
                                    WebSettings.LOAD_DEFAULT
                                } else {
                                    WebSettings.LOAD_CACHE_ELSE_NETWORK
                                }
                                loadUrl(webAppUrl)
                            }
                        },
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
                            text = "🔄 重新連線",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold
                        )
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
}`
  },
  {
    path: 'android/app/src/main/java/com/bilingo/radio/ui/components/BilingualCard.kt',
    name: 'BilingualCard.kt',
    category: 'ui',
    language: 'kotlin',
    content: `package com.bilingo.radio.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.bilingo.radio.model.SubtitleItem

@Composable
fun BilingualCard(subtitle: SubtitleItem) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 6.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = subtitle.timestamp,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f)
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = subtitle.englishText,
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.Medium
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = subtitle.chineseText,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.primary
            )
        }
    }
}`
  }
];
