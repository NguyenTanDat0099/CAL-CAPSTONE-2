package com.calai.app.ui

import androidx.compose.runtime.Composable
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.calai.app.ui.home.HomeShell
import com.calai.app.ui.login.LoginScreen

private const val ROUTE_LOGIN = "login"
private const val ROUTE_HOME = "home"

@Composable
fun AppRoot() {
    val nav = rememberNavController()

    NavHost(navController = nav, startDestination = ROUTE_LOGIN) {
        composable(ROUTE_LOGIN) {
            LoginScreen(
                onLoggedIn = {
                    nav.navigate(ROUTE_HOME) {
                        popUpTo(ROUTE_LOGIN) { inclusive = true }
                    }
                }
            )
        }
        composable(ROUTE_HOME) {
            HomeShell(
                onLoggedOut = {
                    nav.navigate(ROUTE_LOGIN) {
                        popUpTo(ROUTE_HOME) { inclusive = true }
                    }
                }
            )
        }
    }
}
