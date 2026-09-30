package com.gameon.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.EventNote
import androidx.compose.material.icons.filled.Place
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
fun SessionsScreen(viewModel: GameOnViewModel) {
    val sessions by viewModel.sessions.collectAsState()
    val players by viewModel.players.collectAsState()
    val attendance by viewModel.attendance.collectAsState()

    var showAddSessionDialog by remember { mutableStateOf(false) }
    var selectedSessionIdForAttendance by remember { mutableStateOf<String?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // Top Action Row
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Match & Training Sessions",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )
            Button(
                onClick = { showAddSessionDialog = true },
                colors = ButtonDefaults.buttonColors(containerColor = EmeraldPrimary),
                shape = RoundedCornerShape(10.dp),
                contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp)
            ) {
                Icon(imageVector = Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text("New", fontSize = 12.sp)
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        if (sessions.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("No upcoming sessions scheduled.")
            }
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                items(sessions) { session ->
                    val records = attendance[session.id] ?: emptyList()
                    val presentCount = records.count { it.status == "Present" }

                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable {
                                // Toggle attendance sheet drawer
                                selectedSessionIdForAttendance = if (selectedSessionIdForAttendance == session.id) null else session.id
                            },
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text(session.title, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 2.dp)) {
                                        Icon(imageVector = Icons.Default.Place, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(12.dp))
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text(session.location, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                }
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(6.dp))
                                        .background(EmeraldPrimary.copy(alpha = 0.12f))
                                        .padding(horizontal = 8.dp, vertical = 4.dp)
                                ) {
                                    Text(session.type, color = EmeraldPrimary, fontWeight = FontWeight.Bold, fontSize = 10.sp)
                                }
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text("Date: ${session.date} @ ${session.time}", fontSize = 12.sp, fontWeight = FontWeight.Medium)
                                    Text("Fee: $${session.feePerPlayer} per player", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }

                                Text(
                                    text = "$presentCount Present",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 12.sp,
                                    color = EmeraldPrimary
                                )
                            }

                            // EXPANDED ATTENDANCE DRAWER IN-PLACE
                            if (selectedSessionIdForAttendance == session.id) {
                                Spacer(modifier = Modifier.height(16.dp))
                                Divider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
                                Spacer(modifier = Modifier.height(12.dp))
                                
                                Text("Attendance Coordinator Tracker", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = EmeraldPrimary)
                                Spacer(modifier = Modifier.height(8.dp))

                                players.forEach { player ->
                                    val currentRecord = records.find { it.playerId == player.id }
                                    val currentStatus = currentRecord?.status ?: "Absent"
                                    val isFeePaid = currentRecord?.feePaid ?: false

                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(vertical = 6.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(player.name, fontSize = 13.sp, fontWeight = FontWeight.Medium)
                                        
                                        Row(
                                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            // Present Button
                                            Button(
                                                onClick = {
                                                    viewModel.updateAttendance(session.id, player.id, "Present", isFeePaid)
                                                },
                                                shape = RoundedCornerShape(6.dp),
                                                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 2.dp),
                                                colors = ButtonDefaults.buttonColors(
                                                    containerColor = if (currentStatus == "Present") EmeraldPrimary else MaterialTheme.colorScheme.surfaceVariant
                                                )
                                            ) {
                                                Text("Present", fontSize = 10.sp, color = if (currentStatus == "Present") androidx.compose.ui.graphics.Color.White else MaterialTheme.colorScheme.onSurfaceVariant)
                                            }

                                            // Absent Button
                                            Button(
                                                onClick = {
                                                    viewModel.updateAttendance(session.id, player.id, "Absent", isFeePaid)
                                                },
                                                shape = RoundedCornerShape(6.dp),
                                                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 2.dp),
                                                colors = ButtonDefaults.buttonColors(
                                                    containerColor = if (currentStatus == "Absent") MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.surfaceVariant
                                                )
                                            ) {
                                                Text("Absent", fontSize = 10.sp, color = if (currentStatus == "Absent") androidx.compose.ui.graphics.Color.White else MaterialTheme.colorScheme.onSurfaceVariant)
                                            }

                                            // Fee checkbox mock
                                            IconButton(
                                                onClick = {
                                                    viewModel.updateAttendance(session.id, player.id, currentStatus, !isFeePaid)
                                                },
                                                modifier = Modifier.size(24.dp)
                                            ) {
                                                Icon(
                                                    imageVector = Icons.Default.CheckCircle,
                                                    contentDescription = null,
                                                    tint = if (isFeePaid) EmeraldPrimary else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.3f),
                                                    modifier = Modifier.size(18.dp)
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (showAddSessionDialog) {
        var title by remember { mutableStateOf("") }
        var location by remember { mutableStateOf("") }
        var date by remember { mutableStateOf("2026-07-28") }
        var time by remember { mutableStateOf("19:30") }
        var fee by remember { mutableStateOf("10.0") }
        var sessionType by remember { mutableStateOf("League Match") }

        AlertDialog(
            onDismissRequest = { showAddSessionDialog = false },
            title = { Text("Schedule Match or Training") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    TextField(value = title, onValueChange = { title = it }, label = { Text("Session Title") })
                    TextField(value = location, onValueChange = { location = it }, label = { Text("Field/Arena Location") })
                    TextField(value = date, onValueChange = { date = it }, label = { Text("Date (YYYY-MM-DD)") })
                    TextField(value = time, onValueChange = { time = it }, label = { Text("Time (HH:MM)") })
                    TextField(value = fee, onValueChange = { fee = it }, label = { Text("Session Fee ($)") })
                    TextField(value = sessionType, onValueChange = { sessionType = it }, label = { Text("Type (League Match / Friendly)") })
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (title.isNotEmpty()) {
                            viewModel.addSession(
                                title,
                                date,
                                time,
                                location,
                                fee.toDoubleOrNull() ?: 0.0,
                                sessionType,
                                null
                            )
                            showAddSessionDialog = false
                        }
                    }
                ) { Text("Schedule") }
            },
            dismissButton = {
                TextButton(onClick = { showAddSessionDialog = false }) { Text("Cancel") }
            }
        )
    }
}
