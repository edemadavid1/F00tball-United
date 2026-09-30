package com.gameon.app.data

import java.util.UUID

data class Player(
    val id: String = UUID.randomUUID().toString(),
    val name: String,
    val email: String? = null,
    val phone: String? = null,
    val status: String = "Active", // "Active" or "Inactive"
    val joinDate: String,
    val jerseyNumber: Int? = null,
    val position: String? = null,
    val annualDuePaid: Boolean = false,
    val volunteeredToCook: Boolean = false,
    val cookDate: String? = null,
    val endOfYearPartyAttendee: Boolean = false
)

data class Session(
    val id: String = UUID.randomUUID().toString(),
    val title: String,
    val date: String,
    val time: String,
    val location: String,
    val leagueId: String? = null,
    val matchId: String? = null,
    val type: String = "League Match", // "League Match" or "Friendly Match"
    val status: String = "Upcoming", // "Completed" or "Upcoming"
    val feePerPlayer: Double = 0.0,
    val isRecurring: Boolean = false
)

data class AttendanceRecord(
    val sessionId: String,
    val playerId: String,
    val status: String, // "Present", "Absent", "Excused"
    val feePaid: Boolean = false,
    val notes: String? = null,
    val arrivalTime: String? = null
)

data class League(
    val id: String = UUID.randomUUID().toString(),
    val name: String,
    val season: String,
    val sport: String,
    val status: String = "Active", // "Active" or "Completed"
    val format: String? = "once"
)

data class TeamStanding(
    val id: String = UUID.randomUUID().toString(),
    val name: String,
    val played: Int = 0,
    val won: Int = 0,
    val drawn: Int = 0,
    val lost: Int = 0,
    val goalsFor: Int = 0,
    val goalsAgainst: Int = 0,
    val points: Int = 0
)

data class LeagueStanding(
    val leagueId: String,
    val standings: List<TeamStanding>
)

data class MatchGoal(
    val id: String = UUID.randomUUID().toString(),
    val playerId: String,
    val playerName: String,
    val team: String?, // "home" or "away"
    val type: String = "League"
)

data class LeagueMatch(
    val id: String = UUID.randomUUID().toString(),
    val leagueId: String,
    val homeTeam: String,
    val awayTeam: String,
    val homeScore: Int? = null,
    val awayScore: Int? = null,
    val date: String,
    val status: String = "Scheduled", // "Scheduled", "Played", "Live"
    val type: String? = "League Match",
    val matchNumber: Int? = null,
    val playerOfMatch: String? = null,
    val homeSquad: List<String> = emptyList(),
    val awaySquad: List<String> = emptyList(),
    val goals: List<MatchGoal> = emptyList()
)

data class ActivityLog(
    val id: String = UUID.randomUUID().toString(),
    val timestamp: String,
    val type: String, // "Session", "Player", "League", "Attendance"
    val message: String,
    val detail: String
)
