package com.gameon.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import com.gameon.app.data.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.text.SimpleDateFormat
import java.util.*

class GameOnViewModel : ViewModel() {

    // Mock initial data matching the beautiful initial states of Game On web app
    private val _players = MutableStateFlow<List<Player>>(
        listOf(
            Player(id = "1", name = "Alex Johnson", email = "alex@gameon.com", phone = "+1 (555) 019-2831", status = "Active", joinDate = "2026-05-10", jerseyNumber = 10, position = "Forward", annualDuePaid = true),
            Player(id = "2", name = "Marcus Sterling", email = "marcus@gameon.com", phone = "+1 (555) 014-9982", status = "Active", joinDate = "2026-05-15", jerseyNumber = 7, position = "Midfielder", annualDuePaid = false),
            Player(id = "3", name = "David Villa", email = "david@gameon.com", phone = "+1 (555) 012-4433", status = "Active", joinDate = "2026-06-01", jerseyNumber = 9, position = "Striker", annualDuePaid = true),
            Player(id = "4", name = "Christian Pulisic", email = "cap@gameon.com", phone = "+1 (555) 017-1122", status = "Inactive", joinDate = "2026-03-20", jerseyNumber = 11, position = "Winger", annualDuePaid = false)
        )
    )
    val players: StateFlow<List<Player>> = _players.asStateFlow()

    private val _leagues = MutableStateFlow<List<League>>(
        listOf(
            League(id = "l1", name = "Summer Premier Cup", season = "Summer 2026", sport = "Soccer", status = "Active", format = "twice"),
            League(id = "l2", name = "Co-Ed Recreation League", season = "Spring 2026", sport = "Futsal", status = "Completed", format = "once")
        )
    )
    val leagues: StateFlow<List<League>> = _leagues.asStateFlow()

    private val _sessions = MutableStateFlow<List<Session>>(
        listOf(
            Session(id = "s1", title = "Weekly Training Camp", date = "2026-07-15", time = "18:00", location = "Metro Turf Field Arena", type = "Friendly Match", status = "Upcoming", feePerPlayer = 10.0),
            Session(id = "s2", title = "Championship Finals Match", date = "2026-07-20", time = "20:00", location = "Grand Arena Stadium", leagueId = "l1", type = "League Match", status = "Upcoming", feePerPlayer = 15.0)
        )
    )
    val sessions: StateFlow<List<Session>> = _sessions.asStateFlow()

    private val _matches = MutableStateFlow<List<LeagueMatch>>(
        listOf(
            LeagueMatch(id = "m1", leagueId = "l1", homeTeam = "Green Giants FC", awayTeam = "Shadow Strikers", homeScore = 3, awayScore = 2, date = "2026-07-01", status = "Played", matchNumber = 1, playerOfMatch = "Alex Johnson"),
            LeagueMatch(id = "m2", leagueId = "l1", homeTeam = "Red Devils", awayTeam = "Blue Lightning", homeScore = 1, awayScore = 1, date = "2026-07-05", status = "Played", matchNumber = 2, playerOfMatch = "Marcus Sterling"),
            LeagueMatch(id = "m3", leagueId = "l1", homeTeam = "Green Giants FC", awayTeam = "Red Devils", date = "2026-07-18", status = "Scheduled", matchNumber = 3)
        )
    )
    val matches: StateFlow<List<LeagueMatch>> = _matches.asStateFlow()

    private val _attendance = MutableStateFlow<Map<String, List<AttendanceRecord>>>(
        mapOf(
            "s1" to listOf(
                AttendanceRecord(sessionId = "s1", playerId = "1", status = "Present", feePaid = true),
                AttendanceRecord(sessionId = "s1", playerId = "2", status = "Present", feePaid = false),
                AttendanceRecord(sessionId = "s1", playerId = "3", status = "Absent", feePaid = false)
            )
        )
    )
    val attendance: StateFlow<Map<String, List<AttendanceRecord>>> = _attendance.asStateFlow()

    private val _logs = MutableStateFlow<List<ActivityLog>>(
        listOf(
            ActivityLog(timestamp = "13:40", type = "Player", message = "Player profile updated", detail = "Alex Johnson's jersey number was set to 10"),
            ActivityLog(timestamp = "12:15", type = "League", message = "New League Created", detail = "Summer Premier Cup (Summer 2026)")
        )
    )
    val logs: StateFlow<List<ActivityLog>> = _logs.asStateFlow()

    // Standings data
    private val _standings = MutableStateFlow<List<TeamStanding>>(
        listOf(
            TeamStanding(id = "t1", name = "Green Giants FC", played = 2, won = 1, drawn = 1, lost = 0, goalsFor = 4, goalsAgainst = 3, points = 4),
            TeamStanding(id = "t2", name = "Blue Lightning", played = 1, won = 0, drawn = 1, lost = 0, goalsFor = 1, goalsAgainst = 1, points = 1),
            TeamStanding(id = "t3", name = "Red Devils", played = 1, won = 0, drawn = 1, lost = 0, goalsFor = 1, goalsAgainst = 1, points = 1),
            TeamStanding(id = "t4", name = "Shadow Strikers", played = 2, won = 0, drawn = 1, lost = 1, goalsFor = 3, goalsAgainst = 4, points = 1)
        )
    )
    val standings: StateFlow<List<TeamStanding>> = _standings.asStateFlow()

    // HELPER ACTIONS
    fun addPlayer(name: String, email: String, phone: String, jersey: Int?, position: String) {
        val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        val today = dateFormat.format(Date())
        val newPlayer = Player(
            name = name,
            email = email.ifEmpty { null },
            phone = phone.ifEmpty { null },
            jerseyNumber = jersey,
            position = position.ifEmpty { null },
            joinDate = today
        )
        _players.value = _players.value + newPlayer
        logAction("Player", "Player added: $name", "Joined position: ${position.ifEmpty { "N/A" }}, Jersey: $jersey")
    }

    fun togglePlayerStatus(playerId: String) {
        _players.value = _players.value.map {
            if (it.id == playerId) {
                val newStatus = if (it.status == "Active") "Inactive" else "Active"
                logAction("Player", "Status updated for ${it.name}", "Set to $newStatus")
                it.copy(status = newStatus)
            } else it
        }
    }

    fun addLeague(name: String, season: String, sport: String, format: String) {
        val newLeague = League(
            name = name,
            season = season,
            sport = sport,
            format = format
        )
        _leagues.value = _leagues.value + newLeague
        logAction("League", "New League created", "$name ($season)")
    }

    fun addSession(title: String, date: String, time: String, location: String, fee: Double, type: String, leagueId: String?) {
        val newSession = Session(
            title = title,
            date = date,
            time = time,
            location = location,
            feePerPlayer = fee,
            type = type,
            leagueId = leagueId
        )
        _sessions.value = _sessions.value + newSession
        logAction("Session", "New session scheduled", "$title on $date at $time")
    }

    fun updateAttendance(sessionId: String, playerId: String, status: String, feePaid: Boolean) {
        val records = _attendance.value[sessionId]?.toMutableList() ?: mutableListOf()
        val existingIndex = records.indexOfFirst { it.playerId == playerId }
        
        val record = AttendanceRecord(sessionId = sessionId, playerId = playerId, status = status, feePaid = feePaid)
        if (existingIndex != -1) {
            records[existingIndex] = record
        } else {
            records.add(record)
        }
        
        _attendance.value = _attendance.value + (sessionId to records)
        val pName = _players.value.find { it.id == playerId }?.name ?: "Player"
        logAction("Attendance", "Attendance recorded for $pName", "Status: $status, Paid: $feePaid")
    }

    fun addMatch(leagueId: String, home: String, away: String, date: String) {
        val newMatch = LeagueMatch(
            leagueId = leagueId,
            homeTeam = home,
            awayTeam = away,
            date = date,
            status = "Scheduled",
            type = "League Match"
        )
        _matches.value = _matches.value + newMatch
        logAction("League", "Match scheduled", "$home vs $away on $date")
    }

    fun playMatch(matchId: String, homeScore: Int, awayScore: Int, scorer: String?) {
        _matches.value = _matches.value.map {
            if (it.id == matchId) {
                logAction("League", "Match result reported", "${it.homeTeam} $homeScore - $awayScore ${it.awayTeam}")
                it.copy(
                    homeScore = homeScore,
                    awayScore = awayScore,
                    status = "Played",
                    playerOfMatch = scorer
                )
            } else it
        }
        
        // Recalculate standings mock logic
        updateStandingsOnMatch(homeScore, awayScore)
    }

    private fun updateStandingsOnMatch(homeScore: Int, awayScore: Int) {
        // Just update points mock-style for Green Giants FC and Red Devils for demonstration
        _standings.value = _standings.value.map {
            if (it.name == "Green Giants FC") {
                if (homeScore > awayScore) {
                    it.copy(played = it.played + 1, won = it.won + 1, points = it.points + 3)
                } else if (homeScore == awayScore) {
                    it.copy(played = it.played + 1, drawn = it.drawn + 1, points = it.points + 1)
                } else {
                    it.copy(played = it.played + 1, lost = it.lost + 1)
                }
            } else if (it.name == "Red Devils") {
                if (awayScore > homeScore) {
                    it.copy(played = it.played + 1, won = it.won + 1, points = it.points + 3)
                } else if (homeScore == awayScore) {
                    it.copy(played = it.played + 1, drawn = it.drawn + 1, points = it.points + 1)
                } else {
                    it.copy(played = it.played + 1, lost = it.lost + 1)
                }
            } else it
        }
    }

    private fun logAction(type: String, message: String, detail: String) {
        val dateFormat = SimpleDateFormat("HH:mm", Locale.getDefault())
        val time = dateFormat.format(Date())
        _logs.value = listOf(ActivityLog(timestamp = time, type = type, message = message, detail = detail)) + _logs.value
    }
}
