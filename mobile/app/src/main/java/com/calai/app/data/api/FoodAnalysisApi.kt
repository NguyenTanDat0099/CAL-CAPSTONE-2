package com.calai.app.data.api

import com.calai.app.data.api.dto.AnalyzeFoodRequest
import com.calai.app.data.api.dto.AnalyzeFoodResponse
import com.calai.app.data.api.dto.FoodHistoryResponse
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

interface FoodAnalysisApi {
    @POST("api/users/food-analysis/analyze")
    suspend fun analyze(@Body body: AnalyzeFoodRequest): AnalyzeFoodResponse

    @GET("api/users/food-analysis/history")
    suspend fun history(): FoodHistoryResponse

    @POST("api/users/food-analysis/{id}/save")
    suspend fun saveToDietLog(@Path("id") analysisId: String): AnalyzeFoodResponse

    @POST("api/users/food-analysis/{id}/reanalyze")
    suspend fun reanalyze(@Path("id") analysisId: String): AnalyzeFoodResponse
}
