package com.bilingo.radio.player

import android.content.Context
import android.net.Uri
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

enum class PlaybackState {
    IDLE, BUFFERING, PLAYING, PAUSED, ERROR
}

/**
 * Manages Live Bilingo Radio streaming using AndroidX Media3 (ExoPlayer).
 */
class RadioPlayerManager(private val context: Context) {

    private var exoPlayer: ExoPlayer? = null
    
    private val _playbackState = MutableStateFlow(PlaybackState.IDLE)
    val playbackState: StateFlow<PlaybackState> = _playbackState.asStateFlow()

    var currentStreamUrl = "https://npr-ice.streamguys1.com/live.mp3"

    fun setStreamUrl(url: String) {
        if (url.isNotBlank() && url != currentStreamUrl) {
            currentStreamUrl = url
            exoPlayer?.apply {
                setMediaItem(MediaItem.fromUri(Uri.parse(currentStreamUrl)))
                prepare()
            }
        }
    }

    fun initializePlayer() {
        if (exoPlayer == null) {
            exoPlayer = ExoPlayer.Builder(context).build().apply {
                val mediaItem = MediaItem.fromUri(Uri.parse(currentStreamUrl))
                setMediaItem(mediaItem)
                prepare()
                
                addListener(object : Player.Listener {
                    override fun onIsPlayingChanged(isPlaying: Boolean) {
                        if (isPlaying) {
                            _playbackState.value = PlaybackState.PLAYING
                        } else if (_playbackState.value == PlaybackState.PLAYING) {
                            _playbackState.value = PlaybackState.PAUSED
                        }
                    }

                    override fun onPlayerError(error: androidx.media3.common.PlaybackException) {
                        _playbackState.value = PlaybackState.ERROR
                    }

                    override fun onPlaybackStateChanged(state: Int) {
                        when (state) {
                            Player.STATE_BUFFERING -> _playbackState.value = PlaybackState.BUFFERING
                            Player.STATE_READY -> {
                                if (this@apply.playWhenReady) {
                                    _playbackState.value = PlaybackState.PLAYING
                                } else {
                                    _playbackState.value = PlaybackState.PAUSED
                                }
                            }
                            Player.STATE_ENDED -> _playbackState.value = PlaybackState.IDLE
                            Player.STATE_IDLE -> _playbackState.value = PlaybackState.IDLE
                        }
                    }
                })
            }
        }
    }

    fun play() {
        try {
            initializePlayer()
            exoPlayer?.playWhenReady = true
            exoPlayer?.play()
            _playbackState.value = PlaybackState.PLAYING
        } catch (e: Exception) {
            _playbackState.value = PlaybackState.ERROR
        }
    }

    fun pause() {
        exoPlayer?.pause()
        _playbackState.value = PlaybackState.PAUSED
    }

    fun togglePlayPause() {
        if (_playbackState.value == PlaybackState.PLAYING) {
            pause()
        } else {
            play()
        }
    }

    fun release() {
        exoPlayer?.release()
        exoPlayer = null
        _playbackState.value = PlaybackState.IDLE
    }
}
