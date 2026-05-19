package com.calai.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

/**
 * Brand-adjacent tones the Material 3 ColorScheme does not have a natural
 * slot for. Exposed as a CompositionLocal so any screen can pull them
 * without piping through ColorScheme. Use [LocalCalAiColors] inside a
 * Composable: `val brand = LocalCalAiColors.current`.
 */
data class CalAiColors(
    val brand: Color,
    val brandSoft: Color,
    val macroEnergy: Color,
    val macroProtein: Color,
    val macroCarbs: Color,
    val macroFat: Color,
    val scanFrame: Color,
    val scanGlow: Color,
)

val LocalCalAiColors = staticCompositionLocalOf {
    CalAiColors(
        brand = BrandGreen,
        brandSoft = BrandGreenSoft,
        macroEnergy = MacroEnergy,
        macroProtein = MacroProtein,
        macroCarbs = MacroCarbs,
        macroFat = MacroFat,
        scanFrame = BrandGreen,
        scanGlow = BrandGreenLight,
    )
}

private val LightScheme = lightColorScheme(
    primary = BrandGreen,
    onPrimary = Color.White,
    primaryContainer = BrandGreenLight,
    onPrimaryContainer = BrandGreenDark,
    secondary = BrandGreenDark,
    onSecondary = Color.White,
    secondaryContainer = BrandGreenSoft,
    onSecondaryContainer = BrandGreenDark,
    tertiary = MacroProtein,
    onTertiary = Color.White,
    background = LightBackground,
    onBackground = LightOnSurface,
    surface = LightSurface,
    onSurface = LightOnSurface,
    surfaceVariant = LightSurfaceVariant,
    onSurfaceVariant = LightOnSurfaceVariant,
    surfaceContainer = LightSurfaceContainer,
    surfaceContainerHigh = LightSurfaceVariant,
    surfaceContainerHighest = LightSurfaceVariant,
    outline = LightOutline,
    outlineVariant = LightOutlineSoft,
)

private val DarkScheme = darkColorScheme(
    primary = BrandGreenLight,
    onPrimary = Color(0xFF002106),
    primaryContainer = BrandGreenDark,
    onPrimaryContainer = BrandGreenLight,
    secondary = BrandGreenLight,
    onSecondary = Color(0xFF002106),
    secondaryContainer = Color(0xFF0E2A1A),
    onSecondaryContainer = BrandGreenLight,
    tertiary = Color(0xFF8FC9E4),
    onTertiary = Color(0xFF002338),
    background = DarkBackground,
    onBackground = DarkOnSurface,
    surface = DarkSurface,
    onSurface = DarkOnSurface,
    surfaceVariant = DarkSurfaceVariant,
    onSurfaceVariant = DarkOnSurfaceVariant,
    surfaceContainer = DarkSurfaceContainer,
    surfaceContainerHigh = DarkSurfaceVariant,
    surfaceContainerHighest = DarkSurfaceVariant,
    outline = DarkOutline,
    outlineVariant = DarkOutlineSoft,
)

@Composable
fun CalAITheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val extended = if (darkTheme) {
        CalAiColors(
            brand = BrandGreenLight,
            brandSoft = Color(0xFF0E2A1A),
            macroEnergy = Color(0xFF7AD4A0),
            macroProtein = Color(0xFF8FC9E4),
            macroCarbs = Color(0xFFE7C189),
            macroFat = Color(0xFFE3A99B),
            scanFrame = BrandGreenLight,
            scanGlow = BrandGreen,
        )
    } else {
        CalAiColors(
            brand = BrandGreen,
            brandSoft = BrandGreenSoft,
            macroEnergy = MacroEnergy,
            macroProtein = MacroProtein,
            macroCarbs = MacroCarbs,
            macroFat = MacroFat,
            scanFrame = BrandGreen,
            scanGlow = BrandGreenLight,
        )
    }

    CompositionLocalProvider(LocalCalAiColors provides extended) {
        MaterialTheme(
            colorScheme = if (darkTheme) DarkScheme else LightScheme,
            typography = AppTypography,
            content = content
        )
    }
}
