package com.calai.app.ui.login

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.calai.app.AppContainer
import com.calai.app.data.api.dto.LoginRequest
import kotlinx.coroutines.launch
import retrofit2.HttpException

class LoginViewModel(private val container: AppContainer) : ViewModel() {

    var email by mutableStateOf("")
    var password by mutableStateOf("")
    var loading by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set

    fun login(onSuccess: () -> Unit) {
        val emailTrimmed = email.trim()
        if (emailTrimmed.isEmpty() || password.isEmpty()) {
            error = "Vui lòng nhập email và mật khẩu"
            return
        }
        viewModelScope.launch {
            loading = true
            error = null
            try {
                val resp = container.authApi.login(LoginRequest(emailTrimmed, password))
                container.tokenStore.save(resp.data.token)
                onSuccess()
            } catch (e: HttpException) {
                error = when (e.code()) {
                    401 -> "Email hoặc mật khẩu không đúng"
                    403 -> "Email chưa được xác thực"
                    404 -> "Tài khoản không tồn tại"
                    else -> "Lỗi máy chủ (HTTP ${e.code()})"
                }
            } catch (e: Exception) {
                error = "Không kết nối được máy chủ: ${e.message ?: "unknown"}"
            } finally {
                loading = false
            }
        }
    }
}
