package com.calai.app.ui

import androidx.compose.runtime.Composable
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.calai.app.ui.chat.ChatListScreen
import com.calai.app.ui.chat.ChatScreen
import com.calai.app.ui.login.LoginScreen

private const val ROUTE_LOGIN = "login"
private const val ROUTE_SESSIONS = "sessions"
private const val ROUTE_CHAT = "chat/{sessionId}"

@Composable
fun AppRoot() {
    val nav = rememberNavController()

    NavHost(navController = nav, startDestination = ROUTE_LOGIN) {
        composable(ROUTE_LOGIN) {
            LoginScreen(
                onLoggedIn = {
                    nav.navigate(ROUTE_SESSIONS) {
                        popUpTo(ROUTE_LOGIN) { inclusive = true }
                    }
                }
            )
        }
        composable(ROUTE_SESSIONS) {
            ChatListScreen(
                onOpen = { id -> nav.navigate("chat/$id") },
                onNew = { nav.navigate("chat/0") },
                onLogout = {
                    nav.navigate(ROUTE_LOGIN) {
                        popUpTo(ROUTE_SESSIONS) { inclusive = true }
                    }
                }
            )
        }
        composable(ROUTE_CHAT) { entry ->
            val raw = entry.arguments?.getString("sessionId")?.toIntOrNull() ?: 0
            ChatScreen(
                sessionId = if (raw <= 0) null else raw,
                onBack = { nav.popBackStack() }
            )
        }
    }
}
