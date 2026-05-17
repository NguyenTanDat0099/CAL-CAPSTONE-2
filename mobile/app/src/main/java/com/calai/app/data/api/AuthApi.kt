package com.calai.app.data.api

import com.calai.app.data.api.dto.LoginRequest
import com.calai.app.data.api.dto.LoginResponse
import retrofit2.http.Body
import retrofit2.http.POST

interface AuthApi {
    @POST("api/auth/login")
    suspend fun login(@Body body: LoginRequest): LoginResponse
}
