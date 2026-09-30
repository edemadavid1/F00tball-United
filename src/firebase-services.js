import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, deleteField } from "firebase/firestore";
import { db } from "./firebaseConfig";

// 1. Real-Time Listener: Automatically syncs players to your app
export function subscribeToPlayers(onUpdate) {
    const playersRef = collection(db, "go_players_prod");
    
    return onSnapshot(playersRef, (snapshot) => {
        const playersList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        playersList.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        onUpdate(playersList);
    }, (err) => {
        console.warn("Players snapshot subscription warning:", err.message);
    });
}

// 2. Add or Edit a Player
export async function savePlayerToFirestore(playerData) {
    const playerRef = playerData.id 
        ? doc(db, "go_players_prod", String(playerData.id)) 
        : doc(collection(db, "go_players_prod")); 

    await setDoc(playerRef, {
        id: playerRef.id,
        name: (playerData.name || '').trim(),
        nickname: playerData.nickname ? playerData.nickname.trim() : ""
    }, { merge: true });

    return playerRef.id;
}

// 3. Delete a Player
export async function deletePlayerFromFirestore(playerId) {
    if (!playerId) return;
    const playerRef = doc(db, "go_players_prod", String(playerId));
    await deleteDoc(playerRef);
}

// 4. Toggle Attendance & auto-remove from teams if marked absent
export async function updatePlayerAttendance(matchId, playerId, status) {
    if (!matchId || !playerId) return;
    const matchRef = doc(db, "go_matches_prod", String(matchId));
    const pId = String(playerId);
    
    const updates = {
        [`attendance.${pId}`]: status
    };

    if (status === 'absent') {
        updates[`player_teams.${pId}`] = deleteField();
    }

    await updateDoc(matchRef, updates);
}

// 5. Drag & Drop: Assign to team and FORCE attendance to 'present'
export async function assignPlayerToTeam(matchId, playerId, targetTeam) {
    if (!matchId || !playerId) return;
    const matchRef = doc(db, "go_matches_prod", String(matchId));
    const pId = String(playerId);
    
    const updates = {};
    
    if (targetTeam) {
        updates[`player_teams.${pId}`] = targetTeam;
        updates[`attendance.${pId}`] = 'present';
    } else {
        updates[`player_teams.${pId}`] = deleteField();
        updates[`attendance.${pId}`] = 'present'; 
    }

    await updateDoc(matchRef, updates);
}
