package com.calai.app.ui.scan

import android.util.Base64
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.calai.app.AppContainer
import com.calai.app.data.api.dto.AnalyzeFoodRequest
import com.calai.app.data.api.dto.ErrorResponse
import com.calai.app.data.api.dto.FoodAnalysisDto
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import retrofit2.HttpException

/**
 * The captured-image flow surface for [FoodScanScreen]. UI states map to the
 * web FE: idle → camera → preview → analyzing → result | error.
 *
 * Image bytes live on this class as a property rather than a state so the
 * preview/result panes don't recompose every time we capture — they receive
 * the bytes once via [previewImage].
 */
class FoodScanViewModel(private val container: AppContainer) : ViewModel() {

    enum class Stage { Idle, Camera, Preview, Analyzing, Result, Error }
    enum class ErrorKind { System, NoFood }

    var stage by mutableStateOf(Stage.Idle)
        private set

    /** JPEG bytes from the most recent capture; cleared when user retakes. */
    var previewImage by mutableStateOf<ByteArray?>(null)
        private set

    var result by mutableStateOf<FoodAnalysisDto?>(null)
        private set

    var errorMessage by mutableStateOf<String?>(null)
        private set

    var errorKind by mutableStateOf(ErrorKind.System)
        private set

    var saving by mutableStateOf(false)
        private set

    var savedFlash by mutableStateOf(false)
        private set

    var history by mutableStateOf<List<FoodAnalysisDto>>(emptyList())
        private set

    var historyLoading by mutableStateOf(true)
        private set

    var historyError by mutableStateOf<String?>(null)
        private set

    /** Animated progress index for the cosmetic step indicator during analyze. */
    var analysisStepIndex by mutableStateOf(0)
        private set

    fun openCamera() {
        errorMessage = null
        stage = Stage.Camera
    }

    fun backToIdle() {
        previewImage = null
        result = null
        errorMessage = null
        stage = Stage.Idle
    }

    fun setCaptured(jpegBytes: ByteArray) {
        previewImage = jpegBytes
        stage = Stage.Preview
    }

    fun retake() {
        previewImage = null
        errorMessage = null
        stage = Stage.Camera
    }

    fun selectHistoryItem(item: FoodAnalysisDto) {
        result = item
        previewImage = null
        stage = Stage.Result
    }

    fun bumpAnalysisStep(index: Int) {
        if (index > analysisStepIndex) analysisStepIndex = index
    }

    fun analyze() {
        val bytes = previewImage ?: return
        errorMessage = null
        errorKind = ErrorKind.System
        analysisStepIndex = 0
        stage = Stage.Analyzing

        // The backend's strict parseImageDataUrl regex only accepts
        // `data:image/<png|jpeg|webp>;base64,<base64>`. We encode without
        // newlines to keep the regex's `[a-z0-9+/=]+` clean.
        val dataUrl = "data:image/jpeg;base64," +
            Base64.encodeToString(bytes, Base64.NO_WRAP)

        viewModelScope.launch {
            try {
                val resp = container.foodAnalysisApi.analyze(
                    AnalyzeFoodRequest(imageUrl = dataUrl, source = "camera")
                )
                result = resp.data
                stage = Stage.Result
                loadHistory()
            } catch (e: HttpException) {
                handleHttpFailure(e)
            } catch (e: Exception) {
                errorMessage = e.message ?: "Network error"
                errorKind = ErrorKind.System
                stage = Stage.Error
            }
        }
    }

    fun reanalyze() {
        val current = result ?: return
        errorMessage = null
        errorKind = ErrorKind.System
        analysisStepIndex = 0
        stage = Stage.Analyzing
        viewModelScope.launch {
            try {
                val resp = container.foodAnalysisApi.reanalyze(current.id)
                result = resp.data
                stage = Stage.Result
                loadHistory()
            } catch (e: HttpException) {
                handleHttpFailure(e)
            } catch (e: Exception) {
                errorMessage = e.message ?: "Network error"
                errorKind = ErrorKind.System
                stage = Stage.Error
            }
        }
    }

    fun saveToDietLog(onSaved: () -> Unit) {
        val current = result ?: return
        if (saving) return
        saving = true
        viewModelScope.launch {
            try {
                val resp = container.foodAnalysisApi.saveToDietLog(current.id)
                result = resp.data
                savedFlash = true
                onSaved()
                loadHistory()
                delay(2200)
                savedFlash = false
            } catch (e: HttpException) {
                errorMessage = parseHttpMessage(e) ?: "Save failed"
            } catch (e: Exception) {
                errorMessage = e.message ?: "Save failed"
            } finally {
                saving = false
            }
        }
    }

    fun loadHistory() {
        viewModelScope.launch {
            historyError = null
            try {
                val resp = container.foodAnalysisApi.history()
                history = resp.data
            } catch (e: HttpException) {
                historyError = "HTTP ${e.code()}"
            } catch (e: Exception) {
                historyError = e.message ?: "Failed to load history"
            } finally {
                historyLoading = false
            }
        }
    }

    /**
     * Special-case the 422 response from the backend's food-content gate
     * (CLIP rejected the image as non-food). Map it to a softer error UI
     * with retake guidance rather than the red "system failure" path.
     */
    private fun handleHttpFailure(e: HttpException) {
        val msg = parseHttpMessage(e)
        errorMessage = msg ?: "AI service returned HTTP ${e.code()}"
        errorKind = if (e.code() == 422) ErrorKind.NoFood else ErrorKind.System
        stage = Stage.Error
    }

    private fun parseHttpMessage(e: HttpException): String? = try {
        val raw = e.response()?.errorBody()?.string()
        if (raw.isNullOrBlank()) null
        else Json { ignoreUnknownKeys = true }
            .decodeFromString(ErrorResponse.serializer(), raw)
            .message
            .takeIf { it.isNotBlank() }
    } catch (_: Throwable) {
        null
    }
}
