package com.calai.app.ui.home

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.consumeWindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.filled.CenterFocusStrong
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navigation
import com.calai.app.ui.chat.ChatListScreen
import com.calai.app.ui.chat.ChatScreen
import com.calai.app.ui.scan.FoodScanScreen

private object HomeRoutes {
    const val CHAT_GRAPH = "chat_graph"
    const val CHAT_LIST = "chat_list"
    const val CHAT_DETAIL = "chat_detail/{sessionId}"
    const val SCAN = "scan"
}

private data class TabSpec(
    val route: String,
    val label: String,
    val icon: ImageVector,
)

private val TABS = listOf(
    TabSpec(HomeRoutes.CHAT_GRAPH, "Chats", Icons.AutoMirrored.Filled.Chat),
    TabSpec(HomeRoutes.SCAN, "Scan", Icons.Default.CenterFocusStrong),
)

@Composable
fun HomeShell(onLoggedOut: () -> Unit) {
    val nav = rememberNavController()
    val backStack by nav.currentBackStackEntryAsState()
    val currentDestRoute = backStack?.destination?.route
    val currentRoute = backStack?.destination?.hierarchy
        ?.map { it.route }
        ?.firstOrNull { route ->
            TABS.any { tab -> tab.route == route }
        }
        ?: HomeRoutes.CHAT_GRAPH

    // Hide the bottom nav while the user is drilled into a chat session —
    // standard mobile pattern, keeps the chat feeling like its own focused
    // surface and gives the input bar the full bottom edge.
    val showBottomBar = currentDestRoute != null &&
        !currentDestRoute.startsWith("chat_detail")

    Scaffold(
        // safeDrawing = systemBars + displayCutout + IME. Using this (instead of
        // the default systemBars-only) makes Scaffold's padding include the IME
        // when the keyboard opens, so nested screens don't need their own
        // imePadding() — and we avoid double-padding the nav bar region
        // (which created a gap between the chat input bar and the keyboard).
        contentWindowInsets = WindowInsets.safeDrawing,
        bottomBar = {
            if (showBottomBar) {
                NavigationBar(
                    containerColor = MaterialTheme.colorScheme.surface,
                    tonalElevation = 0.dp,
                ) {
                    TABS.forEach { tab ->
                        val selected = currentRoute == tab.route
                        NavigationBarItem(
                            selected = selected,
                            onClick = {
                                // Standard bottom-nav behavior: keep the
                                // back stack of inactive tabs, restore
                                // state on return, and avoid duplicating
                                // the start destination on double-tap.
                                nav.navigate(tab.route) {
                                    popUpTo(nav.graph.findStartDestination().id) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = { Icon(tab.icon, contentDescription = null) },
                            label = { Text(tab.label) },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = MaterialTheme.colorScheme.onPrimaryContainer,
                                selectedTextColor = MaterialTheme.colorScheme.primary,
                                indicatorColor = MaterialTheme.colorScheme.primaryContainer,
                                unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        )
                    }
                }
            }
        }
    ) { padding: PaddingValues ->
        // consumeWindowInsets is the canonical way to tell nested layouts
        // that the parent already padded for system bars. Without it, the
        // child Scaffolds (ChatScreen, ChatListScreen) would try to consume
        // statusBars again and either render their TopAppBar behind the
        // status bar (zero height) or leak whitespace at the bottom.
        Box(
            Modifier
                .fillMaxSize()
                .padding(padding)
                .consumeWindowInsets(padding)
        ) {
            NavHost(
                navController = nav,
                startDestination = HomeRoutes.CHAT_GRAPH,
            ) {
                // The chat tab keeps its own nested back stack so user can
                // drill into a session, hit system back, and land on the
                // chat list without losing the scan tab's state.
                navigation(
                    startDestination = HomeRoutes.CHAT_LIST,
                    route = HomeRoutes.CHAT_GRAPH,
                ) {
                    composable(HomeRoutes.CHAT_LIST) {
                        ChatListScreen(
                            onOpen = { id -> nav.navigate("chat_detail/$id") },
                            onNew = { nav.navigate("chat_detail/0") },
                            onLogout = onLoggedOut,
                        )
                    }
                    composable(HomeRoutes.CHAT_DETAIL) { entry ->
                        val raw = entry.arguments?.getString("sessionId")?.toIntOrNull() ?: 0
                        ChatScreen(
                            sessionId = if (raw <= 0) null else raw,
                            onBack = { nav.popBackStack() },
                        )
                    }
                }

                composable(HomeRoutes.SCAN) {
                    FoodScanScreen()
                }
            }
        }
    }
}

