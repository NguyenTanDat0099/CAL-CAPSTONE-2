package com.calai.app.data.api.dto

import kotlinx.serialization.Serializable

@Serializable
data class LoginRequest(
    val email: String,
    val password: String
)

@Serializable
data class LoginData(
    val accountId: Int,
    val email: String,
    val role: String,
    val status: String? = null,
    val token: String
)

@Serializable
data class LoginResponse(
    val message: String,
    val data: LoginData
)
