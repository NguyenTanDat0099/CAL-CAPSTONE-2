package com.calai.app.data.api.dto

import kotlinx.serialization.Serializable

/**
 * Mirrors `FoodAnalysisResult` from backend `user.service.ts`.
 * Only fields the mobile UI actually reads are typed; everything else is
 * tolerated via the ignoreUnknownKeys flag on the Json instance.
 */
@Serializable
data class FoodAnalysisDto(
    val id: String,
    val name: String = "",
    val image: String = "",
    val source: String = "camera",
    val status: String = "analyzed",
    val detectedDish: String = "",
    val detectedItems: List<String> = emptyList(),
    val estimatedPortion: String = "1 serving",
    val confidence: Float = 0f,
    val needsReview: Boolean = false,
    val nutritionAvailable: Boolean = true,
    val nutritionMessage: String? = null,
    val totalKcal: Int = 0,
    val protein: Int = 0,
    val carbs: Int = 0,
    val fats: Int = 0,
    val ingredients: List<FoodIngredientDto> = emptyList(),
    val healthScore: Float = 0f,
    val sodium: String = "LOW",
    val dailyProgress: DailyProgressDto = DailyProgressDto(),
    val createdAt: String = "",
)

@Serializable
data class FoodIngredientDto(
    val name: String = "",
    val amount: String = "",
    val category: String = "",
    val calories: Int = 0,
)

@Serializable
data class DailyProgressDto(
    val current: Int = 0,
    val target: Int = 2200,
)

@Serializable
data class AnalyzeFoodRequest(
    val imageUrl: String,
    val source: String = "camera",
)

@Serializable
data class AnalyzeFoodResponse(
    val message: String,
    val data: FoodAnalysisDto,
)

@Serializable
data class FoodHistoryResponse(
    val message: String,
    val data: List<FoodAnalysisDto>,
)

@Serializable
data class ErrorResponse(
    val message: String = "",
)
