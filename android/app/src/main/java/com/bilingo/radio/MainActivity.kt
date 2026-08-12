package com.bilingo.radio

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import com.bilingo.radio.service.RadioForegroundService
import com.bilingo.radio.ui.screens.MainScreen
import com.bilingo.radio.ui.theme.LiveBilingoRadioTheme
import com.bilingo.radio.viewmodel.RadioSubtitleViewModel

class MainActivity : ComponentActivity() {

    private val viewModel: RadioSubtitleViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Start Foreground Service so Android OS does not suspend process/audio on screen lock
        try {
            RadioForegroundService.startService(this)
        } catch (e: Exception) {
            e.printStackTrace()
        }

        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.dark(android.graphics.Color.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.dark(android.graphics.Color.TRANSPARENT)
        )
        setContent {
            LiveBilingoRadioTheme {
                MainScreen(viewModel = viewModel)
            }
        }
    }
}

