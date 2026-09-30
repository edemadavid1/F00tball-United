package com.gameon.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.SportsScore
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.gameon.app.ui.theme.EmeraldPrimary
import com.gameon.app.ui.viewmodel.GameOnViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LeaguesScreen(viewModel: GameOnViewModel) {
    val leagues by viewModel.leagues.collectAsState()
    val matches by viewModel.matches.collectAsState()
    val standings by viewModel.standings.collectAsState()

    var activeTab by remember { mutableStateOf(0) } // 0: Standings, 1: Schedule, 2: Leagues List
    var showAddLeagueDialog by remember { mutableStateOf(false) }
    var showAddMatchDialog by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // Top Row with Title & Quick Buttons
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Tournaments & Leagues",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )
            
            Row {
                IconButton(onClick = { showAddMatchDialog = true }) {
                    Icon(imageVector = Icons.Default.SportsScore, contentDescription = "Add Match", tint = EmeraldPrimary)
                }
                IconButton(onClick = { showAddLeagueDialog = true }) {
                    Icon(imageVector = Icons.Default.Add, contentDescription = "Add League", tint = EmeraldPrimary)
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Custom Segmented Control Tab Row
        TabRow(
            selectedTabIndex = activeTab,
            modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(8.dp)),
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
            indicator = @Composable { }
        ) {
            Tab(
                selected = activeTab == 0,
                onClick = { activeTab = 0 },
                text = { Text("Standings", fontWeight = FontWeight.Bold, fontSize = 12.sp) }
            )
            Tab(
                selected = activeTab == 1,
                onClick = { activeTab = 1 },
                text = { Text("Matches", fontWeight = FontWeight.Bold, fontSize = 12.sp) }
            )
            Tab(
                selected = activeTab == 2,
                onClick = { activeTab = 2 },
                text = { Text("Leagues", fontWeight = FontWeight.Bold, fontSize = 12.sp) }
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Tab views
        when (activeTab) {
            0 -> StandingsTab(standings)
            1 -> MatchesTab(matches, viewModel)
            2 -> LeaguesTab(leagues)
        }
    }

    // Add League Dialog
    if (showAddLeagueDialog) {
        var leagueName by remember { mutableStateOf("") }
        var seasonName by remember { mutableStateOf("Summer 2026") }
        var sportName by remember { mutableStateOf("Soccer") }
        var leagueFormat by remember { mutableStateOf("twice") }

        AlertDialog(
            onDismissRequest = { showAddLeagueDialog = false },
            title = { Text("Add New League/Tournament") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    TextField(value = leagueName, onValueChange = { leagueName = it }, label = { Text("League Name") })
                    TextField(value = seasonName, onValueChange = { seasonName = it }, label = { Text("Season") })
                    TextField(value = sportName, onValueChange = { sportName = it }, label = { Text("Sport Type") })
                    TextField(value = leagueFormat, onValueChange = { leagueFormat = it }, label = { Text("Format (e.g. twice/once)") })
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (leagueName.isNotEmpty()) {
                            viewModel.addLeague(leagueName, seasonName, sportName, leagueFormat)
                            showAddLeagueDialog = false
                        }
                    }
                ) { Text("Create") }
            },
            dismissButton = {
                TextButton(onClick = { showAddLeagueDialog = false }) { Text("Cancel") }
            }
        )
    }

    // Add Match Dialog
    if (showAddMatchDialog) {
        var homeTeam by remember { mutableStateOf("") }
        var awayTeam by remember { mutableStateOf("") }
        var matchDate by remember { mutableStateOf("2026-07-25") }

        AlertDialog(
            onDismissRequest = { showAddMatchDialog = false },
            title = { Text("Schedule Tournament Match") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    TextField(value = homeTeam, onValueChange = { homeTeam = it }, label = { Text("Home Team Name") })
                    TextField(value = awayTeam, onValueChange = { awayTeam = it }, label = { Text("Away Team Name") })
                    TextField(value = matchDate, onValueChange = { matchDate = it }, label = { Text("Match Date (YYYY-MM-DD)") })
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (homeTeam.isNotEmpty() && awayTeam.isNotEmpty()) {
                            viewModel.addMatch("l1", homeTeam, awayTeam, matchDate)
                            showAddMatchDialog = false
                        }
                    }
                ) { Text("Schedule") }
            },
            dismissButton = {
                TextButton(onClick = { showAddMatchDialog = false }) { Text("Cancel") }
            }
        )
    }
}

@Composable
fun StandingsTab(standings: List<com.gameon.app.data.TeamStanding>) {
    LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
                modifier = Modifier.fillMaxWidth().padding(bottom = 6.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Team standing positions automatically adjust upon entering match scores.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onPrimaryContainer)
                }
            }
        }

        // Table Header
        item {
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text("TEAM", fontWeight = FontWeight.Bold, fontSize = 11.sp, modifier = Modifier.width(140.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("PL", fontWeight = FontWeight.Bold, fontSize = 11.sp)
                    Text("W", fontWeight = FontWeight.Bold, fontSize = 11.sp)
                    Text("D", fontWeight = FontWeight.Bold, fontSize = 11.sp)
                    Text("L", fontWeight = FontWeight.Bold, fontSize = 11.sp)
                    Text("PTS", fontWeight = FontWeight.Bold, fontSize = 11.sp, color = EmeraldPrimary)
                }
            }
        }

        items(standings.sortedByDescending { it.points }) { team ->
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(10.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(imageVector = Icons.Default.EmojiEvents, contentDescription = null, tint = EmeraldPrimary, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(team.name, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                        Text(team.played.toString(), fontSize = 12.sp)
                        Text(team.won.toString(), fontSize = 12.sp)
                        Text(team.drawn.toString(), fontSize = 12.sp)
                        Text(team.lost.toString(), fontSize = 12.sp)
                        Text(team.points.toString(), fontWeight = FontWeight.Bold, fontSize = 13.sp, color = EmeraldPrimary)
                    }
                }
            }
        }
    }
}

@Composable
fun MatchesTab(matches: List<com.gameon.app.data.LeagueMatch>, viewModel: GameOnViewModel) {
    var showScoreDialogByMatchId by remember { mutableStateOf<String?>(null) }

    LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        items(matches) { match ->
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Fixture Match #${match.matchNumber ?: 0}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(match.date, style = MaterialTheme.typography.bodySmall, color = EmeraldPrimary, fontWeight = FontWeight.Bold)
                    }
                    Spacer(modifier = Modifier.height(10.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(match.homeTeam, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            Text(match.awayTeam, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        }
                        if (match.status == "Played") {
                            Column(horizontalAlignment = Alignment.End) {
                                Text("${match.homeScore} - ${match.awayScore}", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = EmeraldPrimary)
                                if (match.playerOfMatch != null) {
                                    Text("MVP: ${match.playerOfMatch}", fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                        } else {
                            Button(
                                onClick = { showScoreDialogByMatchId = match.id },
                                shape = RoundedCornerShape(8.dp),
                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = EmeraldPrimary)
                            ) {
                                Text("Score", fontSize = 11.sp, color = androidx.compose.ui.graphics.Color.White)
                            }
                        }
                    }
                }
            }
        }
    }

    if (showScoreDialogByMatchId != null) {
        var homeScore by remember { mutableStateOf("2") }
        var awayScore by remember { mutableStateOf("1") }
        var mvp by remember { mutableStateOf("Alex Johnson") }

        AlertDialog(
            onDismissRequest = { showScoreDialogByMatchId = null },
            title = { Text("Report Score Outcomes") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    TextField(value = homeScore, onValueChange = { homeScore = it }, label = { Text("Home Score") })
                    TextField(value = awayScore, onValueChange = { awayScore = it }, label = { Text("Away Score") })
                    TextField(value = mvp, onValueChange = { mvp = it }, label = { Text("MVP / Player of Match") })
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val h = homeScore.toIntOrNull() ?: 0
                        val a = awayScore.toIntOrNull() ?: 0
                        viewModel.playMatch(showScoreDialogByMatchId!!, h, a, mvp.ifEmpty { null })
                        showScoreDialogByMatchId = null
                    }
                ) { Text("Report") }
            },
            dismissButton = {
                TextButton(onClick = { showScoreDialogByMatchId = null }) { Text("Cancel") }
            }
        )
    }
}

@Composable
fun LeaguesTab(leagues: List<com.gameon.app.data.League>) {
    LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        items(leagues) { league ->
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(league.name, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                        Text("${league.sport} • ${league.season}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    val isActive = league.status == "Active"
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(6.dp))
                            .background(if (isActive) EmeraldPrimary.copy(alpha = 0.15f) else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.1f))
                            .padding(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Text(
                            text = league.status,
                            color = if (isActive) EmeraldPrimary else MaterialTheme.colorScheme.onSurfaceVariant,
                            fontWeight = FontWeight.Bold,
                            fontSize = 11.sp
                        )
                    }
                }
            }
        }
    }
}
