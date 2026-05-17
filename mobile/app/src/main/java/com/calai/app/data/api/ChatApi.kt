package com.calai.app.data.api

import com.calai.app.data.api.dto.ChatMessagesResponse
import com.calai.app.data.api.dto.ChatSessionsResponse
import com.calai.app.data.api.dto.SendMessageRequest
import com.calai.app.data.api.dto.SendMessageResponse
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

interface ChatApi {
    @GET("api/chat/sessions")
    suspend fun getSessions(): ChatSessionsResponse

    @GET("api/chat/sessions/{id}/messages")
    suspend fun getMessages(@Path("id") sessionId: Int): ChatMessagesResponse

    @POST("api/chat/message")
    suspend fun sendMessage(@Body body: SendMessageRequest): SendMessageResponse
}
