package com.calai.app.data.auth

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.tokenDataStore by preferencesDataStore("auth")

class TokenStore(private val appContext: Context) {
    private val keyToken = stringPreferencesKey("auth_token")

    val tokenFlow: Flow<String?> = appContext.tokenDataStore.data.map { it[keyToken] }

    suspend fun save(token: String) {
        appContext.tokenDataStore.edit { it[keyToken] = token }
    }

    suspend fun clear() {
        appContext.tokenDataStore.edit { it.remove(keyToken) }
    }
}
