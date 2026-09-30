package com.gameon.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewmodel.compose.viewModel
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import com.gameon.app.ui.screens.DashboardScreen
import com.gameon.app.ui.screens.LeaguesScreen
import com.gameon.app.ui.screens.PlayersScreen
import com.gameon.app.ui.screens.SessionsScreen
import com.gameon.app.ui.theme.GameOnTheme
import com.gameon.app.ui.viewmodel.GameOnViewModel

class MainActivity : ComponentActivity() {
    @OptIn(ExperimentalMaterial3Api::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            GameOnTheme {
                // Instantiates the shared state manager
                val viewModel: GameOnViewModel = viewModel()
                var selectedTab by remember { mutableIntOf(0) }
                
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    Scaffold(
                        topBar = {
                            CenterAlignedTopAppBar(
                                title = {
                                    Text(
                                        text = when (selectedTab) {
                                            0 -> "Dashboard"
                                            1 -> "Leagues"
                                            2 -> "Teammates"
                                            else -> "Sessions"
                                        },
                                        style = MaterialTheme.typography.titleLarge
                                    )
                                },
                                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
                                    containerColor = MaterialTheme.colorScheme.background
                                )
                            )
                        },
                        bottomBar = {
                            NavigationBar(
                                containerColor = MaterialTheme.colorScheme.surface
                            ) {
                                val navigationItems = listOf(
                                    NavigationItem("Dashboard", Icons.Default.Dashboard),
                                    NavigationItem("Leagues", Icons.Default.EmojiEvents),
                                    NavigationItem("Teammates", Icons.Default.Group),
                                    NavigationItem("Sessions", Icons.Default.Schedule)
                                )
                                
                                navigationItems.forEachIndexed { index, item ->
                                    NavigationBarItem(
                                        selected = selectedTab == index,
                                        onClick = { selectedTab = index },
                                        label = { Text(item.label, style = MaterialTheme.typography.bodySmall) },
                                        icon = { Icon(imageVector = item.icon, contentDescription = item.label) }
                                    )
                                }
                            }
                        }
                    ) { innerPadding ->
                        Surface(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(innerPadding)
                        ) {
                            when (selectedTab) {
                                0 -> DashboardScreen(viewModel)
                                1 -> LeaguesScreen(viewModel)
                                2 -> PlayersScreen(viewModel)
                                3 -> SessionsScreen(viewModel)
                            }
                        }
                    }
                }
            }
        }
    }
}

data class NavigationItem(val label: String, val icon: ImageVector)
