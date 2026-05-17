package com.calai.app.data.api.dto

import kotlinx.serialization.Serializable

@Serializable
data class ChatSessionDto(
    val sessionId: Int,
    val lastMessage: String? = null,
    val firstUserMessage: String? = null,
    val startedAt: String
)

@Serializable
data class ChatSessionsResponse(
    val message: String,
    val data: List<ChatSessionDto>
)

@Serializable
data class ChatMessageDto(
    val messageId: Int,
    val sender: String,
    val message: String = "",
    val imageUrl: String? = null,
    val imageName: String? = null,
    val createdAt: String
)

@Serializable
data class ChatMessagesResponse(
    val message: String,
    val data: List<ChatMessageDto>
)

@Serializable
data class SendMessageRequest(
    val message: String,
    val sessionId: Int? = null,
    val imageUrl: String? = null,
    val imageName: String? = null
)

@Serializable
data class SendMessageData(
    val sessionId: Int,
    val messages: List<ChatMessageDto>
)

@Serializable
data class SendMessageResponse(
    val message: String,
    val data: SendMessageData
)
