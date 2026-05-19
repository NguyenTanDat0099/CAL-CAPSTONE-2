package com.calai.app

import android.content.Context
import com.calai.app.data.api.ApiClient
import com.calai.app.data.api.AuthApi
import com.calai.app.data.api.ChatApi
import com.calai.app.data.api.FoodAnalysisApi
import com.calai.app.data.auth.TokenStore

class AppContainer(context: Context) {
    val tokenStore = TokenStore(context.applicationContext)
    private val retrofit = ApiClient.create(tokenStore)
    val authApi: AuthApi = retrofit.create(AuthApi::class.java)
    val chatApi: ChatApi = retrofit.create(ChatApi::class.java)
    val foodAnalysisApi: FoodAnalysisApi = retrofit.create(FoodAnalysisApi::class.java)
}
