package com.calai.app.data.api

import com.calai.app.BuildConfig
import com.calai.app.data.auth.TokenStore
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.Json
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {
    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
        encodeDefaults = true
    }

    fun create(tokenStore: TokenStore): Retrofit {
        val logging = HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) HttpLoggingInterceptor.Level.BODY
            else HttpLoggingInterceptor.Level.NONE
        }

        val authInterceptor = Interceptor { chain ->
            val token = runBlocking { tokenStore.tokenFlow.first() }
            val original = chain.request()
            val builder = original.newBuilder()
                // Bỏ qua trang cảnh báo trình duyệt của ngrok-free
                .header("ngrok-skip-browser-warning", "true")
                .header("User-Agent", "CalAI-Android/${BuildConfig.VERSION_NAME}")
            if (!token.isNullOrBlank()) {
                builder.header("Authorization", "Bearer $token")
            }
            chain.proceed(builder.build())
        }

        val client = OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
            .addInterceptor(logging)
            .connectTimeout(20, TimeUnit.SECONDS)
            // Cal-AI vision pipeline can take 60–120s on a cold Qwen-VL load,
            // plus another ~10s for RAG + LLM compose. Match the web client's
            // 6-minute ceiling so a slow first scan does not time out before
            // the server has a chance to respond.
            .readTimeout(360, TimeUnit.SECONDS)
            .writeTimeout(60, TimeUnit.SECONDS)
            .build()

        return Retrofit.Builder()
            .baseUrl(BuildConfig.BACKEND_BASE_URL.trimEnd('/') + "/")
            .client(client)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
    }
}
