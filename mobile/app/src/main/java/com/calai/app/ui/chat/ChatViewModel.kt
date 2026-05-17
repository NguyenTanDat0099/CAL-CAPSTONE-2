package com.calai.app.ui.chat

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.calai.app.AppContainer
import com.calai.app.data.api.dto.ChatMessageDto
import com.calai.app.data.api.dto.SendMessageRequest
import kotlinx.coroutines.launch
import retrofit2.HttpException

class ChatViewModel(
    private val container: AppContainer,
    initialSessionId: Int?
) : ViewModel() {

    var sessionId: Int? = initialSessionId
        private set

    var messages by mutableStateOf<List<ChatMessageDto>>(emptyList())
        private set
    var loading by mutableStateOf(false)
        private set
    var sending by mutableStateOf(false)
        private set
    var input by mutableStateOf("")
    var error by mutableStateOf<String?>(null)
        private set

    init {
        if (sessionId != null) loadMessages()
    }

    private fun loadMessages() {
        val id = sessionId ?: return
        viewModelScope.launch {
            loading = true
            error = null
            try {
                messages = container.chatApi.getMessages(id).data
            } catch (e: HttpException) {
                error = "HTTP ${e.code()}"
            } catch (e: Exception) {
                error = e.message
            } finally {
                loading = false
            }
        }
    }

    fun send() {
        val text = input.trim()
        if (text.isEmpty() || sending) return
        viewModelScope.launch {
            sending = true
            error = null
            // Optimistic append vào UI
            val temp = ChatMessageDto(
                messageId = -System.currentTimeMillis().toInt(),
                sender = "user",
                message = text,
                createdAt = ""
            )
            messages = messages + temp
            input = ""
            try {
                val resp = container.chatApi.sendMessage(
                    SendMessageRequest(message = text, sessionId = sessionId)
                )
                sessionId = resp.data.sessionId
                messages = resp.data.messages
            } catch (e: HttpException) {
                error = "Gửi thất bại (HTTP ${e.code()})"
            } catch (e: Exception) {
                error = "Lỗi: ${e.message}"
            } finally {
                sending = false
            }
        }
    }
}
