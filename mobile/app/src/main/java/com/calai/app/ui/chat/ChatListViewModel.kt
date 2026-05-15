package com.calai.app.ui.chat

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.calai.app.AppContainer
import com.calai.app.data.api.dto.ChatSessionDto
import kotlinx.coroutines.launch
import retrofit2.HttpException

class ChatListViewModel(private val container: AppContainer) : ViewModel() {

    var sessions by mutableStateOf<List<ChatSessionDto>>(emptyList())
        private set
    var loading by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set

    init { refresh() }

    fun refresh() {
        viewModelScope.launch {
            loading = true
            error = null
            try {
                sessions = container.chatApi.getSessions().data
            } catch (e: HttpException) {
                error = "HTTP ${e.code()}"
            } catch (e: Exception) {
                error = e.message ?: "Lỗi không xác định"
            } finally {
                loading = false
            }
        }
    }

    fun logout(onDone: () -> Unit) {
        viewModelScope.launch {
            container.tokenStore.clear()
            onDone()
        }
    }
}
