package com.calai.app.ui.scan

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.util.Base64
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Cameraswitch
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material.icons.filled.NoPhotography
import androidx.compose.material.icons.filled.PhotoCamera
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Restaurant
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.foundation.Image
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.calai.app.CalAiApplication
import com.calai.app.data.api.dto.FoodAnalysisDto
import com.calai.app.ui.theme.LocalCalAiColors
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import java.util.concurrent.Executors
import kotlin.coroutines.resume
import kotlin.coroutines.suspendCoroutine
import kotlin.math.max
import kotlin.math.min

@Composable
fun FoodScanScreen() {
    val container = (LocalContext.current.applicationContext as CalAiApplication).container
    val vm: FoodScanViewModel = viewModel(
        factory = viewModelFactory { initializer { FoodScanViewModel(container) } }
    )

    // Drive the cosmetic step indicator while waiting on the slow Cal-AI
    // call. The backend doesn't stream progress so this is purely UX
    // reassurance — the real signal is the fetch completing.
    LaunchedEffect(vm.stage) {
        if (vm.stage == FoodScanViewModel.Stage.Analyzing) {
            val durations = longArrayOf(1500, 25000, 18000, 12000)
            var cumulative = 0L
            for ((idx, d) in durations.withIndex()) {
                cumulative += d
                delay(d)
                if (vm.stage != FoodScanViewModel.Stage.Analyzing) break
                vm.bumpAnalysisStep(idx + 1)
            }
        }
    }

    AnimatedContent(
        targetState = vm.stage,
        transitionSpec = {
            (fadeIn(tween(180)) + slideInVertically(tween(220)) { it / 16 })
                .togetherWith(fadeOut(tween(120)) + slideOutVertically(tween(220)) { -it / 16 })
        },
        label = "scan-stage"
    ) { stage ->
        when (stage) {
            FoodScanViewModel.Stage.Idle -> IdleStage(vm)
            FoodScanViewModel.Stage.Camera -> CameraStage(vm)
            FoodScanViewModel.Stage.Preview -> PreviewStage(vm)
            FoodScanViewModel.Stage.Analyzing -> AnalyzingStage(vm)
            FoodScanViewModel.Stage.Result -> ResultStage(vm)
            FoodScanViewModel.Stage.Error -> ErrorStage(vm)
        }
    }
}

// ───────────────────────────────────────────────────────────────────────
// IDLE — landing card + history
// ───────────────────────────────────────────────────────────────────────

@Composable
private fun IdleStage(vm: FoodScanViewModel) {
    val brand = LocalCalAiColors.current
    Column(
        Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .statusBarsPadding()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp)
            .padding(bottom = 24.dp)
    ) {
        Spacer(Modifier.height(12.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(
                Icons.Default.AutoAwesome,
                contentDescription = null,
                tint = brand.brand,
                modifier = Modifier.size(14.dp)
            )
            Spacer(Modifier.width(6.dp))
            Text(
                "AI VISION",
                style = MaterialTheme.typography.labelSmall,
                color = brand.brand,
            )
        }
        Spacer(Modifier.height(6.dp))
        Text(
            "Food Scan",
            style = MaterialTheme.typography.displaySmall,
            color = MaterialTheme.colorScheme.onBackground,
        )
        Spacer(Modifier.height(6.dp))
        Text(
            "Point your camera at a meal. The AI will identify the dish, estimate calories and macros, and let you save it straight to your diet log.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(20.dp))

        ScanFrame(onClick = { vm.openCamera() })

        Spacer(Modifier.height(14.dp))
        BigBrandButton(
            text = "Open Camera",
            icon = Icons.Default.PhotoCamera,
            onClick = { vm.openCamera() },
        )

        Spacer(Modifier.height(28.dp))

        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(
                Icons.Default.History,
                contentDescription = null,
                tint = brand.brand,
                modifier = Modifier.size(16.dp)
            )
            Spacer(Modifier.width(6.dp))
            Text(
                "SCAN HISTORY",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.weight(1f))
            IconButton(
                onClick = { vm.loadHistory() },
                modifier = Modifier.size(28.dp)
            ) {
                Icon(
                    Icons.Default.Refresh,
                    contentDescription = "Refresh",
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.size(16.dp)
                )
            }
        }
        Spacer(Modifier.height(8.dp))

        HistoryList(
            history = vm.history,
            loading = vm.historyLoading,
            error = vm.historyError,
            onSelect = vm::selectHistoryItem,
            onRetry = vm::loadHistory,
        )
    }
}

@Composable
private fun ScanFrame(onClick: () -> Unit) {
    val brand = LocalCalAiColors.current
    Surface(
        shape = RoundedCornerShape(28.dp),
        color = MaterialTheme.colorScheme.surface,
        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(4f / 3f)
                .padding(20.dp),
            contentAlignment = Alignment.Center,
        ) {
            // Dashed brand frame inside the card to read as "scanner viewfinder"
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .border(
                        width = 1.5.dp,
                        color = brand.brand.copy(alpha = 0.45f),
                        shape = RoundedCornerShape(20.dp)
                    )
            )
            CornerBrackets(color = brand.brand)
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Surface(
                    shape = RoundedCornerShape(20.dp),
                    color = brand.brandSoft,
                    modifier = Modifier.size(72.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            Icons.Default.PhotoCamera,
                            contentDescription = null,
                            tint = brand.brand,
                            modifier = Modifier.size(34.dp)
                        )
                    }
                }
                Spacer(Modifier.height(14.dp))
                Text(
                    "Tap to start scanning",
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onSurface,
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    "We'll ask for camera access only when you tap.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                )
            }
        }
    }
}

/**
 * Four L-shaped corner brackets ("scanner viewfinder" look). Drawing with
 * Canvas is the most reliable way to get the 90° rotations right without
 * stacking N nested Box/Modifier.background tricks.
 */
@Composable
private fun CornerBrackets(
    color: Color,
    cornerLength: androidx.compose.ui.unit.Dp = 22.dp,
    thickness: androidx.compose.ui.unit.Dp = 3.dp,
) {
    Canvas(modifier = Modifier.fillMaxSize()) {
        val s = cornerLength.toPx()
        val t = thickness.toPx()
        val w = size.width
        val h = size.height

        // top-left
        drawRect(color, topLeft = Offset(0f, 0f), size = Size(s, t))
        drawRect(color, topLeft = Offset(0f, 0f), size = Size(t, s))
        // top-right
        drawRect(color, topLeft = Offset(w - s, 0f), size = Size(s, t))
        drawRect(color, topLeft = Offset(w - t, 0f), size = Size(t, s))
        // bottom-left
        drawRect(color, topLeft = Offset(0f, h - t), size = Size(s, t))
        drawRect(color, topLeft = Offset(0f, h - s), size = Size(t, s))
        // bottom-right
        drawRect(color, topLeft = Offset(w - s, h - t), size = Size(s, t))
        drawRect(color, topLeft = Offset(w - t, h - s), size = Size(t, s))
    }
}

// ───────────────────────────────────────────────────────────────────────
// CAMERA — live preview + capture + flip
// ───────────────────────────────────────────────────────────────────────

@Composable
private fun CameraStage(vm: FoodScanViewModel) {
    val context = LocalContext.current
    val brand = LocalCalAiColors.current

    var hasPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) ==
                PackageManager.PERMISSION_GRANTED
        )
    }
    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission(),
    ) { granted -> hasPermission = granted }

    // Request the moment we land on the camera stage; previously the camera
    // tab opened nothing until the user tapped a request button.
    LaunchedEffect(Unit) {
        if (!hasPermission) {
            permissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    Box(Modifier.fillMaxSize().background(Color.Black)) {
        if (hasPermission) {
            CameraPreviewSurface(
                onCaptured = { jpeg -> vm.setCaptured(jpeg) },
                modifier = Modifier.fillMaxSize(),
                renderControls = { onCapture, onFlip, ready ->
                    CameraControls(
                        cameraReady = ready,
                        onCapture = onCapture,
                        onFlip = onFlip,
                    )
                },
                topOverlay = {
                    Box(
                        Modifier
                            .fillMaxSize()
                            .padding(top = 16.dp),
                        contentAlignment = Alignment.TopCenter
                    ) {
                        Surface(
                            shape = RoundedCornerShape(999.dp),
                            color = Color.Black.copy(alpha = 0.55f),
                        ) {
                            Text(
                                "Frame the meal",
                                style = MaterialTheme.typography.labelSmall,
                                color = Color.White,
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                            )
                        }
                    }
                    IconButton(
                        onClick = { vm.backToIdle() },
                        modifier = Modifier
                            .statusBarsPadding()
                            .padding(start = 12.dp, top = 8.dp)
                    ) {
                        Surface(
                            shape = CircleShape,
                            color = Color.Black.copy(alpha = 0.55f),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.15f))
                        ) {
                            Box(
                                modifier = Modifier.size(40.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    Icons.AutoMirrored.Filled.ArrowBack,
                                    contentDescription = "Back",
                                    tint = Color.White,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                        }
                    }
                },
                viewfinderOverlay = { ViewfinderOverlay(scanGlow = brand.scanGlow) }
            )
        } else {
            PermissionDeniedState(
                onRequest = { permissionLauncher.launch(Manifest.permission.CAMERA) },
                onBack = { vm.backToIdle() }
            )
        }
    }
}

@Composable
private fun CameraPreviewSurface(
    onCaptured: (ByteArray) -> Unit,
    modifier: Modifier = Modifier,
    topOverlay: @Composable BoxScope.() -> Unit,
    viewfinderOverlay: @Composable BoxScope.() -> Unit,
    renderControls: @Composable (
        onCapture: () -> Unit,
        onFlip: () -> Unit,
        cameraReady: Boolean,
    ) -> Unit,
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val scope = rememberCoroutineScope()

    var lensFacing by rememberSaveable { mutableStateOf(CameraSelector.LENS_FACING_BACK) }
    var cameraReady by remember { mutableStateOf(false) }
    var capturing by remember { mutableStateOf(false) }
    val executor = remember { Executors.newSingleThreadExecutor() }
    val imageCapture = remember {
        ImageCapture.Builder()
            .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
            .build()
    }
    val previewView = remember {
        PreviewView(context).apply {
            scaleType = PreviewView.ScaleType.FILL_CENTER
            implementationMode = PreviewView.ImplementationMode.COMPATIBLE
        }
    }

    DisposableEffect(Unit) {
        onDispose { executor.shutdown() }
    }

    // Rebind the camera whenever the lens flips. Using LaunchedEffect (vs
    // AndroidView.update) ensures we don't re-bind on every recomposition,
    // which would otherwise leak ImageCapture use-cases and flicker the
    // preview surface each time state changes elsewhere on the screen.
    LaunchedEffect(lensFacing) {
        cameraReady = false
        runCatching {
            val provider = context.awaitCameraProvider()
            val preview = Preview.Builder().build().apply {
                setSurfaceProvider(previewView.surfaceProvider)
            }
            val selector = CameraSelector.Builder()
                .requireLensFacing(lensFacing)
                .build()
            provider.unbindAll()
            provider.bindToLifecycle(lifecycleOwner, selector, preview, imageCapture)
            cameraReady = true
        }
    }

    Box(modifier = modifier) {
        AndroidView(
            modifier = Modifier.fillMaxSize(),
            factory = { previewView },
        )

        viewfinderOverlay()
        topOverlay()

        Box(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .navigationBarsPadding()
                .padding(bottom = 24.dp),
        ) {
            renderControls(
                {
                    // Capture button
                    if (capturing || !cameraReady) return@renderControls
                    capturing = true
                    imageCapture.takePicture(
                        executor,
                        object : ImageCapture.OnImageCapturedCallback() {
                            override fun onCaptureSuccess(image: ImageProxy) {
                                val bytes = imageProxyToOrientedJpeg(image)
                                image.close()
                                scope.launch {
                                    val processed = withContext(Dispatchers.Default) {
                                        downscaleJpeg(bytes, maxEdge = 1024, quality = 88)
                                    }
                                    onCaptured(processed)
                                    capturing = false
                                }
                            }

                            override fun onError(exception: ImageCaptureException) {
                                capturing = false
                            }
                        }
                    )
                },
                {
                    // Flip
                    lensFacing = if (lensFacing == CameraSelector.LENS_FACING_BACK)
                        CameraSelector.LENS_FACING_FRONT
                    else
                        CameraSelector.LENS_FACING_BACK
                    cameraReady = false
                },
                cameraReady
            )
        }
    }
}

@Composable
private fun ViewfinderOverlay(scanGlow: Color) {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        BoxWithConstraints(
            modifier = Modifier.size(280.dp)
        ) {
            CornerBrackets(color = scanGlow)
            val transition = rememberInfiniteTransition(label = "scan-line")
            val pos by transition.animateFloat(
                initialValue = 0.05f,
                targetValue = 0.95f,
                animationSpec = infiniteRepeatable(
                    animation = tween(2400, easing = LinearEasing),
                    repeatMode = RepeatMode.Reverse
                ),
                label = "scan-pos"
            )
            // Compose's built-in Modifier.offset accepts a Dp argument; the
            // animated `pos` is a Float in [0.05, 0.95], and `Dp * Float`
            // is supported on the Dp value class so the math stays type-safe.
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 6.dp)
                    .offset(y = maxHeight * pos)
                    .height(2.dp)
                    .background(scanGlow.copy(alpha = 0.85f))
            )
        }
    }
}

@Composable
private fun CameraControls(
    cameraReady: Boolean,
    onCapture: () -> Unit,
    onFlip: () -> Unit,
) {
    val brand = LocalCalAiColors.current
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(64.dp),
            contentAlignment = Alignment.Center
        ) {
            // intentionally left empty (symmetry slot)
        }
        Spacer(Modifier.width(28.dp))

        Box(
            modifier = Modifier
                .size(86.dp)
                .clip(CircleShape)
                .background(
                    if (cameraReady) brand.brand else Color.White.copy(alpha = 0.3f)
                )
                .border(4.dp, Color.White, CircleShape)
                .clickable(enabled = cameraReady, onClick = onCapture),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                Icons.Default.PhotoCamera,
                contentDescription = "Capture",
                tint = Color.White,
                modifier = Modifier.size(34.dp)
            )
        }

        Spacer(Modifier.width(28.dp))

        Surface(
            shape = CircleShape,
            color = Color.Black.copy(alpha = 0.45f),
            border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.18f)),
            modifier = Modifier
                .size(60.dp)
                .clickable(enabled = cameraReady, onClick = onFlip)
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(
                    Icons.Default.Cameraswitch,
                    contentDescription = "Flip",
                    tint = Color.White,
                    modifier = Modifier.size(24.dp)
                )
            }
        }
    }
}

@Composable
private fun PermissionDeniedState(onRequest: () -> Unit, onBack: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            Icons.Default.NoPhotography,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.primary,
            modifier = Modifier.size(56.dp)
        )
        Spacer(Modifier.height(16.dp))
        Text(
            "Camera permission needed",
            style = MaterialTheme.typography.titleLarge,
            color = MaterialTheme.colorScheme.onBackground,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(8.dp))
        Text(
            "We only access the camera while you're scanning. Grant access to continue.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(24.dp))
        BigBrandButton(
            text = "Grant access",
            icon = Icons.Default.PhotoCamera,
            onClick = onRequest,
        )
        Spacer(Modifier.height(8.dp))
        Text(
            "Back",
            style = MaterialTheme.typography.labelLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier
                .clip(RoundedCornerShape(8.dp))
                .clickable(onClick = onBack)
                .padding(8.dp)
        )
    }
}

// ───────────────────────────────────────────────────────────────────────
// PREVIEW — confirm before sending to AI
// ───────────────────────────────────────────────────────────────────────

@Composable
private fun PreviewStage(vm: FoodScanViewModel) {
    val brand = LocalCalAiColors.current
    val bytes = vm.previewImage
    Column(
        Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .statusBarsPadding()
            .padding(horizontal = 20.dp)
            .padding(bottom = 24.dp)
    ) {
        TopBackBar(label = "Preview", onBack = { vm.retake() })
        Spacer(Modifier.height(10.dp))
        if (bytes != null) {
            CapturedImage(
                bytes = bytes,
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(3f / 4f)
                    .clip(RoundedCornerShape(24.dp))
            )
        }
        Spacer(Modifier.height(16.dp))
        Text(
            "Ready",
            style = MaterialTheme.typography.labelSmall,
            color = brand.brand,
        )
        Spacer(Modifier.height(4.dp))
        Text(
            "Send this image to the AI?",
            style = MaterialTheme.typography.titleLarge,
            color = MaterialTheme.colorScheme.onBackground,
        )
        Spacer(Modifier.height(4.dp))
        Text(
            "Analysis usually takes 60–120 seconds.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.weight(1f))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            OutlineActionButton(
                text = "Retake",
                onClick = { vm.retake() },
                modifier = Modifier.weight(1f),
            )
            FilledActionButton(
                text = "Analyze",
                icon = Icons.Default.AutoAwesome,
                onClick = { vm.analyze() },
                modifier = Modifier.weight(1.4f),
            )
        }
    }
}

// ───────────────────────────────────────────────────────────────────────
// ANALYZING — animated step list
// ───────────────────────────────────────────────────────────────────────

@Composable
private fun AnalyzingStage(vm: FoodScanViewModel) {
    val brand = LocalCalAiColors.current
    val steps = listOf(
        "Normalizing image",
        "Identifying dish",
        "Looking up nutrition database",
        "Composing results",
    )
    Column(
        Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .statusBarsPadding()
            .padding(horizontal = 20.dp)
            .padding(bottom = 24.dp)
    ) {
        TopBackBar(label = "Analyzing", onBack = { vm.backToIdle() })
        Spacer(Modifier.height(10.dp))
        val bytes = vm.previewImage
        if (bytes != null) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(16f / 9f)
                    .clip(RoundedCornerShape(24.dp))
            ) {
                CapturedImage(bytes = bytes, modifier = Modifier.fillMaxSize())
                Box(Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.35f)))
                AnalyzingScanLine(color = brand.scanGlow)
            }
        }
        Spacer(Modifier.height(20.dp))
        Text(
            "AI is identifying your dish",
            style = MaterialTheme.typography.titleLarge,
            color = MaterialTheme.colorScheme.onBackground,
        )
        Spacer(Modifier.height(4.dp))
        Text(
            "The Qwen-VL + CLIP + Qdrant pipeline is running. Keep the app open.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(16.dp))
        steps.forEachIndexed { index, label ->
            StepRow(
                label = label,
                index = index,
                currentIndex = vm.analysisStepIndex,
            )
            Spacer(Modifier.height(8.dp))
        }
        Spacer(Modifier.weight(1f))
        Text(
            "Usually takes 60–120 seconds",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.fillMaxWidth(),
            textAlign = TextAlign.Center,
        )
    }
}

@Composable
private fun AnalyzingScanLine(color: Color) {
    BoxWithConstraints(modifier = Modifier.fillMaxSize().padding(horizontal = 18.dp)) {
        val transition = rememberInfiniteTransition(label = "an-scan")
        val pos by transition.animateFloat(
            initialValue = 0.05f,
            targetValue = 0.95f,
            animationSpec = infiniteRepeatable(
                animation = tween(2200, easing = LinearEasing),
                repeatMode = RepeatMode.Reverse
            ),
            label = "an-pos"
        )
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .offset(y = maxHeight * pos)
                .height(2.dp)
                .background(color.copy(alpha = 0.9f))
        )
    }
}

@Composable
private fun StepRow(label: String, index: Int, currentIndex: Int) {
    val brand = LocalCalAiColors.current
    val isDone = index < currentIndex
    val isActive = index == currentIndex

    val border = when {
        isActive -> brand.brand.copy(alpha = 0.5f)
        isDone -> brand.macroEnergy.copy(alpha = 0.4f)
        else -> MaterialTheme.colorScheme.outlineVariant
    }
    val bg = when {
        isActive -> brand.brand.copy(alpha = 0.10f)
        isDone -> brand.macroEnergy.copy(alpha = 0.06f)
        else -> MaterialTheme.colorScheme.surface
    }
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = bg,
        border = androidx.compose.foundation.BorderStroke(1.dp, border),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            val badgeColor = when {
                isActive -> brand.brand
                isDone -> brand.macroEnergy
                else -> MaterialTheme.colorScheme.surfaceVariant
            }
            val badgeFg = when {
                isActive -> Color.White
                isDone -> Color.White
                else -> MaterialTheme.colorScheme.onSurfaceVariant
            }
            Surface(
                shape = CircleShape,
                color = badgeColor,
                modifier = Modifier.size(26.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    when {
                        isDone -> Icon(
                            Icons.Default.CheckCircle,
                            contentDescription = null,
                            tint = badgeFg,
                            modifier = Modifier.size(14.dp)
                        )
                        isActive -> CircularProgressIndicator(
                            color = badgeFg,
                            strokeWidth = 2.dp,
                            modifier = Modifier.size(14.dp)
                        )
                        else -> Text(
                            (index + 1).toString(),
                            style = MaterialTheme.typography.labelSmall,
                            color = badgeFg,
                        )
                    }
                }
            }
            Spacer(Modifier.width(12.dp))
            Text(
                label,
                style = MaterialTheme.typography.bodyMedium,
                color = if (isActive) MaterialTheme.colorScheme.onSurface
                else MaterialTheme.colorScheme.onSurfaceVariant,
                fontWeight = if (isActive) FontWeight.SemiBold else FontWeight.Normal,
            )
        }
    }
}

// ───────────────────────────────────────────────────────────────────────
// RESULT — dish card + macros + actions
// ───────────────────────────────────────────────────────────────────────

@Composable
private fun ResultStage(vm: FoodScanViewModel) {
    val brand = LocalCalAiColors.current
    val result = vm.result ?: run { vm.backToIdle(); return }

    Column(
        Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .statusBarsPadding()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp)
            .padding(bottom = 32.dp)
    ) {
        TopBackBar(label = "Scan another dish", onBack = { vm.backToIdle() })
        Spacer(Modifier.height(8.dp))

        val bytes = vm.previewImage
        val historyBitmap = rememberDataUriBitmap(
            dataUri = if (bytes == null) result.image else "",
            maxWidthPx = 1200
        )
        val dishTitle = result.detectedDish.ifBlank { result.name.ifBlank { "Unknown dish" } }
        Surface(
            shape = RoundedCornerShape(24.dp),
            color = MaterialTheme.colorScheme.surface,
            modifier = Modifier.fillMaxWidth()
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(4f / 3f)
            ) {
                when {
                    bytes != null -> {
                        CapturedImage(bytes = bytes, modifier = Modifier.fillMaxSize())
                    }
                    historyBitmap != null -> {
                        Image(
                            bitmap = historyBitmap,
                            contentDescription = dishTitle,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.fillMaxSize(),
                        )
                    }
                    else -> {
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(MaterialTheme.colorScheme.surfaceVariant),
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(
                                Icons.Default.Restaurant,
                                contentDescription = null,
                                tint = brand.brand.copy(alpha = 0.35f),
                                modifier = Modifier.size(52.dp)
                            )
                        }
                    }
                }
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            androidx.compose.ui.graphics.Brush.verticalGradient(
                                0f to Color.Transparent,
                                0.42f to Color.Transparent,
                                1f to Color.Black.copy(alpha = 0.84f),
                            )
                        )
                )
                Column(
                    Modifier
                        .align(Alignment.BottomStart)
                        .fillMaxWidth()
                        .padding(16.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.AutoAwesome,
                            contentDescription = null,
                            tint = brand.scanGlow,
                            modifier = Modifier.size(12.dp)
                        )
                        Spacer(Modifier.width(6.dp))
                        Text(
                            "IDENTIFIED",
                            style = MaterialTheme.typography.labelSmall,
                            color = brand.scanGlow,
                        )
                    }
                    Spacer(Modifier.height(2.dp))
                    DishHeroTitle(dishTitle)
                    Spacer(Modifier.height(6.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Surface(
                            shape = RoundedCornerShape(999.dp),
                            color = Color.White.copy(alpha = 0.12f)
                        ) {
                            Text(
                                "${(result.confidence * 100).toInt()}%",
                                style = MaterialTheme.typography.labelMedium,
                                color = Color.White,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                            )
                        }
                        Spacer(Modifier.width(8.dp))
                        Text(
                            result.estimatedPortion,
                            style = MaterialTheme.typography.bodySmall,
                            color = Color.White.copy(alpha = 0.8f),
                        )
                    }
                }
            }
        }

        Spacer(Modifier.height(14.dp))

        // Macro grid — show a "no data" notice when every macro is zero,
        // which happens for items scanned before nutrition was wired up
        // or when the dataset is missing the food.
        val hasNutrition = result.totalKcal > 0 ||
                result.protein > 0 ||
                result.carbs > 0 ||
                result.fats > 0
        if (!hasNutrition) {
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = MaterialTheme.colorScheme.surfaceVariant,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        Icons.Default.Info,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(Modifier.width(10.dp))
                    Text(
                        "Không có dữ liệu dinh dưỡng cho món này",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        } else {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                MacroCell(
                    modifier = Modifier.weight(1f),
                    label = "Calories",
                    value = result.totalKcal.toString(),
                    unit = "kcal",
                    tint = brand.macroEnergy,
                    emphasized = true,
                    icon = Icons.Default.LocalFireDepartment,
                )
                MacroCell(
                    modifier = Modifier.weight(1f),
                    label = "Protein",
                    value = result.protein.toString(),
                    unit = "g",
                    tint = brand.macroProtein,
                )
            }
            Spacer(Modifier.height(8.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                MacroCell(
                    modifier = Modifier.weight(1f),
                    label = "Carbs",
                    value = result.carbs.toString(),
                    unit = "g",
                    tint = brand.macroCarbs,
                )
                MacroCell(
                    modifier = Modifier.weight(1f),
                    label = "Fat",
                    value = result.fats.toString(),
                    unit = "g",
                    tint = brand.macroFat,
                )
            }
        }

        Spacer(Modifier.height(14.dp))

        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            InfoChip(
                modifier = Modifier.weight(1f),
                label = "Health score",
                value = "${"%.1f".format(result.healthScore)} / 10",
                tint = brand.macroEnergy,
            )
            InfoChip(
                modifier = Modifier.weight(1f),
                label = "Sodium",
                value = when (result.sodium) {
                    "LOW" -> "Low"
                    "HIGH" -> "High"
                    else -> "Medium"
                },
                tint = when (result.sodium) {
                    "LOW" -> brand.macroEnergy
                    "HIGH" -> brand.macroFat
                    else -> brand.macroCarbs
                }
            )
        }

        if (result.needsReview) {
            Spacer(Modifier.height(12.dp))
            Surface(
                shape = RoundedCornerShape(14.dp),
                color = brand.brand.copy(alpha = 0.08f),
                border = androidx.compose.foundation.BorderStroke(1.dp, brand.brand.copy(alpha = 0.35f)),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.padding(12.dp)
                ) {
                    Icon(
                        Icons.Default.AutoAwesome,
                        contentDescription = null,
                        tint = brand.brand,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(Modifier.width(8.dp))
                    Text(
                        "Low confidence — double-check before saving.",
                        style = MaterialTheme.typography.bodySmall,
                        color = brand.brand,
                    )
                }
            }
        }

        Spacer(Modifier.height(14.dp))
        DailyProgressCard(
            current = result.dailyProgress.current,
            target = result.dailyProgress.target,
        )

        Spacer(Modifier.height(18.dp))

        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            OutlineActionButton(
                text = "Re-analyze",
                onClick = { vm.reanalyze() },
                modifier = Modifier.weight(1f),
                enabled = !vm.saving,
            )
            FilledActionButton(
                text = when {
                    vm.saving -> "Saving…"
                    result.status == "saved" -> "Saved"
                    else -> "Save to log"
                },
                icon = if (result.status == "saved") Icons.Default.CheckCircle else Icons.Default.Restaurant,
                onClick = { vm.saveToDietLog(onSaved = {}) },
                modifier = Modifier.weight(1.4f),
                enabled = !vm.saving && result.status != "saved",
            )
        }

        if (vm.savedFlash) {
            Spacer(Modifier.height(8.dp))
            Text(
                "✓ Added to today's Diet goals.",
                style = MaterialTheme.typography.bodySmall,
                color = brand.macroEnergy,
            )
        }

        if (result.ingredients.isNotEmpty()) {
            Spacer(Modifier.height(20.dp))
            Text(
                "DETECTED INGREDIENTS",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(8.dp))
            result.ingredients.forEach { ing ->
                IngredientRow(ing.name, ing.amount, ing.category, ing.calories)
                Spacer(Modifier.height(6.dp))
            }
        }
    }
}

@Composable
private fun DishHeroTitle(title: String) {
    val cleanTitle = title.trim().ifBlank { "Unknown dish" }
    // Tighter sizing scale + cap at 2 lines so long titles like
    // "Spiced Pumpkin Cheesecake with Caramel-Bourbon Sauce" stay
    // inside the 4:3 hero card and don't get clipped above the gradient.
    val fontSize = when {
        cleanTitle.length > 50 -> 16.sp
        cleanTitle.length > 40 -> 18.sp
        cleanTitle.length > 30 -> 21.sp
        cleanTitle.length > 22 -> 25.sp
        else -> 30.sp
    }
    Text(
        cleanTitle,
        color = Color.White,
        fontWeight = FontWeight.Black,
        fontSize = fontSize,
        lineHeight = (fontSize.value + 3).sp,
        maxLines = 2,
        overflow = TextOverflow.Ellipsis,
        modifier = Modifier.fillMaxWidth(),
    )
}

@Composable
private fun DailyProgressCard(current: Int, target: Int) {
    val brand = LocalCalAiColors.current
    val safeTarget = if (target > 0) target else 1
    val ratio = (current.toFloat() / safeTarget).coerceIn(0f, 1f)
    Surface(
        shape = RoundedCornerShape(18.dp),
        color = MaterialTheme.colorScheme.surface,
        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(Modifier.padding(14.dp)) {
            Text(
                "TODAY",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(4.dp))
            Row(verticalAlignment = Alignment.Bottom) {
                Text(
                    "$current",
                    style = MaterialTheme.typography.displaySmall,
                    color = MaterialTheme.colorScheme.onSurface,
                )
                Text(
                    " kcal",
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(bottom = 4.dp)
                )
                Spacer(Modifier.weight(1f))
                Text(
                    "/ $target kcal",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(bottom = 6.dp)
                )
            }
            Spacer(Modifier.height(8.dp))
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(6.dp)
                    .clip(RoundedCornerShape(999.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth(ratio)
                        .fillMaxSize()
                        .background(brand.brand)
                )
            }
        }
    }
}

// ───────────────────────────────────────────────────────────────────────
// ERROR
// ───────────────────────────────────────────────────────────────────────

@Composable
private fun ErrorStage(vm: FoodScanViewModel) {
    val brand = LocalCalAiColors.current
    val isNoFood = vm.errorKind == FoodScanViewModel.ErrorKind.NoFood
    val accent = if (isNoFood) brand.brand else MaterialTheme.colorScheme.error

    Column(
        Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .statusBarsPadding()
            .padding(horizontal = 20.dp)
            .padding(bottom = 32.dp)
    ) {
        TopBackBar(label = "Back", onBack = { vm.backToIdle() })
        Spacer(Modifier.weight(1f))
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Surface(
                shape = RoundedCornerShape(18.dp),
                color = accent.copy(alpha = 0.12f),
                border = androidx.compose.foundation.BorderStroke(1.dp, accent.copy(alpha = 0.35f)),
                modifier = Modifier.size(56.dp),
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        if (isNoFood) Icons.Default.Restaurant else Icons.Default.NoPhotography,
                        contentDescription = null,
                        tint = accent,
                        modifier = Modifier.size(26.dp)
                    )
                }
            }
            Spacer(Modifier.height(14.dp))
            Text(
                if (isNoFood) "No food detected" else "Analysis failed",
                style = MaterialTheme.typography.titleLarge,
                color = MaterialTheme.colorScheme.onBackground,
            )
            Spacer(Modifier.height(8.dp))
            Text(
                vm.errorMessage
                    ?: if (isNoFood)
                        "We couldn't find a meal in this image. Try again with a clear photo of food."
                    else
                        "The AI service returned an error. Please try again.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )
        }
        Spacer(Modifier.weight(1f))
        if (isNoFood) {
            FilledActionButton(
                text = "Retake photo",
                icon = Icons.Default.PhotoCamera,
                onClick = { vm.retake() },
                modifier = Modifier.fillMaxWidth(),
            )
        } else {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlineActionButton(
                    text = "Try again",
                    onClick = { vm.analyze() },
                    modifier = Modifier.weight(1f),
                )
                FilledActionButton(
                    text = "Rescan",
                    icon = Icons.Default.PhotoCamera,
                    onClick = { vm.backToIdle() },
                    modifier = Modifier.weight(1f),
                )
            }
        }
    }
}

// ───────────────────────────────────────────────────────────────────────
// SHARED CHROME
// ───────────────────────────────────────────────────────────────────────

@Composable
private fun TopBackBar(label: String, onBack: () -> Unit) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp)
            .clickable(onClick = onBack)
    ) {
        Icon(
            Icons.AutoMirrored.Filled.ArrowBack,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.size(16.dp)
        )
        Spacer(Modifier.width(6.dp))
        Text(
            label.uppercase(),
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun CapturedImage(bytes: ByteArray, modifier: Modifier = Modifier) {
    // Decode once per bytes identity; ImageBitmap is immutable so this is
    // safe to remember on the byte-array reference.
    val bitmap = remember(bytes) {
        BitmapFactory.decodeByteArray(bytes, 0, bytes.size)?.asImageBitmap()
    }
    if (bitmap != null) {
        androidx.compose.foundation.Image(
            bitmap = bitmap,
            contentDescription = null,
            modifier = modifier,
            contentScale = ContentScale.Crop,
        )
    } else {
        Box(
            modifier = modifier.background(MaterialTheme.colorScheme.surfaceVariant),
            contentAlignment = Alignment.Center
        ) {
            Icon(Icons.Default.Restaurant, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun BigBrandButton(
    text: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    onClick: () -> Unit,
) {
    val brand = LocalCalAiColors.current
    Surface(
        shape = RoundedCornerShape(18.dp),
        color = brand.brand,
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
    ) {
        Row(
            modifier = Modifier
                .heightIn(min = 54.dp)
                .padding(horizontal = 18.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center,
        ) {
            Icon(icon, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(8.dp))
            Text(
                text.uppercase(),
                style = MaterialTheme.typography.labelLarge,
                color = Color.White,
            )
        }
    }
}

@Composable
private fun FilledActionButton(
    text: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    val brand = LocalCalAiColors.current
    val bg = if (enabled) brand.brand else brand.brand.copy(alpha = 0.4f)
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = bg,
        modifier = modifier.clickable(enabled = enabled, onClick = onClick)
    ) {
        Row(
            modifier = Modifier
                .heightIn(min = 50.dp)
                .padding(horizontal = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center,
        ) {
            Icon(icon, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
            Spacer(Modifier.width(6.dp))
            Text(
                text.uppercase(),
                style = MaterialTheme.typography.labelLarge,
                color = Color.White,
                fontSize = 12.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

@Composable
private fun OutlineActionButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surface,
        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
        modifier = modifier.clickable(enabled = enabled, onClick = onClick)
    ) {
        Row(
            modifier = Modifier
                .heightIn(min = 50.dp)
                .padding(horizontal = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center,
        ) {
            Text(
                text.uppercase(),
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.onSurface,
                fontSize = 12.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

@Composable
private fun MacroCell(
    label: String,
    value: String,
    unit: String,
    tint: Color,
    modifier: Modifier = Modifier,
    emphasized: Boolean = false,
    icon: androidx.compose.ui.graphics.vector.ImageVector? = null,
) {
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = if (emphasized) tint.copy(alpha = 0.10f) else MaterialTheme.colorScheme.surface,
        border = androidx.compose.foundation.BorderStroke(
            1.dp,
            if (emphasized) tint.copy(alpha = 0.5f) else MaterialTheme.colorScheme.outlineVariant
        ),
        modifier = modifier,
    ) {
        Column(Modifier.padding(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (icon != null) {
                    Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(14.dp))
                    Spacer(Modifier.width(4.dp))
                }
                Text(
                    label.uppercase(),
                    style = MaterialTheme.typography.labelSmall,
                    color = if (emphasized) tint else MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Spacer(Modifier.height(4.dp))
            Row(verticalAlignment = Alignment.Bottom) {
                Text(
                    value,
                    style = MaterialTheme.typography.headlineMedium,
                    color = MaterialTheme.colorScheme.onSurface,
                )
                Text(
                    " $unit",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(bottom = 4.dp)
                )
            }
        }
    }
}

@Composable
private fun InfoChip(
    label: String,
    value: String,
    tint: Color,
    modifier: Modifier = Modifier,
) {
    Surface(
        shape = RoundedCornerShape(14.dp),
        color = tint.copy(alpha = 0.10f),
        border = androidx.compose.foundation.BorderStroke(1.dp, tint.copy(alpha = 0.4f)),
        modifier = modifier,
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 10.dp)
        ) {
            Text(
                label.uppercase(),
                style = MaterialTheme.typography.labelSmall,
                color = tint.copy(alpha = 0.85f),
            )
            Spacer(Modifier.weight(1f))
            Text(
                value,
                style = MaterialTheme.typography.titleSmall,
                color = MaterialTheme.colorScheme.onSurface,
            )
        }
    }
}

@Composable
private fun IngredientRow(name: String, amount: String, category: String, calories: Int) {
    val brand = LocalCalAiColors.current
    Surface(
        shape = RoundedCornerShape(14.dp),
        color = MaterialTheme.colorScheme.surface,
        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp)
        ) {
            Column(Modifier.weight(1f)) {
                Text(
                    name,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurface,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    "$amount • $category",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            Spacer(Modifier.width(8.dp))
            Text(
                "$calories kcal",
                style = MaterialTheme.typography.labelLarge,
                color = brand.brand,
            )
        }
    }
}

@Composable
private fun HistoryList(
    history: List<FoodAnalysisDto>,
    loading: Boolean,
    error: String?,
    onSelect: (FoodAnalysisDto) -> Unit,
    onRetry: () -> Unit,
) {
    when {
        loading -> {
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = MaterialTheme.colorScheme.surface,
                modifier = Modifier.fillMaxWidth()
            ) {
                Box(
                    Modifier
                        .fillMaxWidth()
                        .padding(24.dp),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(strokeWidth = 2.dp, modifier = Modifier.size(20.dp))
                }
            }
        }
        error != null -> {
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.4f),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(Modifier.padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        error,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.error,
                        textAlign = TextAlign.Center,
                    )
                    Spacer(Modifier.height(8.dp))
                    OutlineActionButton(text = "Retry", onClick = onRetry)
                }
            }
        }
        history.isEmpty() -> {
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = MaterialTheme.colorScheme.surface,
                border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    Modifier
                        .fillMaxWidth()
                        .padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Icon(
                        Icons.Default.Restaurant,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(28.dp)
                    )
                    Spacer(Modifier.height(8.dp))
                    Text(
                        "No scans yet",
                        style = MaterialTheme.typography.titleSmall,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        "Every dish you scan will appear here.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center,
                    )
                }
            }
        }
        else -> {
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                contentPadding = PaddingValues(horizontal = 4.dp),
                modifier = Modifier.fillMaxWidth(),
            ) {
                items(history, key = { it.id }) { item ->
                    HistoryTile(item = item, onClick = { onSelect(item) })
                }
            }
        }
    }
}

@Composable
private fun HistoryTile(item: FoodAnalysisDto, onClick: () -> Unit) {
    val brand = LocalCalAiColors.current
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surface,
        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
        modifier = Modifier
            .width(160.dp)
            .clickable(onClick = onClick)
    ) {
        Column {
            Box(
                Modifier
                    .fillMaxWidth()
                    .height(100.dp)
                    .clip(RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant),
                contentAlignment = Alignment.Center,
            ) {
                val bitmap = rememberDataUriBitmap(item.image)
                if (bitmap != null) {
                    Image(
                        bitmap = bitmap,
                        contentDescription = item.detectedDish.ifBlank { item.name },
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize(),
                    )
                } else {
                    Icon(
                        Icons.Default.Restaurant,
                        contentDescription = null,
                        tint = brand.brand.copy(alpha = 0.4f),
                        modifier = Modifier.size(40.dp)
                    )
                }
                if (item.status == "saved") {
                    Surface(
                        shape = CircleShape,
                        color = brand.macroEnergy,
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(6.dp)
                            .size(20.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                Icons.Default.CheckCircle,
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.size(12.dp)
                            )
                        }
                    }
                }
            }
            Column(Modifier.padding(10.dp)) {
                Text(
                    item.detectedDish.ifBlank { item.name.ifBlank { "Unknown" } },
                    style = MaterialTheme.typography.titleSmall,
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Spacer(Modifier.height(2.dp))
                Text(
                    "${item.totalKcal} kcal • ${(item.confidence * 100).toInt()}%",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

// ───────────────────────────────────────────────────────────────────────
// HISTORY THUMBNAIL DECODE
// Backend returns scan images inline as `data:image/jpeg;base64,...` URLs.
// Coil's data-URI fetcher has been flaky for us on large strings, so we
// decode manually off the main thread and downsample to thumbnail size.
// ───────────────────────────────────────────────────────────────────────

@Composable
private fun rememberDataUriBitmap(dataUri: String, maxWidthPx: Int = 320): ImageBitmap? {
    var bitmap by remember(dataUri, maxWidthPx) { mutableStateOf<ImageBitmap?>(null) }
    LaunchedEffect(dataUri, maxWidthPx) {
        if (dataUri.isBlank() || !dataUri.startsWith("data:")) {
            bitmap = null
            return@LaunchedEffect
        }
        bitmap = withContext(Dispatchers.Default) {
            try {
                val base64 = dataUri.substringAfter("base64,", missingDelimiterValue = "")
                if (base64.isEmpty()) {
                    android.util.Log.w("HistoryTile", "no base64 payload in uri (len=${dataUri.length})")
                    return@withContext null
                }
                val bytes = Base64.decode(base64, Base64.DEFAULT)

                val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
                BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
                val sample = run {
                    var s = 1
                    while (bounds.outWidth / s > maxWidthPx) s *= 2
                    s.coerceAtLeast(1)
                }
                val opts = BitmapFactory.Options().apply {
                    inSampleSize = sample
                    inPreferredConfig = Bitmap.Config.RGB_565
                }
                val bmp = BitmapFactory.decodeByteArray(bytes, 0, bytes.size, opts)
                android.util.Log.d(
                    "HistoryTile",
                    "decode OK target=${maxWidthPx}px src=${bounds.outWidth}x${bounds.outHeight} sample=$sample -> ${bmp?.width}x${bmp?.height}"
                )
                bmp?.asImageBitmap()
            } catch (t: Throwable) {
                android.util.Log.e("HistoryTile", "decode failed: ${t.javaClass.simpleName}: ${t.message}")
                null
            }
        }
    }
    return bitmap
}

// ───────────────────────────────────────────────────────────────────────
// CAMERA + IMAGE HELPERS
// ───────────────────────────────────────────────────────────────────────

/**
 * Coroutine-friendly wrapper around `ProcessCameraProvider.getInstance(...)`
 * which natively returns a ListenableFuture. Avoids pulling in the
 * `kotlinx-coroutines-guava` artifact just for `.await()`.
 */
private suspend fun android.content.Context.awaitCameraProvider(): ProcessCameraProvider =
    suspendCoroutine { cont ->
        val future = ProcessCameraProvider.getInstance(this)
        future.addListener({ cont.resume(future.get()) }, ContextCompat.getMainExecutor(this))
    }

/**
 * Reads JPEG bytes out of an ImageProxy and applies the orientation hint
 * baked in by ImageInfo. CameraX's in-memory capture path stores rotation
 * metadata separately from the JPEG payload, so PIL on the Cal-AI side
 * would otherwise receive sideways portrait shots.
 */
private fun imageProxyToOrientedJpeg(image: ImageProxy): ByteArray {
    val buffer = image.planes[0].buffer
    val raw = ByteArray(buffer.remaining()).also { buffer.get(it) }
    val rotation = image.imageInfo.rotationDegrees
    if (rotation == 0) return raw

    val bitmap = BitmapFactory.decodeByteArray(raw, 0, raw.size) ?: return raw
    val matrix = Matrix().apply { postRotate(rotation.toFloat()) }
    val rotated = Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
    if (rotated != bitmap) bitmap.recycle()
    val out = ByteArrayOutputStream()
    rotated.compress(Bitmap.CompressFormat.JPEG, 92, out)
    rotated.recycle()
    return out.toByteArray()
}

/**
 * Downscale a JPEG byte array so the long edge fits within [maxEdge]. The
 * backend's `parseImageDataUrl` regex accepts anything ≤8 MB, but smaller
 * payloads cut round-trip time and avoid pushing Qwen-VL into its slow
 * high-resolution path on top of its already-slow inference.
 */
private fun downscaleJpeg(input: ByteArray, maxEdge: Int, quality: Int): ByteArray {
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    BitmapFactory.decodeByteArray(input, 0, input.size, bounds)
    val w = bounds.outWidth
    val h = bounds.outHeight
    if (w <= 0 || h <= 0) return input

    var sample = 1
    while (max(w, h) / (sample * 2) >= maxEdge) sample *= 2
    val decoded = BitmapFactory.decodeByteArray(
        input, 0, input.size,
        BitmapFactory.Options().apply { inSampleSize = sample }
    ) ?: return input

    val scale = min(1f, maxEdge.toFloat() / max(decoded.width, decoded.height))
    val scaled = if (scale < 1f) {
        val targetW = (decoded.width * scale).toInt().coerceAtLeast(1)
        val targetH = (decoded.height * scale).toInt().coerceAtLeast(1)
        Bitmap.createScaledBitmap(decoded, targetW, targetH, true).also {
            if (decoded != it) decoded.recycle()
        }
    } else decoded

    val out = ByteArrayOutputStream()
    scaled.compress(Bitmap.CompressFormat.JPEG, quality, out)
    scaled.recycle()
    return out.toByteArray()
}
