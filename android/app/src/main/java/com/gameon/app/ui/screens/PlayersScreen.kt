package com.gameon.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Shield
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
fun PlayersScreen(viewModel: GameOnViewModel) {
    val players by viewModel.players.collectAsState()
    var showAddPlayerDialog by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // Roster title and add button
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Rosters & Teammates",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )
            Button(
                onClick = { showAddPlayerDialog = true },
                colors = ButtonDefaults.buttonColors(containerColor = EmeraldPrimary),
                shape = RoundedCornerShape(10.dp),
                contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp)
            ) {
                Icon(imageVector = Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text("Add", fontSize = 12.sp)
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        if (players.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("No roster members created yet.")
            }
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                items(players) { player ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            // Header: Name, Position, Jersey, Status
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(imageVector = Icons.Default.Shield, contentDescription = null, tint = EmeraldPrimary, modifier = Modifier.size(18.dp))
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Column {
                                        Text(player.name, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                                        Text(
                                            text = "${player.position ?: "Unassigned"} • Jersey #${player.jerseyNumber ?: "N/A"}",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    }
                                }
                                
                                // Active status pill
                                val isActive = player.status == "Active"
                                Switch(
                                    checked = isActive,
                                    onCheckedChange = { viewModel.togglePlayerStatus(player.id) },
                                    colors = SwitchDefaults.colors(
                                        checkedThumbColor = EmeraldPrimary,
                                        checkedTrackColor = EmeraldPrimary.copy(alpha = 0.3f)
                                    )
                                )
                            }

                            Spacer(modifier = Modifier.height(12.dp))
                            Divider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
                            Spacer(modifier = Modifier.height(12.dp))

                            // Details Row
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                    if (player.email != null) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Icon(imageVector = Icons.Default.Email, contentDescription = null, modifier = Modifier.size(12.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                            Spacer(modifier = Modifier.width(6.dp))
                                            Text(player.email, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        }
                                    }
                                    if (player.phone != null) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Icon(imageVector = Icons.Default.Phone, contentDescription = null, modifier = Modifier.size(12.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                            Spacer(modifier = Modifier.width(6.dp))
                                            Text(player.phone, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        }
                                    }
                                }

                                // Due paid tag
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(6.dp))
                                        .background(
                                            if (player.annualDuePaid) EmeraldPrimary.copy(alpha = 0.12f)
                                            else MaterialTheme.colorScheme.error.copy(alpha = 0.1f)
                                        )
                                        .padding(horizontal = 8.dp, vertical = 4.dp)
                                ) {
                                    Text(
                                        text = if (player.annualDuePaid) "Dues Paid" else "Unpaid Dues",
                                        color = if (player.annualDuePaid) EmeraldPrimary else MaterialTheme.colorScheme.error,
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (showAddPlayerDialog) {
        var name by remember { mutableStateOf("") }
        var email by remember { mutableStateOf("") }
        var phone by remember { mutableStateOf("") }
        var jersey by remember { mutableStateOf("") }
        var position by remember { mutableStateOf("Midfielder") }

        AlertDialog(
            onDismissRequest = { showAddPlayerDialog = false },
            title = { Text("Register Team Player") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    TextField(value = name, onValueChange = { name = it }, label = { Text("Player Name") })
                    TextField(value = email, onValueChange = { email = it }, label = { Text("Email Address") })
                    TextField(value = phone, onValueChange = { phone = it }, label = { Text("Phone Number") })
                    TextField(value = jersey, onValueChange = { jersey = it }, label = { Text("Jersey Number") })
                    TextField(value = position, onValueChange = { position = it }, label = { Text("Position (e.g. Forward, Midfielder)") })
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (name.isNotEmpty()) {
                            viewModel.addPlayer(name, email, phone, jersey.toIntOrNull(), position)
                            showAddPlayerDialog = false
                        }
                    }
                ) { Text("Save") }
            },
            dismissButton = {
                TextButton(onClick = { showAddPlayerDialog = false }) { Text("Cancel") }
            }
        )
    }
}
