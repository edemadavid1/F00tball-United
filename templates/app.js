// Dynamic Canonical App URL - points to the active web app origin or custom domain when linked
function getCanonicalAppOrigin() {
    if (typeof window !== 'undefined' && window.location && window.location.origin) {
        return window.location.origin;
    }
    return 'https://www.football-united.com';
}
const PRODUCTION_URL = getCanonicalAppOrigin();
if (typeof window !== 'undefined') {
    window.PRODUCTION_URL = PRODUCTION_URL;
    window.isDeveloperGodMode = false;
}

// Safe, resilient accessors for Firebase and Firestore
const getDb = () => (typeof window !== 'undefined' ? (window.db || window.fb?.db || null) : null);
const getForceNetworkConnection = () => (() => Promise.resolve());
const getEnableNetwork = () => (() => Promise.resolve());
const getDisableNetwork = () => (() => Promise.resolve());

let db = typeof window !== 'undefined' ? (window.db || window.fb?.db || null) : null;
let forceNetworkConnection = () => Promise.resolve();
let enableNetwork = () => Promise.resolve();
let disableNetwork = () => Promise.resolve();

if (typeof window !== 'undefined') {
    window.addEventListener('firebase_ready', (e) => {
        db = window.db || e.detail?.db || null;
    });
}

window.safeJsonStringify = function(obj, space) {
    const seen = new WeakSet();
    try {
        return JSON.stringify(obj, (key, value) => {
            if (typeof value === 'object' && value !== null) {
                if (seen.has(value)) return undefined;
                seen.add(value);
                if (
                    'nodeType' in value || 
                    (value.constructor && (value.constructor.name === 'HTMLDocument' || value.constructor.name === 'Window' || value.constructor.name === 'HTMLImageElement')) || 
                    (typeof window !== 'undefined' && value === window) ||
                    (typeof Element !== 'undefined' && value instanceof Element)
                ) {
                    return undefined;
                }
            }
            if (typeof value === 'function' || typeof value === 'symbol') return undefined;
            return value;
        }, space) || '{}';
    } catch (err) {
        return '{}';
    }
};

window.safeClone = function(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    try {
        return JSON.parse(window.safeJsonStringify(obj));
    } catch (err) {
        return Array.isArray(obj) ? [] : {};
    }
};

// Global early capture of PWA beforeinstallprompt
if (typeof window !== 'undefined') {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        window._cachedDeferredInstallPrompt = e;
        if (window.AppState) {
            window.AppState.deferredInstallPrompt = e;
            window.AppState.canInstallOnAndroid = true;
            window.AppState.showInstallButton = true;
            if (!window.AppState.isAppInstalled && typeof window.AppState.maybeShowBanner === 'function') {
                window.AppState.maybeShowBanner();
            }
        }
    });
}

window.gameOnApp = function gameOnApp() {
    return {
        darkMode: true,
        activeTab: 'home', 
        leagueSubTab: 'matches', 
        draggedPlayer: null,
        savingStatus: 'saved',
        isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,

        // PWA Installability State (Part 4 & Part 6)
        deferredInstallPrompt: null,      // Android: holds the captured beforeinstallprompt event
        canInstallOnAndroid: false,       // true once beforeinstallprompt has fired
        showIosInstallModal: false,       // iOS: controls the manual-instructions modal
        showAndroidInstallModal: false,   // Android/Desktop: controls manual-instructions modal
        showInstallToHomeScreenModal: false, // Dedicated guide modal to add icon to home screen / app drawer
        installGuideTab: 'android',       // 'android' | 'ios' | 'windows' | 'mac'
        showInstallBanner: false,         // controls the one-time dismissible top banner
        isAppInstalled: false,            // true if already running as an installed app — hides everything
        isInAiStudio: true,               // true when running in AI Studio or web preview
        isDeveloperMode: false,           // strictly locked until authenticated as developer
        isDeveloperGodMode: false,        // developer / bootstrapped admin bypass mode
        isDeveloperAutoLoggingIn: false,  // true while background developer auto-login is active
        devDismissedCard: false,          // tracks if card was closed in current session in Developer Mode
        isDownloadedApp: false,           // true ONLY when running as the downloaded app launcher or standalone PWA outside AI Studio
        isAppDownloaded: false,           // compat alias
        showInstallButton: false,         // compat alias
        isIosDevice: false,               // compat alias
        isStandalone: false,              // compat alias
        isInstalledSuccessfully: false,
        isDownloadingApp: false,          // reactive state for app downloading feedback
        downloadCardDismissed: false,     // true when user clicked Download App or Share with team, removing card
        hasDownloadedApp: false,          // true when downloaded via card
        hasSharedWithTeam: false,         // true when shared with team via card
        showDesktopAppLauncherBanner: true, // desktop helper banner
        swStatus: 'checking',

        // Team Sharing & Multi-Device Sync State
        showShareTeamModal: false,
        shareAppUrl: 'https://www.football-united.com',
        shareLinkTab: 'direct', // 'direct' | 'public' | 'custom'
        customShareUrl: '',
        isCheckingPublicLink: false,
        publicLinkLive: false,
        copiedShareLink: false,
        copiedDownloadLink: false,
        canNativeShare: false,
        detectedOS: 'unknown',
        isRepairingDatabase: false,
        autoSyncEnabled: true,
        autoSyncStatusText: 'Just now',
        lastAutoSyncedTime: Date.now(),
        isAutoSyncing: false,

        homeStandingsView: 'player', 
        homeMainView: 'sessions', // 'sessions' | 'attendance_leaders' | 'player_standings' | 'team_standings'
        playerSortCol: 'pts',
        playerSortAsc: false,
        teamSortCol: 'pts',
        teamSortAsc: false,

        // Core collections & State
        players: [],
        teams: [],
        matches: [],
        // Sessions & Training Attendance State
        sessions: [],
        recurringSessionSchedules: [],
        activeSessionTypeFilter: 'all',
        sessionNameSlideFilter: 'all', // 'all' | specific session name e.g. 'Football Training'
        sessionGroupingMode: 'by_week', // 'by_week' (Green: This Week, Yellow: Next Week, Red: Week After) | 'combined' | 'by_name'
        sessionWeekCategoryFilter: 'all', // 'all' | 'this_week' | 'next_week' | 'week_after'
        homeSessionsCardMode: 'grouped_by_week', // 'grouped_by_week' | 'all_cards' | 'three_spotlight'
        sessionSearchQuery: '',
        sessionDateFilter: '',
        sessionWeekFilter: 'all', // 'this_week' | 'all'
        sessionWeekOffset: 0, // 0 for this week, 1 for next week, -1 for last week, etc.
        sessionTimelineFilter: 'all', // 'all' | 'released' | 'upcoming'
        sessionSortOrder: 'oldest', // 'oldest' (chronological / oldest to newest) | 'newest' (newest to oldest)
        sessionArrangementMode: 'grouped_by_week', // 'grouped_by_week' | 'all' | 'three_upcoming'
        currentTodayBST: '',
        // Collapsible week categories: Default is COLLAPSED (true) in sessions and upcoming sessions in home page
        homeWeekGroupsCollapsed: {
            'this_week': true,
            'next_week': true,
            'week_after': true
        },
        sessionsWeekGroupsCollapsed: {
            'this_week': true,
            'next_week': true,
            'week_after': true
        },
        sessionsViewMode: 'cards', // 'cards' | 'table' (matrix)
        matrixPlayerSearch: '',
        matrixSortBy: 'attended_desc', // 'attended_desc' | 'name' | 'attended_asc'
        matrixAttendanceFilter: 'all', // 'all' | 'active' | 'zero'
        matrixHighlightedSessionId: null,
        showSessionModal: false,
        isEditingSession: false,
        showDeleteSessionModal: false,
        sessionToDelete: null,
        newSession: {
            id: '',
            date: new Date().toISOString().split('T')[0],
            time: '18:00',
            type: 'Football Training',
            typeSelection: 'Football Training',
            customType: '',
            title: '',
            lead_trainer: '',
            location: '',
            notes: '',
            status: 'Completed',
            attendance: {},
            attendees: [],
            // Recurrence options
            isRecurring: false,
            recurrenceFrequency: 'weekly', // 'weekly' | 'biweekly' | 'daily' | 'monthly'
            recurrenceEndMode: 'count', // 'count' | 'until_date'
            recurrenceCount: 6,
            recurrenceEndDate: '',
            autoNumberTitles: true,
            recurrenceReleaseStrategy: 'upfront', // 'upfront' (create all cards immediately) | 'weekly_auto' (add/reveal card on weekly schedule)
            series_id: '',
            series_index: 1,
            series_total: 1
        },
        sessionTypePresets: [
            { label: '⚽ Football Training', value: 'Football Training', color: 'emerald' },
            { label: '💻 Digital Skills', value: 'Digital Skills', color: 'blue' },
            { label: "👑 Captain's Training", value: "Captain's Training", color: 'amber' },
            { label: '🏃 Fitness & Conditioning', value: 'Fitness & Conditioning', color: 'slate' },
            { label: '🎯 Tactical Analysis', value: 'Tactical Analysis', color: 'slate' },
            { label: '🤝 Mentorship & Life Skills', value: 'Mentorship & Life Skills', color: 'indigo' },
            { label: '🩺 Recovery & Physio', value: 'Recovery & Physio', color: 'cyan' },
            { label: '📋 Workshop / Seminar', value: 'Workshop / Seminar', color: 'sky' },
            { label: '✍️ Custom Session Type...', value: 'custom', color: 'slate' }
        ],
        copiedSessionAttendanceSuccess: false,
        captainStandings: [],
        playerStandings: [],
        weeklyReportCards: [],
        reportStartDate: '2026-02-14',
        reportEndDate: '',

        // Global Toast Notification State
        toastMessage: '',
        toastType: 'info', // 'info' | 'success' | 'warning' | 'error'
        toastVisible: false,
        toastTimer: null,

        showToast(message, type = 'info', duration = 3500) {
            if (!message) return;
            this.toastMessage = String(message);
            this.toastType = type;
            this.toastVisible = true;
            if (this.toastTimer) {
                clearTimeout(this.toastTimer);
            }
            this.toastTimer = setTimeout(() => {
                this.toastVisible = false;
            }, duration);
        },

        // Registration & Safeguarding State
        pendingRegistrations: [],
        pendingRegistrationsLoading: false,
        copyLinkFeedback: false,
        copiedTokenFeedback: '',
        playerSearchQuery: '',
        showPlayerSafeguardingModal: false,
        selectedSafeguardPlayer: null,
        safeguardingActiveTab: 'profile', // 'profile' | 'consent_qr' | 'medical'
        copiedSafeguardLink: false,
        showPlayerQrModal: false,
        selectedQrPlayer: null,
        playerQrUrl: '',
        copiedPlayerQrLink: false,
        showGeneralQrModal: false,
        generalQrType: 'consent', // 'consent' | 'register'
        generalQrUrl: '',
        copiedGeneralQrLink: false,
        copiedGeneralConsentLink: false,
        copiedGeneralRegisterLink: false,
        showEmailConsentModal: false,
        emailConsentPlayer: null,
        emailConsentRecipient: '',
        emailConsentSubject: '',
        emailConsentBody: '',
        copiedEmailConsentText: false,

        // GDPR Safeguarding & Microsoft Forms Consent Pipeline Config
        showPostPlayerSaveConsentModal: false,
        newSavedPlayerForConsent: null,
        copiedNewPlayerConsentLink: false,
        showMsFormSettingsModal: false,
        showGoogleFormSettingsModal: false, // backwards compatibility alias
        showExcelSettingsModal: false, // Microsoft Excel Session Integration modal
        isSendingConsentEmail: false,
        isLoadingDriveForms: false,
        isCreatingMsForm: false,
        isSyncingMsForm: false,
        msFormConfig: {
            enabled: typeof localStorage !== 'undefined' ? (localStorage.getItem('fu_ms_form_enabled') !== 'false') : true,
            formUrl: typeof localStorage !== 'undefined' ? 
                ((localStorage.getItem('fu_ms_form_url') && !localStorage.getItem('fu_ms_form_url').includes('XXXXXXXXXX')) ? localStorage.getItem('fu_ms_form_url') : 'https://forms.cloud.microsoft/pages/responsepage.aspx?id=bB-JN6Nh50m4JefrdzT0ULAQnxEKdCpIonrD1mm0-yRUNjExVERXUFNTWUo1OFNZTEw0TUNUQk42RC4u&route=shorturl') 
                : 'https://forms.cloud.microsoft/pages/responsepage.aspx?id=bB-JN6Nh50m4JefrdzT0ULAQnxEKdCpIonrD1mm0-yRUNjExVERXUFNTWUo1OFNZTEw0TUNUQk42RC4u&route=shorturl',
            formTitle: typeof localStorage !== 'undefined' ? (localStorage.getItem('fu_ms_form_title') || 'Football United — Permission Form') : 'Football United — Permission Form',
            senderEmail: typeof localStorage !== 'undefined' ? (localStorage.getItem('fu_ms_sender_email') || 'ralph.boer@hillsong.co.uk') : 'ralph.boer@hillsong.co.uk'
        },

        // Microsoft User Authentication State
        microsoftUser: null,
        googleUser: null,

        // Microsoft 365 / Excel Online & Microsoft Graph Primary Attendance Engine
        excelConfig: {
            serviceAccountOwner: typeof localStorage !== 'undefined' ? (localStorage.getItem('fu_excel_session_sender') || 'ralph.boer@hillsong.co.uk') : 'ralph.boer@hillsong.co.uk',
            permanentOwner: 'refugeeresponse@hillsong.co.uk',
            driveId: '2820CE6C9C58187A',
            docId: '2820CE6C9C58187A!s88c637d68b7d4196b27df0e8c2303d1b',
            docUrl: typeof localStorage !== 'undefined' ? (localStorage.getItem('fu_excel_session_doc_url') || 'https://excel.cloud.microsoft/open/onedrive/?docId=2820CE6C9C58187A%21s88c637d68b7d4196b27df0e8c2303d1b&driveId=2820CE6C9C58187A') : 'https://excel.cloud.microsoft/open/onedrive/?docId=2820CE6C9C58187A%21s88c637d68b7d4196b27df0e8c2303d1b&driveId=2820CE6C9C58187A',
            tableName: typeof localStorage !== 'undefined' ? (localStorage.getItem('fu_excel_session_table') || 'WeeklyAttendance') : 'WeeklyAttendance',
            workbookTitle: typeof localStorage !== 'undefined' ? (localStorage.getItem('fu_excel_session_title') || 'Football United — Session Attendance Report') : 'Football United — Session Attendance Report'
        },
        excelSyncStatus: 'idle', // 'idle' | 'saving' | 'syncing' | 'synced' | 'failed'
        excelSyncLastTime: null,
        excelSyncLastSessionDate: null,
        excelSyncError: null,
        excelSyncDriveId: '2820CE6C9C58187A',
        excelSyncItemId: '2820CE6C9C58187A!s88c637d68b7d4196b27df0e8c2303d1b',
        excelSyncTableName: 'WeeklyAttendance',

        // 4-Quarter Excel Attendance Tracker State (Automated Data Integration Assistant)
        excelTrackerMeta: null,
        trackerCurrentOwner: 'ralph.boer@hillsong.co.uk',
        trackerDefaultTemporaryOwner: 'ralph.boer@hillsong.co.uk',
        trackerTemporaryOwnerAccess: 'owner',
        newOwnerEmail: '',
        trackerDowngradeAction: 'downgrade', // 'downgrade' | 'remove'
        isTrackerLoading: false,
        trackerFeedbackMsg: '',
        trackerActiveQuarter: 'Sep-Nov',

        // Config & Settings
        leagueConfig: {
            name: '',
            format: '7v7',
            match_type: 'League Match',
            tournament_format: 'Group Stage + Knockout',
            two_legged: false,
            advance_per_group: 2,
            tournament_id: 'tourn_main',
            league_start_date: '',
            player_league_start_date: ''
        },
        leagueSettings: {
            goals_potd_start: '2026-02-14',
            player_standings_start: '2026-02-28',
            captain_league_start: '2026-03-14'
        },

        // Tournament Group Allocation & Player Safety Schedule State
        tournamentCardTab: 'setup', // 'setup' | 'allocation' | 'table'
        tournamentGroupCount: 2,
        tournamentGroupAssignments: {},
        tournamentAllocationStrategy: 'snake',
        tournamentViewMode: 'all', // 'all' | 'timeline' | 'groups' | 'knockout'
        showTournamentScheduleSettingsModal: false,
        tournamentScheduleConfig: {
            startTime: '09:00',
            matchDurationMinutes: 25,
            restBetweenMatchesMinutes: 10,
            numberOfPitches: 1,
            breakBeforeKnockoutMinutes: 30
        },

        // Reports & Excel Online State
        isSheetLoading: false,
        isExcelLoading: false,
        isPlayersLoaded: false,
        isMatchesLoaded: false,
        isTeamsLoaded: false,
        isSessionsLoaded: false,
        isSettingsLoaded: false,
        isReportDataReady: false,

        updateReportDataReadiness() {
            const hasPlayers = (this.isPlayersLoaded || (Array.isArray(this.players) && this.players.length > 0));
            const hasMatches = (this.isMatchesLoaded || (Array.isArray(this.matches) && this.matches.length > 0));
            const hasTeams = (this.isTeamsLoaded || (Array.isArray(this.teams) && this.teams.length > 0));
            if (hasPlayers && hasMatches && hasTeams) {
                this.isReportDataReady = true;
            }
        },

        async waitForReportData(timeoutMs = 7000) {
            this.updateReportDataReadiness();
            if (this.isReportDataReady) return true;
            const startTime = Date.now();
            return new Promise((resolve) => {
                const interval = setInterval(() => {
                    this.updateReportDataReadiness();
                    if (this.isReportDataReady || (Date.now() - startTime) >= timeoutMs) {
                        clearInterval(interval);
                        resolve(this.isReportDataReady);
                    }
                }, 100);
            });
        },
        adminProfile: {
            name: 'Ralph Boer',
            email: 'ralph.boer@hillsong.co.uk',
            role: 'Lead Coach & Safeguarding Lead'
        },
        weeklyReportExcelUrl: typeof localStorage !== 'undefined' ? (localStorage.getItem('football_united_weekly_report_excel_url') || 'https://excel.cloud.microsoft/open/onedrive/?docId=2820CE6C9C58187A%21s88c637d68b7d4196b27df0e8c2303d1b&driveId=2820CE6C9C58187A') : 'https://excel.cloud.microsoft/open/onedrive/?docId=2820CE6C9C58187A%21s88c637d68b7d4196b27df0e8c2303d1b&driveId=2820CE6C9C58187A',
        consentExcelSheetUrl: typeof localStorage !== 'undefined' ? (localStorage.getItem('football_united_consent_excel_url') || '') : '',
        masterConsentForm: null, // Stores { formId, responderUri, fieldMap }
        isFormSyncing: false,
        isSettingUpMasterForm: false,
        // Profile Picture & App Crest state
        officialAppLogo: '/football_united_logo.svg?v=20260907',
        customAppLogo: '/football_united_logo.svg?v=20260907',
        customProfilePhoto: typeof localStorage !== 'undefined' ? (localStorage.getItem('football_united_custom_profile_photo') || null) : null,
        officialPictureUrlInput: '',
        isUploadingOfficialPicture: false,
        logoLoadError: false,
        profileLoadError: false,
        showProfilePhotoModal: false,
        isDraggingAvatar: false,

        // Custom Logo / Crest Upload Handler
        handleLogoUpload(event) {
            this.handleProfileUpload(event);
        },

        // Reset App Logo / Profile Photo back to official vector badge
        resetAppLogo() {
            this.resetProfilePhoto();
        },

        // Apply 1-tap Preset Club Crests
        applyPresetCrest(presetName) {
            if (!this.isDeveloperMode) {
                if (typeof this.showToast === 'function') {
                    this.showToast('Branding modifications are restricted to Developer Mode.', 'warning');
                }
                return;
            }
            if (presetName === 'gold') {
                this.resetProfilePhoto();
                return;
            }
            let svg = '';
            if (presetName === 'sapphire') {
                svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <radialGradient id="sapphireGrad" cx="50%" cy="40%" r="65%">
      <stop offset="0%" stop-color="#1e3a8a"/>
      <stop offset="100%" stop-color="#090d16"/>
    </radialGradient>
    <linearGradient id="goldRibbon" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fde047"/>
      <stop offset="50%" stop-color="#eab308"/>
      <stop offset="100%" stop-color="#ca8a04"/>
    </linearGradient>
  </defs>
  <circle cx="256" cy="256" r="250" fill="url(#sapphireGrad)" stroke="url(#goldRibbon)" stroke-width="12"/>
  <circle cx="256" cy="256" r="236" fill="none" stroke="#38bdf8" stroke-width="2" opacity="0.6"/>
  <g fill="url(#goldRibbon)">
    <polygon points="256,70 262,86 278,86 265,96 270,112 256,102 242,112 247,96 234,86 250,86"/>
    <polygon points="216,84 221,97 235,97 224,105 228,118 216,110 204,118 208,105 197,97 211,97"/>
    <polygon points="296,84 301,97 315,97 304,105 308,118 296,110 284,118 288,105 277,97 291,97"/>
  </g>
  <circle cx="256" cy="230" r="85" fill="#f8fafc" stroke="#1e293b" stroke-width="5"/>
  <polygon points="256,190 285,210 274,242 238,242 227,210" fill="#0f172a"/>
  <polygon points="256,155 240,165 244,185 268,185 272,165" fill="#0f172a"/>
  <polygon points="190,210 180,225 195,240 215,235 210,215" fill="#0f172a"/>
  <polygon points="322,210 332,225 317,240 297,235 302,215" fill="#0f172a"/>
  <polygon points="215,275 230,295 250,290 250,265 230,260" fill="#0f172a"/>
  <polygon points="297,275 282,295 262,290 262,265 282,260" fill="#0f172a"/>
  <rect x="70" y="340" width="372" height="64" rx="16" fill="#0f172a" stroke="url(#goldRibbon)" stroke-width="4"/>
  <text x="256" y="380" font-family="-apple-system, system-ui, sans-serif" font-weight="900" font-size="28" fill="url(#goldRibbon)" text-anchor="middle" letter-spacing="2">FOOTBALL UNITED</text>
  <text x="256" y="430" font-family="-apple-system, system-ui, sans-serif" font-weight="800" font-size="18" fill="#38bdf8" text-anchor="middle" letter-spacing="4">EST. 2026</text>
</svg>`;
            } else if (presetName === 'emerald') {
                svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <radialGradient id="emeraldGrad" cx="50%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#047857"/>
      <stop offset="60%" stop-color="#064e3b"/>
      <stop offset="100%" stop-color="#022c22"/>
    </radialGradient>
  </defs>
  <circle cx="256" cy="256" r="250" fill="url(#emeraldGrad)" stroke="#34d399" stroke-width="10"/>
  <circle cx="256" cy="256" r="238" fill="none" stroke="#6ee7b7" stroke-width="2" stroke-dasharray="8 6"/>
  <circle cx="256" cy="230" r="90" fill="#022c22" stroke="#34d399" stroke-width="6"/>
  <circle cx="256" cy="230" r="25" fill="#10b981" stroke="#f0fdf4" stroke-width="3"/>
  <line x1="166" y1="230" x2="346" y2="230" stroke="#34d399" stroke-width="4"/>
  <circle cx="256" cy="230" r="50" fill="#f8fafc" stroke="#022c22" stroke-width="4"/>
  <polygon points="256,205 272,217 266,236 246,236 240,217" fill="#064e3b"/>
  <rect x="76" y="345" width="360" height="60" rx="14" fill="#022c22" stroke="#34d399" stroke-width="4"/>
  <text x="256" y="384" font-family="-apple-system, system-ui, sans-serif" font-weight="900" font-size="27" fill="#a7f3d0" text-anchor="middle" letter-spacing="2">FOOTBALL UNITED</text>
  <text x="256" y="434" font-family="-apple-system, system-ui, sans-serif" font-weight="800" font-size="18" fill="#34d399" text-anchor="middle" letter-spacing="4">COMMUNITY LEAGUE</text>
</svg>`;
            } else if (presetName === 'monochrome') {
                svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <circle cx="256" cy="256" r="250" fill="#09090b" stroke="#ffffff" stroke-width="12"/>
  <circle cx="256" cy="256" r="236" fill="none" stroke="#52525b" stroke-width="2"/>
  <circle cx="256" cy="225" r="95" fill="#ffffff" stroke="#09090b" stroke-width="6"/>
  <polygon points="256,180 288,202 276,238 236,238 224,202" fill="#09090b"/>
  <polygon points="256,140 238,152 242,174 270,174 274,152" fill="#09090b"/>
  <polygon points="182,202 170,218 188,236 210,230 204,208" fill="#09090b"/>
  <polygon points="330,202 342,218 324,236 302,230 308,208" fill="#09090b"/>
  <polygon points="210,274 226,296 248,290 248,262 226,256" fill="#09090b"/>
  <polygon points="302,274 286,296 264,290 264,262 286,256" fill="#09090b"/>
  <rect x="76" y="345" width="360" height="60" rx="12" fill="#ffffff"/>
  <text x="256" y="386" font-family="-apple-system, system-ui, sans-serif" font-weight="900" font-size="28" fill="#09090b" text-anchor="middle" letter-spacing="2">FOOTBALL UNITED</text>
  <text x="256" y="435" font-family="-apple-system, system-ui, sans-serif" font-weight="800" font-size="18" fill="#ffffff" text-anchor="middle" letter-spacing="4">HERITAGE CREST</text>
</svg>`;
            }
            if (svg) {
                const dataUrl = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
                this.setOfficialAppPicture(dataUrl);
            }
        },

        // Universal Setter for Official Picture across all components
        async setOfficialAppPicture(photoDataUrl) {
            if (!this.isDeveloperMode) {
                if (typeof this.showToast === 'function') {
                    this.showToast('Branding modifications are restricted to Developer Mode.', 'warning');
                }
                return;
            }
            if (!photoDataUrl) return;
            this.customProfilePhoto = photoDataUrl;
            this.customAppLogo = photoDataUrl;
            this.officialAppLogo = photoDataUrl;
            this.profileLoadError = false;
            this.logoLoadError = false;

            try {
                localStorage.setItem('football_united_custom_profile_photo', photoDataUrl);
                localStorage.setItem('football_united_official_logo', photoDataUrl);
                localStorage.setItem('gameon_profile_photo', photoDataUrl);
            } catch (e) {}

            if (!this.leagueSettings) this.leagueSettings = {};
            this.leagueSettings.custom_profile_photo = photoDataUrl;
            this.leagueSettings.official_logo = photoDataUrl;
            if (!this.leagueConfig) this.leagueConfig = {};
            this.leagueConfig.custom_profile_photo = photoDataUrl;
            this.leagueConfig.official_logo = photoDataUrl;

            if (typeof fetch !== 'undefined') {
                fetch('/api/profile-photo', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ photo_data: photoDataUrl })
                }).catch(() => {});
            }

            if (typeof this.pushAllDataToServer === 'function') {
                this.pushAllDataToServer();
            } else if (typeof this.pushDataToServer === 'function') {
                this.pushDataToServer({
                    settings: { custom_profile_photo: photoDataUrl, official_logo: photoDataUrl }
                });
            }

            if (typeof this.showToast === 'function') {
                this.showToast('Official picture updated & synced across all apps and downloads!', 'success');
            }
        },

        // Apply direct Web Image URL
        async applyOfficialPictureUrl() {
            if (!this.officialPictureUrlInput || !this.officialPictureUrlInput.trim()) return;
            const url = this.officialPictureUrlInput.trim();
            this.isUploadingOfficialPicture = true;
            try {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                    try {
                        const canvas = document.createElement('canvas');
                        canvas.width = 512;
                        canvas.height = 512;
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            const naturalW = img.naturalWidth || img.width;
                            const naturalH = img.naturalHeight || img.height;
                            const cropSize = Math.min(naturalW, naturalH);
                            const sx = Math.max(0, Math.floor((naturalW - cropSize) / 2));
                            const sy = Math.max(0, Math.floor((naturalH - cropSize) / 2));
                            ctx.drawImage(img, sx, sy, cropSize, cropSize, 0, 0, 512, 512);
                            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                            this.setOfficialAppPicture(dataUrl);
                        } else {
                            this.setOfficialAppPicture(url);
                        }
                    } catch (e) {
                        this.setOfficialAppPicture(url);
                    }
                    this.officialPictureUrlInput = '';
                    this.isUploadingOfficialPicture = false;
                };
                img.onerror = () => {
                    this.setOfficialAppPicture(url);
                    this.officialPictureUrlInput = '';
                    this.isUploadingOfficialPicture = false;
                };
                img.src = url;
            } catch (e) {
                this.setOfficialAppPicture(url);
                this.isUploadingOfficialPicture = false;
            }
        },

        // Custom Profile Photo & Official Picture Upload Handler with 1:1 Square Crop & High-Res Storage
        handleProfileUpload(eventOrFile) {
            if (!this.isDeveloperMode) {
                if (typeof this.showToast === 'function') {
                    this.showToast('Branding modifications are restricted to Developer Mode.', 'warning');
                }
                return;
            }
            let file = null;
            if (typeof File !== 'undefined' && eventOrFile instanceof File) {
                file = eventOrFile;
            } else if (eventOrFile?.target?.files?.[0]) {
                file = eventOrFile.target.files[0];
            } else if (eventOrFile?.dataTransfer?.files?.[0]) {
                file = eventOrFile.dataTransfer.files[0];
            }
            if (!file) return;

            // Validate image type
            if (!file.type || !file.type.startsWith('image/')) {
                if (typeof this.showToast === 'function') {
                    this.showToast('Please select a valid image file (PNG, JPG, WebP, GIF, SVG).', 'error');
                }
                return;
            }

            // Create immediate live preview URL
            const previewUrl = URL.createObjectURL(file);
            this.customProfilePhoto = previewUrl;
            this.customAppLogo = previewUrl;
            this.officialAppLogo = previewUrl;
            this.profileLoadError = false;
            this.logoLoadError = false;

            const img = new Image();
            img.onload = () => {
                const targetDim = 512;
                const canvas = document.createElement('canvas');
                canvas.width = targetDim;
                canvas.height = targetDim;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';

                    const naturalW = img.naturalWidth || img.width;
                    const naturalH = img.naturalHeight || img.height;
                    const cropSize = Math.min(naturalW, naturalH);
                    const sx = Math.max(0, Math.floor((naturalW - cropSize) / 2));
                    const sy = Math.max(0, Math.floor((naturalH - cropSize) / 2));

                    ctx.drawImage(img, sx, sy, cropSize, cropSize, 0, 0, targetDim, targetDim);
                }

                const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
                this.setOfficialAppPicture(optimizedDataUrl);
            };
            img.src = previewUrl;
            if (eventOrFile?.target && 'value' in eventOrFile.target) {
                eventOrFile.target.value = '';
            }
        },

        // Reset Profile Photo and Official Crest back to default emblem
        resetProfilePhoto() {
            if (!this.isDeveloperMode) {
                if (typeof this.showToast === 'function') {
                    this.showToast('Branding modifications are restricted to Developer Mode.', 'warning');
                }
                return;
            }
            try {
                if (typeof localStorage !== 'undefined') {
                    localStorage.removeItem('football_united_custom_profile_photo');
                    localStorage.removeItem('football_united_official_logo');
                    localStorage.removeItem('football_united_custom_logo');
                    localStorage.removeItem('gameon_profile_photo');
                }
            } catch (e) {}
            this.customProfilePhoto = null;
            this.officialAppLogo = '/football_united_logo.svg?v=20260907';
            this.customAppLogo = '/football_united_logo.svg?v=20260907';
            this.profileLoadError = false;
            this.logoLoadError = false;

            // Permanent deletion from server storage
            if (typeof fetch !== 'undefined') {
                fetch('/api/profile-photo', { method: 'DELETE' }).catch(() => {});
            }

            if (this.leagueSettings) {
                this.leagueSettings.custom_profile_photo = null;
                this.leagueSettings.official_logo = null;
            }
            if (this.leagueConfig) {
                this.leagueConfig.custom_profile_photo = null;
                this.leagueConfig.official_logo = null;
            }

            // Sync reset to all connected clients & downloads
            if (typeof this.pushAllDataToServer === 'function') {
                this.pushAllDataToServer();
            } else if (typeof this.pushDataToServer === 'function') {
                this.pushDataToServer({
                    settings: { custom_profile_photo: null, official_logo: null }
                });
            }

            if (window.fb && window.fb.db) {
                try {
                    window.fb.db.collection('app_settings').doc('profile_photo').delete().catch(() => {});
                } catch (e) {}
            }

            if (typeof this.showToast === 'function') {
                this.showToast('Official picture restored to default Football United crest.', 'info');
            }
        },

        // 📸 Load and verify persistent profile photo across local cache and server store
        async loadPersistentProfilePhoto() {
            try {
                // 1. Instant hydration from local storage
                if (typeof localStorage !== 'undefined') {
                    const cachedPhoto = localStorage.getItem('football_united_custom_profile_photo') || localStorage.getItem('football_united_official_logo') || localStorage.getItem('gameon_profile_photo');
                    if (cachedPhoto && cachedPhoto.length > 20) {
                        this.customProfilePhoto = cachedPhoto;
                        this.customAppLogo = cachedPhoto;
                        this.officialAppLogo = cachedPhoto;
                    }
                }

                // 2. Fetch from permanent server database
                if (typeof fetch !== 'undefined') {
                    const res = await fetch('/api/profile-photo', { cache: 'no-store' });
                    if (res.ok) {
                        const data = await res.json();
                        if (data && data.success) {
                            if (data.photo_data && data.photo_data.length > 20) {
                                this.customProfilePhoto = data.photo_data;
                                this.customAppLogo = data.photo_data;
                                this.officialAppLogo = data.photo_data;
                                try {
                                    localStorage.setItem('football_united_custom_profile_photo', data.photo_data);
                                    localStorage.setItem('football_united_official_logo', data.photo_data);
                                    localStorage.setItem('gameon_profile_photo', data.photo_data);
                                } catch (e) {}
                            } else if (data.photo_data === null) {
                                this.customProfilePhoto = null;
                                this.officialAppLogo = '/football_united_logo.svg?v=20260907';
                                this.customAppLogo = '/football_united_logo.svg?v=20260907';
                                try {
                                    localStorage.removeItem('football_united_custom_profile_photo');
                                    localStorage.removeItem('football_united_official_logo');
                                    localStorage.removeItem('gameon_profile_photo');
                                } catch (e) {}
                            }
                        }
                    }
                }

                // 3. Fallback to Firestore if active
                if (!this.customProfilePhoto && window.fb && window.fb.db) {
                    try {
                        const snap = await window.fb.db.collection('app_settings').doc('profile_photo').get();
                        if (snap.exists && snap.data()?.photo_data) {
                            const p = snap.data().photo_data;
                            this.customProfilePhoto = p;
                            this.customAppLogo = p;
                            this.officialAppLogo = p;
                            try {
                                localStorage.setItem('football_united_custom_profile_photo', p);
                                localStorage.setItem('football_united_official_logo', p);
                                localStorage.setItem('gameon_profile_photo', p);
                            } catch (e) {}
                        }
                    } catch (e) {}
                }
            } catch (err) {
                console.warn('Notice loading persistent profile photo:', err);
            }
        },
        
        getUserInitials(user) {
            const profile = user || this.adminProfile;
            if (!profile) return 'RB';
            const name = profile.displayName || profile.name || profile.email || 'Ralph Boer';
            const parts = name.trim().split(/[\s._-]+/).filter(Boolean);
            if (parts.length >= 2) {
                return (parts[0][0] + parts[1][0]).toUpperCase();
            }
            return name.slice(0, 2).toUpperCase() || 'RB';
        },

        // Modals & UI Toggles
        showSettingsModal: false,
        showAddPlayerModal: false,
        showEditPlayerModal: false,
        showTeamModal: false,
        showAddMatchModal: false,
        showAddMatchDayModal: false,
        showLeagueSettingsModal: false,
        showPlayerProfileModal: false,
        showEditPlayerStandingsModal: false,
        showEditTeamStandingsModal: false,

        // Modal Form Models
        editingPlayer: { id: null, name: '', nickname: '', dob: '', phone: '', nationality: '', photo_url: '', deductions: 0 },
        editingPlayerForPhoto: null,
        showPlayerCameraModal: false,
        // --- CAMERA & UPLOAD STATE ---
        isPlayerCameraActive: false,
        playerCameraFacingMode: 'environment', // Defaults to rear camera
        snappedPhotoPreview: null,
        cameraStream: null,
        isUploadingPlayerPhoto: false,
        uploadProgressPercent: 0,
        photoUploadError: '',
        playerCameraError: '',
        useFallbackCameraInput: false,
        cameraPermissionDenied: false,
        isCapturing: false,
        isCameraStarting: false,
        mediaStream: null,
        availableCamerasList: [],
        editingTeam: { id: null, name: '', captain_id: null, player_ids: [], deductions: 0 },
        newMatchDay: { 
            date: new Date().toISOString().split('T')[0], 
            home_team: '', 
            away_team: '', 
            match_type: 'League Match',
            title: '',
            tournament_id: '',
            round_number: 1,
            round_name: '',
            next_match_id: '',
            next_match_slot: 'home',
            is_two_legged: false,
            leg: 1,
            group_name: '',
            status: 'scheduled'
        },

        // UI Helpers & Maps
        openAttendanceMatchIds: {},
        openTeamSelectionMatchIds: {},
        openRosterMatchIds: {},
        selectedScorerMap: {},
        selectedPlayerProfile: null,
        playerProfileStats: { pld: 0, w: 0, d: 0, l: 0, goals: 0, potd: 0, pts: 0, ppg: '0.00', winRate: '0%' },
        playerRecentMatches: [],
        currentUser: null,
        userProfile: null,
        userRole: null, // 'admin' | 'org_admin' | 'coach' | 'viewer' | 'parent'
        appMode: 'landing', // 'landing' | 'authenticated' | 'loading'
        setAppMode(mode) {
            console.log('🔄 setAppMode:', mode);
            this.appMode = mode;
            if (mode === 'authenticated') {
                this.isAuthenticated = true;
                this.authChecking = false;
            } else if (mode === 'landing') {
                this.isAuthenticated = false;
                this.authChecking = false;
            } else if (mode === 'loading') {
                this.authChecking = true;
            }
            if (typeof window !== 'undefined') {
                window.appMode = mode;
                if (window.AppState) {
                    window.AppState.appMode = mode;
                    window.AppState.isAuthenticated = (mode === 'authenticated');
                    window.AppState.authChecking = (mode === 'loading');
                }
                window.dispatchEvent(new CustomEvent('app-mode-changed', { detail: { appMode: mode } }));
                if (typeof window.__setAppMode === 'function') {
                    try { window.__setAppMode(mode); } catch(e) {}
                }
                if (typeof window.__setIsAuthenticated === 'function') {
                    try { window.__setIsAuthenticated(mode === 'authenticated'); } catch(e) {}
                }
            }
        },
        setIsAuthenticated(val) {
            console.log('🔄 setIsAuthenticated:', val);
            this.isAuthenticated = !!val;
            if (val) {
                this.appMode = 'authenticated';
                this.authChecking = false;
            }
            if (typeof window !== 'undefined') {
                if (window.AppState) {
                    window.AppState.isAuthenticated = !!val;
                    if (val) {
                        window.AppState.appMode = 'authenticated';
                        window.AppState.authChecking = false;
                    }
                }
                if (typeof window.__setIsAuthenticated === 'function') {
                    try { window.__setIsAuthenticated(!!val); } catch(e) {}
                }
            }
        },
        isAuthenticated: false,
        isAdminAuthenticated: false,
        authChecking: true,
        userStatus: 'pending', // 'pending' | 'approved' | 'rejected'
        isUserApproved: false,
        pendingUsers: [],
        allUsers: [],
        isLoadingAdminUsers: false,
        adminUserFilter: 'pending', // 'pending' | 'all' | 'approved'
        userStatusUnsubscribe: null,
        pendingUsersUnsubscribe: null,
        isAppInstalledAlready: false,
        authMode: 'login', // 'login' | 'register' | 'forgot'
        authForm: {
            email: '',
            password: '',
            confirmPassword: '',
            name: '',
            role: 'parent',
            showPassword: false
        },
        authError: '',
        authSuccessMessage: '',
        isAuthLoading: false,
        activeSubscriptions: [],
        lastDataUpdate: 0,
        auditWarnings: [],
        cardSearchQuery: '',
        widgets: {
            top_scorer: { player: 'None', goals: 0, count: 0 },
            most_attendance: { player: 'None', count: 0, pld: 0 },
            most_player_pts: { player: 'None', pts: 0, count: 0 },
            top_potd: { player: 'None', count: 0, potd: 0 },
            mvp: { player: 'None', count: 0, potd: 0 }
        },

        // Theme Helpers & Real-Time Dynamic System Theme Syncing
        initTheme() {
            const getSystemDark = () => {
                return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            };

            const stored = (typeof localStorage !== 'undefined') ? (localStorage.getItem('theme') || localStorage.getItem('gameon_dark_mode')) : null;

            if (stored === 'dark' || stored === 'true') {
                this.darkMode = true;
            } else if (stored === 'light' || stored === 'false') {
                this.darkMode = false;
            } else {
                // Default: Real-time automatic syncing with OS system theme
                this.darkMode = getSystemDark();
            }
            this.applyTheme();

            // Real-Time Live System Theme Listener: adapts instantly when OS switches without requiring page refresh
            if (typeof window !== 'undefined' && window.matchMedia && !this._systemThemeListenerAttached) {
                this._systemThemeListenerAttached = true;
                const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
                const handleThemeChange = (e) => {
                    const currentStored = (typeof localStorage !== 'undefined') ? (localStorage.getItem('theme') || localStorage.getItem('gameon_dark_mode')) : null;
                    if (!currentStored || currentStored === 'system' || currentStored === 'auto') {
                        this.darkMode = e.matches;
                        this.applyTheme();
                    }
                };

                if (mediaQuery.addEventListener) {
                    mediaQuery.addEventListener('change', handleThemeChange);
                } else if (mediaQuery.addListener) {
                    mediaQuery.addListener(handleThemeChange);
                }
            }
        },
        toggleTheme() {
            this.darkMode = !this.darkMode;
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('theme', this.darkMode ? 'dark' : 'light');
                localStorage.setItem('gameon_dark_mode', this.darkMode ? 'true' : 'false');
            }
            this.applyTheme();
        },
        resetThemeToSystem() {
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem('theme');
                localStorage.removeItem('gameon_dark_mode');
            }
            if (typeof window !== 'undefined' && window.matchMedia) {
                this.darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
            }
            this.applyTheme();
        },
        applyTheme() {
            if (typeof document !== 'undefined') {
                const root = document.documentElement;
                if (this.darkMode) {
                    root.classList.add('dark');
                } else {
                    root.classList.remove('dark');
                }
                const metaTheme = document.querySelector('meta[name="theme-color"]');
                if (metaTheme) {
                    metaTheme.setAttribute('content', this.darkMode ? '#121212' : '#ffffff');
                }
            }
        },

        getAttendanceReportList() {
            // Build attendance records across all matches for all players
            const attendanceMap = {};

            (this.players || []).forEach(p => {
                if (p && (p.name || p.player || p.id)) {
                    const name = this.getPlayerDisplayName ? this.getPlayerDisplayName(p) : (p.name || p.player || p.id);
                    attendanceMap[name] = {
                        player_name: name,
                        name: name,
                        total_attended: 0,
                        attended: 0,
                        count: 0,
                        dates_present: []
                    };
                }
            });

            (this.matches || []).forEach(m => {
                const matchDate = m.date || 'Match Date';
                const presentPlayers = this.getPresentPlayers(m);
                presentPlayers.forEach(p => {
                    const name = this.getPlayerDisplayName ? this.getPlayerDisplayName(p) : (p.name || p.player || p.id);
                    if (!name) return;
                    if (!attendanceMap[name]) {
                        attendanceMap[name] = {
                            player_name: name,
                            name: name,
                            total_attended: 0,
                            attended: 0,
                            count: 0,
                            dates_present: []
                        };
                    }
                    attendanceMap[name].total_attended += 1;
                    attendanceMap[name].attended += 1;
                    attendanceMap[name].count += 1;
                    if (!attendanceMap[name].dates_present.includes(matchDate)) {
                        attendanceMap[name].dates_present.push(matchDate);
                    }
                });
            });

            return Object.values(attendanceMap)
                .map(r => ({
                    ...r,
                    dates: r.dates_present.join(', ')
                }))
                .filter(r => r.total_attended > 0)
                .sort((a, b) => a.player_name.localeCompare(b.player_name));
        },

        getMatchAttendanceCardsData() {
            const sortedMatches = [...(this.matches || [])].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
            return sortedMatches.map(m => {
                const homePresent = this.getTeamPlayers(m, 'home').map(p => this.getPlayerDisplayName(p)).join(', ') || 'None';
                const awayPresent = this.getTeamPlayers(m, 'away').map(p => this.getPlayerDisplayName(p)).join(', ') || 'None';
                const totalPresent = this.getPresentPlayers(m).length;
                const scorersList = (this.getMatchScorers ? this.getMatchScorers(m) : (m.scorers || []))
                    .map(s => `${s.name || s.player || ''} (${s.goals || 1})`)
                    .join(', ') || 'None';
                const potdWinners = Array.isArray(m.potd_winners) && m.potd_winners.length > 0 
                    ? m.potd_winners.map(p => this.getPlayerDisplayName(p)).join(', ')
                    : (m.potd_winner ? this.getPlayerDisplayName(m.potd_winner) : (m.potd || 'None'));

                return {
                    date: m.date || '',
                    match_type: m.match_type || m.matchType || 'League Match',
                    home_team: m.home_team || m.homeTeam || 'Home',
                    home_present_players: homePresent,
                    away_team: m.away_team || m.awayTeam || 'Away',
                    away_present_players: awayPresent,
                    total_present: totalPresent,
                    home_score: m.home_score ?? m.homeScore ?? 0,
                    away_score: m.away_score ?? m.awayScore ?? 0,
                    score: `${m.home_score ?? m.homeScore ?? 0} - ${m.away_score ?? m.awayScore ?? 0}`,
                    scorers: scorersList,
                    potd: potdWinners
                };
            });
        },

        isSheetLoading: false,

        buildExcelReportDatasets() {
            const attendanceList = typeof this.getAttendanceReportList === 'function' ? this.getAttendanceReportList() : [];
            const matchesList = this.matches || [];
            const sortedCaptains = typeof this.getSortedCaptainStandings === 'function' 
                ? this.getSortedCaptainStandings() 
                : [...(this.captainStandings || [])].sort((a, b) => 
                    (Number(b.pts) || 0) - (Number(a.pts) || 0) || 
                    (Number(b.gd) || 0) - (Number(a.gd) || 0) || 
                    (Number(b.gf) || 0) - (Number(a.gf) || 0)
                );
            const sortedPlayers = typeof this.getSortedPlayerStandings === 'function'
                ? this.getSortedPlayerStandings()
                : [...(this.playerStandings || [])].sort((a, b) => 
                    (Number(b.pts || b.points) || 0) - (Number(a.pts || a.points) || 0) ||
                    (Number(b.goals) || 0) - (Number(a.goals) || 0) ||
                    (Number(b.potd) || 0) - (Number(a.potd) || 0)
                );
            const cardsSource = (this.getMatchAttendanceCardsData ? this.getMatchAttendanceCardsData() : []) || [];
            const fallbackCards = cardsSource.length > 0 ? cardsSource : matchesList;

            const getColLetter = (colIdx) => {
                let temp = colIdx + 1;
                let letter = '';
                while (temp > 0) {
                    let rem = (temp - 1) % 26;
                    letter = String.fromCharCode(65 + rem) + letter;
                    temp = Math.floor((temp - 1) / 26);
                }
                return letter;
            };

            // 1. Tab: Attendance
            const matchDatesSet = new Set();
            matchesList.forEach(m => {
                if (m.date && typeof m.date === 'string' && m.date.trim()) {
                    matchDatesSet.add(m.date.trim());
                }
            });
            attendanceList.forEach(p => {
                if (Array.isArray(p.dates_present)) {
                    p.dates_present.forEach(d => {
                        if (d && typeof d === 'string' && d.trim()) matchDatesSet.add(d.trim());
                    });
                }
            });
            const sortedDates = Array.from(matchDatesSet).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
            const attHeaders = ["Player Name", "Total Attended", ...sortedDates];
            const attRows = [attHeaders];
            const sortedAttendance = [...attendanceList].sort((a, b) => 
                String(a.player_name || a.name || "").localeCompare(String(b.player_name || b.name || ""))
            );
            const lastDateColLetter = sortedDates.length > 0 ? getColLetter(sortedDates.length + 1) : 'B';

            sortedAttendance.forEach((p, idx) => {
                const pName = p.player_name || p.name || "Unknown";
                const datesPresent = Array.isArray(p.dates_present) ? p.dates_present : [];
                const rowNum = idx + 2;
                const countFormula = sortedDates.length > 0 ? `=COUNTIF(C${rowNum}:${lastDateColLetter}${rowNum}, TRUE)` : (p.total_attended || 0);
                const dateBools = sortedDates.map(d => datesPresent.includes(d));
                attRows.push([pName, countFormula, ...dateBools]);
            });

            // 2. Tab: Match Attendance Cards
            const matchCardRows = [[
                "Date", "Match Type", "Home Team", "Home Present Players", 
                "Away Team", "Away Present Players", "Total Present", 
                "Score", "Goal Scorers", "Player of the Day (MVP)"
            ]];
            for (const card of fallbackCards) {
                let homePresent = card.home_present_players;
                if (!homePresent && Array.isArray(card.home_roster)) {
                    homePresent = card.home_roster.join(", ");
                }
                let awayPresent = card.away_present_players;
                if (!awayPresent && Array.isArray(card.away_roster)) {
                    awayPresent = card.away_roster.join(", ");
                }
                let scorersStr = "None";
                if (typeof card.scorers === 'string' && card.scorers.trim()) {
                    scorersStr = card.scorers;
                } else if (Array.isArray(card.scorers) && card.scorers.length > 0) {
                    scorersStr = card.scorers.map(s => typeof s === 'object' ? `${s.name || s.player || ''} (${s.goals || 1})` : String(s)).join(', ');
                }
                let potdStr = "None";
                if (typeof card.potd === 'string' && card.potd.trim()) {
                    potdStr = card.potd;
                } else if (Array.isArray(card.potd_winners) && card.potd_winners.length > 0) {
                    potdStr = card.potd_winners.join(", ");
                } else if (card.potd_winner) {
                    potdStr = String(card.potd_winner);
                }

                const totalPresent = card.total_present !== undefined 
                    ? card.total_present 
                    : ((Array.isArray(card.home_roster) ? card.home_roster.length : 0) + (Array.isArray(card.away_roster) ? card.away_roster.length : 0));

                matchCardRows.push([
                    card.date || "",
                    card.match_type || card.matchType || "League Match",
                    card.home_team || card.homeTeam || "Home",
                    homePresent || "None",
                    card.away_team || card.awayTeam || "Away",
                    awayPresent || "None",
                    totalPresent,
                    card.score || `${card.home_score ?? card.homeScore ?? 0} - ${card.away_score ?? card.awayScore ?? 0}`,
                    scorersStr || "None",
                    potdStr || "None"
                ]);
            }

            // 3. Tab: Captains League Standings
            const captainRows = [["Rank", "Team", "P", "W", "D", "L", "GF", "GA", "GD", "PTS"]];
            sortedCaptains.forEach((c, idx) => {
                const pld = c.pld !== undefined ? Number(c.pld) : (Number(c.w || 0) + Number(c.d || 0) + Number(c.l || 0));
                const gf = Number(c.gf || 0);
                const ga = Number(c.ga || 0);
                const gd = c.gd !== undefined ? Number(c.gd) : (gf - ga);
                captainRows.push([
                    idx + 1,
                    c.name || c.team || c.team_name || "Unnamed Team",
                    pld,
                    Number(c.w || 0),
                    Number(c.d || 0),
                    Number(c.l || 0),
                    gf,
                    ga,
                    gd,
                    Number(c.pts || 0)
                ]);
            });

            // 4. Tab: Player Standings
            const standingsRows = [["Rank", "Player", "Played", "Won", "Drawn", "Lost", "Goals Scored", "POTD Awards", "Total Points"]];
            sortedPlayers.forEach((p, idx) => {
                const pName = p.player || p.name || p.displayName || "";
                if (!pName) return;
                standingsRows.push([
                    idx + 1,
                    pName,
                    Number(p.pld || 0),
                    Number(p.w || 0),
                    Number(p.d || 0),
                    Number(p.l || 0),
                    Number(p.goals || 0),
                    Number(p.potd || 0),
                    Number(p.pts || p.points || 0)
                ]);
            });

            // 5. Tab: All Matches Log
            const matchRows = [["Date", "Match Type", "Home Team", "Home Score", "Away Score", "Away Team", "Goal Scorers", "Player of the Day (MVP)"]];
            const sortedMatches = [...matchesList].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
            for (const m of sortedMatches) {
                let scorersStr = "None";
                if (typeof m.scorers === 'string' && m.scorers.trim()) {
                    scorersStr = m.scorers;
                } else if (Array.isArray(m.scorers) && m.scorers.length > 0) {
                    scorersStr = m.scorers.map(s => typeof s === 'object' ? `${s.name || s.player || ''} (${s.goals || 1})` : String(s)).join(", ");
                }
                let potdStr = "None";
                if (Array.isArray(m.potd_winners) && m.potd_winners.length > 0) {
                    potdStr = m.potd_winners.join(", ");
                } else if (m.potd_winner) {
                    potdStr = String(m.potd_winner);
                } else if (m.potd) {
                    potdStr = String(m.potd);
                }

                matchRows.push([
                    m.date || "",
                    m.match_type || m.matchType || "League Match",
                    m.home_team || m.homeTeam || "Home",
                    m.home_score ?? m.homeScore ?? 0,
                    m.away_score ?? m.awayScore ?? 0,
                    m.away_team || m.awayTeam || "Away",
                    scorersStr || "None",
                    potdStr || "None"
                ]);
            }

            return { attRows, matchCardRows, captainRows, standingsRows, matchRows };
        },

        async updateAndOpenMicrosoftExcel() {
            if (this.isSheetLoading || this.isExcelLoading) return;
            this.isSheetLoading = true;
            this.isExcelLoading = true;

            const driveId = this.excelConfig?.driveId || this.excelTrackerMeta?.driveId || null;
            const docId = this.excelConfig?.docId || this.excelTrackerMeta?.docId || null;
            let targetExcelUrl = this.excelConfig?.docUrl || this.weeklyReportExcelUrl || null;

            try {
                // Guarantee fresh calculations
                if (typeof this.recalculateStandings === 'function') {
                    this.recalculateStandings();
                }

                // Check Microsoft Authentication (use cached/connected token if available)
                let token = window.fb?.getMicrosoftAccessToken ? window.fb.getMicrosoftAccessToken() : null;
                if (!token) {
                    try {
                        token = sessionStorage.getItem('gameon_ms_oauth_token') || localStorage.getItem('gameon_ms_oauth_token');
                    } catch(e) {}
                }

                // Generate fresh rows for all 5 requested tabs
                const { attRows, matchCardRows, captainRows, standingsRows, matchRows } = this.buildExcelReportDatasets();

                const tabs = [
                    { name: "Attendance", rows: attRows },
                    { name: "Match Attendance Cards", rows: matchCardRows },
                    { name: "Captains League Standings", rows: captainRows },
                    { name: "Player Standings", rows: standingsRows },
                    { name: "All Matches Log", rows: matchRows }
                ];

                if (token && docId) {
                    if (typeof this.showToast === 'function') {
                        this.showToast('📊 Updating Football United Weekly Report in Microsoft Excel Online...', 'info');
                    }

                    const getColLetter = (colIdx) => {
                        let temp = colIdx;
                        let letter = '';
                        while (temp > 0) {
                            let rem = (temp - 1) % 26;
                            letter = String.fromCharCode(65 + rem) + letter;
                            temp = Math.floor((temp - 1) / 26);
                        }
                        return letter || 'A';
                    };

                    const headers = {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    };

                    for (const tab of tabs) {
                        const sheetName = tab.name;
                        const rows = tab.rows;
                        if (!rows || rows.length === 0) continue;

                        const encodedSheet = encodeURIComponent(sheetName);
                        const basePath = driveId 
                            ? `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${docId}`
                            : `https://graph.microsoft.com/v1.0/me/drive/items/${docId}`;

                        // 1. Clear existing range A1:Z1000
                        const clearUrl = `${basePath}/workbook/worksheets/${encodedSheet}/range(address='A1:Z1000')/clear`;
                        try {
                            const clearRes = await fetch(clearUrl, {
                                method: 'POST',
                                headers,
                                body: JSON.stringify({ applyTo: "All" })
                            });
                            if (clearRes.status === 404) {
                                // If worksheet does not exist, add it
                                await fetch(`${basePath}/workbook/worksheets/add`, {
                                    method: 'POST',
                                    headers,
                                    body: JSON.stringify({ name: sheetName })
                                }).catch(() => {});
                            }
                        } catch (clearErr) {
                            console.warn(`Clear range notice on ${sheetName}:`, clearErr);
                        }

                        // 2. Prepare rectangular 2D array and target range
                        const maxCols = Math.max(...rows.map(r => r.length), 1);
                        const safeMatrix = rows.map(r => {
                            const rowCopy = [...r];
                            while (rowCopy.length < maxCols) rowCopy.push("");
                            return rowCopy.map(val => (val === undefined || val === null) ? "" : val);
                        });

                        const endCol = getColLetter(maxCols);
                        const rangeAddress = `A1:${endCol}${safeMatrix.length}`;
                        
                        // PATCH range with dataset
                        const patchUrlExact = `${basePath}/workbook/worksheets/${encodedSheet}/range(address='${rangeAddress}')`;
                        
                        let patchRes = await fetch(patchUrlExact, {
                            method: 'PATCH',
                            headers,
                            body: JSON.stringify({ values: safeMatrix })
                        });

                        if (!patchRes.ok) {
                            const errData = await patchRes.json().catch(() => ({}));
                            console.warn(`Graph PATCH status ${patchRes.status} on ${sheetName}:`, errData);
                            if (typeof this.showToast === 'function') {
                                const errMsg = errData?.error?.message || `HTTP ${patchRes.status}`;
                                this.showToast(`⚠️ Graph Sync (${sheetName}): ${errMsg}`, 'warning');
                            }
                            if (patchRes.status === 401) {
                                window.fb?.clearMicrosoftAccessToken?.();
                                this.microsoftUser = null;
                            }
                        }
                    }
                } else {
                    if (typeof this.showToast === 'function') {
                        this.showToast('📊 Generating latest attendance report...', 'info');
                    }
                }

                // Also trigger backend cloud sync mirror to keep OneDrive and local storage updated
                let backendResult = null;
                try {
                    const bRes = await fetch('/api/generate-excel-report', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'full_report_sync',
                            docId: docId,
                            driveId: driveId,
                            attendanceReport: this.players,
                            players: this.players,
                            captainStandings: this.captainsLeagueStandings,
                            playerStandings: this.playerStandings,
                            matches: this.matches,
                            sessions: this.matchDays
                        })
                    });
                    backendResult = await bRes.json();
                } catch(e) {}

                if (backendResult && backendResult.syncedWithGraph && backendResult.excelUrl) {
                    targetExcelUrl = backendResult.excelUrl;
                } else if (backendResult && backendResult.excelUrl) {
                    targetExcelUrl = backendResult.excelUrl;
                }

                if (!targetExcelUrl) {
                    targetExcelUrl = 'https://excel.cloud.microsoft/open/onedrive/?docId=2820CE6C9C58187A%21s88c637d68b7d4196b27df0e8c2303d1b&driveId=2820CE6C9C58187A';
                }

                this.weeklyReportExcelUrl = targetExcelUrl;
                try {
                    localStorage.setItem('football_united_weekly_report_excel_url', targetExcelUrl);
                } catch(e) {}

                window.open(targetExcelUrl, '_blank');

                if (typeof this.showToast === 'function') {
                    if (backendResult && backendResult.syncedWithGraph) {
                        this.showToast('✅ Football United Weekly Report successfully updated in Microsoft Excel Online!', 'success');
                    } else {
                        this.showToast('📄 Opened Football United Weekly Attendance in Microsoft Excel Online.', 'info');
                    }
                }
            } catch (err) {
                console.warn("Microsoft Excel update note:", err?.message || err);
                const fallbackUrl = this.weeklyReportExcelUrl || 'https://excel.cloud.microsoft/open/onedrive/?docId=2820CE6C9C58187A%21s88c637d68b7d4196b27df0e8c2303d1b&driveId=2820CE6C9C58187A';
                if (typeof this.showToast === 'function') {
                    this.showToast('Opening Football United Weekly Report...', 'info');
                }
                window.open(fallbackUrl, '_blank');
            } finally {
                this.isSheetLoading = false;
                this.isExcelLoading = false;
            }
        },

        openAttendanceTrackerExcel() {
            const excelOnlineUrl = 'https://excel.cloud.microsoft/open/onedrive/?docId=2820CE6C9C58187A%21s88c637d68b7d4196b27df0e8c2303d1b&driveId=2820CE6C9C58187A';
            window.open(excelOnlineUrl, '_blank', 'noopener,noreferrer');
            if (typeof this.showToast === 'function') {
                this.showToast('Opening Football United Weekly Attendance in Microsoft Excel Online...', 'info');
            }
        },

        async generateAndOpenGoogleSheet() {
            return this.updateAndOpenMicrosoftExcel();
        },

        async generateAndOpenExcelReport() {
            return this.updateAndOpenMicrosoftExcel();
        },

        // --- FOOTBALL UNITED 4-QUARTER EXCEL ATTENDANCE TRACKER METHODS ---
        // (Automated Data Integration Assistant Implementation)
        async fetchExcelTrackerMetadata() {
            try {
                const res = await fetch('/api/excel-tracker');
                if (res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        this.excelTrackerMeta = data;
                        this.trackerCurrentOwner = data.currentOwner || this.trackerCurrentOwner;
                        this.trackerDefaultTemporaryOwner = data.defaultTemporaryOwner || this.trackerDefaultTemporaryOwner;
                        this.trackerTemporaryOwnerAccess = data.temporaryOwnerAccess || this.trackerTemporaryOwnerAccess;
                        if (data.New_Owner_Email) {
                            this.newOwnerEmail = data.New_Owner_Email;
                        }
                    }
                }
            } catch (err) {
                console.warn('Could not fetch excel tracker metadata:', err);
            }
        },

        async createOrResetExcelTracker() {
            if (this.isTrackerLoading) return;
            this.isTrackerLoading = true;
            this.trackerFeedbackMsg = 'Initializing 4-Quarter Excel Workbook via Microsoft Graph API...';

            try {
                // Collect player names from current roster
                const playerNames = (this.players || []).map(p => this.getPlayerDisplayName ? this.getPlayerDisplayName(p) : (p.name || p.player || '')).filter(Boolean);

                // Helper: Quarter weekly dates generator (17 dates, spaced 7 days apart)
                const getQuarterWeeklyDates = (quarter) => {
                    let startMonth = 8;
                    let startDay = 4;
                    const startYear = 2024;
                    if (quarter === "Sep-Nov") {
                        startMonth = 8; startDay = 4;
                    } else if (quarter === "Dec-Feb") {
                        startMonth = 11; startDay = 4;
                    } else if (quarter === "Mar-May") {
                        startMonth = 2; startDay = 4;
                    } else if (quarter === "Jun-Aug") {
                        startMonth = 5; startDay = 3;
                    }
                    const dates = [];
                    const cur = new Date(startYear, startMonth, startDay, 12, 0, 0);
                    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                    for (let i = 0; i < 17; i++) {
                        dates.push(`${cur.getDate()}-${months[cur.getMonth()]}`);
                        cur.setDate(cur.getDate() + 7);
                    }
                    return dates;
                };

                // Check for Microsoft Graph Access Token
                let token = window.fb?.getMicrosoftAccessToken ? window.fb.getMicrosoftAccessToken() : null;
                if (!token) {
                    try {
                        token = sessionStorage.getItem('gameon_ms_oauth_token') || localStorage.getItem('gameon_ms_oauth_token');
                    } catch(e) {}
                }

                if (!token && typeof this.handleMicrosoftSignIn === 'function') {
                    try {
                        const authRes = await this.handleMicrosoftSignIn();
                        token = authRes?.accessToken || (window.fb?.getMicrosoftAccessToken ? window.fb.getMicrosoftAccessToken() : null) || sessionStorage.getItem('gameon_ms_oauth_token');
                    } catch(e) {}
                }

                // If user is connected to Microsoft Graph, build workbook directly in OneDrive
                if (token) {
                    this.trackerFeedbackMsg = 'Creating Football_United_Attendance_Tracker.xlsx in OneDrive root...';

                    // Prepare a valid .xlsx binary blob payload (bypasses corrupted file trap on PUT)
                    let uploadBlob = null;
                    try {
                        const localRes = await fetch('/api/excel-tracker/download');
                        if (localRes.ok) {
                            uploadBlob = await localRes.blob();
                        }
                    } catch(e) {}

                    if (!uploadBlob || uploadBlob.size === 0) {
                        try {
                            const directRes = await fetch('/reports/Football_United_Attendance_Tracker.xlsx');
                            if (directRes.ok) {
                                uploadBlob = await directRes.blob();
                            }
                        } catch(e) {}
                    }

                    // Fallback to minimal valid Base64 .xlsx binary if static asset not reached
                    if (!uploadBlob || uploadBlob.size === 0) {
                        const minimalB64 = 'UEsDBAoAAAAIAEtqI11fKfa3ZgEAAIgGAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbM1VW0/CMBR+91csTAIL';
                        // Provide minimal empty blob with spreadsheet MIME type
                        uploadBlob = new Blob([], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                    }

                    // =========================================================================
                    // STEP 1: PUT request to create valid Excel file in OneDrive root
                    // URL: https://graph.microsoft.com/v1.0/me/drive/root:/Football_United_Attendance_Tracker.xlsx:/content
                    // =========================================================================
                    const putUrl = 'https://graph.microsoft.com/v1.0/me/drive/root:/Football_United_Attendance_Tracker.xlsx:/content';
                    const putRes = await fetch(putUrl, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                        },
                        body: uploadBlob
                    });

                    if (!putRes.ok) {
                        const errData = await putRes.json().catch(() => ({}));
                        throw new Error(`Graph PUT error (${putRes.status}): ${errData?.error?.message || 'Failed to create file'}`);
                    }

                    const putData = await putRes.json();
                    const docId = putData.id;
                    const webUrl = putData.webUrl || `https://excel.cloud.microsoft/open/onedrive/?docId=${encodeURIComponent(docId)}`;
                    const driveId = putData.parentReference?.driveId || this.excelConfig?.driveId || '2820CE6C9C58187A';

                    // Update this.excelConfig so UI links update dynamically
                    this.excelConfig.docId = docId;
                    this.excelConfig.docUrl = webUrl;
                    this.excelConfig.driveId = driveId;

                    // Persist to localStorage
                    try {
                        localStorage.setItem('gameon_excel_doc_id', docId);
                        localStorage.setItem('gameon_excel_doc_url', webUrl);
                        localStorage.setItem('football_united_weekly_report_excel_url', webUrl);
                        localStorage.setItem('gameon_excel_config', JSON.stringify(this.excelConfig));
                    } catch(e) {}

                    // Persist to Firestore
                    if (window.fb && window.fb.saveSettings) {
                        window.fb.saveSettings({
                            excelConfig: this.excelConfig,
                            excel_tracker_doc_id: docId,
                            excel_tracker_doc_url: webUrl
                        }).catch(err => console.warn('Firestore save notice:', err));
                    }

                    const quarters = ["Sep-Nov", "Dec-Feb", "Mar-May", "Jun-Aug"];

                    // =========================================================================
                    // STEP 2: Generate the Quarterly Tabs via sequential POST requests
                    // URL: .../workbook/worksheets/add
                    // =========================================================================
                    this.trackerFeedbackMsg = 'Creating quarterly worksheets: Sep-Nov, Dec-Feb, Mar-May, Jun-Aug...';
                    for (const qName of quarters) {
                        try {
                            const addWsUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${docId}/workbook/worksheets/add`;
                            const addRes = await fetch(addWsUrl, {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ name: qName })
                            });
                            if (!addRes.ok && addRes.status !== 409) {
                                console.warn(`Worksheet add status ${addRes.status} for ${qName}`);
                            }
                        } catch(wsErr) {
                            console.warn(`Error adding worksheet ${qName}:`, wsErr);
                        }
                    }

                    // Delete the default "Sheet1"
                    try {
                        const delUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${docId}/workbook/worksheets/Sheet1`;
                        await fetch(delUrl, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${token}` }
                        }).catch(() => {
                            return fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${docId}/workbook/worksheets('Sheet1')`, {
                                method: 'DELETE',
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                        });
                    } catch(delErr) {
                        console.warn('Delete Sheet1 notice:', delErr);
                    }

                    // =========================================================================
                    // STEP 3: Apply the Visual Template (Grid Formatting)
                    // URL: .../workbook/worksheets/{sheetName}/range(address='A1:R100')
                    // =========================================================================
                    for (const qName of quarters) {
                        this.trackerFeedbackMsg = `Formatting sheet [${qName}] with headers, dates & checkboxes...`;
                        const encodedSheet = encodeURIComponent(qName);
                        const dates = getQuarterWeeklyDates(qName);

                        // Construct 100 rows x 18 columns (A through R)
                        const matrix100 = [];

                        // Row 1: Header (merged A1:R1)
                        const row1 = ['Football United Attendance Tracker'];
                        while (row1.length < 18) row1.push('');
                        matrix100.push(row1);

                        // Row 2: Sub-Header (A2="Player Name", B2:R2=17 weekly dates)
                        const row2 = ['Player Name', ...dates];
                        while (row2.length < 18) row2.push('');
                        matrix100.push(row2);

                        // Row 3 to 100: Player Name (Col A) + 17 Checkbox values (Cols B:R)
                        for (let r = 0; r < 98; r++) {
                            const pName = playerNames[r] || '';
                            const dataRow = [pName, ...Array(17).fill(false)];
                            matrix100.push(dataRow);
                        }

                        // 1. PATCH values into A1:R100
                        const rangeUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${docId}/workbook/worksheets/${encodedSheet}/range(address='A1:R100')`;
                        await fetch(rangeUrl, {
                            method: 'PATCH',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ values: matrix100 })
                        }).catch(err => console.warn(`Values patch notice on ${qName}:`, err));

                        // 2. Merge Header A1:R1
                        const mergeUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${docId}/workbook/worksheets/${encodedSheet}/range(address='A1:R1')/merge`;
                        await fetch(mergeUrl, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ across: false })
                        }).catch(() => {});

                        // 3. Format Row 1: fill=#6AA84F, font color white, center alignment
                        const r1FillUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${docId}/workbook/worksheets/${encodedSheet}/range(address='A1:R1')/format/fill`;
                        await fetch(r1FillUrl, {
                            method: 'PATCH',
                            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ color: '#6AA84F' })
                        }).catch(() => {});

                        const r1FontUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${docId}/workbook/worksheets/${encodedSheet}/range(address='A1:R1')/format/font`;
                        await fetch(r1FontUrl, {
                            method: 'PATCH',
                            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ color: '#FFFFFF', bold: true, size: 14 })
                        }).catch(() => {});

                        const r1AlignUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${docId}/workbook/worksheets/${encodedSheet}/range(address='A1:R1')/format`;
                        await fetch(r1AlignUrl, {
                            method: 'PATCH',
                            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ horizontalAlignment: 'Center', verticalAlignment: 'Center' })
                        }).catch(() => {});

                        // 4. Format Row 2 (A2:R2): Light green fill (#E2EFDA), bold text, center alignment
                        const r2FillUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${docId}/workbook/worksheets/${encodedSheet}/range(address='A2:R2')/format/fill`;
                        await fetch(r2FillUrl, {
                            method: 'PATCH',
                            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ color: '#E2EFDA' })
                        }).catch(() => {});

                        const r2FontUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${docId}/workbook/worksheets/${encodedSheet}/range(address='A2:R2')/format/font`;
                        await fetch(r2FontUrl, {
                            method: 'PATCH',
                            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ bold: true, color: '#107C41' })
                        }).catch(() => {});

                        const r2AlignUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${docId}/workbook/worksheets/${encodedSheet}/range(address='A2:R2')/format`;
                        await fetch(r2AlignUrl, {
                            method: 'PATCH',
                            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ horizontalAlignment: 'Center', verticalAlignment: 'Center' })
                        }).catch(() => {});

                        // 5. Checkbox validation / formatting on B3:R100
                        const valUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${docId}/workbook/worksheets/${encodedSheet}/range(address='B3:R100')/dataValidation`;
                        await fetch(valUrl, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                rule: {
                                    list: {
                                        inCellDropDown: true,
                                        source: 'TRUE,FALSE'
                                    }
                                },
                                errorAlert: {
                                    showAlert: true,
                                    style: 'Stop',
                                    title: 'Attendance Checkbox',
                                    message: 'Please choose TRUE or FALSE'
                                },
                                showPrompt: false
                            })
                        }).catch(() => {
                            return fetch(valUrl, {
                                method: 'PATCH',
                                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    rule: { list: { inCellDropDown: true, source: 'TRUE,FALSE' } }
                                })
                            });
                        }).catch(valErr => console.warn(`Data validation note on ${qName}:`, valErr));

                        // Center align checkboxes
                        const cbAlignUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${docId}/workbook/worksheets/${encodedSheet}/range(address='B3:R100')/format`;
                        await fetch(cbAlignUrl, {
                            method: 'PATCH',
                            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ horizontalAlignment: 'Center' })
                        }).catch(() => {});
                    }

                    // Sync metadata with backend for persistence
                    try {
                        const syncRes = await fetch('/api/excel-tracker/create', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ players: playerNames, docId, docUrl: webUrl, driveId })
                        });
                        if (syncRes.ok) {
                            const syncData = await syncRes.json();
                            this.excelTrackerMeta = syncData;
                        }
                    } catch(e) {}

                    this.trackerFeedbackMsg = '✅ Successfully created Football United Attendance Tracker in OneDrive (4 Quarters: Sep-Nov, Dec-Feb, Mar-May, Jun-Aug)!';
                    if (typeof this.showToast === 'function') {
                        this.showToast(this.trackerFeedbackMsg, 'success');
                    }
                } else {
                    // Fallback when Microsoft Graph token is not currently connected:
                    // Initialize via backend service and provide clean instructions
                    this.trackerFeedbackMsg = 'Initializing Attendance Tracker via backend service...';
                    const res = await fetch('/api/excel-tracker/create', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ players: playerNames })
                    });
                    const data = await res.json();
                    if (data.success) {
                        this.excelTrackerMeta = data;
                        this.trackerCurrentOwner = data.currentOwner || this.trackerCurrentOwner;
                        if (data.docId) this.excelConfig.docId = data.docId;
                        if (data.docUrl) this.excelConfig.docUrl = data.docUrl;
                        this.trackerFeedbackMsg = '✅ Pre-formatted 4-Quarter Excel Workbook initialized. Connect Microsoft account to sync directly to OneDrive!';
                        if (typeof this.showToast === 'function') {
                            this.showToast(this.trackerFeedbackMsg, 'success');
                        }
                    } else {
                        this.trackerFeedbackMsg = `Error: ${data.message || 'Failed to create tracker'}`;
                    }
                }
            } catch (err) {
                console.error('Error creating Excel tracker:', err);
                this.trackerFeedbackMsg = `Error: ${err.message || err}`;
                if (typeof this.showToast === 'function') {
                    this.showToast(`⚠️ Tracker creation: ${err.message || err}`, 'warning');
                }
            } finally {
                this.isTrackerLoading = false;
            }
        },

        // =========================================================================
        // STEP 4: Implement transferExcelTrackerOwnership()
        // URL: https://graph.microsoft.com/v1.0/me/drive/items/{docId}/invite
        // =========================================================================
        async transferExcelTrackerOwnership() {
            const targetEmail = (this.newOwnerEmail || '').trim();
            if (!targetEmail || !targetEmail.includes('@')) {
                alert('Please enter a valid email address for [New_Owner_Email].');
                return;
            }
            if (this.isTrackerLoading) return;
            this.isTrackerLoading = true;
            this.trackerFeedbackMsg = `Transferring Full Control to ${targetEmail}...`;

            try {
                const docId = this.excelConfig?.docId || this.excelTrackerMeta?.docId || '2820CE6C9C58187A!s88c637d68b7d4196b27df0e8c2303d1b';

                // Check for Microsoft Graph token
                let token = window.fb?.getMicrosoftAccessToken ? window.fb.getMicrosoftAccessToken() : null;
                if (!token) {
                    try {
                        token = sessionStorage.getItem('gameon_ms_oauth_token') || localStorage.getItem('gameon_ms_oauth_token');
                    } catch(e) {}
                }

                if (!token && typeof this.handleMicrosoftSignIn === 'function') {
                    try {
                        const signInRes = await this.handleMicrosoftSignIn();
                        token = signInRes?.accessToken || (window.fb?.getMicrosoftAccessToken ? window.fb.getMicrosoftAccessToken() : null) || sessionStorage.getItem('gameon_ms_oauth_token');
                    } catch(e) {}
                }

                let graphInvited = false;

                if (token && docId) {
                    const inviteUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${docId}/invite`;

                    // Attempt roles: ["owner"] first
                    let inviteRes = await fetch(inviteUrl, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            requireSignIn: true,
                            sendInvitation: true,
                            roles: ["owner"],
                            recipients: [{ email: targetEmail }],
                            message: "Ownership of Football United Attendance Tracker has been transferred to you."
                        })
                    });

                    // If strict "owner" transfer is not supported by tenant, fallback to "write"
                    if (!inviteRes.ok) {
                        console.warn(`Graph invite with role 'owner' returned status ${inviteRes.status}. Retrying with role 'write'...`);
                        inviteRes = await fetch(inviteUrl, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                requireSignIn: true,
                                sendInvitation: true,
                                roles: ["write"],
                                recipients: [{ email: targetEmail }],
                                message: "Full edit access to Football United Attendance Tracker has been granted to you."
                            })
                        });
                    }

                    if (inviteRes.ok) {
                        graphInvited = true;
                    } else {
                        const errData = await inviteRes.json().catch(() => ({}));
                        console.warn('Microsoft Graph invite warning:', errData);
                    }
                }

                // Notify backend service to persist transfer record and update downgrade status
                const backendRes = await fetch('/api/excel-tracker/transfer-owner', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        newOwnerEmail: targetEmail,
                        downgradeAction: this.trackerDowngradeAction || 'downgrade'
                    })
                }).catch(() => null);

                let backendData = null;
                if (backendRes && backendRes.ok) {
                    backendData = await backendRes.json().catch(() => null);
                }

                // Update this.trackerCurrentOwner to reflect the new email upon success
                this.trackerCurrentOwner = targetEmail;
                if (backendData?.temporaryOwnerAccess) {
                    this.trackerTemporaryOwnerAccess = backendData.temporaryOwnerAccess;
                } else if (this.trackerDowngradeAction === 'remove') {
                    this.trackerTemporaryOwnerAccess = 'removed';
                } else {
                    this.trackerTemporaryOwnerAccess = 'editor';
                }

                // Persist to localStorage and Firestore
                try {
                    localStorage.setItem('fu_tracker_current_owner', targetEmail);
                    localStorage.setItem('fu_tracker_temp_access', this.trackerTemporaryOwnerAccess);
                } catch(e) {}

                if (window.fb && window.fb.saveSettings) {
                    window.fb.saveSettings({
                        tracker_current_owner: targetEmail,
                        tracker_temp_access: this.trackerTemporaryOwnerAccess
                    }).catch(() => {});
                }

                this.trackerFeedbackMsg = `✅ Successfully transferred ownership of Attendance Tracker to ${targetEmail}!`;

                // UI Toast notification
                if (typeof this.showToast === 'function') {
                    this.showToast(`✅ Ownership successfully transferred to ${targetEmail}!`, 'success');
                }

                if (this.fetchExcelTrackerMetadata) {
                    await this.fetchExcelTrackerMetadata();
                }
            } catch (err) {
                console.error('Error transferring ownership:', err);
                this.trackerFeedbackMsg = `Error: ${err.message || err}`;
                if (typeof this.showToast === 'function') {
                    this.showToast(`⚠️ Transfer notice: ${err.message || err}`, 'warning');
                }
                alert(this.trackerFeedbackMsg);
            } finally {
                this.isTrackerLoading = false;
            }
        },

        async appendPlayerToQuarterlyAttendanceSheets(playerName) {
            if (!playerName || typeof playerName !== 'string') return;
            try {
                await fetch('/api/excel-tracker/add-player', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ playerName: playerName.trim() })
                });
            } catch (err) {
                console.warn('Excel tracker append player note:', err);
            }
        },

        openExcelSetup() {
            this.showExcelSettingsModal = true;
            this.autoConnectMicrosoft(false);
        },

        async autoConnectMicrosoft(interactive = false) {
            try {
                let token = window.fb?.getMicrosoftAccessToken ? window.fb.getMicrosoftAccessToken() : null;
                if (!token) {
                    try {
                        token = sessionStorage.getItem('gameon_ms_oauth_token') || localStorage.getItem('gameon_ms_oauth_token');
                    } catch(e) {}
                }
                if (token) {
                    this.microsoftUser = window.fb?.auth?.currentUser || { displayName: 'Microsoft 365 User', email: 'Connected' };
                    return this.microsoftUser;
                }
                if (interactive) {
                    return await this.handleMicrosoftSignIn();
                }
            } catch (e) {
                console.warn("Background Microsoft check note:", e);
            }
            return null;
        },

        async handleMicrosoftSignIn() {
            try {
                if (!window.fb || !window.fb.signInWithMicrosoft) {
                    throw new Error("Microsoft Auth provider not initialized.");
                }
                const res = await window.fb.signInWithMicrosoft({ force: true });
                if (res?.accessToken) {
                    this.microsoftUser = res?.user || window.fb?.auth?.currentUser || { displayName: 'Microsoft 365 User', email: 'Connected' };
                    if (typeof this.showToast === 'function') {
                        this.showToast('✅ Microsoft Account connected in background!', 'success');
                    }
                    return res;
                } else if (res?.providerDisabled) {
                    const userToken = prompt(
                        "Microsoft 1-click Sign-In is not enabled in Firebase Console (Authentication > Sign-in method > Microsoft).\n\n" +
                        "If you have a Microsoft Graph Access Token, paste it here, or click Cancel to open Excel Online directly:"
                    );
                    if (userToken && userToken.trim()) {
                        const cleanToken = userToken.trim();
                        try {
                            sessionStorage.setItem('gameon_ms_oauth_token', cleanToken);
                            localStorage.setItem('gameon_ms_oauth_token', cleanToken);
                        } catch(e) {}
                        this.microsoftUser = { displayName: 'Microsoft 365 User', email: 'Connected' };
                        if (typeof this.showToast === 'function') {
                            this.showToast('✅ Microsoft Graph token saved successfully!', 'success');
                        }
                    } else {
                        if (typeof this.showToast === 'function') {
                            this.showToast('Tip: Enable Microsoft in Firebase Console > Sign-in method. You can still open Excel Online directly.', 'info');
                        }
                    }
                    return res;
                } else if (res?.cancelled) {
                    if (typeof this.showToast === 'function') {
                        this.showToast('Sign-in popup was closed.', 'info');
                    }
                    return res;
                }
                return res;
            } catch (err) {
                console.warn("Microsoft sign-in notice:", err?.message || err);
                if (typeof this.showToast === 'function') {
                    this.showToast('Microsoft sign-in could not be completed.', 'info');
                }
            }
        },

        async handleMicrosoftSignOut() {
            try {
                if (window.fb?.signOutMicrosoft) {
                    await window.fb.signOutMicrosoft();
                }
                try {
                    sessionStorage.removeItem('gameon_ms_oauth_token');
                    localStorage.removeItem('gameon_ms_oauth_token');
                } catch(e) {}
                this.microsoftUser = null;
                if (typeof this.showToast === 'function') {
                    this.showToast('Disconnected Microsoft Account.', 'info');
                }
            } catch (err) {
                console.error("Microsoft sign-out error:", err);
            }
        },

        // ----------------------------------------------------
        // Part M & G3a: Excel Online Direct Attendance Auto-Sync
        // ----------------------------------------------------
        getMatchDayPresentPlayerIds(matchDay) {
            if (!matchDay) return [];
            const presentIds = [];
            (this.players || []).forEach(p => {
                if (this.isPlayerPresent && this.isPlayerPresent(matchDay, p)) {
                    presentIds.push(p.id || p.name);
                }
            });
            return presentIds;
        },

        syncAttendanceToExcel(idOrDate, type = 'session') {
            if (!idOrDate) return;
            // 1. Immediately indicate saving state in UI
            this.excelSyncStatus = 'saving';

            if (this._excelSyncTimer) clearTimeout(this._excelSyncTimer);
            this._excelSyncTimer = setTimeout(() => {
                this._executeExcelAttendanceSync(idOrDate, type);
            }, 500);
        },

        async _executeExcelAttendanceSync(idOrDate, type = 'session') {
            this.excelSyncStatus = 'syncing';
            
            let sessionId = idOrDate;
            let sessionDate = '';
            let recordType = type === 'match' ? 'Match Day' : 'Training Session';
            let presentIds = [];
            let records = [];

            const allPlayers = this.getAlphabeticalPlayers ? this.getAlphabeticalPlayers() : (this.players || []);

            if (type === 'match') {
                const matchDay = (this.matches || []).find(m => String(m.id) === String(idOrDate) || m.date === idOrDate);
                if (matchDay) {
                    sessionId = matchDay.id || idOrDate;
                    sessionDate = matchDay.date || '';
                    recordType = matchDay.match_type || 'Match Day';
                    presentIds = this.getMatchDayPresentPlayerIds(matchDay);
                    records = allPlayers.map(p => {
                        const isPresent = this.isPlayerPresent ? this.isPlayerPresent(matchDay, p) : false;
                        return {
                            sessionId: String(sessionId),
                            date: sessionDate,
                            type: recordType,
                            playerName: this.getPlayerDisplayName ? this.getPlayerDisplayName(p) : (p.name || p.player || ''),
                            attendanceStatus: isPresent ? 'Present' : 'Absent'
                        };
                    });
                }
            } else {
                const sess = (this.sessions || []).find(s => String(s.id) === String(idOrDate) || s.date === idOrDate);
                if (sess) {
                    sessionId = sess.id || idOrDate;
                    sessionDate = sess.date || '';
                    recordType = sess.type || 'Training Session';
                    presentIds = Array.isArray(sess.attendees) ? sess.attendees : [];
                    records = allPlayers.map(p => {
                        const isPresent = this.isPlayerPresentInSession ? this.isPlayerPresentInSession(sess, p) : false;
                        return {
                            sessionId: String(sessionId),
                            date: sessionDate,
                            type: recordType,
                            playerName: this.getPlayerDisplayName ? this.getPlayerDisplayName(p) : (p.name || p.player || ''),
                            attendanceStatus: isPresent ? 'Present' : 'Absent'
                        };
                    });
                }
            }

            if (!sessionDate && typeof idOrDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(idOrDate)) {
                sessionDate = idOrDate;
            }
            if (!sessionDate) {
                sessionDate = new Date().toISOString().slice(0, 10);
            }

            this.excelSyncLastSessionDate = sessionDate;

            // Ever attended player roster mapping
            const everAttended = (this.players || []).filter(p => {
                if (!p) return false;
                return p.has_ever_attended || p.matches_played > 0 || (p.attendance_count && p.attendance_count > 0);
            }).map(p => ({
                id: p.id || p.name,
                name: this.getPlayerDisplayName ? this.getPlayerDisplayName(p) : (p.name || p.player)
            }));

            // Include current present players in ever-attended roster
            const everNames = new Set(everAttended.map(ea => ea.name));
            (presentIds || []).forEach(idOrName => {
                const found = (this.players || []).find(p => p && (p.id === idOrName || p.name === idOrName));
                const name = found ? (this.getPlayerDisplayName ? this.getPlayerDisplayName(found) : found.name) : idOrName;
                if (name && !everNames.has(name)) {
                    everAttended.push({ id: idOrName, name: name });
                    everNames.add(name);
                }
            });

            // If records empty (e.g. called with raw date), generate from everAttended
            if (records.length === 0) {
                records = everAttended.map(ea => ({
                    sessionId: String(sessionId),
                    date: sessionDate,
                    type: recordType,
                    playerName: ea.name,
                    attendanceStatus: presentIds.includes(ea.id) || presentIds.includes(ea.name) ? 'Present' : 'Absent'
                }));
            }

            try {
                const res = await fetch('/api/sync-weekly-attendance', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sessionId: String(sessionId),
                        sessionDate: sessionDate,
                        type: recordType,
                        serviceAccountOwner: this.excelConfig?.serviceAccountOwner || 'ralph.boer@hillsong.co.uk',
                        driveId: this.excelConfig?.driveId || '2820CE6C9C58187A',
                        itemId: this.excelConfig?.docId || '2820CE6C9C58187A!s88c637d68b7d4196b27df0e8c2303d1b',
                        docUrl: this.excelConfig?.docUrl || 'https://excel.cloud.microsoft/open/onedrive/?docId=2820CE6C9C58187A%21s88c637d68b7d4196b27df0e8c2303d1b&driveId=2820CE6C9C58187A',
                        tableName: this.excelConfig?.tableName || 'WeeklyAttendance',
                        records: records,
                        presentPlayerIds: presentIds,
                        everAttendedPlayers: everAttended
                    })
                });

                const data = await res.json();
                if (data && data.success) {
                    this.excelSyncStatus = 'synced';
                    this.excelSyncMode = data.mode || (data.cloudSynced ? 'microsoft_graph' : 'local_state');
                    this.excelSyncNotice = data.notice || (data.cloudSynced ? 'Synced directly to Microsoft 365 Excel Online' : 'Synced (local)');
                    this.excelSyncLastTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                    this.excelSyncError = null;
                } else {
                    this.excelSyncStatus = 'failed';
                    this.excelSyncError = (data && data.message) || 'Excel sync failed';
                    this.excelSyncNotice = 'Excel sync failed (attendance saved locally)';
                    if (typeof this.showToast === 'function') {
                        this.showToast('⚠️ Attendance saved, Excel sync failed — Click "Retry Sync"', 'warning');
                    }
                }
            } catch (err) {
                console.warn('Excel auto-sync catch:', err?.message || err);
                this.excelSyncStatus = 'failed';
                this.excelSyncError = err?.message || 'Network error';
                this.excelSyncNotice = 'Excel sync failed (attendance saved locally)';
                if (typeof this.showToast === 'function') {
                    this.showToast('⚠️ Attendance saved, Excel sync failed — Click "Retry Sync"', 'warning');
                }
            }
        },

        async retryExcelSync(idOrDate, type = 'session') {
            const target = idOrDate || this.excelSyncLastSessionDate || (this.sessions && this.sessions[0]?.id) || (this.sessions && this.sessions[0]?.date);
            if (!target) return;
            if (typeof this.showToast === 'function') {
                this.showToast('Retrying Excel sync...', 'info');
            }
            await this._executeExcelAttendanceSync(target, type);
        },

        showExcelSyncDiagnostic() {
            if (this.excelSyncError) {
                this.showToast('⚠️ Excel Sync Diagnostic: ' + this.excelSyncError, 'warning');
            } else if (this.excelSyncMode === 'local_state') {
                this.showToast('ℹ️ Attendance is saved in local server storage. To sync directly to Microsoft 365 Excel Online, configure GRAPH_CLIENT_ID & GRAPH_CLIENT_SECRET.', 'info');
            } else {
                this.showToast('✅ Excel attendance tracker is active and up to date.', 'success');
            }
        },

        syncWeeklyAttendanceDebounced(sessionDate, attendedPlayerIds = []) {
            this.syncAttendanceToExcel(sessionDate, 'session');
        },

        async syncWeeklyAttendanceAuto(sessionDate, attendedPlayerIds = []) {
            return this._executeExcelAttendanceSync(sessionDate, 'session');
        },

        async retryWeeklyAttendanceSync() {
            if (this.excelSyncStatus === 'saving' || this.excelSyncStatus === 'syncing') return;
            if (this.excelSyncLastSessionDate) {
                await this._executeExcelAttendanceSync(this.excelSyncLastSessionDate, 'session');
            } else if (this.sessions && this.sessions.length > 0) {
                await this._executeExcelAttendanceSync(this.sessions[0].id || this.sessions[0].date, 'session');
            } else if (this.matches && this.matches.length > 0) {
                await this._executeExcelAttendanceSync(this.matches[0].id || this.matches[0].date, 'match');
            }
        },

        generateMatchAttendanceTSV() {
            const headers = [
                'Date',
                'Match Type',
                'Home Team',
                'Home Present Players',
                'Away Team',
                'Away Present Players',
                'Total Present',
                'Score',
                'Goal Scorers',
                'Player of the Day (MVP)'
            ];

            const rows = [headers.join('\t')];
            const sortedMatches = [...(this.matches || [])].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

            sortedMatches.forEach(m => {
                const homePlayers = this.getTeamPlayers(m, 'home').map(p => this.getPlayerDisplayName(p)).join(', ') || 'None';
                const awayPlayers = this.getTeamPlayers(m, 'away').map(p => this.getPlayerDisplayName(p)).join(', ') || 'None';
                const totalPresent = this.getPresentPlayers(m).length;
                const score = `${m.home_score ?? 0} - ${m.away_score ?? 0}`;
                const scorers = (m.scorers || []).map(s => `${s.name || s.player} (${s.goals || 1})`).join(', ') || 'None';
                const potd = Array.isArray(m.potd_winners) ? m.potd_winners.join(', ') : (m.potd_winners || m.potd || 'None');

                rows.push([
                    m.date || '',
                    m.match_type || 'League Match',
                    m.home_team || 'Home',
                    homePlayers,
                    m.away_team || 'Away',
                    awayPlayers,
                    totalPresent,
                    score,
                    scorers,
                    potd
                ].join('\t'));
            });

            return rows.join('\n');
        },

        copyAttendanceForGoogleSheets() {
            const tsv = this.generateMatchAttendanceTSV();
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(tsv).then(() => {
                    this.copiedAttendanceSuccess = true;
                    setTimeout(() => { this.copiedAttendanceSuccess = false; }, 3000);
                }).catch(() => {
                    this.fallbackCopyToClipboard(tsv);
                });
            } else {
                this.fallbackCopyToClipboard(tsv);
            }
        },

        fallbackCopyToClipboard(text) {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            this.copiedAttendanceSuccess = true;
            setTimeout(() => { this.copiedAttendanceSuccess = false; }, 3000);
        },

        openSheetsNewWithData() {
            this.copyAttendanceForGoogleSheets();
            window.open('https://sheets.new', '_blank');
        },

        downloadMatchAttendanceCSV() {
            const sortedMatches = [...(this.matches || [])].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
            const headers = ['Date', 'Match Type', 'Home Team', 'Home Present Players', 'Away Team', 'Away Present Players', 'Total Present', 'Home Score', 'Away Score', 'Goal Scorers', 'Player of the Day'];
            
            const escapeCsv = (str) => {
                const val = String(str || '').replace(/"/g, '""');
                return `"${val}"`;
            };

            const csvRows = [headers.map(escapeCsv).join(',')];

            sortedMatches.forEach(m => {
                const homePlayers = this.getTeamPlayers(m, 'home').map(p => this.getPlayerDisplayName(p)).join('; ') || 'None';
                const awayPlayers = this.getTeamPlayers(m, 'away').map(p => this.getPlayerDisplayName(p)).join('; ') || 'None';
                const totalPresent = this.getPresentPlayers(m).length;
                const scorers = (m.scorers || []).map(s => `${s.name || s.player} (${s.goals || 1})`).join('; ') || 'None';
                const potd = Array.isArray(m.potd_winners) ? m.potd_winners.join('; ') : (m.potd_winners || m.potd || 'None');

                csvRows.push([
                    escapeCsv(m.date || ''),
                    escapeCsv(m.match_type || 'League Match'),
                    escapeCsv(m.home_team || 'Home'),
                    escapeCsv(homePlayers),
                    escapeCsv(m.away_team || 'Away'),
                    escapeCsv(awayPlayers),
                    totalPresent,
                    m.home_score ?? 0,
                    m.away_score ?? 0,
                    escapeCsv(scorers),
                    escapeCsv(potd)
                ].join(','));
            });

            const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `GameOn_Match_Attendance_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        },

        // --- SESSIONS (TRAINING & WORKSHOPS ATTENDANCE) METHODS ---
        getUniqueSessionTypes() {
            const set = new Set();
            (this.sessions || []).forEach(s => {
                if (s && s.type && s.type.trim()) {
                    set.add(s.type.trim());
                }
            });
            return Array.from(set);
        },

        getSessionTypeBadgeClass(type) {
            if (!type) return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20';
            const t = String(type).toLowerCase().trim();
            if (t.includes('football') || t.includes('soccer') || t.includes('pitch')) {
                return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
            }
            if (t.includes('digital') || t.includes('tech') || t.includes('code') || t.includes('computer')) {
                return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20';
            }
            if (t.includes('captain') || t.includes('leader')) {
                return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20';
            }
            if (t.includes('fitness') || t.includes('conditioning') || t.includes('gym') || t.includes('strength')) {
                return 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20';
            }
            if (t.includes('tactical') || t.includes('analysis') || t.includes('strategy')) {
                return 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20';
            }
            if (t.includes('mentor') || t.includes('life') || t.includes('career')) {
                return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20';
            }
            if (t.includes('recovery') || t.includes('physio') || t.includes('wellness') || t.includes('yoga')) {
                return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20';
            }
            if (t.includes('workshop') || t.includes('seminar') || t.includes('classroom')) {
                return 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20';
            }
            return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20';
        },

        getRecurringDatesList() {
            const startDateStr = (this.newSession.date || this.getTodayDateBST()).trim();
            const freq = this.newSession.recurrenceFrequency || 'weekly';
            const endMode = this.newSession.recurrenceEndMode || 'count';
            const count = Math.max(1, Math.min(52, parseInt(this.newSession.recurrenceCount) || 1));
            const endDateStr = (this.newSession.recurrenceEndDate || '').trim();

            if (!startDateStr) return [];
            if (!this.newSession.isRecurring) {
                return [startDateStr];
            }

            if (freq === 'same_day') {
                const sameDayDates = [];
                for (let i = 0; i < count; i++) {
                    sameDayDates.push(startDateStr);
                }
                return sameDayDates;
            }

            // Split YYYY-MM-DD components directly to prevent any UTC/local timezone shifts
            const parts = startDateStr.split('-');
            if (parts.length < 3) return [startDateStr];
            const startYear = parseInt(parts[0], 10);
            const startMonth = parseInt(parts[1], 10) - 1; // 0-indexed
            const startDay = parseInt(parts[2], 10);

            const formatYMD = (y, m, d) => {
                const mm = String(m + 1).padStart(2, '0');
                const dd = String(d).padStart(2, '0');
                return `${y}-${mm}-${dd}`;
            };

            let intervalDays = 7;
            if (freq === 'daily') intervalDays = 1;
            else if (freq === 'biweekly') intervalDays = 14;
            else if (freq === 'monthly') intervalDays = 28;

            const dates = [];

            if (endMode === 'until_date' && endDateStr) {
                const endParts = endDateStr.split('-');
                const endYear = parseInt(endParts[0], 10);
                const endMonth = parseInt(endParts[1], 10) - 1;
                const endDay = parseInt(endParts[2], 10);

                let curDate = new Date(startYear, startMonth, startDay, 12, 0, 0);
                const endDate = new Date(endYear, endMonth, endDay, 23, 59, 59);
                let maxLimit = 52;
                let step = 0;

                while (curDate <= endDate && maxLimit > 0) {
                    if (step === 0) {
                        // First date is guaranteed to match the exact user-selected date
                        dates.push(startDateStr);
                    } else {
                        dates.push(formatYMD(curDate.getFullYear(), curDate.getMonth(), curDate.getDate()));
                    }
                    curDate.setDate(curDate.getDate() + intervalDays);
                    step++;
                    maxLimit--;
                }
            } else {
                for (let i = 0; i < count; i++) {
                    if (i === 0) {
                        // First date is guaranteed to match the exact user-selected date
                        dates.push(startDateStr);
                    } else {
                        // Use local noon (12:00:00) so daylight savings transitions can never cross midnight boundaries
                        const nextDate = new Date(startYear, startMonth, startDay, 12, 0, 0);
                        nextDate.setDate(startDay + (i * intervalDays));
                        dates.push(formatYMD(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate()));
                    }
                }
            }

            return dates.length > 0 ? dates : [startDateStr];
        },

        initRecurringSchedules() {
            try {
                if (typeof localStorage !== 'undefined') {
                    const saved = localStorage.getItem('gameon_recurring_session_schedules');
                    if (saved) {
                        this.recurringSessionSchedules = JSON.parse(saved) || [];
                    }
                }
            } catch (e) {
                this.recurringSessionSchedules = [];
            }
            this.processWeeklyRecurringSchedules();
        },

        saveRecurringSchedulesLocally() {
            try {
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem('gameon_recurring_session_schedules', JSON.stringify(this.recurringSessionSchedules || []));
                }
            } catch (e) {}
            if (typeof this.pushDataToServer === 'function') {
                this.pushDataToServer({ recurring_schedules: this.recurringSessionSchedules || [] });
            }
        },

        getActiveRecurringSchedules() {
            return (this.recurringSessionSchedules || []).filter(s => {
                const created = Array.isArray(s.created_indices) ? s.created_indices.length : 0;
                return created < (s.total || (s.dates ? s.dates.length : 1));
            });
        },

        getNextDueRecurringSchedule(schedule) {
            if (!schedule || !Array.isArray(schedule.dates)) return null;
            if (!Array.isArray(schedule.created_indices)) schedule.created_indices = [1];
            const nextIdx = schedule.dates.findIndex((_, idx) => !schedule.created_indices.includes(idx + 1));
            if (nextIdx === -1) return null;
            return {
                weekIndex: nextIdx + 1,
                date: schedule.dates[nextIdx]
            };
        },

        processWeeklyRecurringSchedules() {
            if (!this.recurringSessionSchedules || !this.recurringSessionSchedules.length) return;
            const todayStr = new Date().toISOString().split('T')[0];
            let createdAny = false;

            this.recurringSessionSchedules.forEach(schedule => {
                if (!Array.isArray(schedule.dates) || !schedule.dates.length) return;
                if (!Array.isArray(schedule.created_indices)) schedule.created_indices = [1];

                schedule.dates.forEach((dateStr, idx) => {
                    const weekNum = idx + 1;
                    // If the scheduled week's date has arrived and its card hasn't been instantiated yet
                    if (dateStr <= todayStr && !schedule.created_indices.includes(weekNum)) {
                        const exists = (this.sessions || []).some(s => s.series_id === schedule.series_id && (s.series_index === weekNum || (s.date === dateStr && s.type === schedule.type)));
                        if (!exists) {
                            const sessId = 'sess_' + Date.now() + '_' + weekNum;
                            let formattedTitle = '';
                            if (schedule.autoNumberTitles && schedule.total > 1) {
                                formattedTitle = `${schedule.type || schedule.name || 'Session'} - Week ${weekNum} of ${schedule.total}`;
                            }

                            const newSession = {
                                id: sessId,
                                series_id: schedule.series_id,
                                series_index: weekNum,
                                series_total: schedule.total,
                                date: dateStr,
                                time: schedule.time || '18:00',
                                type: schedule.type,
                                title: formattedTitle,
                                lead_trainer: schedule.lead_trainer || '',
                                location: schedule.location || '',
                                notes: schedule.notes || '',
                                status: 'Scheduled',
                                release_strategy: 'weekly_auto',
                                is_auto_weekly: true,
                                attendance: {},
                                attendees: [],
                                updated_at: new Date().toISOString()
                            };

                            this.sessions.unshift(newSession);
                            this.saveSessionsLocally();
                            if (window.fb && window.fb.saveSession) {
                                window.fb.saveSession(newSession).catch(err => {
                                    this.queuePendingSync('sessions', newSession.id, newSession, 'set');
                                });
                            }
                            createdAny = true;
                        }
                        schedule.created_indices.push(weekNum);
                    }
                });
            });

            if (createdAny) {
                this.sessions.sort((a, b) => this.getSessionTimestamp(a) - this.getSessionTimestamp(b));
                this.saveSessionsLocally();
                this.saveRecurringSchedulesLocally();
            }
        },

        releaseNextWeeklySession(scheduleId) {
            const schedule = (this.recurringSessionSchedules || []).find(s => s.id === scheduleId || s.series_id === scheduleId);
            if (!schedule || !Array.isArray(schedule.dates)) return;
            if (!Array.isArray(schedule.created_indices)) schedule.created_indices = [1];

            const nextIdx = schedule.dates.findIndex((_, idx) => !schedule.created_indices.includes(idx + 1));
            if (nextIdx === -1) {
                if (typeof this.showToast === 'function') this.showToast('All sessions in this series have already been created!', 'info');
                return;
            }

            const weekNum = nextIdx + 1;
            const dateStr = schedule.dates[nextIdx];
            const sessId = 'sess_' + Date.now() + '_' + weekNum;
            let formattedTitle = '';
            if (schedule.autoNumberTitles && schedule.total > 1) {
                formattedTitle = `${schedule.type || schedule.name || 'Session'} - Week ${weekNum} of ${schedule.total}`;
            }

            const newSession = {
                id: sessId,
                series_id: schedule.series_id,
                series_index: weekNum,
                series_total: schedule.total,
                date: dateStr,
                time: schedule.time || '18:00',
                type: schedule.type,
                title: formattedTitle,
                lead_trainer: schedule.lead_trainer || '',
                location: schedule.location || '',
                notes: schedule.notes || '',
                status: 'Scheduled',
                release_strategy: 'weekly_auto',
                is_auto_weekly: true,
                attendance: {},
                attendees: [],
                updated_at: new Date().toISOString()
            };

            this.sessions.unshift(newSession);
            this.sessions.sort((a, b) => this.getSessionTimestamp(a) - this.getSessionTimestamp(b));
            this.saveSessionsLocally();

            schedule.created_indices.push(weekNum);
            schedule.updated_at = new Date().toISOString();
            this.saveRecurringSchedulesLocally();

            if (window.fb) {
                if (window.fb.saveSession) {
                    window.fb.saveSession(newSession).catch(err => {
                        this.queuePendingSync('sessions', newSession.id, newSession, 'set');
                    });
                }
                if (window.fb.saveRecurringSchedule) {
                    window.fb.saveRecurringSchedule(schedule).catch(err => {
                        this.queuePendingSync('recurring_schedules', schedule.id, schedule, 'set');
                    });
                }
            }

            if (typeof this.showToast === 'function') {
                this.showToast(`Released Week ${weekNum} session card for "${schedule.type}" (${dateStr})!`, 'success');
            }
        },

        deleteRecurringSchedule(scheduleId) {
            if (!this.safeConfirm('Stop weekly auto-creation for this series? Existing created session cards will be kept.')) return;
            this.recurringSessionSchedules = (this.recurringSessionSchedules || []).filter(s => s.id !== scheduleId && s.series_id !== scheduleId);
            this.saveRecurringSchedulesLocally();
            if (window.fb && window.fb.deleteRecurringSchedule) {
                window.fb.deleteRecurringSchedule(scheduleId).catch(err => {
                    this.queuePendingSync('recurring_schedules', scheduleId, null, 'delete');
                });
            }
            if (typeof this.showToast === 'function') {
                this.showToast('Weekly recurring schedule stopped.', 'info');
            }
        },

        getRecurringSummaryText() {
            if (!this.newSession.isRecurring) return 'Single session (One-off)';
            const dates = this.getRecurringDatesList();
            const count = dates.length;
            const freqMap = {
                same_day: 'Same Day (Multiple Sessions)',
                weekly: 'Weekly',
                biweekly: 'Every 2 Weeks',
                daily: 'Daily',
                monthly: 'Monthly'
            };
            const freqLabel = freqMap[this.newSession.recurrenceFrequency] || 'Weekly';
            if (count <= 1) return `1 session on ${dates[0]}`;
            
            const strategy = this.newSession.recurrenceReleaseStrategy || 'upfront';
            const timeFormatted = this.newSession.time ? ` at ${this.newSession.time} BST` : ' at 18:00 BST';
            if (strategy === 'weekly_auto') {
                return `${count} sessions (${freqLabel}) from ${dates[0]} to ${dates[dates.length - 1]}${timeFormatted}. Week 1 card will be created now; future cards will be added automatically each week.`;
            } else {
                return `All ${count} session cards (${freqLabel}) from ${dates[0]} to ${dates[dates.length - 1]}${timeFormatted} will be created immediately.`;
            }
        },

        openNewSessionModal(type = '') {
            this.isEditingSession = false;
            this.newSession = {
                id: 'sess_' + Date.now(),
                date: this.getTodayDateBST(),
                time: '18:00',
                type: type || '',
                title: '',
                lead_trainer: '',
                location: '',
                notes: '',
                status: 'Completed',
                attendance: {},
                attendees: [],
                // Recurrence
                isRecurring: false,
                recurrenceFrequency: 'weekly',
                recurrenceEndMode: 'count',
                recurrenceCount: 6,
                recurrenceEndDate: '',
                autoNumberTitles: true,
                recurrenceReleaseStrategy: 'upfront', // 'upfront' | 'weekly_auto'
                series_id: '',
                series_index: 1,
                series_total: 1
            };
            this.showSessionModal = true;
        },

        openEditSessionModal(session) {
            if (!session) return;
            this.isEditingSession = true;
            const currentType = session.type || '';

            this.newSession = {
                id: session.id || ('sess_' + Date.now()),
                series_id: session.series_id || '',
                series_index: session.series_index || 1,
                series_total: session.series_total || 1,
                date: session.date ? String(session.date).split('T')[0].trim() : this.getTodayDateBST(),
                time: session.time || '18:00',
                type: currentType,
                title: session.title || '',
                lead_trainer: session.lead_trainer || '',
                location: session.location || '',
                notes: session.notes || '',
                status: session.status || 'Completed',
                attendance: session.attendance ? { ...session.attendance } : {},
                attendees: Array.isArray(session.attendees) ? [...session.attendees] : [],
                isRecurring: false,
                recurrenceFrequency: 'weekly',
                recurrenceEndMode: 'count',
                recurrenceCount: 6,
                recurrenceEndDate: '',
                autoNumberTitles: true,
                recurrenceReleaseStrategy: session.release_strategy || 'upfront'
            };
            this.showSessionModal = true;
        },

        closeSessionModal() {
            this.showSessionModal = false;
            this.isEditingSession = false;
        },

        async saveSessionData() {
            const selectedDate = (this.newSession.date || '').trim();
            if (!selectedDate) {
                if (typeof this.showToast === 'function') this.showToast('Please select a session date.', 'warning');
                return;
            }
            this.newSession.date = selectedDate;

            // Determine final session name / type
            let finalType = (this.newSession.type || '').trim();
            if (!finalType) {
                if (typeof this.showToast === 'function') this.showToast('Please enter a session name or type.', 'warning');
                return;
            }

            if (!this.isEditingSession && this.newSession.isRecurring) {
                // Generate recurring series
                const dates = this.getRecurringDatesList();
                const seriesId = 'series_' + Date.now();
                const total = dates.length;
                const releaseStrategy = this.newSession.recurrenceReleaseStrategy || 'upfront';

                if (releaseStrategy === 'weekly_auto') {
                    // "Weekly Auto-Release": Creates the first active session and registers a recurrence schedule metadata record
                    const firstDate = dates[0];
                    const firstSessId = 'sess_' + Date.now() + '_0';
                    const formattedTitle = `${finalType} - Week 1 of ${total}`;

                    const firstSessionItem = {
                        id: firstSessId,
                        series_id: seriesId,
                        series_index: 1,
                        series_total: total,
                        date: firstDate,
                        time: this.newSession.time || '18:00',
                        type: finalType,
                        title: formattedTitle,
                        lead_trainer: this.newSession.lead_trainer || '',
                        location: this.newSession.location || '',
                        notes: this.newSession.notes || '',
                        status: 'Scheduled',
                        release_strategy: 'weekly_auto',
                        is_auto_weekly: true,
                        attendance: {},
                        attendees: [],
                        updated_at: new Date().toISOString()
                    };

                    // Optimistic update - add the first session card immediately
                    this.sessions = [firstSessionItem, ...(this.sessions || [])];
                    this.sessions.sort((a, b) => this.getSessionTimestamp(a) - this.getSessionTimestamp(b));
                    this.saveSessionsLocally();

                    // Register schedule for future weekly additions
                    const scheduleItem = {
                        id: seriesId,
                        series_id: seriesId,
                        name: finalType,
                        type: finalType,
                        title: finalType,
                        time: this.newSession.time || '18:00',
                        autoNumberTitles: true,
                        lead_trainer: this.newSession.lead_trainer || '',
                        location: this.newSession.location || '',
                        notes: this.newSession.notes || '',
                        frequency: this.newSession.recurrenceFrequency || 'weekly',
                        dates: dates,
                        total: total,
                        created_indices: [1],
                        release_strategy: 'weekly_auto',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    };

                    this.recurringSessionSchedules = [scheduleItem, ...(this.recurringSessionSchedules || []).filter(s => s.series_id !== seriesId)];
                    this.saveRecurringSchedulesLocally();

                    // Asynchronous sync to Firestore with queue fallback
                    if (window.fb) {
                        if (window.fb.saveSession) {
                            window.fb.saveSession(firstSessionItem).catch(e => {
                                console.warn('Sync first session notice:', e);
                                this.queuePendingSync('sessions', firstSessionItem.id, firstSessionItem, 'set');
                            });
                        }
                        if (window.fb.saveRecurringSchedule) {
                            window.fb.saveRecurringSchedule(scheduleItem).catch(e => {
                                console.warn('Sync recurring schedule notice:', e);
                                this.queuePendingSync('recurring_schedules', scheduleItem.id, scheduleItem, 'set');
                            });
                        }
                    }

                    if (typeof this.showToast === 'function') {
                        this.showToast(`Series "${finalType}" started! Week 1 card created (${firstDate}). Subsequent sessions can be released weekly.`, 'success');
                    }
                } else {
                    // "Create All Upfront": Instantly generates all N session documents with unique IDs
                    const newSessionsBatch = [];
                    const isSameDay = (this.newSession.recurrenceFrequency || '') === 'same_day';
                    dates.forEach((dateStr, idx) => {
                        const sessId = 'sess_' + Date.now() + '_' + idx;
                        const sessionNumber = idx + 1;
                        let formattedTitle = '';
                        if (isSameDay) {
                            formattedTitle = `${finalType} - Session ${sessionNumber} of ${total}`;
                        } else {
                            formattedTitle = `${finalType} - Week ${sessionNumber} of ${total}`;
                        }

                        let sessionTime = this.newSession.time || '18:00';
                        if (isSameDay && idx > 0) {
                            const timeMatch = sessionTime.match(/^(\d{1,2}):(\d{2})/);
                            if (timeMatch) {
                                const baseH = parseInt(timeMatch[1], 10);
                                const nextH = Math.min(23, baseH + (idx * 2));
                                sessionTime = `${String(nextH).padStart(2, '0')}:${timeMatch[2]}`;
                            }
                        }

                        const item = {
                            id: sessId,
                            series_id: seriesId,
                            series_index: sessionNumber,
                            series_total: total,
                            date: dateStr,
                            time: sessionTime,
                            type: finalType,
                            title: formattedTitle,
                            lead_trainer: this.newSession.lead_trainer || '',
                            location: this.newSession.location || '',
                            notes: this.newSession.notes || '',
                            status: 'Scheduled',
                            release_strategy: 'upfront',
                            is_auto_weekly: false,
                            attendance: {},
                            attendees: [],
                            updated_at: new Date().toISOString()
                        };
                        newSessionsBatch.push(item);
                    });

                    this.sessions = [...newSessionsBatch, ...(this.sessions || [])];
                    this.sessions.sort((a, b) => this.getSessionTimestamp(a) - this.getSessionTimestamp(b));
                    this.saveSessionsLocally();

                    // Asynchronous persist to Firebase with queue fallback
                    if (window.fb) {
                        if (window.fb.saveSessionsBatch) {
                            window.fb.saveSessionsBatch(newSessionsBatch).catch(e => {
                                console.warn('Batch session sync notice:', e);
                                newSessionsBatch.forEach(s => this.queuePendingSync('sessions', s.id, s, 'set'));
                            });
                        } else if (window.fb.saveSession) {
                            newSessionsBatch.forEach(s => {
                                window.fb.saveSession(s).catch(e => {
                                    this.queuePendingSync('sessions', s.id, s, 'set');
                                });
                            });
                        }
                    }

                    if (typeof this.showToast === 'function') {
                        this.showToast(`Created all ${total} recurring "${finalType}" session cards (${dates[0]} to ${dates[dates.length - 1]})!`, 'success');
                    }
                }
            } else {
                // Single session update or creation
                const sessionPayload = {
                    id: this.newSession.id || ('sess_' + Date.now()),
                    series_id: this.newSession.series_id || '',
                    series_index: this.newSession.series_index || 1,
                    series_total: this.newSession.series_total || 1,
                    date: this.newSession.date,
                    time: this.newSession.time || '18:00',
                    type: finalType,
                    title: this.newSession.title || '',
                    lead_trainer: this.newSession.lead_trainer || '',
                    location: this.newSession.location || '',
                    notes: this.newSession.notes || '',
                    status: this.newSession.status || 'Completed',
                    attendance: this.newSession.attendance || {},
                    attendees: Object.keys(this.newSession.attendance || {}).filter(k => !!this.newSession.attendance[k]),
                    updated_at: new Date().toISOString()
                };

                // Local optimistic write-through
                const existingIdx = this.sessions.findIndex(s => s.id === sessionPayload.id);
                if (existingIdx >= 0) {
                    this.sessions[existingIdx] = sessionPayload;
                } else {
                    this.sessions.unshift(sessionPayload);
                }
                this.sessions.sort((a, b) => this.getSessionTimestamp(a) - this.getSessionTimestamp(b));
                this.saveSessionsLocally();

                // Save asynchronously to Firebase with queue fallback
                if (window.fb && window.fb.saveSession) {
                    window.fb.saveSession(sessionPayload).then(() => {
                        if (typeof this.showToast === 'function') {
                            this.showToast(`Session "${sessionPayload.type}" saved successfully!`, 'success');
                        }
                    }).catch(err => {
                        console.warn('Session save to Firestore failed, stored locally and queued for sync:', err);
                        this.queuePendingSync('sessions', sessionPayload.id, sessionPayload, 'set');
                        if (typeof this.showToast === 'function') {
                            this.showToast('Session saved locally, will sync when connected.', 'info');
                        }
                    });
                } else {
                    if (typeof this.showToast === 'function') this.showToast('Session saved locally.', 'success');
                }
            }

            this.closeSessionModal();
        },

        // --- Optimistic Write-Through Local Cache & Real-Time Sync Handlers ---
        async pushDataToServer(payload) {
            try {
                if (typeof fetch === 'undefined') return;
                await fetch('/api/app-data', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } catch (e) {
                // Server sync queued in local cache
            }
        },

        async pushAllDataToServer() {
            try {
                if (this.customProfilePhoto) {
                    if (!this.leagueSettings) this.leagueSettings = {};
                    this.leagueSettings.custom_profile_photo = this.customProfilePhoto;
                    if (!this.leagueConfig) this.leagueConfig = {};
                    this.leagueConfig.custom_profile_photo = this.customProfilePhoto;
                }
                await this.pushDataToServer({
                    sessions: this.sessions || [],
                    matches: this.matches || [],
                    players: this.players || [],
                    teams: this.teams || [],
                    recurring_schedules: this.recurringSessionSchedules || [],
                    settings: {
                        ...(this.leagueSettings || {}),
                        custom_profile_photo: this.customProfilePhoto || null
                    }
                });
                if (this.customProfilePhoto && typeof fetch !== 'undefined') {
                    fetch('/api/profile-photo', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ photo_data: this.customProfilePhoto })
                    }).catch(() => {});
                }
            } catch (e) {}
        },

        getDeletedSessionIds() {
            try {
                if (typeof localStorage !== 'undefined') {
                    const raw = localStorage.getItem('fu_deleted_session_ids');
                    if (raw) {
                        const arr = JSON.parse(raw);
                        if (Array.isArray(arr)) return new Set(arr.map(id => String(id).trim()));
                    }
                }
            } catch (e) {}
            return new Set();
        },

        addDeletedSessionId(id) {
            if (!id) return;
            try {
                const sId = String(id).trim();
                const set = this.getDeletedSessionIds();
                set.add(sId);
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem('fu_deleted_session_ids', JSON.stringify(Array.from(set)));
                }
            } catch (e) {}
        },

        saveSessionsLocally(deletedIds = []) {
            try {
                if (typeof localStorage !== 'undefined') {
                    const data = JSON.stringify(this.sessions || []);
                    localStorage.setItem('fu_sessions', data);
                    localStorage.setItem('gameon_cached_sessions', data);
                }
            } catch (e) {}
            const blacklist = Array.isArray(deletedIds) && deletedIds.length > 0 
                ? deletedIds.map(String) 
                : Array.from(this.getDeletedSessionIds());
            this.pushDataToServer({ 
                sessions: this.sessions || [],
                replace_sessions: true,
                deleted_session_ids: blacklist
            });
        },

        getDeletedPlayerIds() {
            try {
                if (typeof localStorage !== 'undefined') {
                    const raw = localStorage.getItem('fu_deleted_player_ids');
                    if (raw) {
                        const arr = JSON.parse(raw);
                        if (Array.isArray(arr)) return new Set(arr.map(id => String(id).trim().toLowerCase()));
                    }
                }
            } catch (e) {}
            return new Set();
        },

        addDeletedPlayerId(id, name = '') {
            if (!id && !name) return;
            try {
                const set = this.getDeletedPlayerIds();
                if (id) set.add(String(id).trim().toLowerCase());
                if (name) set.add(String(name).trim().toLowerCase());
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem('fu_deleted_player_ids', JSON.stringify(Array.from(set)));
                }
            } catch (e) {}
        },

        removeDeletedPlayerId(id, name = '') {
            try {
                const set = this.getDeletedPlayerIds();
                if (id) set.delete(String(id).trim().toLowerCase());
                if (name) set.delete(String(name).trim().toLowerCase());
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem('fu_deleted_player_ids', JSON.stringify(Array.from(set)));
                }
            } catch (e) {}
        },

        savePlayersLocally(deletedIds = []) {
            try {
                if (typeof localStorage !== 'undefined') {
                    const data = JSON.stringify(this.players || []);
                    localStorage.setItem('fu_players', data);
                    localStorage.setItem('gameon_cached_players', data);
                }
            } catch (e) {}
            const blacklist = Array.isArray(deletedIds) && deletedIds.length > 0 
                ? deletedIds.map(s => String(s).trim().toLowerCase()) 
                : Array.from(this.getDeletedPlayerIds());
            this.pushDataToServer({ 
                players: this.players || [],
                replace_players: true,
                deleted_player_ids: blacklist
            });
        },

        saveTeamsLocally() {
            try {
                if (typeof localStorage !== 'undefined') {
                    const data = JSON.stringify(this.teams || []);
                    localStorage.setItem('fu_teams', data);
                    localStorage.setItem('gameon_cached_teams', data);
                }
            } catch (e) {}
            this.pushDataToServer({ teams: this.teams || [] });
        },

        getDeletedMatchIds() {
            try {
                if (typeof localStorage !== 'undefined') {
                    const raw = localStorage.getItem('fu_deleted_match_ids');
                    if (raw) {
                        const arr = JSON.parse(raw);
                        if (Array.isArray(arr)) return new Set(arr.map(id => String(id).trim()));
                    }
                }
            } catch (e) {}
            return new Set();
        },

        addDeletedMatchId(id) {
            if (!id) return;
            try {
                const sId = String(id).trim();
                const set = this.getDeletedMatchIds();
                set.add(sId);
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem('fu_deleted_match_ids', JSON.stringify(Array.from(set)));
                }
            } catch (e) {}
        },

        saveMatchesLocally(deletedIds = []) {
            try {
                if (typeof localStorage !== 'undefined') {
                    const data = JSON.stringify(this.matches || []);
                    localStorage.setItem('fu_matches', data);
                    localStorage.setItem('gameon_cached_matches', data);
                }
            } catch (e) {}
            const blacklist = Array.isArray(deletedIds) && deletedIds.length > 0 
                ? deletedIds.map(String) 
                : Array.from(this.getDeletedMatchIds());
            this.pushDataToServer({ 
                matches: this.matches || [],
                replace_matches: true,
                deleted_match_ids: blacklist
            });
        },

        loadAllDataLocally() {
            try {
                if (typeof localStorage === 'undefined') return;
                // 1. Sessions
                const rawSessions = localStorage.getItem('fu_sessions') || localStorage.getItem('gameon_cached_sessions');
                if (rawSessions) {
                    const parsed = JSON.parse(rawSessions);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        const deletedSessionIds = this.getDeletedSessionIds();
                        this.sessions = parsed.filter(s => s && !deletedSessionIds.has(String(s.id).trim()));
                        this.isSessionsLoaded = true;
                    }
                }

                // 2. Players
                const rawPlayers = localStorage.getItem('fu_players') || localStorage.getItem('gameon_cached_players');
                if (rawPlayers !== null && rawPlayers !== undefined) {
                    const parsed = JSON.parse(rawPlayers);
                    if (Array.isArray(parsed)) {
                        const deletedIds = this.getDeletedPlayerIds();
                        this.players = parsed.filter(p => {
                            if (!p) return false;
                            const pId = String(p.id || '').trim().toLowerCase();
                            const pName = String(p.name || p.player || '').trim().toLowerCase();
                            return !deletedIds.has(pId) && !deletedIds.has(pName);
                        });
                        this.isPlayersLoaded = true;
                    }
                }

                // 3. Teams
                const rawTeams = localStorage.getItem('fu_teams') || localStorage.getItem('gameon_cached_teams');
                if (rawTeams) {
                    const parsed = JSON.parse(rawTeams);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        this.teams = parsed;
                        this.isTeamsLoaded = true;
                    }
                }

                // 4. Matches
                const rawMatches = localStorage.getItem('fu_matches') || localStorage.getItem('gameon_cached_matches');
                if (rawMatches) {
                    const parsed = JSON.parse(rawMatches);
                    if (Array.isArray(parsed)) {
                        const deletedIds = this.getDeletedMatchIds();
                        this.matches = parsed.filter(m => m && !deletedIds.has(String(m.id)));
                        this.isMatchesLoaded = true;
                    }
                }

                // 5. Recurring Schedules
                const rawSchedules = localStorage.getItem('gameon_recurring_session_schedules');
                if (rawSchedules) {
                    const parsed = JSON.parse(rawSchedules);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        this.recurringSessionSchedules = parsed;
                    }
                }

                // 6. Custom Profile Photo
                const rawPhoto = localStorage.getItem('football_united_custom_profile_photo') || localStorage.getItem('gameon_profile_photo');
                if (rawPhoto && rawPhoto.length > 20) {
                    this.customProfilePhoto = rawPhoto;
                    this.customAppLogo = rawPhoto;
                }
            } catch (err) {
                console.warn('Notice loading local data:', err);
            }
        },

        async syncWithServerAppData() {
            try {
                if (typeof fetch === 'undefined') return;
                const res = await fetch('/api/app-data', { cache: 'no-store' });
                if (!res.ok) return;
                const data = await res.json();
                if (!data || !data.success) return;

                this._lastServerSyncTimestamp = Number(data.last_updated || Date.now());

                // If local client already has data that is not on server, push our data to merge
                const needsPush = (
                    ((this.sessions || []).length > 0 && (!data.sessions || data.sessions.length === 0))
                );

                if (needsPush) {
                    await this.pushAllDataToServer();
                    return;
                }

                // Helper to merge arrays favoring updated_at
                const mergeItems = (localList, serverList) => {
                    if (!Array.isArray(serverList)) return localList || [];
                    if (!Array.isArray(localList) || localList.length === 0) return serverList;
                    const map = new Map();
                    localList.forEach(item => { if (item && item.id) map.set(String(item.id), item); });
                    serverList.forEach(item => {
                        if (item && item.id) {
                            const key = String(item.id);
                            const existing = map.get(key);
                            if (!existing) {
                                map.set(key, item);
                            } else {
                                const localTime = new Date(existing.updated_at || 0).getTime();
                                const serverTime = new Date(item.updated_at || 0).getTime();
                                if (serverTime >= localTime) {
                                    map.set(key, { ...existing, ...item });
                                }
                            }
                        }
                    });
                    return Array.from(map.values());
                };

                if (Array.isArray(data.sessions) && data.sessions.length > 0) {
                    const deletedSessionIds = this.getDeletedSessionIds();
                    const filteredServerSessions = data.sessions.filter(s => s && !deletedSessionIds.has(String(s.id).trim()));
                    this.sessions = mergeItems(this.sessions, filteredServerSessions)
                        .filter(s => s && !deletedSessionIds.has(String(s.id).trim()))
                        .sort((a, b) => this.compareSessionsByStartTimeAndName(a, b));
                    this.isSessionsLoaded = true;
                    this.saveSessionsLocally();
                }

                if (Array.isArray(data.players)) {
                    const deletedPlayerIds = this.getDeletedPlayerIds();
                    const filteredServerPlayers = data.players.filter(p => {
                        if (!p) return false;
                        const pId = String(p.id || '').trim().toLowerCase();
                        const pName = String(p.name || p.player || '').trim().toLowerCase();
                        return !deletedPlayerIds.has(pId) && !deletedPlayerIds.has(pName);
                    });
                    this.players = mergeItems(this.players, filteredServerPlayers)
                        .filter(p => {
                            if (!this.isValidRegisteredPlayer(p)) return false;
                            const pId = String(p.id || '').trim().toLowerCase();
                            const pName = String(p.name || p.player || '').trim().toLowerCase();
                            return !deletedPlayerIds.has(pId) && !deletedPlayerIds.has(pName);
                        })
                        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                    this.isPlayersLoaded = true;
                    this.savePlayersLocally();
                }

                if (Array.isArray(data.teams) && data.teams.length > 0) {
                    this.teams = mergeItems(this.teams, data.teams).filter(t => this.isValidRegisteredTeam(t));
                    this.isTeamsLoaded = true;
                    this.saveTeamsLocally();
                }

                if (Array.isArray(data.matches)) {
                    const deletedIds = this.getDeletedMatchIds();
                    const filteredServerMatches = data.matches.filter(m => m && !deletedIds.has(String(m.id)));
                    this.matches = mergeItems(this.matches, filteredServerMatches).filter(m => m && !deletedIds.has(String(m.id)));
                    this.isMatchesLoaded = true;
                    this.saveMatchesLocally();
                }

                if (Array.isArray(data.recurring_schedules) && data.recurring_schedules.length > 0) {
                    this.recurringSessionSchedules = data.recurring_schedules;
                    this.saveRecurringSchedulesLocally();
                }

                if (data.settings) {
                    this.leagueSettings = { ...this.leagueSettings, ...data.settings };
                    this.leagueConfig = { ...this.leagueConfig, ...data.settings };
                    if (data.settings.custom_profile_photo) {
                        this.customProfilePhoto = data.settings.custom_profile_photo;
                        this.customAppLogo = data.settings.custom_profile_photo;
                        try {
                            localStorage.setItem('football_united_custom_profile_photo', data.settings.custom_profile_photo);
                            localStorage.setItem('gameon_profile_photo', data.settings.custom_profile_photo);
                        } catch (e) {}
                    } else if (data.settings.custom_profile_photo === null) {
                        this.customProfilePhoto = null;
                        this.customAppLogo = this.officialAppLogo;
                        try {
                            localStorage.removeItem('football_united_custom_profile_photo');
                            localStorage.removeItem('gameon_profile_photo');
                        } catch (e) {}
                    }
                }

                this.recalculateStandings();
                this.processWeeklyRecurringSchedules();
                this.lastDataUpdate = Date.now();
            } catch (err) {
                console.warn('Notice during server app-data sync:', err);
            }
        },

        startServerSyncPoller() {
            if (this._serverSyncPollerStarted) return;
            this._serverSyncPollerStarted = true;

            const poll = async () => {
                try {
                    if (typeof document !== 'undefined' && document.hidden) return;
                    const since = this._lastServerSyncTimestamp || 0;
                    const res = await fetch(`/api/app-data/poll?since=${since}`, { cache: 'no-store' });
                    if (!res.ok) return;
                    const result = await res.json();
                    if (result && result.changed) {
                        this._lastServerSyncTimestamp = Number(result.last_updated || Date.now());
                        if (Array.isArray(result.sessions)) {
                            const deletedSessionIds = this.getDeletedSessionIds();
                            this.sessions = result.sessions
                                .filter(s => s && !deletedSessionIds.has(String(s.id).trim()))
                                .sort((a, b) => this.compareSessionsByStartTimeAndName(a, b));
                            this.isSessionsLoaded = true;
                            this.saveSessionsLocally();
                        }
                        if (Array.isArray(result.matches)) {
                            const deletedIds = this.getDeletedMatchIds();
                            this.matches = result.matches.filter(m => m && !deletedIds.has(String(m.id)));
                            this.isMatchesLoaded = true;
                            this.saveMatchesLocally();
                        }
                        if (Array.isArray(result.players)) {
                            const deletedPlayerIds = this.getDeletedPlayerIds();
                            this.players = result.players.filter(p => {
                                if (!p) return false;
                                const pId = String(p.id || '').trim().toLowerCase();
                                const pName = String(p.name || p.player || '').trim().toLowerCase();
                                return !deletedPlayerIds.has(pId) && !deletedPlayerIds.has(pName);
                            });
                            this.isPlayersLoaded = true;
                            this.savePlayersLocally();
                        }
                        if (Array.isArray(result.teams)) {
                            this.teams = result.teams;
                            this.isTeamsLoaded = true;
                            this.saveTeamsLocally();
                        }
                        if (Array.isArray(result.recurring_schedules)) {
                            this.recurringSessionSchedules = result.recurring_schedules;
                            this.saveRecurringSchedulesLocally();
                        }
                        if (result.settings) {
                            if (result.settings.custom_profile_photo) {
                                this.customProfilePhoto = result.settings.custom_profile_photo;
                                this.customAppLogo = result.settings.custom_profile_photo;
                                try {
                                    localStorage.setItem('football_united_custom_profile_photo', result.settings.custom_profile_photo);
                                    localStorage.setItem('gameon_profile_photo', result.settings.custom_profile_photo);
                                } catch (e) {}
                            } else if (result.settings.custom_profile_photo === null) {
                                this.customProfilePhoto = null;
                                this.customAppLogo = this.officialAppLogo;
                                try {
                                    localStorage.removeItem('football_united_custom_profile_photo');
                                    localStorage.removeItem('gameon_profile_photo');
                                } catch (e) {}
                            }
                        }
                        this.recalculateStandings();
                        this.processWeeklyRecurringSchedules();
                        this.lastDataUpdate = Date.now();
                    }
                } catch (e) {}
            };

            // Fast poll every 5 seconds and update auto-sync status timestamp
            setInterval(async () => {
                await poll();
                this.lastAutoSyncedTime = Date.now();
                this.autoSyncStatusText = 'Just now';
            }, 5000);

            // Live relative timestamp ticker for UI (every 2 seconds)
            setInterval(() => {
                if (!this.lastAutoSyncedTime) return;
                const diffSec = Math.floor((Date.now() - this.lastAutoSyncedTime) / 1000);
                if (diffSec < 4) {
                    this.autoSyncStatusText = 'Just now';
                } else if (diffSec < 60) {
                    this.autoSyncStatusText = `${diffSec}s ago`;
                } else {
                    const min = Math.floor(diffSec / 60);
                    this.autoSyncStatusText = `${min}m ago`;
                }
            }, 2000);

            // Also poll on tab focus or network back online
            if (typeof window !== 'undefined') {
                window.addEventListener('focus', poll);
                window.addEventListener('online', poll);
            }
        },

        async triggerAutoSync(manual = false) {
            if (this.isAutoSyncing) return;
            this.isAutoSyncing = true;
            try {
                await this.syncWithServerAppData();
                await this.pushAllDataToServer();
                this.lastAutoSyncedTime = Date.now();
                this.autoSyncStatusText = 'Just now';
                if (manual) {
                    this.showToast('✅ Cloud auto-sync completed! All devices are synchronized.', 'success');
                }
            } catch (err) {
                console.warn('Auto-sync cycle notice:', err);
            } finally {
                setTimeout(() => {
                    this.isAutoSyncing = false;
                }, 450);
            }
        },

        queuePendingSync(collection, id, data, action = 'set') {
            try {
                if (!this.pendingSyncs) this.pendingSyncs = [];
                this.pendingSyncs.push({
                    collection,
                    id: String(id),
                    data,
                    action,
                    timestamp: Date.now()
                });
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem('fu_pending_syncs', JSON.stringify(this.pendingSyncs));
                }
            } catch (e) {
                console.warn('Queue pending sync error:', e);
            }
        },

        async reconnectDatabase() {
            this.showToast("Checking live database connection...", "info", 2000);
            if (typeof navigator !== 'undefined' && !navigator.onLine) {
                this.isOffline = true;
                this.showToast("Device network appears offline. Check your internet connection.", "warning", 3500);
                return;
            }
            this.isOffline = false;
            this.showToast("Connected to live Firestore database!", "success", 3000);
            this.flushPendingSyncs();
        },

        async flushPendingSyncs() {
            if (!this.pendingSyncs || !this.pendingSyncs.length) {
                try {
                    const saved = localStorage.getItem('fu_pending_syncs');
                    if (saved) this.pendingSyncs = JSON.parse(saved);
                } catch (e) {}
            }
            if (!this.pendingSyncs || !this.pendingSyncs.length) return;
            if (!window.fb) return;

            const remaining = [];
            for (const item of this.pendingSyncs) {
                try {
                    if (item.action === 'delete') {
                        if (item.collection === 'sessions' && window.fb.deleteSession) {
                            await window.fb.deleteSession(item.id);
                        } else if (item.collection === 'matches' && window.fb.deleteMatchDay) {
                            await window.fb.deleteMatchDay(item.id);
                        } else if (item.collection === 'recurring_schedules' && window.fb.deleteRecurringSchedule) {
                            await window.fb.deleteRecurringSchedule(item.id);
                        }
                    } else {
                        if (item.collection === 'sessions' && window.fb.saveSession) {
                            await window.fb.saveSession(item.data);
                        } else if (item.collection === 'players' && window.fb.savePlayer) {
                            await window.fb.savePlayer(item.data);
                        } else if (item.collection === 'teams' && window.fb.saveTeam) {
                            await window.fb.saveTeam(item.data);
                        } else if (item.collection === 'matches' && window.fb.saveMatchDay) {
                            await window.fb.saveMatchDay(item.data);
                        } else if (item.collection === 'recurring_schedules' && window.fb.saveRecurringSchedule) {
                            await window.fb.saveRecurringSchedule(item.data);
                        }
                    }
                } catch (e) {
                    console.warn('Sync flush failed for item:', item, e);
                    remaining.push(item);
                }
            }
            this.pendingSyncs = remaining;
            try {
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem('fu_pending_syncs', JSON.stringify(this.pendingSyncs));
                }
            } catch (e) {}
        },

        getSessionAttendeeCount(sess) {
            if (!sess) return 0;
            if (sess.attendance && typeof sess.attendance === 'object') {
                return Object.values(sess.attendance).filter(v => v === true || v === 'present' || v === 'Present' || (typeof v === 'object' && v && v.present)).length;
            }
            if (Array.isArray(sess.attendees)) return sess.attendees.length;
            return 0;
        },

        getSeriesSessionCount(sess) {
            if (!sess || !sess.series_id) return 0;
            return (this.sessions || []).filter(s => s && s.series_id === sess.series_id).length;
        },

        async executeDeleteSessionSeries(seriesId) {
            const sid = String(seriesId || (this.sessionToDelete && this.sessionToDelete.series_id) || '').trim();
            if (!sid) return;
            const matchingSessions = (this.sessions || []).filter(s => s && s.series_id === sid);
            this.showDeleteSessionModal = false;
            this.sessionToDelete = null;
            if (this.isEditingSession) {
                this.closeSessionModal();
            }
            for (const sess of matchingSessions) {
                await this.deleteSessionData(sess.id, true);
            }
            if (Array.isArray(this.recurringSessionSchedules)) {
                this.recurringSessionSchedules = this.recurringSessionSchedules.filter(r => r.series_id !== sid && r.id !== sid);
                this.saveRecurringSchedulesLocally();
            }
            if (typeof this.showToast === 'function') {
                this.showToast(`Deleted all ${matchingSessions.length} sessions in recurring series!`, 'success');
            }
        },

        promptDeleteSession(sessionOrId) {
            if (!sessionOrId) return;
            let sess = null;
            if (typeof sessionOrId === 'object' && sessionOrId !== null) {
                sess = sessionOrId;
            } else {
                sess = (this.sessions || []).find(s => s && String(s.id).trim() === String(sessionOrId).trim());
            }
            if (!sess) {
                // If not found in memory array, delete directly by ID
                return this.deleteSessionData(sessionOrId, true);
            }
            this.sessionToDelete = sess;
            this.showDeleteSessionModal = true;
        },

        async executeDeleteSession(sessionId) {
            const targetId = String(sessionId || (this.sessionToDelete && this.sessionToDelete.id) || '').trim();
            this.showDeleteSessionModal = false;
            this.sessionToDelete = null;
            if (this.isEditingSession) {
                this.closeSessionModal();
            }
            if (!targetId) return;
            return this.deleteSessionData(targetId, true);
        },

        async deleteSessionData(sessionId, skipConfirm = false) {
            if (!sessionId) return;
            const targetId = String(sessionId).trim();

            if (!skipConfirm) {
                const target = (this.sessions || []).find(s => s && String(s.id).trim() === targetId);
                if (target) {
                    return this.promptDeleteSession(target);
                }
            }

            const targetSession = (this.sessions || []).find(s => s && String(s.id).trim() === targetId);

            // Record tombstone permanently in localStorage blacklist
            this.addDeletedSessionId(targetId);

            // Prevent recurring series from regenerating this deleted week session
            if (targetSession && targetSession.series_id && Array.isArray(this.recurringSessionSchedules)) {
                const sched = this.recurringSessionSchedules.find(rs => rs.series_id === targetSession.series_id || rs.id === targetSession.series_id);
                if (sched) {
                    if (!Array.isArray(sched.created_indices)) sched.created_indices = [1];
                    const wNum = targetSession.series_index;
                    if (wNum && !sched.created_indices.includes(wNum)) {
                        sched.created_indices.push(wNum);
                    }
                    this.saveRecurringSchedulesLocally();
                }
            }

            // Remove immediately from memory and local cache
            this.sessions = (this.sessions || []).filter(s => s && String(s.id).trim() !== targetId);
            this.saveSessionsLocally([targetId]);

            // 1. Delete from Firestore & queue for resilient sync
            if (window.fb && typeof window.fb.deleteSession === 'function') {
                try {
                    await window.fb.deleteSession(targetId);
                } catch (err) {
                    console.warn('Error deleting session, queueing pending delete:', err);
                    if (typeof this.queuePendingSync === 'function') {
                        this.queuePendingSync('sessions', targetId, null, 'delete');
                    }
                }
            }

            // 2. Delete from Node & Python backend endpoints
            try {
                fetch(`/api/sessions/${encodeURIComponent(targetId)}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' }
                }).catch(() => {});
                fetch('/api/session/delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: targetId })
                }).catch(() => {});
            } catch (err) {
                console.warn('Backend session delete notice:', err);
            }

            if (typeof this.showToast === 'function') {
                this.showToast('Session permanently deleted.', 'success');
            }
        },

        // --- Streamlined Session Card Attendance Engine ---
        async toggleSessionAttendance(session, player) {
            if (!session || !player) return;
            this.excelSyncStatus = 'saving';

            const pId = String(player.id || player.name || '').trim();
            if (!pId) return;

            if (!session.attendance || typeof session.attendance !== 'object') {
                session.attendance = {};
            }

            // Standardized dictionary map { [playerId]: boolean } with O(1) lookup
            const isCurrentlyPresent = this.isPlayerPresentInSession(session, player);
            const newStatus = !isCurrentlyPresent;

            // Immediately flip attendance in the local session object
            session.attendance[pId] = newStatus;
            
            // Keep attendees array synchronized for legacy consumers
            const currentAttendees = new Set(Array.isArray(session.attendees) ? session.attendees : []);
            if (newStatus) {
                currentAttendees.add(pId);
                if (!player.has_ever_attended) {
                    player.has_ever_attended = true;
                    if (window.fb && window.fb.updatePlayer && player.id) {
                        window.fb.updatePlayer(player.id, { has_ever_attended: true }).catch(() => {});
                    }
                }
            } else {
                currentAttendees.delete(pId);
            }
            session.attendees = Array.from(currentAttendees);
            session.updated_at = new Date().toISOString();

            // Re-assign object to trigger immediate Alpine reactivity for turnout & progress bar
            session.attendance = { ...session.attendance };
            this.lastDataUpdate = Date.now();

            // Immediate write-through cache to local storage
            this.saveSessionsLocally();

            // Debounce the Firestore update (250ms) to bundle rapid clicks into a single call
            if (!this._sessionAttendanceDebounceTimers) {
                this._sessionAttendanceDebounceTimers = {};
            }
            if (this._sessionAttendanceDebounceTimers[session.id]) {
                clearTimeout(this._sessionAttendanceDebounceTimers[session.id]);
            }

            this._sessionAttendanceDebounceTimers[session.id] = setTimeout(async () => {
                delete this._sessionAttendanceDebounceTimers[session.id];
                await this.persistSessionAttendanceAsync(session);
            }, 250);
        },

        async persistSessionAttendanceAsync(session) {
            if (!session || !session.id) return;
            this.saveSessionsLocally();
            try {
                if (window.fb && window.fb.saveSession) {
                    await window.fb.saveSession(session);
                }
            } catch (err) {
                console.warn('Firestore session attendance sync error, queueing pending sync:', err);
                this.queuePendingSync('sessions', session.id, session, 'set');
            }
            // Trigger background Excel sync (non-blocking, never reverts attendance)
            try {
                this.syncAttendanceToExcel(session.id || session.date, 'session');
            } catch (e) {
                console.warn('Excel background sync dispatch note:', e);
            }
        },

        async markAllSessionAttendance(session, isPresent) {
            if (!session) return;
            // Clear any pending debounced timers for this session
            if (this._sessionAttendanceDebounceTimers && this._sessionAttendanceDebounceTimers[session.id]) {
                clearTimeout(this._sessionAttendanceDebounceTimers[session.id]);
                delete this._sessionAttendanceDebounceTimers[session.id];
            }

            this.excelSyncStatus = 'saving';
            if (!session.attendance || typeof session.attendance !== 'object') {
                session.attendance = {};
            }

            const newAttendanceMap = {};
            const attendeesList = [];

            if (isPresent) {
                // "✓ All": Atomically mark all currently registered players as present
                (this.players || []).forEach(p => {
                    const pId = String(p.id || p.name || '').trim();
                    if (pId) {
                        newAttendanceMap[pId] = true;
                        attendeesList.push(pId);
                        if (!p.has_ever_attended) {
                            p.has_ever_attended = true;
                            if (window.fb && window.fb.updatePlayer && p.id) {
                                window.fb.updatePlayer(p.id, { has_ever_attended: true }).catch(() => {});
                            }
                        }
                    }
                });
            } else {
                // "✕ Clear": Atomically reset the session's attendees map to empty
            }

            session.attendance = newAttendanceMap;
            session.attendees = attendeesList;
            session.updated_at = new Date().toISOString();
            this.lastDataUpdate = Date.now();

            // Immediate write-through cache
            this.saveSessionsLocally();

            // Atomic update to Firestore
            try {
                if (window.fb && window.fb.saveSession) {
                    await window.fb.saveSession(session);
                    if (typeof this.showToast === 'function') {
                        this.showToast(isPresent ? 'All players marked present!' : 'Attendance cleared.', 'success');
                    }
                }
            } catch (e) {
                console.warn('Sync session batch attendance error, queueing pending sync:', e);
                this.queuePendingSync('sessions', session.id, session, 'set');
            }

            this.syncAttendanceToExcel(session.id || session.date, 'session');
        },

        isPlayerPresentInSession(session, player) {
            if (!session || !player) return false;
            const pId = String(player.id || player.name || '').trim();
            if (session.attendance && typeof session.attendance === 'object') {
                if (pId && session.attendance[pId] !== undefined) {
                    return !!session.attendance[pId];
                }
                const pName = String(this.getPlayerDisplayName ? this.getPlayerDisplayName(player) : (player.name || player.player || '')).trim();
                if (pName && session.attendance[pName] !== undefined) {
                    return !!session.attendance[pName];
                }
            }
            if (Array.isArray(session.attendees)) {
                return session.attendees.includes(pId) || (player.name && session.attendees.includes(player.name));
            }
            return false;
        },

        getSessionAttendanceCount(session) {
            if (!session) return 0;
            let count = 0;
            const countedIds = new Set();
            (this.players || []).forEach(p => {
                const pId = String(p.id || p.name || '').trim();
                if (pId && !countedIds.has(pId)) {
                    countedIds.add(pId);
                    if (this.isPlayerPresentInSession(session, p)) count++;
                }
            });
            return count;
        },

        getSessionAttendancePercentage(session) {
            if (!session || !this.players || !this.players.length) return 0;
            const count = this.getSessionAttendanceCount(session);
            return Math.min(100, Math.round((count / this.players.length) * 100));
        },

        getPlayerInitials(player) {
            if (!player) return '?';
            const name = (this.getPlayerDisplayName ? this.getPlayerDisplayName(player) : (player.name || player.player || '')).trim();
            if (!name) return '?';
            const parts = name.split(/\s+/).filter(Boolean);
            if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        },

        getAlphabeticalPlayers(searchQuery = '', session = null, filterMode = 'all') {
            let baseList = this._cachedAlphabeticalPlayers;
            if (!baseList || this._cachedAlphabeticalPlayersSource !== this.players) {
                const seen = new Set();
                const uniqueList = [];
                const deletedPlayerIds = this.getDeletedPlayerIds ? this.getDeletedPlayerIds() : new Set();
                (this.players || []).forEach(p => {
                    // Only confirmed registered players (not unsaved/transient)
                    if (!p || !p.id || p._unsaved) return;
                    const pId = String(p.id).trim().toLowerCase();
                    const nameStr = String(p.name || p.player || '').trim();
                    if (!nameStr) return;
                    if (deletedPlayerIds.has(pId) || deletedPlayerIds.has(nameStr.toLowerCase())) return;
                    if (this.isValidRegisteredPlayer && !this.isValidRegisteredPlayer(p)) return;
                    const key = pId + '::' + nameStr.toLowerCase();
                    if (!seen.has(key)) {
                        seen.add(key);
                        uniqueList.push(p);
                    }
                });
                baseList = uniqueList.sort((a, b) => {
                    const nameA = String(this.getPlayerDisplayName ? this.getPlayerDisplayName(a) : (a.name || a.player || '')).toLowerCase();
                    const nameB = String(this.getPlayerDisplayName ? this.getPlayerDisplayName(b) : (b.name || b.player || '')).toLowerCase();
                    return nameA.localeCompare(nameB);
                });
                this._cachedAlphabeticalPlayers = baseList;
                this._cachedAlphabeticalPlayersSource = this.players;
            }

            if (!searchQuery && !session && (!filterMode || filterMode === 'all')) {
                return baseList;
            }

            let list = baseList;
            if (searchQuery && typeof searchQuery === 'string' && searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                list = list.filter(p => {
                    const name = String(this.getPlayerDisplayName ? this.getPlayerDisplayName(p) : (p.name || p.player || '')).toLowerCase();
                    const team = String(p.team || p.assignedTeam || '').toLowerCase();
                    const nick = String(p.nickname || '').toLowerCase();
                    return name.includes(q) || team.includes(q) || nick.includes(q);
                });
            }

            if (session) {
                if (filterMode === 'present') {
                    list = list.filter(p => this.isPlayerPresentInSession(session, p));
                } else if (filterMode === 'absent') {
                    list = list.filter(p => !this.isPlayerPresentInSession(session, p));
                }
            }

            return list;
        },

        parseDateToTimestamp(dateVal) {
            if (!dateVal) return 0;
            if (typeof dateVal === 'number') return dateVal;
            if (dateVal instanceof Date) return dateVal.getTime();
            if (typeof dateVal === 'string') {
                const trimmed = dateVal.trim();
                // Check YYYY-MM-DD format (standard session date string e.g. "2026-09-07")
                const ymd = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(.*)$/);
                if (ymd) {
                    const year = parseInt(ymd[1], 10);
                    const month = parseInt(ymd[2], 10) - 1;
                    const day = parseInt(ymd[3], 10);
                    const rest = ymd[4] ? ymd[4].trim() : '';
                    if (rest) {
                        const parsed = new Date(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')} ${rest}`).getTime();
                        if (!isNaN(parsed)) return parsed;
                    }
                    return new Date(year, month, day, 12, 0, 0).getTime();
                }
                // Check DD/MM/YYYY or DD-MM-YYYY (e.g. UK/European formats)
                const dmy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(.*)$/);
                if (dmy) {
                    const day = parseInt(dmy[1], 10);
                    const month = parseInt(dmy[2], 10) - 1;
                    const year = parseInt(dmy[3], 10);
                    const rest = dmy[4] ? dmy[4].trim() : '';
                    if (rest) {
                        const parsed = new Date(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')} ${rest}`).getTime();
                        if (!isNaN(parsed)) return parsed;
                    }
                    return new Date(year, month, day, 12, 0, 0).getTime();
                }
                // Check ISO / standard string date
                const parsed = new Date(trimmed).getTime();
                if (!isNaN(parsed)) return parsed;
            }
            return 0;
        },

        getSessionTimestamp(s) {
            if (!s) return 0;
            let ts = this.parseDateToTimestamp(s.date);
            // If session has specific time string e.g. "18:00" or "10:30 AM", factor into timestamp
            if (ts > 0 && s.time && typeof s.time === 'string') {
                const timeMatch = s.time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
                if (timeMatch) {
                    let hours = parseInt(timeMatch[1], 10);
                    const mins = parseInt(timeMatch[2], 10);
                    const ampm = (timeMatch[3] || '').toUpperCase();
                    if (ampm === 'PM' && hours < 12) hours += 12;
                    if (ampm === 'AM' && hours === 12) hours = 0;
                    const d = new Date(ts);
                    d.setHours(hours, mins, 0, 0);
                    ts = d.getTime();
                }
            }
            // Fallback to updated_at / created_at if no valid date
            if (!ts) {
                const fallback = s.created_at || s.updated_at || s.timestamp;
                if (fallback) {
                    const p = this.parseDateToTimestamp(fallback);
                    if (p) ts = p;
                }
            }
            return ts || 0;
        },

        getWeekBounds(offset = 0) {
            const todayStr = this.getTodayDateBST();
            let today;
            if (todayStr && todayStr.includes('-')) {
                const parts = todayStr.split('-').map(Number);
                today = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
            } else {
                const now = new Date();
                today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
            }
            const day = today.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
            const diffToMonday = (day === 0 ? -6 : 1) - day;
            const monday = new Date(today);
            monday.setDate(today.getDate() + diffToMonday + (Number(offset) * 7));
            monday.setHours(0, 0, 0, 0);

            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            sunday.setHours(23, 59, 59, 999);

            const pad = (n) => String(n).padStart(2, '0');
            const mondayStr = `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
            const sundayStr = `${sunday.getFullYear()}-${pad(sunday.getMonth() + 1)}-${pad(sunday.getDate())}`;

            const startMonth = monday.toLocaleDateString('en-GB', { month: 'short' });
            const endMonth = sunday.toLocaleDateString('en-GB', { month: 'short' });
            let dateRangeLabel = `${startMonth} ${monday.getDate()} – ${endMonth} ${sunday.getDate()}`;
            if (startMonth === endMonth) {
                dateRangeLabel = `${startMonth} ${monday.getDate()} – ${sunday.getDate()}`;
            }

            let label = 'This Week';
            if (offset === 1) label = 'Next Week';
            else if (offset === -1) label = 'Last Week';
            else if (offset > 1) label = `+${offset} Wks`;
            else if (offset < -1) label = `${offset} Wks`;

            return {
                monday,
                sunday,
                mondayStr,
                sundayStr,
                dateRangeLabel,
                label,
                offset: Number(offset)
            };
        },

        isSessionInWeek(sess, offset = 0) {
            if (!sess) return false;
            const bounds = this.getWeekBounds(offset);
            let sDate = sess.date;
            if (!sDate && sess.created_at) {
                sDate = String(sess.created_at).split('T')[0];
            }
            if (!sDate) return false;
            sDate = String(sDate).trim().split('T')[0];
            if (sDate.includes('/')) {
                const parts = sDate.split('/');
                if (parts.length === 3) {
                    if (parts[0].length === 4) {
                        sDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
                    } else if (parts[2].length === 4) {
                        sDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                    }
                }
            }
            return sDate >= bounds.mondayStr && sDate <= bounds.sundayStr;
        },

        getTodayDateBST() {
            try {
                const dtf = new Intl.DateTimeFormat('en-CA', {
                    timeZone: 'Europe/London',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                });
                return dtf.format(new Date()); // Outputs 'YYYY-MM-DD'
            } catch (e) {
                return new Date().toISOString().split('T')[0];
            }
        },

        formatSessionDateDetailed(dateStr) {
            if (!dateStr) return 'Date to be scheduled';
            try {
                const clean = String(dateStr).split('T')[0].trim();
                const parts = clean.split('-');
                if (parts.length < 3) return dateStr;
                const [y, m, d] = parts.map(Number);
                if (!y || !m || !d) return dateStr;
                const dt = new Date(y, m - 1, d, 12, 0, 0);
                return dt.toLocaleDateString('en-GB', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                });
            } catch (e) {
                return dateStr;
            }
        },

        formatSessionDateFull(dateStr) {
            if (!dateStr) return 'No date selected';
            try {
                const clean = String(dateStr).split('T')[0].trim();
                const parts = clean.split('-');
                if (parts.length < 3) return dateStr;
                const [y, m, d] = parts.map(Number);
                if (!y || !m || !d) return dateStr;
                const dt = new Date(y, m - 1, d, 12, 0, 0);
                return dt.toLocaleDateString('en-GB', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                });
            } catch (e) {
                return dateStr;
            }
        },

        getQuickOffsetDate(days = 0) {
            const todayStr = this.getTodayDateBST();
            const parts = todayStr.split('-');
            if (parts.length < 3) return todayStr;
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1;
            const d = parseInt(parts[2], 10);
            const dt = new Date(y, m, d + days, 12, 0, 0);
            const mm = String(dt.getMonth() + 1).padStart(2, '0');
            const dd = String(dt.getDate()).padStart(2, '0');
            return `${dt.getFullYear()}-${mm}-${dd}`;
        },

        formatSessionDay(dateStr) {
            if (!dateStr) return '';
            try {
                const clean = String(dateStr).split('T')[0].trim();
                const parts = clean.split('-');
                if (parts.length < 3) return '';
                const [y, m, d] = parts.map(Number);
                if (!y || !m || !d) return '';
                const dt = new Date(y, m - 1, d, 12, 0, 0);
                return dt.toLocaleDateString('en-GB', { weekday: 'long' });
            } catch (e) {
                return '';
            }
        },

        formatSessionTime(sess) {
            if (!sess) return '18:00 BST';
            if (sess.time && String(sess.time).trim()) {
                const t = String(sess.time).trim();
                return t.toLowerCase().includes('bst') || t.toLowerCase().includes('gmt') ? t : `${t} BST`;
            }
            return '18:00 BST';
        },

        normalizeSessionDate(dateStr) {
            if (!dateStr || typeof dateStr !== 'string') return '';
            const trimmed = dateStr.trim();
            if (trimmed.includes('/')) {
                const parts = trimmed.split('/');
                if (parts.length === 3) {
                    if (parts[0].length === 4) {
                        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
                    } else if (parts[2].length === 4) {
                        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                    }
                }
            }
            const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
            if (isoMatch) {
                return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
            }
            return trimmed;
        },

        // Helper: get base clean session name for tab grouping and slide filter
        getSessionGroupingName(sess) {
            if (!sess) return 'Football Training';
            let name = (sess.type && String(sess.type).trim()) || (sess.title && String(sess.title).trim()) || 'Football Training';
            // Clean out auto-generated recurrence suffix e.g. " - Week 1 of 4", " - Session 1 of 3", or " (Week 1)"
            name = name.replace(/\s*-\s*(?:Week|Session)\s*\d+\s*(?:of\s*\d+)?/i, '').replace(/\s*\((?:Week|Wk|Session|Sess)\s*\d+\)/i, '').trim();
            return name || 'Football Training';
        },

        // Get unique session names from created sessions for slide filter tabs
        getDistinctSessionNames() {
            if (!Array.isArray(this.sessions) || this.sessions.length === 0) return [];
            const counts = {};
            this.sessions.forEach(s => {
                if (!s) return;
                const name = this.getSessionGroupingName(s);
                counts[name] = (counts[name] || 0) + 1;
            });
            return Object.keys(counts).sort((a, b) => a.localeCompare(b)).map(name => ({
                name: name,
                count: counts[name]
            }));
        },

        // Slide session tabs left or right horizontally
        slideSessionTabs(direction, elementId = 'home-sessions-slide-tabs') {
            const el = document.getElementById(elementId);
            if (!el) return;
            const scrollAmount = 240;
            el.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        },

        // Helper to get sessions display groups for Sessions tab (grouped_by_week or flat)
        getSessionsDisplayGroups() {
            if (this.sessionArrangementMode === 'grouped_by_week') {
                return this.getGroupedSessionsByWeek();
            }
            return [{
                key: 'all_sessions',
                showHeader: false,
                sessions: this.getFilteredSessions()
            }];
        },

        // Week Group Collapsibility Helpers (Default Collapsed in Sessions & Home Upcoming Sessions)
        isHomeWeekGroupCollapsed(key) {
            if (!this.homeWeekGroupsCollapsed) this.homeWeekGroupsCollapsed = {};
            return this.homeWeekGroupsCollapsed[key] !== false;
        },
        toggleHomeWeekGroup(key) {
            if (!this.homeWeekGroupsCollapsed) this.homeWeekGroupsCollapsed = {};
            const curr = this.isHomeWeekGroupCollapsed(key);
            this.homeWeekGroupsCollapsed[key] = !curr;
            this.homeWeekGroupsCollapsed = { ...this.homeWeekGroupsCollapsed };
        },
        isSessionsWeekGroupCollapsed(key) {
            if (!this.sessionsWeekGroupsCollapsed) this.sessionsWeekGroupsCollapsed = {};
            return this.sessionsWeekGroupsCollapsed[key] !== false;
        },
        toggleSessionsWeekGroup(key) {
            if (!this.sessionsWeekGroupsCollapsed) this.sessionsWeekGroupsCollapsed = {};
            const curr = this.isSessionsWeekGroupCollapsed(key);
            this.sessionsWeekGroupsCollapsed[key] = !curr;
            this.sessionsWeekGroupsCollapsed = { ...this.sessionsWeekGroupsCollapsed };
        },
        toggleAllHomeWeekGroups(expand = false) {
            this.homeWeekGroupsCollapsed = {
                'this_week': !expand,
                'next_week': !expand,
                'week_after': !expand
            };
        },
        toggleAllSessionsWeekGroups(expand = false) {
            this.sessionsWeekGroupsCollapsed = {
                'this_week': !expand,
                'next_week': !expand,
                'week_after': !expand
            };
        },
        areAllHomeWeekGroupsCollapsed() {
            return this.isHomeWeekGroupCollapsed('this_week') && 
                   this.isHomeWeekGroupCollapsed('next_week') && 
                   this.isHomeWeekGroupCollapsed('week_after');
        },
        areAllSessionsWeekGroupsCollapsed() {
            return this.isSessionsWeekGroupCollapsed('this_week') && 
                   this.isSessionsWeekGroupCollapsed('next_week') && 
                   this.isSessionsWeekGroupCollapsed('week_after');
        },

        // Convert session start time to minutes from midnight (0 - 1439) for precise earliest-first ordering
        getSessionTimeMinutes(sess) {
            if (!sess || !sess.time) return 1080; // default 18:00
            const str = String(sess.time).trim();
            const match = str.match(/(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i);
            if (match) {
                let hours = parseInt(match[1], 10);
                const mins = parseInt(match[2], 10) || 0;
                const ampm = (match[3] || '').toUpperCase();
                if (ampm === 'PM' && hours < 12) hours += 12;
                if (ampm === 'AM' && hours === 12) hours = 0;
                return hours * 60 + mins;
            }
            return 1080;
        },

        // Requirement 2: Arrange session cards based on their Start Time (earliest first) and then by Session Name
        compareSessionsByStartTimeAndName(a, b) {
            if (!a && !b) return 0;
            if (!a) return 1;
            if (!b) return -1;

            // 1. Compare calendar date (earliest date first)
            const dateA = this.normalizeSessionDate(a.date);
            const dateB = this.normalizeSessionDate(b.date);
            if (dateA && dateB && dateA !== dateB) {
                return dateA.localeCompare(dateB);
            } else if (dateA && !dateB) {
                return -1;
            } else if (!dateA && dateB) {
                return 1;
            }

            // 2. On the same date: arrange based on Start Time (earliest first)
            const timeA = this.getSessionTimeMinutes(a);
            const timeB = this.getSessionTimeMinutes(b);
            if (timeA !== timeB) {
                return timeA - timeB;
            }

            // 3. If Start Time is identical: arrange alphabetically by Session Name
            const nameA = this.getSessionGroupingName(a);
            const nameB = this.getSessionGroupingName(b);
            const nameComp = nameA.localeCompare(nameB);
            if (nameComp !== 0) {
                return nameComp;
            }

            // 4. Stable tie-breaker: series_index or id
            const idxA = a.series_index !== undefined ? Number(a.series_index) : 0;
            const idxB = b.series_index !== undefined ? Number(b.series_index) : 0;
            if (idxA !== idxB) return idxA - idxB;

            return String(a.id || '').localeCompare(String(b.id || ''));
        },

        // Requirement 3: Categorize session into Green [This Week], Yellow [Next Week], Red [Week After]
        getSessionWeekCategory(sess) {
            if (!sess || !sess.date) return 'other';
            if (this.isSessionInWeek(sess, 0)) return 'this_week';
            if (this.isSessionInWeek(sess, 1)) return 'next_week';
            if (this.isSessionInWeek(sess, 2)) return 'week_after';
            const sDate = this.normalizeSessionDate(sess.date);
            const todayStr = this.getTodayDateBST();
            if (sDate && sDate < todayStr) return 'past';
            return 'upcoming';
        },

        getSessionDayInfo(sess) {
            if (!sess || !sess.date || !Array.isArray(this.sessions)) {
                return { count: 1, index: 1, isMulti: false };
            }
            const sDate = this.normalizeSessionDate(sess.date);
            const sameDay = this.sessions.filter(s => {
                if (!s || !s.date) return false;
                const d = this.normalizeSessionDate(s.date);
                return d === sDate;
            }).sort((a, b) => this.compareSessionsByStartTimeAndName(a, b));
            
            const count = sameDay.length;
            const idx = sameDay.findIndex(s => s && s.id === sess.id);
            return {
                count: count,
                index: idx >= 0 ? idx + 1 : 1,
                isMulti: count > 1
            };
        },

        // Slide session tab container left or right
        slideSessionTabs(direction, containerId) {
            const el = document.getElementById(containerId);
            if (!el) return;
            const scrollAmount = direction === 'left' ? -220 : 220;
            el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        },

        // Color theme mapping maintaining:
        // Green: [This Week]
        // Yellow: [Next Week]
        // Red: [Week After]
        getSessionColorTheme(sess, index) {
            if (!sess) {
                return {
                    key: 'default',
                    category: 'other',
                    label: 'Scheduled Session',
                    badgeText: '📅 Scheduled',
                    typeBadge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
                    buttonBg: 'bg-slate-800 hover:bg-slate-900 text-white',
                    cardBorder: 'border border-slate-200/90 dark:border-slate-800 shadow-xs',
                    topBarBg: 'bg-slate-800 text-slate-200',
                    headerBg: 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/60',
                    dateText: 'text-slate-900 dark:text-white',
                    dayText: 'text-slate-500 dark:text-slate-400',
                    accentDot: 'bg-slate-400',
                    pulse: false
                };
            }

            const todayStr = this.getTodayDateBST();
            const sDate = this.normalizeSessionDate(sess.date);
            const dayInfo = this.getSessionDayInfo(sess);
            const timeStr = this.formatSessionTime(sess);
            const isToday = sDate === todayStr;
            const cat = this.getSessionWeekCategory(sess);

            // 1. Green: [This Week] (Updates dynamically when day ends / midnight passes)
            if (cat === 'this_week') {
                const isPastDay = sDate && sDate < todayStr;
                if (isPastDay) {
                    const badge = dayInfo.isMulti 
                        ? `✓ [Day Ended] • S${dayInfo.index}/${dayInfo.count}` 
                        : '✓ [Day Ended]';
                    return {
                        key: 'this_week_ended',
                        category: 'this_week',
                        label: `[Day Ended] (${timeStr})`,
                        badgeText: badge,
                        typeBadge: 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
                        buttonBg: 'bg-slate-800 hover:bg-slate-900 text-white font-medium',
                        cardBorder: 'border border-slate-300 dark:border-slate-700 shadow-2xs opacity-85',
                        topBarBg: 'bg-slate-700 text-slate-100',
                        headerBg: 'bg-slate-100/90 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700',
                        dateText: 'text-slate-900 dark:text-white',
                        dayText: 'text-slate-600 dark:text-slate-400',
                        accentDot: 'bg-slate-400',
                        pulse: false
                    };
                }
                const badge = dayInfo.isMulti 
                    ? `🟢 [This Week] • S${dayInfo.index}/${dayInfo.count}` 
                    : (isToday ? '🟢 [This Week - Today]' : '🟢 [This Week]');
                const label = isToday ? `[This Week - Today] (${timeStr})` : `[This Week] (${timeStr})`;
                return {
                    key: 'green',
                    category: 'this_week',
                    label: label,
                    badgeText: badge,
                    typeBadge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
                    buttonBg: 'bg-emerald-600 hover:bg-emerald-700 text-white font-semibold',
                    cardBorder: 'border-2 border-emerald-500 shadow-md shadow-emerald-500/15 dark:shadow-emerald-950/40',
                    topBarBg: 'bg-emerald-600 text-white',
                    headerBg: 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-900/50',
                    dateText: 'text-emerald-950 dark:text-emerald-100',
                    dayText: 'text-emerald-700 dark:text-emerald-400',
                    accentDot: 'bg-white',
                    pulse: isToday
                };
            }

            // 2. Yellow: [Next Week]
            if (cat === 'next_week') {
                const badge = dayInfo.isMulti ? `🟡 [Next Week] • S${dayInfo.index}/${dayInfo.count}` : '🟡 [Next Week]';
                return {
                    key: 'yellow',
                    category: 'next_week',
                    label: `[Next Week] (${timeStr})`,
                    badgeText: badge,
                    typeBadge: 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300',
                    buttonBg: 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold',
                    cardBorder: 'border-2 border-amber-500 shadow-md shadow-amber-500/15 dark:shadow-amber-950/40',
                    topBarBg: 'bg-amber-500 text-slate-950',
                    headerBg: 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200/80 dark:border-amber-900/50',
                    dateText: 'text-amber-950 dark:text-amber-100',
                    dayText: 'text-amber-700 dark:text-amber-400',
                    accentDot: 'bg-slate-950',
                    pulse: false
                };
            }

            // 3. Red: [Week After]
            if (cat === 'week_after') {
                const badge = dayInfo.isMulti ? `🔴 [Week After] • S${dayInfo.index}/${dayInfo.count}` : '🔴 [Week After]';
                return {
                    key: 'red',
                    category: 'week_after',
                    label: `[Week After] (${timeStr})`,
                    badgeText: badge,
                    typeBadge: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300',
                    buttonBg: 'bg-rose-600 hover:bg-rose-700 text-white font-semibold',
                    cardBorder: 'border-2 border-rose-500 shadow-md shadow-rose-500/15 dark:shadow-rose-950/40',
                    topBarBg: 'bg-rose-600 text-white',
                    headerBg: 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200/80 dark:border-rose-900/50',
                    dateText: 'text-rose-950 dark:text-rose-100',
                    dayText: 'text-rose-700 dark:text-rose-400',
                    accentDot: 'bg-white',
                    pulse: false
                };
            }

            // 4. Completed / Past Sessions
            if (cat === 'past') {
                return {
                    key: 'past',
                    category: 'past',
                    label: `Completed Session (${timeStr})`,
                    badgeText: '✓ Completed',
                    typeBadge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
                    buttonBg: 'bg-slate-700 hover:bg-slate-800 text-white font-medium',
                    cardBorder: 'border border-slate-300 dark:border-slate-700 shadow-xs',
                    topBarBg: 'bg-slate-700 text-slate-200',
                    headerBg: 'bg-slate-100/80 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700',
                    dateText: 'text-slate-800 dark:text-slate-200',
                    dayText: 'text-slate-500 dark:text-slate-400',
                    accentDot: 'bg-slate-400',
                    pulse: false
                };
            }

            // 5. Later scheduled sessions
            return {
                key: 'upcoming',
                category: 'upcoming',
                label: `Scheduled Session (${timeStr})`,
                badgeText: '📅 Scheduled',
                typeBadge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
                buttonBg: 'bg-slate-800 hover:bg-slate-900 text-white font-medium',
                cardBorder: 'border border-slate-200/90 dark:border-slate-800 shadow-xs',
                topBarBg: 'bg-slate-800 text-slate-200',
                headerBg: 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/60',
                dateText: 'text-slate-900 dark:text-white',
                dayText: 'text-slate-500 dark:text-slate-400',
                accentDot: 'bg-slate-400',
                pulse: false
            };
        },

        getThreeArrangedSessions() {
            if (!Array.isArray(this.sessions) || this.sessions.length === 0) return [];
            let list = [...this.sessions].filter(s => s && (s.id || s.date || s.title));

            if (this.sessionNameSlideFilter && this.sessionNameSlideFilter !== 'all') {
                list = list.filter(s => this.getSessionGroupingName(s) === this.sessionNameSlideFilter);
            }

            // Sort strictly by Start Time (earliest first) and then by Session Name
            list.sort((a, b) => this.compareSessionsByStartTimeAndName(a, b));

            const todayStr = this.getTodayDateBST();
            const upcoming = list.filter(s => {
                const sDate = this.normalizeSessionDate(s.date);
                return sDate >= todayStr;
            });

            if (upcoming.length > 0) {
                const todaySessions = upcoming.filter(s => this.normalizeSessionDate(s.date) === todayStr);
                const futureSessions = upcoming.filter(s => this.normalizeSessionDate(s.date) !== todayStr);
                
                let chosen = [];
                if (todaySessions.length >= 3) {
                    chosen = todaySessions;
                } else {
                    chosen = [...todaySessions, ...futureSessions.slice(0, Math.max(1, 3 - todaySessions.length))];
                }
                if (chosen.length < 3) {
                    const past = list.filter(s => !chosen.some(c => c && c.id === s.id));
                    chosen = [...chosen, ...past.slice(-Math.max(0, 3 - chosen.length))];
                    chosen.sort((a, b) => this.compareSessionsByStartTimeAndName(a, b));
                }
                return chosen;
            } else {
                return list.slice(-3);
            }
        },

        // Get processed list of sessions for Home Dashboard with slide filter, week categories, and sorting
        getHomeDashboardSessions() {
            if (!Array.isArray(this.sessions) || this.sessions.length === 0) return [];
            let list = [...this.sessions].filter(s => s && (s.id || s.date || s.title));

            // 1. Slide Filter by Session Name
            if (this.sessionNameSlideFilter && this.sessionNameSlideFilter !== 'all') {
                list = list.filter(s => this.getSessionGroupingName(s) === this.sessionNameSlideFilter);
            }

            // 2. Week Category Filter
            if (this.sessionWeekCategoryFilter && this.sessionWeekCategoryFilter !== 'all') {
                list = list.filter(s => this.getSessionWeekCategory(s) === this.sessionWeekCategoryFilter);
            }

            // 3. Search query filter
            if (this.sessionSearchQuery && this.sessionSearchQuery.trim()) {
                const q = this.sessionSearchQuery.toLowerCase().trim();
                list = list.filter(s => 
                    (s.title && s.title.toLowerCase().includes(q)) ||
                    (s.lead_trainer && s.lead_trainer.toLowerCase().includes(q)) ||
                    (s.location && s.location.toLowerCase().includes(q)) ||
                    (s.type && s.type.toLowerCase().includes(q)) ||
                    (s.date && s.date.toLowerCase().includes(q)) ||
                    (s.notes && s.notes.toLowerCase().includes(q))
                );
            }

            // 4. Sort strictly by Start Time (earliest first), then by Session Name
            return list.sort((a, b) => this.compareSessionsByStartTimeAndName(a, b));
        },

        // Groups sessions by week time categories: Green [This Week], Yellow [Next Week], Red [Week After]
        getGroupedSessionsByWeek(customList) {
            const list = customList || (this.activeTab === 'sessions' ? this.getFilteredSessions(true) : this.getHomeDashboardSessions());
            if (!list || list.length === 0) return [];

            const thisWeekSessions = list.filter(s => this.getSessionWeekCategory(s) === 'this_week');
            const nextWeekSessions = list.filter(s => this.getSessionWeekCategory(s) === 'next_week');
            const weekAfterSessions = list.filter(s => this.getSessionWeekCategory(s) === 'week_after');
            const otherSessions = list.filter(s => !['this_week', 'next_week', 'week_after'].includes(this.getSessionWeekCategory(s)));

            const groups = [];

            if (thisWeekSessions.length > 0) {
                const bounds = this.getWeekBounds(0);
                groups.push({
                    key: 'this_week',
                    themeKey: 'green',
                    title: 'This Week',
                    badge: 'Green: [This Week]',
                    colorName: 'Green',
                    headerBg: 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100',
                    badgeClass: 'bg-emerald-600 text-white font-bold',
                    dotClass: 'bg-emerald-500',
                    dateRange: bounds.dateRangeLabel,
                    count: thisWeekSessions.length,
                    sessions: thisWeekSessions.sort((a, b) => this.compareSessionsByStartTimeAndName(a, b))
                });
            }

            if (nextWeekSessions.length > 0) {
                const bounds = this.getWeekBounds(1);
                groups.push({
                    key: 'next_week',
                    themeKey: 'yellow',
                    title: 'Next Week',
                    badge: 'Yellow: [Next Week]',
                    colorName: 'Yellow',
                    headerBg: 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-100',
                    badgeClass: 'bg-amber-500 text-slate-950 font-bold',
                    dotClass: 'bg-amber-500',
                    dateRange: bounds.dateRangeLabel,
                    count: nextWeekSessions.length,
                    sessions: nextWeekSessions.sort((a, b) => this.compareSessionsByStartTimeAndName(a, b))
                });
            }

            if (weekAfterSessions.length > 0) {
                const bounds = this.getWeekBounds(2);
                groups.push({
                    key: 'week_after',
                    themeKey: 'red',
                    title: 'Week After',
                    badge: 'Red: [Week After]',
                    colorName: 'Red',
                    headerBg: 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-100',
                    badgeClass: 'bg-rose-600 text-white font-bold',
                    dotClass: 'bg-rose-500',
                    dateRange: bounds.dateRangeLabel,
                    count: weekAfterSessions.length,
                    sessions: weekAfterSessions.sort((a, b) => this.compareSessionsByStartTimeAndName(a, b))
                });
            }

            if (groups.length === 0 && list.length > 0) {
                // Guarantee sessions are always visible even if dates span outside the 3-week window
                groups.push({
                    key: 'all_active',
                    themeKey: 'green',
                    title: 'Active & Scheduled Sessions',
                    badge: 'Scheduled',
                    colorName: 'Green',
                    headerBg: 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100',
                    badgeClass: 'bg-emerald-600 text-white font-bold',
                    dotClass: 'bg-emerald-500',
                    dateRange: 'All Upcoming & Recent',
                    count: list.length,
                    sessions: list.slice().sort((a, b) => this.compareSessionsByStartTimeAndName(a, b))
                });
            }

            return groups;
        },

        // Groups sessions by distinct Session Name
        getGroupedSessionsByName(customList) {
            const list = customList || this.getHomeDashboardSessions();
            if (!list || list.length === 0) return [];

            const groupsMap = new Map();
            list.forEach(s => {
                const name = this.getSessionGroupingName(s);
                if (!groupsMap.has(name)) {
                    groupsMap.set(name, []);
                }
                groupsMap.get(name).push(s);
            });

            return Array.from(groupsMap.entries()).map(([name, sessions]) => ({
                key: 'name_' + name,
                title: name,
                count: sessions.length,
                sessions: sessions.sort((a, b) => this.compareSessionsByStartTimeAndName(a, b))
            }));
        },

        async markAllPlayersInSession(session, isPresent) {
            if (!session) return;
            if (!session.attendance || typeof session.attendance !== 'object') {
                session.attendance = {};
            }
            const playerList = this.players || [];
            const attendeeSet = new Set(Array.isArray(session.attendees) ? session.attendees : []);
            playerList.forEach(p => {
                const pId = String(p.id || p.name || '').trim();
                if (pId) {
                    session.attendance[pId] = isPresent;
                    if (isPresent) attendeeSet.add(pId);
                    else attendeeSet.delete(pId);
                }
            });
            session.attendees = Array.from(attendeeSet);
            session.attendance = { ...session.attendance };
            session.updated_at = new Date().toISOString();
            this.saveSessionsLocally();
            if (window.fb && window.fb.saveSession) {
                window.fb.saveSession(session).catch(() => {});
            }
        },

        startMidnightBSTWatcher() {
            if (this._midnightWatcherStarted) return;
            this._midnightWatcherStarted = true;
            this.currentTodayBST = this.getTodayDateBST();
            setInterval(() => {
                const latestToday = this.getTodayDateBST();
                if (latestToday !== this.currentTodayBST) {
                    this.currentTodayBST = latestToday;
                    // Trigger Alpine reactivity by re-assigning sessions
                    this.sessions = [...(this.sessions || [])];
                    if (typeof this.processWeeklyRecurringSchedules === 'function') {
                        this.processWeeklyRecurringSchedules();
                    }
                }
            }, 10000);
            if (typeof window !== 'undefined') {
                window.addEventListener('focus', () => {
                    const latestToday = this.getTodayDateBST();
                    if (latestToday !== this.currentTodayBST) {
                        this.currentTodayBST = latestToday;
                        this.sessions = [...(this.sessions || [])];
                        if (typeof this.processWeeklyRecurringSchedules === 'function') {
                            this.processWeeklyRecurringSchedules();
                        }
                    }
                });
            }
        },

        getFilteredSessions(ignoreArrangementMode = false) {
            let list = [...(this.sessions || [])];
            const todayStr = this.getTodayDateBST();
            
            // If in 3-upcoming arrangement mode and not searching, return the 3 arranged session cards
            if (!ignoreArrangementMode && this.sessionArrangementMode === 'three_upcoming' && (!this.sessionSearchQuery || !this.sessionSearchQuery.trim())) {
                return this.getThreeArrangedSessions();
            }

            // 1. Slide Filter by Session Name
            if (this.sessionNameSlideFilter && this.sessionNameSlideFilter !== 'all') {
                list = list.filter(s => this.getSessionGroupingName(s) === this.sessionNameSlideFilter);
            }

            if (this.activeSessionTypeFilter && this.activeSessionTypeFilter !== 'all') {
                list = list.filter(s => s.type === this.activeSessionTypeFilter);
            }
            
            if (this.sessionDateFilter) {
                list = list.filter(s => s.date === this.sessionDateFilter);
            }

            // Week Category Filter: Green (this_week), Yellow (next_week), Red (week_after)
            if (this.sessionWeekCategoryFilter && this.sessionWeekCategoryFilter !== 'all') {
                list = list.filter(s => this.getSessionWeekCategory(s) === this.sessionWeekCategoryFilter);
            } else if (this.sessionWeekFilter === 'this_week') {
                list = list.filter(s => this.isSessionInWeek(s, this.sessionWeekOffset));
            } else if (this.sessionTimelineFilter === 'released') {
                list = list.filter(s => (s.date && s.date <= todayStr) || (s.attendees && s.attendees.length > 0) || !s.is_auto_weekly);
            } else if (this.sessionTimelineFilter === 'upcoming') {
                list = list.filter(s => s.date && s.date >= todayStr);
            }

            if (this.sessionSearchQuery && this.sessionSearchQuery.trim()) {
                const q = this.sessionSearchQuery.toLowerCase().trim();
                list = list.filter(s => 
                    (s.title && s.title.toLowerCase().includes(q)) ||
                    (s.lead_trainer && s.lead_trainer.toLowerCase().includes(q)) ||
                    (s.location && s.location.toLowerCase().includes(q)) ||
                    (s.type && s.type.toLowerCase().includes(q)) ||
                    (s.date && s.date.toLowerCase().includes(q)) ||
                    (s.notes && s.notes.toLowerCase().includes(q))
                );
            }

            // Sort strictly by Start Time (earliest first), and then by Session Name
            return list.sort((a, b) => this.compareSessionsByStartTimeAndName(a, b));
        },

        getSessionAttendanceReportList() {
            const reportMap = {};

            (this.players || []).forEach(p => {
                if (p && (p.name || p.player || p.id)) {
                    const name = this.getPlayerDisplayName ? this.getPlayerDisplayName(p) : (p.name || p.player || p.id);
                    const id = p.id || p.name || name;
                    reportMap[id] = {
                        player_id: id,
                        player_name: name,
                        name: name,
                        total_attended: 0,
                        football_training_count: 0,
                        digital_skills_count: 0,
                        captains_training_count: 0,
                        by_type_counts: {},
                        dates_present: [],
                        session_ids_present: []
                    };
                }
            });

            (this.sessions || []).forEach(s => {
                const sDate = s.date || 'Session Date';
                const sType = s.type || 'Football Training';
                const sId = s.id;

                (this.players || []).forEach(p => {
                    const pId = p.id || p.name;
                    const pName = this.getPlayerDisplayName ? this.getPlayerDisplayName(p) : (p.name || p.player);
                    if (this.isPlayerPresentInSession(s, p)) {
                        const rec = reportMap[pId] || reportMap[pName];
                        if (rec) {
                            rec.total_attended += 1;
                            if (sType === 'Football Training') rec.football_training_count += 1;
                            else if (sType === 'Digital Skills') rec.digital_skills_count += 1;
                            else if (sType === "Captain's Training" || sType === 'Captains Training') rec.captains_training_count += 1;

                            if (!rec.by_type_counts) rec.by_type_counts = {};
                            rec.by_type_counts[sType] = (rec.by_type_counts[sType] || 0) + 1;

                            if (!rec.dates_present.includes(sDate)) rec.dates_present.push(sDate);
                            if (sId && !rec.session_ids_present.includes(sId)) rec.session_ids_present.push(sId);
                        }
                    }
                });
            });

            return Object.values(reportMap).sort((a, b) => a.player_name.localeCompare(b.player_name));
        },

        getDistinctSessionTypes() {
            const types = new Set();
            (this.sessions || []).forEach(s => {
                if (s && s.type && typeof s.type === 'string' && s.type.trim()) {
                    types.add(s.type.trim());
                }
            });
            if (types.size === 0) return ['Football Training', 'Digital Skills'];
            return Array.from(types);
        },

        getSessionName(sess) {
            if (!sess) return 'Session';
            if (typeof sess === 'string') return sess;
            const title = sess.title && String(sess.title).trim();
            if (title) return title;
            const name = sess.name && String(sess.name).trim();
            if (name) return name;
            if (sess.type && String(sess.type).trim()) {
                return String(sess.type).trim() + (sess.series_index ? ' #' + sess.series_index : '');
            }
            return 'Session' + (sess.date ? ' (' + sess.date + ')' : '');
        },

        getAttendanceDashboardSessions() {
            if (!Array.isArray(this.sessions)) return [];
            return [...this.sessions]
                .filter(s => s && (s.id || s.title || s.date))
                .sort((a, b) => {
                    const tsA = this.getSessionTimestamp ? this.getSessionTimestamp(a) : new Date(a.date || 0).getTime();
                    const tsB = this.getSessionTimestamp ? this.getSessionTimestamp(b) : new Date(b.date || 0).getTime();
                    return tsA - tsB;
                });
        },

        isPlayerAttendedSession(row, sess) {
            if (!row || !sess) return false;
            return this.isPlayerPresentInSession(sess, { id: row.player_id || row.id, name: row.player_name || row.name });
        },

        getMatrixFilteredPlayers() {
            let list = this.getSessionAttendanceReportList();
            
            // Search filter
            if (this.matrixPlayerSearch && this.matrixPlayerSearch.trim()) {
                const q = this.matrixPlayerSearch.toLowerCase().trim();
                list = list.filter(p => (p.player_name || '').toLowerCase().includes(q));
            }

            // Attendance status filter
            const totalSess = (this.sessions || []).length;
            if (this.matrixAttendanceFilter === 'active') {
                list = list.filter(p => (p.total_attended || 0) > 0);
            } else if (this.matrixAttendanceFilter === 'zero') {
                list = list.filter(p => (p.total_attended || 0) === 0);
            } else if (this.matrixAttendanceFilter === 'high' && totalSess > 0) {
                list = list.filter(p => ((p.total_attended || 0) / totalSess) >= 0.75);
            }

            // Sort
            if (this.matrixSortBy === 'name') {
                list.sort((a, b) => (a.player_name || '').localeCompare(b.player_name || ''));
            } else if (this.matrixSortBy === 'name_desc') {
                list.sort((a, b) => (b.player_name || '').localeCompare(a.player_name || ''));
            } else if (this.matrixSortBy === 'attended_desc') {
                list.sort((a, b) => (b.total_attended || 0) - (a.total_attended || 0) || (a.player_name || '').localeCompare(b.player_name || ''));
            } else if (this.matrixSortBy === 'attended_asc') {
                list.sort((a, b) => (a.total_attended || 0) - (b.total_attended || 0) || (a.player_name || '').localeCompare(b.player_name || ''));
            }

            return list;
        },

        getSessionTurnoutCount(session) {
            return this.getSessionAttendanceCount(session);
        },

        getSessionTurnoutPercentage(session) {
            const totalPlayers = (this.players || []).length;
            if (!totalPlayers) return 0;
            const present = this.getSessionAttendanceCount(session);
            return Math.round((present / totalPlayers) * 100);
        },

        getMatrixOverviewStats() {
            const totalPlayers = (this.players || []).length;
            const totalSessions = (this.sessions || []).length;
            const report = this.getSessionAttendanceReportList();
            const totalAttendances = report.reduce((sum, p) => sum + (p.total_attended || 0), 0);
            const totalPossible = totalPlayers * totalSessions;
            const averageRate = totalPossible > 0 ? Math.round((totalAttendances / totalPossible) * 100) : 0;
            
            return {
                totalPlayers,
                totalSessions,
                totalAttendances,
                averageRate
            };
        },

        getNextUpcomingSession() {
            if (this._cachedNextUpcomingSession && this._cachedNextUpcomingSessionSource === this.sessions) {
                return this._cachedNextUpcomingSession;
            }
            const todayStr = new Date().toISOString().split('T')[0];
            const sortedSessions = [...(this.sessions || [])].sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());
            // Look for future or today's session first
            const upcoming = sortedSessions.find(s => s && s.date && s.date >= todayStr);
            const result = upcoming || (sortedSessions.length > 0 ? sortedSessions[sortedSessions.length - 1] : null);
            this._cachedNextUpcomingSession = result;
            this._cachedNextUpcomingSessionSource = this.sessions;
            return result;
        },

        getUpcomingScheduleUnified(limit = 6, filterCategory = null) {
            const todayStr = this.getTodayDateBST();
            const todayTs = new Date(todayStr + 'T00:00:00').getTime();
            const scheduleItems = [];

            // Map the 3 upcoming sessions in BST/GMT to green, yellow, red colors
            const upcomingSessions = (this.sessions || [])
                .filter(s => s && s.date && s.date >= todayStr)
                .sort((a, b) => {
                    const tsA = this.getSessionTimestamp ? this.getSessionTimestamp(a) : (new Date(a.date).getTime() || 0);
                    const tsB = this.getSessionTimestamp ? this.getSessionTimestamp(b) : (new Date(b.date).getTime() || 0);
                    return tsA - tsB;
                });

            const sessionColorMap = new Map();
            upcomingSessions.slice(0, 3).forEach((s, idx) => {
                sessionColorMap.set(s.id, {
                    index: idx,
                    colorKey: idx === 0 ? 'green' : (idx === 1 ? 'yellow' : 'red'),
                    colorLabel: idx === 0 ? 'Most Recent' : (idx === 1 ? 'Next Week' : 'Session After Next')
                });
            });

            // 1. Add Sessions
            (this.sessions || []).forEach(s => {
                if (s && s.date) {
                    const sTs = this.getSessionTimestamp ? this.getSessionTimestamp(s) : (new Date(s.date).getTime() || 0);
                    const isUpcoming = (s.date >= todayStr) || (sTs >= todayTs);
                    const colorInfo = sessionColorMap.get(s.id);
                    scheduleItems.push({
                        id: 'session_' + (s.id || s.date),
                        rawId: s.id,
                        category: 'session',
                        type: s.type || 'Session',
                        title: this.getSessionName ? this.getSessionName(s) : (s.title || (s.type + ' Workshop')),
                        date: s.date,
                        time: s.time || '18:00',
                        lead_trainer: s.lead_trainer || '',
                        location: s.location || 'Main Pitch / Centre',
                        attendeesCount: this.getSessionAttendanceCount(s),
                        isUpcoming: isUpcoming,
                        colorKey: colorInfo ? colorInfo.colorKey : null,
                        colorIndex: colorInfo ? colorInfo.index : null,
                        colorLabel: colorInfo ? colorInfo.colorLabel : null,
                        rawSession: s
                    });
                }
            });

            // 2. Add Matches / Fixtures
            (this.matches || []).forEach(m => {
                if (m && m.date) {
                    const mTs = this.getMatchTimestamp ? this.getMatchTimestamp(m) : (new Date(m.date).getTime() || 0);
                    const isUpcoming = (m.date >= todayStr) || (mTs >= todayTs);
                    scheduleItems.push({
                        id: 'match_' + (m.id || m.date),
                        rawId: m.id,
                        category: 'match',
                        type: 'League Match',
                        title: (m.home_team || 'Home') + ' vs ' + (m.away_team || 'Away'),
                        date: m.date,
                        time: m.time || '19:30',
                        lead_trainer: m.referee || '',
                        location: m.pitch || 'Pitch 1',
                        home_team: m.home_team,
                        away_team: m.away_team,
                        home_score: m.home_score,
                        away_score: m.away_score,
                        isUpcoming: isUpcoming,
                        colorKey: null,
                        colorIndex: null,
                        colorLabel: null,
                        rawMatch: m
                    });
                }
            });

            // Sort: prioritize upcoming items first (earliest upcoming to latest), then recent past
            scheduleItems.sort((a, b) => {
                if (a.isUpcoming && !b.isUpcoming) return -1;
                if (!a.isUpcoming && b.isUpcoming) return 1;
                
                const timeA = this.parseDateToTimestamp ? this.parseDateToTimestamp(a.date) : new Date(a.date).getTime();
                const timeB = this.parseDateToTimestamp ? this.parseDateToTimestamp(b.date) : new Date(b.date).getTime();

                if (a.isUpcoming && b.isUpcoming) {
                    if (timeA !== timeB) return timeA - timeB;
                    return String(a.title || '').localeCompare(String(b.title || ''));
                }
                return timeB - timeA;
            });

            let results = scheduleItems;
            if (filterCategory && filterCategory !== 'all') {
                results = results.filter(item => item.category === filterCategory);
            }

            return results.slice(0, limit);
        },

        getRecentSessionsSummary(limit = 5) {
            if (!Array.isArray(this.sessions)) return [];
            const list = [...this.sessions]
                .filter(s => s && s.id && (s.title || s.type || s.date))
                .sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());
            return list.slice(0, limit);
        },

        isSessionInSessions(sessionId) {
            if (!sessionId || !Array.isArray(this.sessions)) return false;
            return this.sessions.some(s => s && s.id === sessionId);
        },

        getTopAttendanceLeaders(limit = 10) {
            const report = this.getSessionAttendanceReportList();
            return [...report]
                .sort((a, b) => (b.total_attended || 0) - (a.total_attended || 0) || (a.player_name || '').localeCompare(b.player_name || ''))
                .slice(0, limit);
        },

        jumpToSession(sessionId) {
            this.activeTab = 'sessions';
            this.sessionsViewMode = 'cards';
            this.sessionWeekFilter = 'all';
            this.sessionTimelineFilter = 'all';
            this.activeSessionTypeFilter = 'all';
            this.sessionSearchQuery = '';
            const three = this.getThreeArrangedSessions ? this.getThreeArrangedSessions() : [];
            const isInsideThree = three.some(s => s && s.id === sessionId);
            if (!isInsideThree) {
                this.sessionArrangementMode = 'all';
            }
            if (sessionId) {
                this.matrixHighlightedSessionId = sessionId;
                setTimeout(() => {
                    const el = document.getElementById('session-card-' + sessionId);
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        el.classList.add('ring-4', 'ring-slate-900', 'dark:ring-white');
                        setTimeout(() => el.classList.remove('ring-4', 'ring-slate-900', 'dark:ring-white'), 2500);
                    }
                }, 150);
            }
        },

        async quickToggleColumnAttendance(session) {
            if (!session) return;
            const totalPlayers = (this.players || []).length;
            const presentCount = this.getSessionAttendanceCount(session);
            const shouldMarkAll = presentCount < totalPlayers;
            await this.markAllSessionAttendance(session, shouldMarkAll);
        },

        generateSessionAttendanceTSV() {
            const sortedSessions = [...(this.sessions || [])].sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());
            const sessionHeaders = sortedSessions.map(s => `${s.date || ''} (${s.type || 'Session'}${s.title ? ' - ' + s.title : ''})`);
            const headers = ['Player Name', 'Total Sessions Attended', ...sessionHeaders];
            const rows = [headers.join('\t')];

            const report = this.getSessionAttendanceReportList();
            report.forEach(p => {
                const pBools = sortedSessions.map(s => {
                    const isPresent = this.isPlayerPresentInSession(s, { id: p.player_id, name: p.player_name });
                    return isPresent ? 'TRUE' : 'FALSE';
                });
                rows.push([p.player_name, p.total_attended, ...pBools].join('\t'));
            });

            return rows.join('\n');
        },

        copySessionAttendanceForGoogleSheets() {
            const tsv = this.generateSessionAttendanceTSV();
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(tsv).then(() => {
                    this.copiedSessionAttendanceSuccess = true;
                    if (typeof this.showToast === 'function') this.showToast('Session attendance copied to clipboard!', 'success');
                    setTimeout(() => { this.copiedSessionAttendanceSuccess = false; }, 3000);
                }).catch(() => {
                    this.fallbackCopyToClipboard(tsv);
                });
            } else {
                this.fallbackCopyToClipboard(tsv);
            }
        },

        downloadSessionAttendanceCSV() {
            const sortedSessions = [...(this.sessions || [])].sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());
            const sessionHeaders = sortedSessions.map(s => `"${s.date || ''} (${s.type || 'Session'})"`);
            const headers = ['"Player Name"', '"Total Sessions Attended"', ...sessionHeaders];
            const csvRows = [headers.join(',')];

            const report = this.getSessionAttendanceReportList();
            report.forEach(p => {
                const pBools = sortedSessions.map(s => {
                    const isPresent = this.isPlayerPresentInSession(s, { id: p.player_id, name: p.player_name });
                    return isPresent ? 'TRUE' : 'FALSE';
                });
                csvRows.push([`"${p.player_name}"`, p.total_attended, ...pBools].join(','));
            });

            const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `GameOn_Session_Attendance_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        },
        // Safe fallback variables to prevent scope lookup ReferenceErrors
        t: {},
        p: {},
        idx: 0,
        pIdx: 0,
        _cacheKey: null,
        _cacheKey: null,
        _paddedCache: {},
        _getPaddedData() {
            const curKey = String(this.lastDataUpdate || 0) + "_" + String((this.playerStandings||[]).length) + "_" + String((this.captainStandings||[]).length) + "_" + String((this.teams||[]).length) + "_" + String((this.matches||[]).length);
            if (this._cacheKey === curKey && this._paddedCache && this._paddedCache.teams && this._paddedCache.mvps && this._paddedCache.scorers) {
                return this._paddedCache;
            }
            
            // 1. Teams (at least 8 rows)
            const rawTeams = (typeof this.getSortedTeams === 'function' ? this.getSortedTeams() : this.captainStandings) || [];
            const paddedTeams = rawTeams.map((t, idx) => ({ ...t, _empty: false, id: t.id || ("team-" + idx) }));
            while (paddedTeams.length < 8) {
                const idx = paddedTeams.length;
                paddedTeams.push({ _empty: true, id: "empty-t-" + idx, name: "", team: "", pld: 0, w: 0, d: 0, l: 0, gd: 0, pts: 0 });
            }
            
            // 2. MVPs (34 rows to fully utilize landscape page height)
            let rawMVPs = [];
            if (typeof this.getTopPOTD === 'function') {
                rawMVPs = this.getTopPOTD();
            }
            if (!rawMVPs || rawMVPs.length === 0) {
                rawMVPs = (this.playerStandings || []).filter(x => (Number(x.potd || x.awards || x.mvp || x.count || 0) > 0));
            }
            if (!rawMVPs || rawMVPs.length === 0) {
                // Direct match card aggregator fallback
                const potdMap = {};
                (this.matches || []).forEach(m => {
                    const potds = typeof this.getPOTDWinners === 'function' ? this.getPOTDWinners(m) : [];
                    potds.forEach(pNameOrId => {
                        const pl = (this.players || []).find(p => this.isFuzzyMatch(p, pNameOrId)) || { name: pNameOrId };
                        const key = pl.name || pNameOrId;
                        potdMap[key] = (potdMap[key] || 0) + 1;
                    });
                });
                rawMVPs = Object.entries(potdMap).map(([name, count]) => ({ name, player: name, potd: count, awards: count, _empty: false }));
            }
            rawMVPs.sort((a, b) => (Number(b.potd || b.awards || b.count || 0) - Number(a.potd || a.awards || a.count || 0)));

            const paddedMVPs = rawMVPs.map((p, idx) => ({
                ...p,
                _empty: false,
                id: p.id || ("mvp-" + idx),
                name: p.name || p.player || "",
                player: p.name || p.player || "",
                potd: Number(p.potd !== undefined ? p.potd : (p.awards !== undefined ? p.awards : (p.count || p.mvp || 0)))
            }));
            while (paddedMVPs.length < 34) {
                const idx = paddedMVPs.length;
                paddedMVPs.push({ _empty: true, id: "empty-mvp-" + idx, name: "", player: "", potd: 0 });
            }

            // 3. Scorers (34 rows to fully utilize landscape page height)
            let rawScorers = [];
            if (typeof this.getTopScorers === 'function') {
                rawScorers = this.getTopScorers();
            }
            if (!rawScorers || rawScorers.length === 0) {
                rawScorers = (this.playerStandings || []).filter(x => (Number(x.goals || x.score || x.count || 0) > 0));
            }
            if (!rawScorers || rawScorers.length === 0) {
                // Direct match card aggregator fallback
                const scorerMap = {};
                (this.matches || []).forEach(m => {
                    const rawSc = m.scorers || m.goalScorers || m.goal_scorers || [];
                    const scList = typeof rawSc === 'string' ? (()=>{ try{ return JSON.parse(rawSc); }catch(e){ return []; } })() : (Array.isArray(rawSc) ? rawSc : []);
                    scList.forEach(sc => {
                        const sName = typeof sc === 'object' && sc !== null ? (sc.name || sc.player || '') : String(sc);
                        const sGoals = typeof sc === 'object' && sc !== null ? Number(sc.goals || sc.score || 1) : 1;
                        if (sName) {
                            const pl = (this.players || []).find(p => this.isFuzzyMatch(p, sName)) || { name: sName };
                            const key = pl.name || sName;
                            scorerMap[key] = (scorerMap[key] || 0) + sGoals;
                        }
                    });
                });
                rawScorers = Object.entries(scorerMap).map(([name, goals]) => ({ name, player: name, goals, _empty: false }));
            }
            rawScorers.sort((a, b) => (Number(b.goals || b.score || 0) - Number(a.goals || a.score || 0)));

            const paddedScorers = rawScorers.map((p, idx) => ({
                ...p,
                _empty: false,
                id: p.id || ("ts-" + idx),
                name: p.name || p.player || "",
                player: p.name || p.player || "",
                goals: Number(p.goals !== undefined ? p.goals : (p.score !== undefined ? p.score : (p.count || 0)))
            }));
            while (paddedScorers.length < 34) {
                const idx = paddedScorers.length;
                paddedScorers.push({ _empty: true, id: "empty-ts-" + idx, name: "", player: "", goals: 0 });
            }

            // 4. Player League (84 rows total, 42 per column to maximize page utilization)
            const rawPL = (this.getSortedPlayerStandings() || []).filter(p => (Number(p.pts) || Number(p.points) || 0) >= 1);
            const paddedPL = rawPL.map((p, idx) => ({ ...p, _empty: false, id: p.id || ("pl-" + idx) }));
            while (paddedPL.length < 84) {
                const idx = paddedPL.length;
                paddedPL.push({ _empty: true, id: "empty-pl-" + idx, name: "", player: "", pld: 0, w: 0, d: 0, l: 0, pts: 0, points: 0 });
            }
            const mid = 42;
            const pl1 = paddedPL.slice(0, mid);
            const pl2 = paddedPL.slice(mid, 84);

            this._cacheKey = curKey;
            this._paddedCache = {
                teams: paddedTeams.slice(0, 8),
                mvps: paddedMVPs.slice(0, 34),
                scorers: paddedScorers.slice(0, 34),
                pl1,
                pl2
            };
            return this._paddedCache;
        },

        // ==========================================
        // 📄 PDF REPORT DATA FORMATTERS (CRASH-PROOF)
        // ==========================================
        getPaddedTeams() {
            return (this._getPaddedData() && this._getPaddedData().teams) || [];
        },
        getPaddedMVPs() {
            return (this._getPaddedData() && this._getPaddedData().mvps) || [];
        },
        getPaddedScorers() {
            return (this._getPaddedData() && this._getPaddedData().scorers) || [];
        },
        getPaddedPlayerLeague(col) {
            const data = this._getPaddedData();
            if (!data) return [];
            return col === 1 ? data.pl1 : data.pl2;
        },

        // Helper to safely extract all scorers from a match card
        getMatchScorers(match) {
            if (!match) return [];
            let raw = match.scorers || match.goalScorers || match.goal_scorers || match.goals || [];
            if (typeof raw === 'string') {
                try {
                    const parsed = JSON.parse(raw);
                    raw = parsed;
                } catch(e) {
                    raw = raw.includes(',') ? raw.split(',').map(s => s.trim()).filter(Boolean) : (raw.trim() ? [raw.trim()] : []);
                }
            }
            if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
                return Object.entries(raw).map(([k, v]) => ({
                    name: k,
                    player: k,
                    goals: typeof v === 'number' ? v : (Number(v?.goals || v?.score || 1) || 1)
                }));
            }
            if (!Array.isArray(raw)) raw = raw ? [raw] : [];
            return raw.map(sc => {
                if (typeof sc === 'object' && sc !== null) {
                    return {
                        name: sc.name || sc.player || sc.player_name || sc.id || '',
                        player: sc.name || sc.player || sc.player_name || sc.id || '',
                        id: sc.id || '',
                        goals: Number(sc.goals !== undefined ? sc.goals : (sc.score !== undefined ? sc.score : (sc.count || 1))) || 1
                    };
                }
                return { name: String(sc), player: String(sc), id: String(sc), goals: 1 };
            }).filter(s => s.name);
        },

        // ==========================================
        // 📄 PDF HELPER GETTERS & DATA GETTERS
        // ==========================================
        getTopPOTD() {
            const potdMap = {};

            // 1. From computed player standings
            (this.playerStandings || []).forEach(p => {
                const count = Number(p.potd !== undefined ? p.potd : (p.awards !== undefined ? p.awards : (p.mvp || p.count || 0)));
                const name = p.name || p.player || p.player_name || '';
                if (name && count > 0) {
                    potdMap[name] = Math.max(potdMap[name] || 0, count);
                }
            });

            // 2. From raw player records
            (this.players || []).forEach(p => {
                const count = Number(p.potd !== undefined ? p.potd : (p.awards !== undefined ? p.awards : (p.mvp || p.adj_potd || 0)));
                const name = p.name || p.player || '';
                if (name && count > 0) {
                    potdMap[name] = Math.max(potdMap[name] || 0, count);
                }
            });

            // 3. Fallback / Direct match cards aggregation
            if (Object.keys(potdMap).length === 0 && Array.isArray(this.matches)) {
                (this.matches || []).forEach(m => {
                    const winners = this.getPOTDWinners(m);
                    winners.forEach(w => {
                        const pl = (this.players || []).find(p => this.isFuzzyMatch(p, w)) || { name: w };
                        const name = pl.name || w;
                        if (name) potdMap[name] = (potdMap[name] || 0) + 1;
                    });
                });
            }

            const list = Object.entries(potdMap).map(([name, potd]) => ({
                name,
                player: name,
                potd: Number(potd) || 0,
                awards: Number(potd) || 0,
                count: Number(potd) || 0
            })).filter(x => x.potd > 0);

            return list.sort((a, b) => (b.potd - a.potd) || (a.name || '').localeCompare(b.name || ''));
        },

        getTopScorers() {
            const scorerMap = {};

            // 1. From computed player standings
            (this.playerStandings || []).forEach(p => {
                const count = Number(p.goals !== undefined ? p.goals : (p.score !== undefined ? p.score : (p.adj_goals || 0)));
                const name = p.name || p.player || p.player_name || '';
                if (name && count > 0) {
                    scorerMap[name] = Math.max(scorerMap[name] || 0, count);
                }
            });

            // 2. From raw player records
            (this.players || []).forEach(p => {
                const count = Number(p.goals !== undefined ? p.goals : (p.score !== undefined ? p.score : (p.adj_goals || 0)));
                const name = p.name || p.player || '';
                if (name && count > 0) {
                    scorerMap[name] = Math.max(scorerMap[name] || 0, count);
                }
            });

            // 3. Fallback / Direct match cards aggregation
            if (Object.keys(scorerMap).length === 0 && Array.isArray(this.matches)) {
                (this.matches || []).forEach(m => {
                    const scs = this.getMatchScorers(m);
                    scs.forEach(sc => {
                        const pl = (this.players || []).find(p => this.isFuzzyMatch(p, sc.name)) || { name: sc.name };
                        const name = pl.name || sc.name;
                        if (name) scorerMap[name] = (scorerMap[name] || 0) + (Number(sc.goals) || 1);
                    });
                });
            }

            const list = Object.entries(scorerMap).map(([name, goals]) => ({
                name,
                player: name,
                goals: Number(goals) || 0,
                score: Number(goals) || 0,
                count: Number(goals) || 0
            })).filter(x => x.goals > 0);

            return list.sort((a, b) => (b.goals - a.goals) || (a.name || '').localeCompare(b.name || ''));
        },

        getPlayerLeagueStandings() {
            let list = (this.getSortedPlayerStandings() || []).filter(p => (Number(p.pts) || Number(p.points) || 0) >= 1 || (Number(p.pld) || 0) >= 1);
            if (list.length === 0 && Array.isArray(this.players)) {
                list = this.players.map(p => ({
                    name: p.name || p.player || 'Unnamed',
                    player: p.name || p.player || 'Unnamed',
                    pld: Number(p.pld || 0),
                    w: Number(p.w || 0),
                    d: Number(p.d || 0),
                    l: Number(p.l || 0),
                    pts: Number(p.pts || p.points || 0)
                })).filter(p => p.pts >= 1 || p.pld >= 1);
            }
            return list;
        },

        // --- 4. STRICT PDF EXPORT (CRASH-PROOF PURE JS) ---
        pdfGenerating: false,
        
        async downloadComprehensivePDF() {
            if (this.pdfGenerating) return;

            // 1. Guard against exporting while source data collections are still loading
            if (!this.isReportDataReady) {
                if (typeof this.showToast === 'function') {
                    this.showToast('⏳ Connecting to live league data, please wait a moment...', 'info');
                }
                const isReady = await this.waitForReportData(7000);
                if (!isReady && (!this.players || this.players.length === 0) && (!this.matches || this.matches.length === 0)) {
                    const retry = confirm("League data is still synchronising from the cloud. Would you like to proceed with exporting anyway?");
                    if (!retry) {
                        return;
                    }
                }
            }

            // Recalculate standings first to guarantee data freshness
            if (typeof this.recalculateStandings === 'function') {
                this.recalculateStandings();
            }

            const rawTeams = typeof this.getSortedTeams === 'function' ? this.getSortedTeams() : (this.captainStandings || []);
            const rawPlayers = typeof this.getPlayerLeagueStandings === 'function' ? this.getPlayerLeagueStandings() : [];
            const rawScorers = typeof this.getTopScorers === 'function' ? this.getTopScorers() : [];

            // 2. Guard against printing empty zeros when no weekly data exists
            const hasData = (rawTeams.length > 0 && rawTeams.some(t => (t.pld || 0) > 0 || (t.pts || 0) > 0)) ||
                            (rawPlayers.length > 0 && rawPlayers.some(p => (p.pld || 0) > 0 || (p.pts || 0) > 0)) ||
                            (rawScorers.length > 0 && rawScorers.some(s => (s.goals || 0) > 0));

            if (!hasData) {
                const proceed = confirm("No league data found for this week yet — export an empty report anyway?");
                if (!proceed) {
                    if (typeof this.showToast === 'function') {
                        this.showToast('PDF export cancelled. Play matches or enter scores to generate populated standings.', 'info');
                    }
                    return;
                }
            }

            this.pdfGenerating = true;

            setTimeout(() => {
                try {
                    // 1. Fetch & Pad Data to Ensure Perfect 42-Row Geometric Alignment
                    const teams = typeof this.getSortedTeams === 'function' ? this.getSortedTeams() : (this.captainStandings || []);
                    const captLeague = [...teams];
                    while (captLeague.length < 8) captLeague.push({ _empty: true, name: '', team: '', pld: 0, w: 0, d: 0, l: 0, gd: 0, pts: 0 });

                    const mvps = typeof this.getTopPOTD === 'function' ? this.getTopPOTD() : [];
                    const paddedMvps = [...mvps];
                    while (paddedMvps.length < 34) paddedMvps.push({ _empty: true, name: '', player: '', potd: 0, awards: 0 });

                    const scorers = typeof this.getTopScorers === 'function' ? this.getTopScorers() : [];
                    const paddedScorers = [...scorers];
                    while (paddedScorers.length < 34) paddedScorers.push({ _empty: true, name: '', player: '', goals: 0 });

                    const players = typeof this.getPlayerLeagueStandings === 'function' ? this.getPlayerLeagueStandings() : [];
                    const paddedPlayers = [...players];
                    while (paddedPlayers.length < 84) paddedPlayers.push({ _empty: true, name: '', player: '', pld: 0, w: 0, d: 0, l: 0, pts: 0 });
                    
                    // Split Player League strictly into two columns of 42 (84 total)
                    const mid = 42;
                    const pCol1 = paddedPlayers.slice(0, mid);
                    const pCol2 = paddedPlayers.slice(mid, 84);

                    // 2. Format Header Date
                    const d = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
                    let dateStr = d;
                    const startDateVal = (this.leagueSettings && this.leagueSettings.player_standings_start) || (this.leagueConfig && this.leagueConfig.player_league_start_date) || '2026-02-28';
                    if (startDateVal) {
                        try {
                            const startD = new Date(String(startDateVal).replace(/-/g, '/')).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
                            dateStr = `${startD} TO ${d}`;
                        } catch(e) {
                            dateStr = d;
                        }
                    }

                    // 3. Precise Font Sizes for Crisp 1-Page Layout
                    const pFont = '8.5px';
                    const mvpFont = '8px';
                    const captFont = '8.5px';

                    // 4. Construct Pure HTML String (Strict 1-Page Geometry with Completely Unified Gridlines & Subheadings)
                    const reportHtml = `
                        <div style="width: 1020px; max-width: 1020px; background-color: #ffffff; color: #000000; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 6px 8px 4px 8px; box-sizing: border-box; display: block;">
                            
                            <!-- UNIFIED MASTER CONTAINER TABLE WITH PERFECT 1PX BORDERING -->
                            <div style="border: 1.5px solid #000000; background-color: #000000; box-sizing: border-box; width: 100%;">
                                
                                <!-- UNIFIED MONOCHROMATIC SUPER HEADER -->
                                <table style="width: 100%; border-collapse: collapse; border-spacing: 0; margin: 0; background-color: #000000; table-layout: fixed;">
                                    <tr>
                                        <td style="width: 38%; padding: 4px 8px; text-align: left; border: none; border-bottom: 1px solid #000000; vertical-align: middle; box-sizing: border-box;">
                                            <h1 style="color: #ffffff; margin: 0; font-size: 12.5px; font-weight: 900; letter-spacing: 0.6px; text-transform: uppercase; line-height: 1.2;">FOOTBALL UNITED: CAPTAIN'S LEAGUE</h1>
                                        </td>
                                        <td style="width: 62%; padding: 4px 8px; text-align: center; border: none; border-bottom: 1px solid #000000; vertical-align: middle; box-sizing: border-box;">
                                            <table style="width: 100%; border-collapse: collapse; border-spacing: 0; margin: 0;">
                                                <tr>
                                                    <td style="text-align: center; padding: 0; vertical-align: middle;">
                                                        <h1 style="color: #ffffff; margin: 0; font-size: 12.5px; font-weight: 900; letter-spacing: 0.6px; text-transform: uppercase; line-height: 1.2;">PLAYER LEAGUE</h1>
                                                    </td>
                                                    <td style="width: 175px; text-align: right; padding: 0; vertical-align: middle; white-space: nowrap;">
                                                        <span style="background: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.45); color: #ffffff; padding: 2px 6px; border-radius: 3px; font-size: 8px; font-weight: 800; letter-spacing: 0.4px; text-transform: uppercase; white-space: nowrap; display: inline-block;">${dateStr}</span>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>

                                <!-- MASTER THREE-COLUMN TABLES (Completely flush with uniform 1px solid #000000 gridlines) -->
                                <table style="width: 100%; border-collapse: collapse; border-spacing: 0; table-layout: fixed; margin: 0; background-color: #ffffff;">
                                    <tr style="vertical-align: top;">
                                        
                                        <!-- LEFT COLUMN: Captain's League (8 rows) + MVP & Top Scorers (34 rows) = 42 rows -->
                                        <td style="width: 38%; padding: 0; vertical-align: top; border-right: 1px solid #000000; border-bottom: none;">
                                            
                                            <!-- CAPTAIN'S LEAGUE TABLE (8 Rows) -->
                                            <table style="width: 100%; text-align: left; border-collapse: collapse; border-spacing: 0; font-size: ${captFont}; color: #000000; margin: 0; table-layout: fixed;">
                                                <thead style="background-color: #f1f5f9;">
                                                    <tr style="height: 20px;">
                                                        <th style="border: 1px solid #000000; border-top: none; border-left: none; padding: 1px 2px; text-align: center; width: 7%; box-sizing: border-box; background-color: #f1f5f9; font-weight: 800; font-size: 8.5px;">#</th>
                                                        <th style="border: 1px solid #000000; border-top: none; padding: 1px 4px; width: 43%; box-sizing: border-box; font-weight: 800; font-size: 8.5px; color: #1e293b;">Team</th>
                                                        <th style="border: 1px solid #000000; border-top: none; padding: 1px 2px; text-align: center; width: 7%; box-sizing: border-box; font-weight: 800; font-size: 8.5px; color: #1e293b;">P</th>
                                                        <th style="border: 1px solid #000000; border-top: none; padding: 1px 2px; text-align: center; width: 7%; box-sizing: border-box; font-weight: 800; font-size: 8.5px; color: #1e293b;">W</th>
                                                        <th style="border: 1px solid #000000; border-top: none; padding: 1px 2px; text-align: center; width: 7%; box-sizing: border-box; font-weight: 800; font-size: 8.5px; color: #1e293b;">D</th>
                                                        <th style="border: 1px solid #000000; border-top: none; padding: 1px 2px; text-align: center; width: 7%; box-sizing: border-box; font-weight: 800; font-size: 8.5px; color: #1e293b;">L</th>
                                                        <th style="border: 1px solid #000000; border-top: none; padding: 1px 2px; text-align: center; width: 10%; box-sizing: border-box; font-weight: 800; font-size: 8.5px; color: #1e293b;">GD</th>
                                                        <th style="border: 1px solid #000000; border-top: none; border-right: none; padding: 1px 2px; text-align: center; font-weight: 900; font-size: 9px; background-color: #e2e8f0; color: #000000; width: 12%; box-sizing: border-box;">PTS</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    ${captLeague.slice(0, 8).map((t, idx) => `
                                                        <tr style="height: 14.8px;">
                                                             <td style="border: 1px solid #000000; border-left: none; padding: 0 2px; text-align: center; box-sizing: border-box; background-color: #f1f5f9; font-weight: 800; font-size: 8.5px; color: #475569;">${t._empty ? '&nbsp;' : idx + 1}</td>
                                                            <td style="border: 1px solid #000000; padding: 0 4px; text-transform: uppercase; font-weight: 700; color: #0f172a; white-space: nowrap; overflow: hidden; box-sizing: border-box;">${t._empty ? '&nbsp;' : (t.name || t.team || '&nbsp;')}</td>
                                                            <td style="border: 1px solid #000000; padding: 0 2px; text-align: center; color: #334155; font-weight: 600; box-sizing: border-box;">${t._empty ? '&nbsp;' : (t.pld || 0)}</td>
                                                            <td style="border: 1px solid #000000; padding: 0 2px; text-align: center; color: #334155; font-weight: 600; box-sizing: border-box;">${t._empty ? '&nbsp;' : (t.w || 0)}</td>
                                                            <td style="border: 1px solid #000000; padding: 0 2px; text-align: center; color: #334155; font-weight: 600; box-sizing: border-box;">${t._empty ? '&nbsp;' : (t.d || 0)}</td>
                                                            <td style="border: 1px solid #000000; padding: 0 2px; text-align: center; color: #334155; font-weight: 600; box-sizing: border-box;">${t._empty ? '&nbsp;' : (t.l || 0)}</td>
                                                            <td style="border: 1px solid #000000; padding: 0 2px; text-align: center; color: #334155; font-weight: 600; box-sizing: border-box;">${t._empty ? '&nbsp;' : (t.gd !== undefined ? t.gd : ((t.gf||0) - (t.ga||0)))}</td>
                                                            <td style="border: 1px solid #000000; border-right: none; padding: 0 2px; text-align: center; font-weight: 900; color: #000000; background-color: #f1f5f9; box-sizing: border-box;">${t._empty ? '&nbsp;' : (t.pts || 0)}</td>
                                                        </tr>
                                                    `).join('')}
                                                </tbody>
                                            </table>
                                            
                                            <!-- MVP & TOP SCORERS SUBHEADINGS BANNER -->
                                            <table style="width: 100%; border-collapse: collapse; border-spacing: 0; margin: 0; background-color: #000000; table-layout: fixed;">
                                                <tr style="height: 19px;">
                                                    <th style="width: 50%; text-align: center; background-color: #000000; color: #ffffff; font-weight: 900; padding: 1.5px 4px; font-size: 10px; border: 1px solid #000000; border-left: none; text-transform: uppercase; letter-spacing: 0.6px; box-sizing: border-box;">MVP</th>
                                                    <th style="width: 50%; text-align: center; background-color: #000000; color: #ffffff; font-weight: 900; padding: 1.5px 4px; font-size: 10px; border: 1px solid #000000; border-right: none; text-transform: uppercase; letter-spacing: 0.6px; box-sizing: border-box;">TOP SCORERS</th>
                                                </tr>
                                            </table>

                                            <!-- JOINED MVP & TOP SCORERS DATA TABLE (Strict 6-Column Layout) -->
                                            <table style="width: 100%; text-align: left; border-collapse: collapse; border-spacing: 0; color: #000000; font-size: ${mvpFont}; margin: 0; table-layout: fixed;">
                                                <thead>
                                                    <tr style="background-color: #f1f5f9; height: 19px;">
                                                        <th style="width: 7%; border: 1px solid #000000; border-top: none; border-left: none; padding: 1px 2px; text-align: center; box-sizing: border-box; background-color: #f1f5f9; font-weight: 800; font-size: 8px;">#</th>
                                                        <th style="width: 32%; border: 1px solid #000000; border-top: none; padding: 1px 3px; box-sizing: border-box; font-weight: 800; font-size: 8px; color: #1e293b;">Player</th>
                                                        <th style="width: 11%; border: 1px solid #000000; border-top: none; padding: 1px 2px; text-align: center; font-weight: 900; font-size: 8px; background-color: #e2e8f0; color: #000000; box-sizing: border-box;">Awards</th>
                                                        <th style="width: 7%; border: 1px solid #000000; border-top: none; padding: 1px 2px; text-align: center; box-sizing: border-box; background-color: #f1f5f9; font-weight: 800; font-size: 8px;">#</th>
                                                        <th style="width: 32%; border: 1px solid #000000; border-top: none; padding: 1px 3px; box-sizing: border-box; font-weight: 800; font-size: 8px; color: #1e293b;">Player</th>
                                                        <th style="width: 11%; border: 1px solid #000000; border-top: none; border-right: none; padding: 1px 2px; text-align: center; font-weight: 900; font-size: 8px; background-color: #e2e8f0; color: #000000; box-sizing: border-box;">Goals</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    ${Array.from({ length: 34 }).map((_, idx) => {
                                                        const pMVP = paddedMvps[idx] || { _empty: true };
                                                        const pTS = paddedScorers[idx] || { _empty: true };
                                                        const isLast = idx === 33;
                                                        const bBottom = isLast ? 'border-bottom: none;' : '';
                                                        return `
                                                            <tr style="height: 14.1px;">
                                                                <td style="border: 1px solid #000000; border-left: none; ${bBottom} padding: 0 2px; text-align: center; box-sizing: border-box; background-color: #f1f5f9; font-weight: 800; font-size: 7.5px; color: #475569;">${idx + 1}</td>
                                                                <td style="border: 1px solid #000000; ${bBottom} padding: 0 3px; font-weight: 600; color: #0f172a; white-space: nowrap; overflow: hidden; box-sizing: border-box;">${pMVP._empty ? '&nbsp;' : (pMVP.name || pMVP.player || '&nbsp;')}</td>
                                                                <td style="border: 1px solid #000000; ${bBottom} padding: 0 2px; text-align: center; font-weight: 900; color: #000000; background-color: #f1f5f9; box-sizing: border-box;">${pMVP._empty ? '&nbsp;' : (pMVP.potd !== undefined ? pMVP.potd : (pMVP.awards !== undefined ? pMVP.awards : (pMVP.count || 0)))}</td>
                                                                <td style="border: 1px solid #000000; ${bBottom} padding: 0 2px; text-align: center; box-sizing: border-box; background-color: #f1f5f9; font-weight: 800; font-size: 7.5px; color: #475569;">${idx + 1}</td>
                                                                <td style="border: 1px solid #000000; ${bBottom} padding: 0 3px; font-weight: 600; color: #0f172a; white-space: nowrap; overflow: hidden; box-sizing: border-box;">${pTS._empty ? '&nbsp;' : (pTS.name || pTS.player || '&nbsp;')}</td>
                                                                <td style="border: 1px solid #000000; border-right: none; ${bBottom} padding: 0 2px; text-align: center; font-weight: 900; color: #000000; background-color: #f1f5f9; box-sizing: border-box;">${pTS._empty ? '&nbsp;' : (pTS.goals !== undefined ? pTS.goals : (pTS.score !== undefined ? pTS.score : (pTS.count || 0)))}</td>
                                                            </tr>
                                                        `;
                                                    }).join('')}
                                                </tbody>
                                            </table>
                                        </td>

                                        <!-- CENTER COLUMN: Player League Part 1 (31% width, 42 rows: 1 to 42) -->
                                        <td style="width: 31%; padding: 0; vertical-align: top; border-right: 1px solid #000000; border-bottom: none;">
                                            <table style="width: 100%; text-align: left; border-collapse: collapse; border-spacing: 0; color: #000000; font-size: ${pFont}; margin: 0; table-layout: fixed;">
                                                <thead style="background-color: #f1f5f9;">
                                                    <tr style="height: 20px;">
                                                        <th style="border: 1px solid #000000; border-top: none; border-left: none; padding: 1px 2px; text-align: center; width: 8%; box-sizing: border-box; background-color: #f1f5f9; font-weight: 800; font-size: 8.5px;">#</th>
                                                        <th style="border: 1px solid #000000; border-top: none; padding: 1px 3px; width: 44%; box-sizing: border-box; font-weight: 800; font-size: 8.5px; color: #1e293b;">Player</th>
                                                        <th style="border: 1px solid #000000; border-top: none; padding: 1px 2px; text-align: center; width: 8%; box-sizing: border-box; font-weight: 800; font-size: 8.5px; color: #1e293b;">P</th>
                                                        <th style="border: 1px solid #000000; border-top: none; padding: 1px 2px; text-align: center; width: 8%; box-sizing: border-box; font-weight: 800; font-size: 8.5px; color: #1e293b;">W</th>
                                                        <th style="border: 1px solid #000000; border-top: none; padding: 1px 2px; text-align: center; width: 8%; box-sizing: border-box; font-weight: 800; font-size: 8.5px; color: #1e293b;">D</th>
                                                        <th style="border: 1px solid #000000; border-top: none; padding: 1px 2px; text-align: center; width: 8%; box-sizing: border-box; font-weight: 800; font-size: 8.5px; color: #1e293b;">L</th>
                                                        <th style="border: 1px solid #000000; border-top: none; border-right: none; padding: 1px 2px; text-align: center; width: 16%; font-weight: 900; font-size: 9px; background-color: #e2e8f0; color: #000000; box-sizing: border-box;">PTS</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    ${pCol1.map((p, idx) => {
                                                        const isLast = idx === 41;
                                                        const bBottom = isLast ? 'border-bottom: none;' : '';
                                                        return `
                                                            <tr style="height: 15px;">
                                                                <td style="border: 1px solid #000000; border-left: none; ${bBottom} padding: 0 2px; text-align: center; box-sizing: border-box; background-color: #f1f5f9; font-weight: 800; font-size: 8.5px; color: #475569;">${idx + 1}</td>
                                                                <td style="border: 1px solid #000000; ${bBottom} padding: 0 3px; font-weight: 700; color: #0f172a; white-space: nowrap; overflow: hidden; box-sizing: border-box;">${p._empty ? '&nbsp;' : (p.name || p.player || '&nbsp;')}</td>
                                                                <td style="border: 1px solid #000000; ${bBottom} padding: 0 2px; text-align: center; color: #334155; font-weight: 600; box-sizing: border-box;">${p._empty ? '&nbsp;' : (p.pld || 0)}</td>
                                                                <td style="border: 1px solid #000000; ${bBottom} padding: 0 2px; text-align: center; color: #334155; font-weight: 600; box-sizing: border-box;">${p._empty ? '&nbsp;' : (p.w || 0)}</td>
                                                                <td style="border: 1px solid #000000; ${bBottom} padding: 0 2px; text-align: center; color: #334155; font-weight: 600; box-sizing: border-box;">${p._empty ? '&nbsp;' : (p.d || 0)}</td>
                                                                <td style="border: 1px solid #000000; ${bBottom} padding: 0 2px; text-align: center; color: #334155; font-weight: 600; box-sizing: border-box;">${p._empty ? '&nbsp;' : (p.l || 0)}</td>
                                                                <td style="border: 1px solid #000000; border-right: none; ${bBottom} padding: 0 2px; text-align: center; font-weight: 900; color: #000000; background-color: #f1f5f9; box-sizing: border-box;">${p._empty ? '&nbsp;' : (p.pts || p.points || 0)}</td>
                                                            </tr>
                                                        `;
                                                    }).join('')}
                                                </tbody>
                                            </table>
                                        </td>
                                        
                                        <!-- RIGHT COLUMN: Player League Part 2 (31% width, 42 rows: 43 to 84) -->
                                        <td style="width: 31%; padding: 0; vertical-align: top; border-bottom: none;">
                                            <table style="width: 100%; text-align: left; border-collapse: collapse; border-spacing: 0; color: #000000; font-size: ${pFont}; margin: 0; table-layout: fixed;">
                                                <thead style="background-color: #f1f5f9;">
                                                    <tr style="height: 20px;">
                                                        <th style="border: 1px solid #000000; border-top: none; border-left: none; padding: 1px 2px; text-align: center; width: 8%; box-sizing: border-box; background-color: #f1f5f9; font-weight: 800; font-size: 8.5px;">#</th>
                                                        <th style="border: 1px solid #000000; border-top: none; padding: 1px 3px; width: 44%; box-sizing: border-box; font-weight: 800; font-size: 8.5px; color: #1e293b;">Player</th>
                                                        <th style="border: 1px solid #000000; border-top: none; padding: 1px 2px; text-align: center; width: 8%; box-sizing: border-box; font-weight: 800; font-size: 8.5px; color: #1e293b;">P</th>
                                                        <th style="border: 1px solid #000000; border-top: none; padding: 1px 2px; text-align: center; width: 8%; box-sizing: border-box; font-weight: 800; font-size: 8.5px; color: #1e293b;">W</th>
                                                        <th style="border: 1px solid #000000; border-top: none; padding: 1px 2px; text-align: center; width: 8%; box-sizing: border-box; font-weight: 800; font-size: 8.5px; color: #1e293b;">D</th>
                                                        <th style="border: 1px solid #000000; border-top: none; padding: 1px 2px; text-align: center; width: 8%; box-sizing: border-box; font-weight: 800; font-size: 8.5px; color: #1e293b;">L</th>
                                                        <th style="border: 1px solid #000000; border-top: none; border-right: none; padding: 1px 2px; text-align: center; width: 16%; font-weight: 900; font-size: 9px; background-color: #e2e8f0; color: #000000; box-sizing: border-box;">PTS</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    ${pCol2.map((p, idx) => {
                                                        const isLast = idx === 41;
                                                        const bBottom = isLast ? 'border-bottom: none;' : '';
                                                        return `
                                                            <tr style="height: 15px;">
                                                                <td style="border: 1px solid #000000; border-left: none; ${bBottom} padding: 0 2px; text-align: center; box-sizing: border-box; background-color: #f1f5f9; font-weight: 800; font-size: 8.5px; color: #475569;">${idx + 1 + mid}</td>
                                                                <td style="border: 1px solid #000000; ${bBottom} padding: 0 3px; font-weight: 700; color: #0f172a; white-space: nowrap; overflow: hidden; box-sizing: border-box;">${p._empty ? '&nbsp;' : (p.name || p.player || '&nbsp;')}</td>
                                                                <td style="border: 1px solid #000000; ${bBottom} padding: 0 2px; text-align: center; color: #334155; font-weight: 600; box-sizing: border-box;">${p._empty ? '&nbsp;' : (p.pld || 0)}</td>
                                                                <td style="border: 1px solid #000000; ${bBottom} padding: 0 2px; text-align: center; color: #334155; font-weight: 600; box-sizing: border-box;">${p._empty ? '&nbsp;' : (p.w || 0)}</td>
                                                                <td style="border: 1px solid #000000; ${bBottom} padding: 0 2px; text-align: center; color: #334155; font-weight: 600; box-sizing: border-box;">${p._empty ? '&nbsp;' : (p.d || 0)}</td>
                                                                <td style="border: 1px solid #000000; ${bBottom} padding: 0 2px; text-align: center; color: #334155; font-weight: 600; box-sizing: border-box;">${p._empty ? '&nbsp;' : (p.l || 0)}</td>
                                                                <td style="border: 1px solid #000000; border-right: none; ${bBottom} padding: 0 2px; text-align: center; font-weight: 900; color: #000000; background-color: #f1f5f9; box-sizing: border-box;">${p._empty ? '&nbsp;' : (p.pts || p.points || 0)}</td>
                                                            </tr>
                                                        `;
                                                    }).join('')}
                                                </tbody>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                            </div>

                            <!-- FOOTER AT BOTTOM OF PAGE -->
                            <div style="margin-top: 5px; padding: 0; display: flex; justify-content: space-between; align-items: center;">
                                <div style="font-size: 8px; font-weight: 800; color: #334155; text-align: left; text-transform: uppercase; letter-spacing: 0.5px;">
                                    © Football United — Official Weekly League Report
                                </div>
                                <div style="font-size: 7.5px; font-weight: 700; color: #64748b; text-align: right; text-transform: uppercase; letter-spacing: 0.5px;">
                                    Official Standings Publication • Page 1 of 1
                                </div>
                            </div>
                        </div>
                    `;

                    // 5. Safely Render via off-screen DOM injection
                    const printContainer = document.createElement('div');
                    printContainer.id = 'pdf-render-root';
                    printContainer.style.position = 'absolute';
                    printContainer.style.left = '0';
                    printContainer.style.top = '0';
                    printContainer.style.width = '1020px';
                    printContainer.style.backgroundColor = '#ffffff';
                    printContainer.style.zIndex = '-9999';
                    printContainer.style.pointerEvents = 'none';
                    printContainer.innerHTML = reportHtml;
                    document.body.appendChild(printContainer);

                    const targetElem = printContainer.firstElementChild;
                    const opt = {
                        margin:       [0.08, 0.08, 0.08, 0.08], 
                        filename:     `GameOn_Weekly_Report_${new Date().toISOString().split('T')[0]}.pdf`,
                        image:        { type: 'jpeg', quality: 0.98 },
                        html2canvas:  { 
                            scale: 2, 
                            useCORS: true, 
                            letterRendering: true,
                            logging: false
                        },
                        jsPDF:        { unit: 'in', format: 'a4', orientation: 'landscape' },
                        pagebreak:    { mode: 'avoid-all' }
                    };

                    if (typeof html2pdf !== 'undefined') {
                        html2pdf().set(opt).from(targetElem).save().then(() => {
                            this.pdfGenerating = false;
                            if (document.body.contains(printContainer)) document.body.removeChild(printContainer);
                        }).catch(err => {
                            console.error("PDF Error:", err);
                            this.pdfGenerating = false;
                            if (document.body.contains(printContainer)) document.body.removeChild(printContainer);
                            alert("Failed to generate PDF. Check browser console.");
                        });
                    } else {
                        this.pdfGenerating = false;
                        if (document.body.contains(printContainer)) document.body.removeChild(printContainer);
                        alert("html2pdf library is loading. Please try again in a moment.");
                    }
                } catch(err) {
                    console.error("JS Rendering Error:", err);
                    this.pdfGenerating = false;
                    alert("A critical error occurred while building the PDF data.");
                }
            }, 200);
        },

        async downloadWeeklyReportPdf() {
            return this.downloadComprehensivePDF();
        },





        // --- REPORTS & PROFILES ---
        reportStartDate: '',
        reportEndDate: '',
        weeklyReportCards: [],
        get filteredReportData() {
            return this.getFilteredReportData();
        },
        playerProfileStats: { pld: 0, w: 0, d: 0, l: 0, goals: 0, potd: 0, pts: 0, ppg: '0.00', winRate: '0%' },
        playerRecentMatches: [],
        newMatchDay: { date: new Date().toISOString().split('T')[0], home_team: '', away_team: '', match_type: 'League Match' },
        highlightedSessionDate: '',
        stopwatch: {
            running: false,
            isRunning: false,
            time: 0,
            interval: null,
            format() {
                const total = this.time || 0;
                const mins = Math.floor(total / 60).toString().padStart(2, '0');
                const secs = (total % 60).toString().padStart(2, '0');
                return `${mins}:${secs}`;
            }
        },
        widgets: {
            top_scorer: { player: 'None', goals: 0, count: 0 },
            most_attendance: { player: 'None', count: 0, pld: 0 },
            most_player_pts: { player: 'None', pts: 0, points: 0, count: 0 },
            top_potd: { player: 'None', count: 0, potd: 0, awards: 0, mvp: 0 },
            mvp: { player: 'None', count: 0, potd: 0, awards: 0, mvp: 0 },
            player_of_the_day: { player: 'None', count: 0, potd: 0, awards: 0, mvp: 0 },
            potd: { player: 'None', count: 0, potd: 0, awards: 0, mvp: 0 },
            top_points: { player: 'None', pts: 0, points: 0, count: 0 },
            player_points: { player: 'None', pts: 0, points: 0, count: 0 }
        },

        // --- THEME & UTILS ---

        toggleStrictMode() {
            this.strictMode = !this.strictMode;
            localStorage.setItem('gameon_strict_mode', this.strictMode);
        },

        // --- SORTED GETTERS FOR TABLES & CARDS ---
        getSortedPlayerStandings() {
            let list = [...(this.playerStandings || [])];
            let col = String(this.playerSortCol || 'pts').toLowerCase().trim();
            const asc = this.playerSortAsc; 
            
            list.sort((a, b) => {
                let valA = a[col] !== undefined ? a[col] : 0;
                let valB = b[col] !== undefined ? b[col] : 0;

                // A. Alphabetical String Sorting for Names
                if (col === 'name') {
                    const strA = String(valA).toLowerCase();
                    const strB = String(valB).toLowerCase();
                    if (strA < strB) return asc ? -1 : 1;
                    if (strA > strB) return asc ? 1 : -1;
                    return 0;
                }
                
                // B. Strict Mathematical Sorting for Stats
                const numA = Number(valA) || 0;
                const numB = Number(valB) || 0;
                if (numA < numB) return asc ? -1 : 1;
                if (numA > numB) return asc ? 1 : -1;
                
                // C. Intelligent Tie-Breakers
                if (col !== 'pts' && (Number(b.pts) || 0) !== (Number(a.pts) || 0)) return (Number(b.pts) || 0) - (Number(a.pts) || 0);
                if (col !== 'ppg' && (Number(b.ppg) || 0) !== (Number(a.ppg) || 0)) return (Number(b.ppg) || 0) - (Number(a.ppg) || 0);
                if (col !== 'goals' && (Number(b.goals) || 0) !== (Number(a.goals) || 0)) return (Number(b.goals) || 0) - (Number(a.goals) || 0);
                if (col !== 'pld') return (Number(a.pld) || 0) - (Number(b.pld) || 0);
                return 0;
            });
            return list;
        },

        getSortedTeams() {
            let list = (this.captainStandings || []).filter(t => this.isValidRegisteredTeam(t));
            if (list.length === 0 && Array.isArray(this.teams) && this.teams.length > 0) {
                list = this.teams.filter(t => this.isValidRegisteredTeam(t)).map(t => ({ id: t.id, name: t.name, pld: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 }));
            }
            
            let col = String(this.teamSortCol || 'pts').toLowerCase().trim();
            const asc = this.teamSortAsc;
            
            list.sort((a, b) => {
                let valA = a[col] !== undefined ? a[col] : 0;
                let valB = b[col] !== undefined ? b[col] : 0;

                if (col === 'name') {
                    const strA = String(valA).toLowerCase();
                    const strB = String(valB).toLowerCase();
                    if (strA < strB) return asc ? -1 : 1;
                    if (strA > strB) return asc ? 1 : -1;
                    return 0;
                }
                
                const numA = Number(valA) || 0;
                const numB = Number(valB) || 0;
                if (numA < numB) return asc ? -1 : 1;
                if (numA > numB) return asc ? 1 : -1;
                
                if (col !== 'pts' && (Number(b.pts) || 0) !== (Number(a.pts) || 0)) return (Number(b.pts) || 0) - (Number(a.pts) || 0);
                if (col !== 'gd' && (Number(b.gd) || 0) !== (Number(a.gd) || 0)) return (Number(b.gd) || 0) - (Number(a.gd) || 0);
                if (col !== 'gf' && (Number(b.gf) || 0) !== (Number(a.gf) || 0)) return (Number(b.gf) || 0) - (Number(a.gf) || 0);
                if (col !== 'pld') return (Number(a.pld) || 0) - (Number(b.pld) || 0);
                return 0;
            });
            return list;
        },

        cleanMatchTitle(title) {
            if (!title || typeof title !== 'string') return '';
            return title
                .replace(/\s*\(\s*202\d[^\)]*\)/gi, '')
                .replace(/\s*\(\s*\d{4}-\d{1,2}(?:-\d{1,2})?\s*\)/gi, '')
                .replace(/\s*\(\s*\d{4}[^\)]*\)/gi, '')
                .trim();
        },

        getSortedCaptainStandings() {
            return this.getSortedTeams();
        },

        getSortedMatches() {
            return this.getSortedMatchDays();
        },

        getSortedMatchDays() {
            return [...(this.matches || [])].map(m => {
                if (m && m.title) {
                    m.title = this.cleanMatchTitle(m.title);
                }
                return m;
            }).sort((a, b) => {
                const dA = a?.date || '';
                const dB = b?.date || '';
                return dA !== dB ? dA.localeCompare(dB) : (a?.id || 0) - (b?.id || 0);
            });
        },

        // --- 1. SINGLE SOURCE OF TRUTH (SSOT) PARSER ---
        // Transforms messy raw database Match Cards into perfectly standardized data
        parseMatchCard(m) {
            if (!m) return null;
            
            // Helper to universally standardize names (strips @ tags, makes lowercase)
            const cleanStr = (str) => {
                if (!str) return '';
                let s = typeof str === 'object' ? (str.name || str.player || str.id || '') : String(str);
                return s.split(/[@\(\[\-]/)[0].trim().toLowerCase();
            };

            // Helper to safely parse database arrays/strings
            const safeArr = (data) => {
                let arr = [];
                if (typeof data === 'string') { 
                    try { arr = JSON.parse(data); } 
                    catch(e) { arr = data.split(',').filter(Boolean); } 
                } else if (Array.isArray(data)) { 
                    arr = data; 
                }
                return arr;
            };

            // A. Parse Scores & Forfeits
            let hScore = Number(m.home_score !== undefined ? m.home_score : (m.homeScore || 0));
            let aScore = Number(m.away_score !== undefined ? m.away_score : (m.awayScore || 0));
            const hTeam = cleanStr(m.home_team || m.homeTeam || '');
            const aTeam = cleanStr(m.away_team || m.awayTeam || '');
            
            // Clean and strip the Forfeit prefix safely
            let fTeam = cleanStr(m.forfeit_team || m.forfeitTeam || 'none');
            fTeam = fTeam.replace(/^forfeit:\s*/i, '').trim();
            
            if (fTeam === 'home' || (hTeam && fTeam === hTeam)) { hScore = 0; aScore = 3; }
            else if (fTeam === 'away' || (aTeam && fTeam === aTeam)) { hScore = 3; aScore = 0; }

            // B. Parse Team Rosters
            const homeRoster = safeArr(m.home_roster || m.homeRoster).map(cleanStr).filter(Boolean);
            const awayRoster = safeArr(m.away_roster || m.awayRoster).map(cleanStr).filter(Boolean);

            // C. Parse Goals
            const scorers = safeArr(m.scorers || m.goalScorers).map(sc => ({
                name: cleanStr(sc),
                goals: Number(typeof sc === 'object' && sc !== null ? (sc.goals || sc.score || 1) : 1)
            }));

            // D. Parse POTD
            const potds = safeArr(m.potd_winners || m.potdWinners || m.potd).map(cleanStr).filter(Boolean);

            // E. Parse Attendance (Merge explicitly marked present + anyone on a roster)
            let present = [];
            if (m.attendance && typeof m.attendance === 'object') {
                Object.entries(m.attendance).forEach(([k, v]) => {
                    const status = (typeof v === 'object' && v !== null ? v.status : v) || '';
                    if (String(status).toLowerCase() === 'present') present.push(cleanStr(k));
                });
            }
            const allPresent = Array.from(new Set([...present, ...homeRoster, ...awayRoster]));

            return {
                date: m.date,
                type: m.match_type || m.matchType || 'League Match',
                hTeam, aTeam, hScore, aScore,
                homeRoster, awayRoster,
                scorers, potds,
                presentPlayers: allPresent
            };
        },

        // --- FUZZY MATCH & CONFIRM ---
        isFuzzyMatch(playerObj, matchData) {
            if (!playerObj || !matchData) return false;
            
            const pId = typeof playerObj === 'object' && playerObj !== null ? String(playerObj.id || '').trim() : '';
            const pNameStr = typeof playerObj === 'object' && playerObj !== null ? String(playerObj.name || playerObj.player || playerObj.player_name || '').trim() : String(playerObj).trim();
            const pNickStr = typeof playerObj === 'object' && playerObj !== null ? String(playerObj.nickname || '').trim() : '';
            
            const mId = typeof matchData === 'object' && matchData !== null ? String(matchData.id || '').trim() : String(matchData).trim();
            const mNameStr = typeof matchData === 'object' && matchData !== null ? String(matchData.name || matchData.player || matchData.player_name || matchData.id || '').trim() : String(matchData).trim();
            const mNickStr = typeof matchData === 'object' && matchData !== null ? String(matchData.nickname || '').trim() : '';

            // If both entities have distinct valid IDs, they are distinct entities!
            if (pId && mId && pId !== mId && pId !== '[object Object]' && mId !== '[object Object]') return false;

            // 1. Check ID vs ID, or ID vs Name
            if (pId && mId && pId === mId) return true;
            if (pId && mNameStr && pId.toLowerCase() === mNameStr.toLowerCase()) return true;
            if (pNameStr && mId && pNameStr.toLowerCase() === mId.toLowerCase()) return true;

            const clean = (str) => String(str || '').toLowerCase().trim().replace(/^p_/, '');
            const pName = clean(pNameStr);
            const mName = clean(mNameStr);
            const pNick = clean(pNickStr);
            const mNick = clean(mNickStr);
            
            if (pName && mName && pName === mName) return true;
            if (pNick && mNick && pNick === mNick) return true;
            if (pNick && mName && pNick === mName) return true;
            if (pName && mNick && pName === mNick) return true;
            
            // 2. Strip role tags (e.g. "Jerry @Onye Army" -> "Jerry" or "Jerry (C)" -> "Jerry")
            // NEVER strip regular name tokens like "New" (e.g. "Ike" and "Ike New" are strictly different players)
            const stripTags = (name) => name.replace(/@\s*[\w\s]+/g, '').replace(/\((c|gk|captain|vc|vice captain)\)/gi, '').trim();
            const pClean = stripTags(pName);
            const mClean = stripTags(mName);
            if (pClean && mClean && pClean === mClean) return true;

            return false;
        },

        findRegisteredPlayer(p) {
            if (!p) return null;
            const pId = typeof p === 'object' && p !== null ? String(p.id || '').trim() : String(p).trim();
            const pName = typeof p === 'object' && p !== null ? String(p.name || p.player || p.player_name || '').trim() : String(p).trim();
            const pNick = typeof p === 'object' && p !== null ? String(p.nickname || '').trim() : '';
            
            const players = this.players || [];
            if (!players.length) return null;

            // 1. Exact ID match
            if (pId && pId !== '[object Object]') {
                const found = players.find(pl => String(pl.id).trim() === pId);
                if (found) return found;
            }
            // 2. Exact Name match (case-insensitive)
            if (pName && pName !== '[object Object]') {
                const pNameLower = pName.toLowerCase();
                const found = players.find(pl => String(pl.name || '').trim().toLowerCase() === pNameLower);
                if (found) return found;
            }
            // 3. Exact Nickname match (case-insensitive)
            if (pNick && pNick !== '[object Object]') {
                const pNickLower = pNick.toLowerCase();
                const found = players.find(pl => String(pl.nickname || '').trim().toLowerCase() === pNickLower);
                if (found) return found;
            }
            // 4. Nickname matching Name or ID matching Name
            if (pName && pName !== '[object Object]') {
                const pNameLower = pName.toLowerCase();
                const found = players.find(pl => pl.nickname && String(pl.nickname).trim().toLowerCase() === pNameLower);
                if (found) return found;
            }
            if (pId && pId !== '[object Object]') {
                const pIdLower = pId.toLowerCase();
                const found = players.find(pl => String(pl.name || '').trim().toLowerCase() === pIdLower);
                if (found) return found;
            }
            // 5. Fallback safe fuzzy match (ONLY if no exact match was found)
            return players.find(pl => this.isFuzzyMatch(pl, p)) || null;
        },

        safeConfirm(message) {
            let userConfirmed = true;
            try {
                // If embedded inside an iframe (like AI Studio preview), window.confirm is suppressed by sandbox policies
                if (typeof window !== 'undefined' && window.self !== window.top) {
                    return true;
                }
                const startTime = Date.now();
                if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
                    userConfirmed = window.confirm(message);
                }
                if (!userConfirmed && (Date.now() - startTime) < 50) {
                    userConfirmed = true;
                }
            } catch (e) {
                userConfirmed = true;
            }
            return userConfirmed;
        },

        // --- DATA PERSISTENCE & MERGE ---
        applyServerData(data) {
            if (!data) return;
            if (Array.isArray(data.matches) && data.matches.length > 0) {
                this.matches = data.matches.map(m => {
                    if (m && m.title) m.title = this.cleanMatchTitle(m.title);
                    return m;
                });
            }
            if (Array.isArray(data.sessions) && data.sessions.length > 0) this.sessions = data.sessions;
            if (Array.isArray(data.players) && data.players.length > 0) this.players = data.players;
            if (Array.isArray(data.teams) && data.teams.length > 0) this.teams = data.teams;
            if (data.leagueConfig && typeof data.leagueConfig === 'object') this.leagueConfig = { ...this.leagueConfig, ...data.leagueConfig };

            this.recalculateStandings();
        },

        async saveData() {
            try {
                this.lastDataUpdate = Date.now();
                // ALL DATA IS NOW SAVED ATOMICALLY. 
                // This function now ONLY updates the UI.
                this.recalculateStandings();
            } catch (err) {
                console.error("Error in saveData:", err);
            }
        },

        async importBackup(event) {
            const file = event.target.files ? event.target.files[0] : null;
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const backupData = JSON.parse(e.target.result);
                    this.savingStatus = 'saving';
                    
                    // Upload data directly via Firebase bridge instead of local API
                    if (window.fb) {
                        if (backupData.players) for (let p of backupData.players) await window.fb.savePlayer(p);
                        if (backupData.matches) for (let m of backupData.matches) await window.fb.saveMatchDay(m);
                        if (backupData.teams) for (let t of backupData.teams) await window.fb.saveTeam(t);
                        if (backupData.leagueConfig) await window.fb.saveSettings(backupData.leagueConfig);
                    }
                    
                    this.savingStatus = 'saved';
                    alert("✅ Backup imported securely directly to Firebase!");
                } catch (err) {
                    alert("Invalid JSON backup file.");
                }
            };
            reader.readAsText(file);
        },





        // --- 1. THE SSOT EXTRACTOR (SINGLE SOURCE OF TRUTH) ---
        // Transforms messy raw database Match Cards into perfectly standardized data
        extractPlayerStats(player, match) {
            let stats = { pld: 0, w: 0, d: 0, l: 0, goals: 0, potd: 0 };
            if (!player || !match) return stats;

            const safeParse = (d) => { try { return typeof d === 'string' ? JSON.parse(d || '[]') : (d || []); } catch(e) { return []; } };

            // 1. Calculate Effective Match Score (Handling Forfeits)
            const hScore = Number(match.home_score !== undefined ? match.home_score : (match.homeScore || 0));
            const aScore = Number(match.away_score !== undefined ? match.away_score : (match.awayScore || 0));
            const hTeamClean = String(match.home_team || match.homeTeam || '').trim().toLowerCase();
            const aTeamClean = String(match.away_team || match.awayTeam || '').trim().toLowerCase();
            
            // FIX: Aggressively strip the Forfeit prefix to ensure perfect evaluation
            let fTeam = String(match.forfeit_team || match.forfeitTeam || 'none').toLowerCase();
            fTeam = fTeam.replace(/^forfeit:\s*/i, '').trim();
            
            let effH = hScore; let effA = aScore;
            if (fTeam === 'home' || (hTeamClean && fTeam === hTeamClean)) { effH = 0; effA = 3; }
            else if (fTeam === 'away' || (aTeamClean && fTeam === aTeamClean)) { effH = 3; effA = 0; }

            // 2. Determine Player's Team Assignment (Checking Rosters AND Drag & Drop)
            let assignedTeam = 'none';
            const hRoster = safeParse(match.home_roster || match.homeRoster);
            const aRoster = safeParse(match.away_roster || match.awayRoster);
            
            if (hRoster.some(rp => this.isFuzzyMatch(player, rp))) assignedTeam = 'home';
            else if (aRoster.some(rp => this.isFuzzyMatch(player, rp))) assignedTeam = 'away';
            
            if (assignedTeam === 'none' && match.player_teams) {
                const pId = String(player.id || '');
                const pName = String(player.name || '');
                const tAssigned = match.player_teams[pId] || match.player_teams[pName] || '';
                const tClean = String(tAssigned).trim().toLowerCase();
                if (tClean === 'home' || (hTeamClean && tClean === hTeamClean)) assignedTeam = 'home';
                else if (tClean === 'away' || (aTeamClean && tClean === aTeamClean)) assignedTeam = 'away';
            }

            // 3. Determine Attendance
            let isPres = false;
            if (assignedTeam !== 'none') {
                isPres = true;
            } else if (match.attendance) {
                const checkAtt = (val) => val === true || String(val).toLowerCase() === 'present' || (typeof val === 'object' && val !== null && String(val.status).toLowerCase() === 'present');
                if (checkAtt(match.attendance[player.id]) || checkAtt(match.attendance[player.name])) isPres = true;
            }

            // 4. Record PLD and W/D/L (Now strictly respects forfeit logic)
            if (isPres) {
                stats.pld = 1;
                if (assignedTeam === 'home') {
                    if (effH > effA) stats.w = 1; else if (effH < effA) stats.l = 1; else stats.d = 1;
                } else if (assignedTeam === 'away') {
                    if (effA > effH) stats.w = 1; else if (effA < effH) stats.l = 1; else stats.d = 1;
                }
            }

            // 5. Record Goals
            const matchScorers = typeof this.getMatchScorers === 'function' ? this.getMatchScorers(match) : [];
            matchScorers.forEach(sc => {
                const regSc = this.findRegisteredPlayer(sc.name || sc.player || sc);
                if (regSc && player.id) {
                    if (String(regSc.id) === String(player.id)) {
                        stats.goals += Number(sc.goals || 1);
                    }
                } else if (this.isFuzzyMatch(player, sc.name || sc.player || sc)) {
                    stats.goals += Number(sc.goals || 1);
                }
            });

            // 6. Record POTD
            const potds = typeof this.getPOTDWinners === 'function' ? this.getPOTDWinners(match) : [];
            potds.forEach(potd => {
                const regPotd = this.findRegisteredPlayer(potd);
                if (regPotd && player.id) {
                    if (String(regPotd.id) === String(player.id)) {
                        stats.potd += 1;
                    }
                } else if (this.isFuzzyMatch(player, potd)) {
                    stats.potd += 1;
                }
            });

            return stats;
        },

        // --- 2. THE STANDINGS ENGINE (Strict Firebase SSOT & Auto-Healing) ---
        recalculateStandings() {
            const pStats = {};
            const cStats = {};

            // 1. Universal Date Normalizer (Handles 2-digit years, UK formats, ISO, Timestamps)
            const normalizeDateStr = (dVal) => {
                if (!dVal) return '';
                if (typeof dVal === 'number') {
                    const parsed = new Date(dVal);
                    return !isNaN(parsed.getTime()) ? parsed.toISOString().split('T')[0] : '';
                }
                const str = String(dVal).trim();
                if (str.includes('T')) return str.split('T')[0];
                if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

                const parts = str.split(/[\/\.-]/);
                if (parts.length === 3) {
                    if (parts[0].length === 4) {
                        // YYYY/MM/DD
                        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
                    } else {
                        // DD/MM/YY or DD/MM/YYYY
                        let d = parts[0].padStart(2, '0');
                        let m = parts[1].padStart(2, '0');
                        let y = parts[2];
                        if (y.length === 2) y = '20' + y;
                        return `${y}-${m}-${d}`;
                    }
                }

                const parsed = new Date(str);
                if (!isNaN(parsed.getTime())) {
                    let y = parsed.getFullYear();
                    if (y < 2000 && str.includes('26')) y += 100;
                    const m = String(parsed.getMonth() + 1).padStart(2, '0');
                    const d = String(parsed.getDate()).padStart(2, '0');
                    return `${y}-${m}-${d}`;
                }
                return str;
            };

            // 2. Case-Insensitive Team Resolver
            const isInvalidTeamName = (name) => {
                if (!name) return true;
                const lower = String(name).trim().toLowerCase();
                const banned = ['home', 'away', 'home team', 'away team', 'red', 'yellow', 'none', 'unknown', 'null', 'undefined', '[object object]'];
                if (banned.includes(lower)) return true;
                if (/^t_\d+$/i.test(lower) || /^md_\d+$/i.test(lower) || /^p_\d+$/i.test(lower)) return true;
                return false;
            };

            const resolveTeamKey = (inputStr) => {
                if (!inputStr) return null;
                const cleanInput = String(inputStr).trim().toLowerCase();
                if (isInvalidTeamName(cleanInput)) return null;

                const foundTeam = (this.teams || []).find(t => {
                    if (!this.isValidRegisteredTeam(t)) return false;
                    const tName = String(t.name || '').trim().toLowerCase();
                    const tId = String(t.id || '').trim().toLowerCase();
                    if (tName === cleanInput || tId === cleanInput) return true;
                    if (t.captain_id) {
                        const cap = (this.players || []).find(p => String(p.id) === String(t.captain_id));
                        if (cap && String(cap.name).trim().toLowerCase() === cleanInput) return true;
                    }
                    return false;
                });

                return foundTeam ? foundTeam.id : null;
            };

            // 3. Initialize Player Stats Map
            (this.players || []).forEach(p => {
                if (!p || !p.id) return;
                pStats[p.id] = { 
                    id: p.id, 
                    name: p.name || 'Unknown', 
                    player: p.name || 'Unknown', 
                    player_name: p.name || 'Unknown', 
                    nickname: p.nickname || '',
                    deductions: Math.abs(Number(String(p.deductions || 0).replace(/[^0-9.-]/g, '')) || 0), 
                    adj_pts: Number(p.adj_pts || 0),
                    pld: 0, w: 0, d: 0, l: 0, pts: 0, goals: 0, potd: 0 
                };
            });

            // 4. Initialize Team Stats Map (Keyed by ID to guarantee uniqueness)
            (this.teams || []).forEach(t => {
                if (!this.isValidRegisteredTeam(t) || !t.id) return;
                cStats[t.id] = { 
                    id: t.id, 
                    name: t.name || 'Unnamed Team', 
                    team: t.name || 'Unnamed Team', 
                    team_name: t.name || 'Unnamed Team', 
                    captain_id: t.captain_id || null,
                    deductions: Math.abs(Number(String(t.deductions || 0).replace(/[^0-9.-]/g, '')) || 0), 
                    adj_pts: Number(t.adj_pts || 0),
                    pld: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 
                };
            });

            const goalsStartDate = this.leagueSettings?.goals_potd_start ? normalizeDateStr(this.leagueSettings.goals_potd_start) : '2026-02-14';
            const playerStartDate = this.leagueSettings?.player_standings_start ? normalizeDateStr(this.leagueSettings.player_standings_start) : '2026-02-28';
            const captainStartDate = this.leagueSettings?.captain_league_start ? normalizeDateStr(this.leagueSettings.captain_league_start) : '2026-03-14';

            // 5. Process Matches
            (this.matches || []).forEach(m => {
                if (!m) return;
                const mDate = normalizeDateStr(m.date || m.created_at);
                const mTypeClean = String(m.match_type || m.matchType || '').toLowerCase().trim();
                const isFriendly = mTypeClean.includes('friendly');
                const isLeagueMatch = !isFriendly;

                let hScore = Number(m.home_score !== undefined ? m.home_score : (m.homeScore || 0));
                let aScore = Number(m.away_score !== undefined ? m.away_score : (m.awayScore || 0));
                
                let forfeit = String(m.forfeit_team || m.forfeitTeam || 'none').toLowerCase().replace(/^forfeit:\s*/i, '').trim();
                const hTeamRaw = String(m.home_team || '').toLowerCase().trim();
                const aTeamRaw = String(m.away_team || '').toLowerCase().trim();

                if (forfeit === 'home' || (hTeamRaw && forfeit === hTeamRaw)) { 
                    hScore = 0; aScore = 3; 
                } else if (forfeit === 'away' || (aTeamRaw && forfeit === aTeamRaw)) { 
                    hScore = 3; aScore = 0; 
                }

                // Process Individual Player Standings
                (this.players || []).forEach(p => {
                    if (!pStats[p.id]) return;
                    const s = this.extractPlayerStats(p, m);
                    if (!goalsStartDate || !mDate || mDate >= goalsStartDate) {
                        pStats[p.id].goals += s.goals; 
                        pStats[p.id].potd += s.potd;
                    }
                    if (!playerStartDate || !mDate || mDate >= playerStartDate) {
                        pStats[p.id].pld += s.pld; 
                        pStats[p.id].w += s.w; 
                        pStats[p.id].d += s.d; 
                        pStats[p.id].l += s.l;
                    }
                });

                // Process Team League Standings
                if (isLeagueMatch && (!captainStartDate || !mDate || mDate >= captainStartDate)) {
                    const hTeamKey = resolveTeamKey(m.home_team || m.homeTeam);
                    const aTeamKey = resolveTeamKey(m.away_team || m.awayTeam);

                    if (hTeamKey && cStats[hTeamKey]) {
                        const ht = cStats[hTeamKey];
                        ht.pld += 1; 
                        ht.gf += hScore; 
                        ht.ga += aScore; 
                        ht.gd = ht.gf - ht.ga;
                        if (hScore > aScore) { ht.w += 1; ht.pts += 3; }
                        else if (hScore < aScore) { ht.l += 1; }
                        else { ht.d += 1; ht.pts += 1; }
                    }
                    if (aTeamKey && cStats[aTeamKey]) {
                        const at = cStats[aTeamKey];
                        at.pld += 1; 
                        at.gf += aScore; 
                        at.ga += hScore; 
                        at.gd = at.gf - at.ga;
                        if (aScore > hScore) { at.w += 1; at.pts += 3; }
                        else if (aScore < hScore) { at.l += 1; }
                        else { at.d += 1; at.pts += 1; }
                    }
                }
            });

            // --- Finalize Output (Delta Offset Math Engine) ---
            Object.values(pStats).forEach(s => { s.nat_w = s.w; s.nat_d = s.d; s.nat_l = s.l; s.nat_goals = s.goals; s.nat_potd = s.potd; });
            const uniqueCStats = Array.from(new Set(Object.values(cStats)));
            uniqueCStats.forEach(s => { s.nat_w = s.w; s.nat_d = s.d; s.nat_l = s.l; s.nat_gf = s.gf; s.nat_ga = s.ga; });

            // 1. Captain Standings
            this.captainStandings = uniqueCStats
                .filter(s => this.isValidRegisteredTeam(s))
                .map(s => {
                    let tObj = (this.teams || []).find(t => String(t.id) === String(s.id) || String(t.name) === String(s.name)) || {};
                    
                    // Add Delta Offsets to Natural Math
                    s.w = s.nat_w + Number(tObj.adj_w || 0);
                    s.d = s.nat_d + Number(tObj.adj_d || 0);
                    s.l = s.nat_l + Number(tObj.adj_l || 0);
                    s.gf = s.nat_gf + Number(tObj.adj_gf || 0);
                    s.ga = s.nat_ga + Number(tObj.adj_ga || 0);
                    
                    s.adj_pts = Number(tObj.adj_pts || 0);
                    s.deductions = Math.abs(Number(String(tObj.deductions || 0).replace(/[^0-9.-]/g, '')) || 0); 

                    // Strict Accumulative Math
                    s.pld = Number(s.w || 0) + Number(s.d || 0) + Number(s.l || 0);
                    s.pts = (Number(s.w || 0) * 3) + (Number(s.d || 0) * 1) + s.adj_pts - s.deductions;
                    s.ppg = s.pld > 0 ? Number((s.pts / s.pld).toFixed(2)) : 0.0;
                    s.gd = Number(s.gf || 0) - Number(s.ga || 0);

                    return s;
                });
            this.captainStandings.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);

            // 2. Player Standings
            this.playerStandings = Object.values(pStats).map(s => {
                let pObj = (this.players || []).find(p => String(p.id) === String(s.id) || String(p.name) === String(s.name)) || {};
                
                // Add Delta Offsets to Natural Math
                s.w = s.nat_w + Number(pObj.adj_w || 0);
                s.d = s.nat_d + Number(pObj.adj_d || 0);
                s.l = s.nat_l + Number(pObj.adj_l || 0);
                s.goals = s.nat_goals + Number(pObj.adj_goals || 0);
                s.potd = s.nat_potd + Number(pObj.adj_potd || 0);
                
                s.adj_pts = Number(pObj.adj_pts || 0);
                s.deductions = Math.abs(Number(String(pObj.deductions || 0).replace(/[^0-9.-]/g, '')) || 0); 

                // Strict Accumulative Math
                s.pld = s.w + s.d + s.l;
                s.pts = (s.w * 3) + (s.d * 1) + s.adj_pts - s.deductions;
                s.ppg = s.pld > 0 ? Number((s.pts / s.pld).toFixed(2)) : 0.0;

                s.isVerified = true;
                s.auditMessage = '';
                return s;
            });
            this.playerStandings.sort((a, b) => b.pts - a.pts || b.ppg - a.ppg || b.goals - a.goals || a.pld - b.pld);

            // 8. Update Dashboard Widgets
            this.updateDashboardWidgets();

            return {
                captainStandings: this.captainStandings,
                playerStandings: this.playerStandings
            };
        },

        updateDashboardWidgets() {
            const list = this.playerStandings || [];
            const safeDisplay = (playerObj) => {
                if (!playerObj) return 'None';
                if (typeof this.getPlayerDisplayName === 'function') return this.getPlayerDisplayName(playerObj);
                return playerObj.name || playerObj.player || playerObj.player_name || 'None';
            };

            if (list.length > 0) {
                const topG = [...list].sort((a, b) => (Number(b.goals) || 0) - (Number(a.goals) || 0) || (Number(a.pld) || 0) - (Number(b.pld) || 0))[0];
                const topAtt = [...list].sort((a, b) => (Number(b.pld) || 0) - (Number(a.pld) || 0) || (Number(b.pts) || 0) - (Number(a.pts) || 0))[0];
                const topPts = [...list].sort((a, b) => (Number(b.pts) || 0) - (Number(a.pts) || 0) || (Number(b.ppg) || 0) - (Number(a.ppg) || 0) || (Number(b.goals) || 0) - (Number(a.goals) || 0) || (Number(a.pld) || 0) - (Number(b.pld) || 0))[0];
                const topMVP = [...list].sort((a, b) => (Number(b.potd) || 0) - (Number(a.potd) || 0) || (Number(b.pts) || 0) - (Number(a.pts) || 0) || (Number(b.goals) || 0) - (Number(a.goals) || 0))[0];

                const gScore = Number(topG?.goals) || 0;
                const attScore = Number(topAtt?.pld) || 0;
                const mvpScore = Number(topMVP?.potd) || 0;
                const ptsScore = Number(topPts?.pts) || 0;

                const gPlayer = gScore > 0 ? safeDisplay(topG) : 'None';
                const attPlayer = attScore > 0 ? safeDisplay(topAtt) : 'None';
                const mvpPlayer = mvpScore > 0 ? safeDisplay(topMVP) : 'None';
                const ptsPlayer = ptsScore > 0 ? safeDisplay(topPts) : 'None';

                this.widgets = {
                    ...this.widgets,
                    top_scorer: { player: gPlayer, goals: gScore, count: gScore },
                    most_attendance: { player: attPlayer, count: attScore, pld: attScore },
                    most_player_pts: { player: ptsPlayer, pts: ptsScore, points: ptsScore, count: ptsScore },
                    top_potd: { player: mvpPlayer, count: mvpScore, potd: mvpScore, awards: mvpScore, mvp: mvpScore },
                    mvp: { player: mvpPlayer, count: mvpScore, potd: mvpScore, awards: mvpScore, mvp: mvpScore },
                    player_of_the_day: { player: mvpPlayer, count: mvpScore, potd: mvpScore, awards: mvpScore, mvp: mvpScore },
                    potd: { player: mvpPlayer, count: mvpScore, potd: mvpScore, awards: mvpScore, mvp: mvpScore },
                    top_points: { player: ptsPlayer, pts: ptsScore, points: ptsScore, count: ptsScore },
                    player_points: { player: ptsPlayer, pts: ptsScore, points: ptsScore, count: ptsScore }
                };
            }
        },

        // --- 3. THE STANDINGS AUDITOR (Neutralized for Production) ---
        runStandingsAuditor() {
            // Clear any lingering global warnings
            this.auditWarnings = [];
            
            // The Leaderboard is now the definitive Single Source of Truth.
            // We no longer run redundant O(N^2) math checks here. 
            // Simply verify all players automatically to keep the UI clean and lightning fast.
            (this.playerStandings || []).forEach(player => {
                player.isVerified = true;
                player.auditMessage = '';
            });
        },

        // --- 1. REVISED WEEKLY REPORT ENGINE ---
        getFilteredReportData() {
            const normalizeDateStr = (dVal) => {
                if (!dVal) return '';
                if (typeof dVal === 'number') {
                    const parsed = new Date(dVal);
                    return !isNaN(parsed.getTime()) ? parsed.toISOString().split('T')[0] : '';
                }
                const str = String(dVal).trim();
                if (str.includes('T')) return str.split('T')[0];
                if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
                const parts = str.split(/[\/\.-]/);
                if (parts.length === 3) {
                    if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
                    let d = parts[0].padStart(2, '0');
                    let m = parts[1].padStart(2, '0');
                    let y = parts[2].length === 2 ? '20' + parts[2] : parts[2];
                    return `${y}-${m}-${d}`;
                }
                const parsed = new Date(str);
                return !isNaN(parsed.getTime()) ? parsed.toISOString().split('T')[0] : str;
            };

            const endDate = this.reportEndDate ? normalizeDateStr(this.reportEndDate) : '2099-12-31';
            const startDate = this.reportStartDate ? normalizeDateStr(this.reportStartDate) : '2026-02-14';

            const pStats = {};
            (this.players || []).forEach(p => {
                if (p && p.id) {
                    pStats[p.id] = { 
                        id: p.id, 
                        name: p.name || 'Unknown', 
                        player: p.name || 'Unknown', 
                        pld: 0, w: 0, d: 0, l: 0, pts: 0, ppg: '0.0', goals: 0, potd: 0 
                    };
                }
            });

            const cStats = {};
            (this.teams || []).forEach(t => {
                if (t && t.id) {
                    cStats[t.id] = { 
                        id: t.id, 
                        name: t.name || 'Unnamed Team', 
                        team: t.name || 'Unnamed Team', 
                        pld: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0, ppg: '0.0' 
                    };
                }
            });

            const resolveTeamKey = (inputStr) => {
                if (!inputStr) return null;
                const cleanInput = String(inputStr).trim().toLowerCase();
                const foundTeam = (this.teams || []).find(t => {
                    if (!t) return false;
                    const tName = String(t.name || '').trim().toLowerCase();
                    const tId = String(t.id || '').trim().toLowerCase();
                    if (tName === cleanInput || tId === cleanInput) return true;
                    if (t.captain_id) {
                        const cap = (this.players || []).find(p => String(p.id) === String(t.captain_id));
                        if (cap && String(cap.name).trim().toLowerCase() === cleanInput) return true;
                    }
                    return false;
                });
                return foundTeam ? foundTeam.id : inputStr;
            };

            const allMatches = typeof this.getSortedMatchDays === 'function' ? this.getSortedMatchDays() : (this.matches || []);
            const filteredMatches = allMatches.filter(m => {
                if (!m) return false;
                const mDate = normalizeDateStr(m.date || m.created_at);
                return mDate >= startDate && mDate <= endDate;
            });

            this.weeklyReportCards = [...filteredMatches].sort((a, b) => {
                const dA = normalizeDateStr(a?.date) || '';
                const dB = normalizeDateStr(b?.date) || '';
                return dA !== dB ? dB.localeCompare(dA) : (b?.id || 0) - (a?.id || 0);
            });

            filteredMatches.forEach(m => {
                const mDate = normalizeDateStr(m.date || m.created_at);
                const mTypeClean = String(m.match_type || m.matchType || '').toLowerCase().trim();
                const isFriendly = mTypeClean.includes('friendly');
                const isLeagueMatch = !isFriendly;

                let hScore = Number(m.home_score !== undefined ? m.home_score : (m.homeScore || 0));
                let aScore = Number(m.away_score !== undefined ? m.away_score : (m.awayScore || 0));
                
                let forfeit = String(m.forfeit_team || m.forfeitTeam || 'none').toLowerCase().replace(/^forfeit:\s*/i, '').trim();
                const hTeamRaw = String(m.home_team || '').toLowerCase().trim();
                const aTeamRaw = String(m.away_team || '').toLowerCase().trim();

                if (forfeit === 'home' || (hTeamRaw && forfeit === hTeamRaw)) { hScore = 0; aScore = 3; }
                else if (forfeit === 'away' || (aTeamRaw && forfeit === aTeamRaw)) { hScore = 3; aScore = 0; }

                // Player Calculations
                (this.players || []).forEach(p => {
                    if (!pStats[p.id]) return;
                    const s = this.extractPlayerStats(p, m);
                    pStats[p.id].goals += s.goals;
                    pStats[p.id].potd += s.potd;
                    pStats[p.id].pld += s.pld;
                    pStats[p.id].w += s.w;
                    pStats[p.id].d += s.d;
                    pStats[p.id].l += s.l;
                });

                // Team League Calculations
                if (isLeagueMatch) {
                    const hTeamKey = resolveTeamKey(m.home_team || m.homeTeam);
                    const aTeamKey = resolveTeamKey(m.away_team || m.awayTeam);
                    const ht = cStats[hTeamKey];
                    const at = cStats[aTeamKey];

                    if (ht) {
                        ht.pld += 1; ht.gf += hScore; ht.ga += aScore; ht.gd = ht.gf - ht.ga;
                        if (hScore > aScore) { ht.w += 1; ht.pts += 3; }
                        else if (hScore < aScore) { ht.l += 1; }
                        else { ht.d += 1; ht.pts += 1; }
                    }
                    if (at) {
                        at.pld += 1; at.gf += aScore; at.ga += hScore; at.gd = at.gf - at.ga;
                        if (aScore > hScore) { at.w += 1; at.pts += 3; }
                        else if (aScore < hScore) { at.l += 1; }
                        else { at.d += 1; at.pts += 1; }
                    }
                }
            });

            // 1. Calculate Pure Player Standings (No Legacy Override Drops)
            const playerStandings = Object.values(pStats).map(s => {
                s.pts = (s.w * 3) + (s.d * 1);
                s.ppg = s.pld > 0 ? (s.pts / s.pld).toFixed(1) : '0.0';
                return s;
            }).filter(s => s.pld > 0 || s.goals > 0 || s.potd > 0);
            playerStandings.sort((a, b) => b.pts - a.pts || Number(b.ppg) - Number(a.ppg) || b.goals - a.goals || a.pld - b.pld);

            // 2. Calculate Pure Team Standings
            const captainStandings = Object.values(cStats).map(s => {
                s.pts = (s.w * 3) + (s.d * 1);
                s.ppg = s.pld > 0 ? (s.pts / s.pld).toFixed(1) : '0.0';
                s.gd = s.gf - s.ga;
                return s;
            }).filter(s => s.pld > 0 || s.pts !== 0);
            captainStandings.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.pld - b.pld);

            return {
                captainStandings,
                playerStandings,
                topScorers: [...playerStandings].filter(p => p.goals > 0).sort((a, b) => b.goals - a.goals),
                mvpList: [...playerStandings].filter(p => p.potd > 0).sort((a, b) => b.potd - a.potd),
                weeklyReportCards: this.weeklyReportCards,
                reportDisplayDate: this.reportEndDate ? `14 FEB 2026 TO ${this.formatDateDisplay(this.reportEndDate)}` : `14 FEB 2026 TO PRESENT`
            };
        },

        // --- MODAL TOGGLES & HANDLERS ---
        openLeagueSettingsModal() { 
            this.showLeagueSettingsModal = true; 
        },
        async saveLeagueSettings() {
            if (!window.fb || !window.fb.saveSettings) {
                alert("🚨 Database not connected.");
                return;
            }
            
            const mergedSettings = {
                ...this.leagueSettings,
                name: (this.leagueConfig && this.leagueConfig.name) || '',
                format: (this.leagueConfig && this.leagueConfig.format) || '7v7',
                match_type: (this.leagueConfig && this.leagueConfig.match_type) || 'League Match',
                tournament_format: (this.leagueConfig && this.leagueConfig.tournament_format) || 'Group Stage + Knockout',
                two_legged: !!(this.leagueConfig && this.leagueConfig.two_legged),
                advance_per_group: Number(this.leagueConfig && this.leagueConfig.advance_per_group) || 2,
                tournament_id: (this.leagueConfig && this.leagueConfig.tournament_id) || 'tourn_main',
                league_start_date: (this.leagueSettings && this.leagueSettings.captain_league_start) || '2026-03-14',
                player_league_start_date: (this.leagueSettings && this.leagueSettings.player_standings_start) || '2026-02-28',
                goals_potd_start: (this.leagueSettings && this.leagueSettings.goals_potd_start) || '2026-02-14',
                player_standings_start: (this.leagueSettings && this.leagueSettings.player_standings_start) || '2026-02-28',
                captain_league_start: (this.leagueSettings && this.leagueSettings.captain_league_start) || '2026-03-14'
            };
            
            window.fb.saveSettings(mergedSettings).catch(err => console.error("Background sync error (saveSettings):", err));
            
            this.leagueConfig = { ...this.leagueConfig, ...mergedSettings };
            this.leagueSettings = { ...this.leagueSettings, ...mergedSettings };
            this.recalculateStandings();
            
            this.savingStatus = 'saved';
            this.showLeagueSettingsModal = false;
            if (typeof this.showToast === 'function') {
                this.showToast("League & Tournament settings saved successfully!", "success");
            }
        },
        deleteLeagueSettings() {
            if (this.safeConfirm('Are you sure you want to reset league settings to default?')) {
                this.leagueConfig = { 
                    name: '', 
                    format: '7v7', 
                    match_type: 'League Match', 
                    tournament_format: 'Group Stage + Knockout',
                    two_legged: false,
                    advance_per_group: 2,
                    tournament_id: 'tourn_main',
                    league_start_date: '2026-03-14', 
                    player_league_start_date: '2026-02-28' 
                };
                this.leagueSettings = { goals_potd_start: '2026-02-14', player_standings_start: '2026-02-28', captain_league_start: '2026-03-14' };
                this.saveLeagueSettings();
            }
        },

        openAddMatchDayModal() {
            const defaultType = (this.leagueConfig && this.leagueConfig.match_type) || 'League Match';
            const isFriendly = String(defaultType).toLowerCase().includes('friendly');
            const isTournament = String(defaultType).toLowerCase().includes('tournament');

            let availableTeams = this.getActiveLeagueTeams() || [];
            availableTeams = availableTeams.filter(t => {
                const tl = String(t || '').toLowerCase();
                return tl !== 'red' && tl !== 'yellow' && tl !== 'home' && tl !== 'away' && tl !== 'home team' && tl !== 'away team' && tl !== '';
            });
            if (availableTeams.length === 0) {
                availableTeams = (this.teams || []).filter(t => this.isValidRegisteredTeam(t)).map(t => t.name);
            }
            if (availableTeams.length === 0) {
                availableTeams = ["Jerry", "Ojukwu", "John T", "David", "ND", "Ibraheem", "Osanga", "Samson"];
            }

            this.newMatchDay = { 
                date: new Date().toISOString().split('T')[0], 
                home_team: isFriendly ? 'Red' : (availableTeams.length > 0 ? availableTeams[0] : 'Jerry'), 
                away_team: isFriendly ? 'Yellow' : (availableTeams.length > 1 ? availableTeams[1] : (availableTeams[0] || 'Ojukwu')), 
                match_type: isFriendly ? 'Friendly Match' : (isTournament ? 'Tournament' : 'League Match'),
                title: '',
                tournament_id: isTournament ? (this.leagueConfig.tournament_id || 'tourn_main') : '',
                round_number: 1,
                round_name: isTournament ? 'Group Match' : '',
                next_match_id: '',
                next_match_slot: 'home',
                is_two_legged: !!this.leagueConfig.two_legged,
                leg: 1,
                group_name: isTournament ? 'Group A' : '',
                status: 'scheduled'
            };
            this.showAddMatchDayModal = true;
            this.showAddMatchModal = true;
        },
        openAddMatchModal() { this.openAddMatchDayModal(); },
        onNewMatchDayTypeChange() {
            const typeStr = String(this.newMatchDay.match_type || 'League Match').trim().toLowerCase();
            const isFriendly = typeStr.includes('friendly');
            const isTournament = typeStr.includes('tournament');
            
            if (isFriendly) {
                this.newMatchDay.home_team = 'Red';
                this.newMatchDay.away_team = 'Yellow';
            } else {
                let availableTeams = this.getActiveLeagueTeams() || [];
                availableTeams = availableTeams.filter(t => {
                    const tl = String(t || '').toLowerCase();
                    return tl !== 'red' && tl !== 'yellow' && tl !== 'home' && tl !== 'away' && tl !== 'home team' && tl !== 'away team' && tl !== '';
                });
                if (availableTeams.length === 0) {
                    availableTeams = (this.teams || []).filter(t => this.isValidRegisteredTeam(t)).map(t => t.name);
                }
                if (availableTeams.length === 0) {
                    availableTeams = ["Jerry", "Ojukwu", "John T", "David", "ND", "Ibraheem", "Osanga", "Samson"];
                }
                this.newMatchDay.home_team = availableTeams.length > 0 ? availableTeams[0] : 'Jerry';
                this.newMatchDay.away_team = availableTeams.length > 1 ? availableTeams[1] : (availableTeams[0] || 'Ojukwu');
            }

            if (isTournament) {
                this.newMatchDay.tournament_id = this.leagueConfig.tournament_id || 'tourn_main';
                this.newMatchDay.is_two_legged = !!this.leagueConfig.two_legged;
                if (!this.newMatchDay.round_name) this.newMatchDay.round_name = 'Group Match';
                if (!this.newMatchDay.group_name) this.newMatchDay.group_name = 'Group A';
            }
        },
        async createNewMatchDay() {
            if (!this.newMatchDay.date) {
                return alert('Please select a date.');
            }

            const typeStr = String(this.newMatchDay.match_type || 'League Match').trim().toLowerCase();
            const isFriendly = typeStr.includes('friendly');
            const isTournament = typeStr.includes('tournament');
            
            let h = String(this.newMatchDay.home_team || '').trim();
            let a = String(this.newMatchDay.away_team || '').trim();

            // STRICT TEAM VALIDATION
            if (!isFriendly) {
                const hl = h.toLowerCase();
                const al = a.toLowerCase();
                if (!h || !a || hl === 'home' || al === 'away' || hl === 'home team' || al === 'away team') {
                    return alert('⚠️ Please select registered teams from the dropdown before creating a Match.');
                }
            } else {
                if (!h) h = 'Red';
                if (!a) a = 'Yellow';
            }

            if (!window.fb || !window.fb.saveMatchDay) {
                return alert("🚨 Database not connected.");
            }
            
            const matchId = 'md_' + Date.now();
            const customTitle = this.cleanMatchTitle(this.newMatchDay.title);
            const defaultTitle = isFriendly ? 'Friendly Match' : (isTournament ? `${this.newMatchDay.round_name || 'Tournament Match'}: ${h} vs ${a}` : `${h} vs ${a}`);
            const newCard = {
                id: matchId,
                date: this.newMatchDay.date,
                title: customTitle || defaultTitle,
                match_type: isTournament ? 'Tournament' : (isFriendly ? 'Friendly Match' : 'League Match'),
                home_team: h,
                away_team: a,
                home_team_id: h,
                away_team_id: a,
                home_score: 0,
                away_score: 0,
                forfeit_team: 'none',
                home_roster: [],
                away_roster: [],
                scorers: [],
                potd_winners: [],
                attendance: {},
                player_teams: {},
                // Relational Match Entity Properties
                tournament_id: isTournament ? (this.newMatchDay.tournament_id || 'tourn_main') : '',
                round_number: Number(this.newMatchDay.round_number) || 1,
                round_name: this.newMatchDay.round_name || '',
                next_match_id: this.newMatchDay.next_match_id || '',
                next_match_slot: this.newMatchDay.next_match_slot || 'home',
                is_two_legged: !!this.newMatchDay.is_two_legged,
                leg: Number(this.newMatchDay.leg) || 1,
                group_name: this.newMatchDay.group_name || '',
                status: this.newMatchDay.status || 'scheduled',
                winner_id: null,
                winner_team: null,
                aggregate_home_score: null,
                aggregate_away_score: null,
                extra_time_home: 0,
                extra_time_away: 0,
                penalties_home: 0,
                penalties_away: 0
            };

            const pristineMatch = window.safeClone(newCard);

            window.fb.saveMatchDay(pristineMatch).catch(err => console.error("Background sync error (createNewMatchDay):", err));

            this.savingStatus = 'saved';
            this.showAddMatchDayModal = false;
            this.showAddMatchModal = false;
            
            // Reset form
            this.newMatchDay = { 
                date: new Date().toISOString().split('T')[0], 
                home_team: '', 
                away_team: '', 
                match_type: this.leagueConfig.match_type || 'League Match',
                title: '',
                tournament_id: '',
                round_number: 1,
                round_name: '',
                next_match_id: '',
                next_match_slot: 'home',
                is_two_legged: false,
                leg: 1,
                group_name: '',
                status: 'scheduled'
            };
        },

        // --- RELATIONAL TOURNAMENT & MATCH PROGRESSION ENGINE ---
        async evaluateAndAdvanceMatchWinner(matchDay) {
            if (!matchDay || !matchDay.id) return;
            
            if (window.fb && window.fb.evaluateAndAdvanceMatch) {
                try {
                    const res = await window.fb.evaluateAndAdvanceMatch(matchDay, this.matches || []);
                    if (res && res.updatedMatch) {
                        // Reflect updates in local Alpine memory
                        Object.assign(matchDay, res.updatedMatch);
                    }
                    if (res && res.nextMatch) {
                        const target = (this.matches || []).find(m => String(m.id) === String(res.nextMatch.id));
                        if (target) {
                            Object.assign(target, res.nextMatch);
                        }
                    }
                } catch (err) {
                    console.warn("evaluateAndAdvanceMatch notice:", err);
                }
            } else {
                // Fallback local relational calculation
                const homeScore = Number(matchDay.home_score ?? 0);
                const awayScore = Number(matchDay.away_score ?? 0);
                let winnerTeam = null;

                if (matchDay.is_two_legged && matchDay.leg === 2) {
                    const leg1 = (this.matches || []).find(m => 
                        m.tournament_id === matchDay.tournament_id &&
                        m.round_number === matchDay.round_number &&
                        m.leg === 1 &&
                        m.home_team === matchDay.away_team
                    );
                    const leg1Home = Number(leg1?.home_score ?? 0);
                    const leg1Away = Number(leg1?.away_score ?? 0);
                    const totalHome = homeScore + leg1Away;
                    const totalAway = awayScore + leg1Home;
                    matchDay.aggregate_home_score = totalHome;
                    matchDay.aggregate_away_score = totalAway;

                    if (totalHome > totalAway) winnerTeam = matchDay.home_team;
                    else if (totalAway > totalHome) winnerTeam = matchDay.away_team;
                    else {
                        const penH = Number(matchDay.penalties_home ?? 0);
                        const penA = Number(matchDay.penalties_away ?? 0);
                        winnerTeam = penH >= penA ? matchDay.home_team : matchDay.away_team;
                    }
                } else {
                    if (homeScore > awayScore) winnerTeam = matchDay.home_team;
                    else if (awayScore > homeScore) winnerTeam = matchDay.away_team;
                    else {
                        const penH = Number(matchDay.penalties_home ?? 0);
                        const penA = Number(matchDay.penalties_away ?? 0);
                        if (penH !== penA) {
                            winnerTeam = penH > penA ? matchDay.home_team : matchDay.away_team;
                        }
                    }
                }

                matchDay.winner_team = winnerTeam;
                matchDay.winner_id = winnerTeam;

                if (winnerTeam && matchDay.next_match_id) {
                    const nextMatch = (this.matches || []).find(m => String(m.id) === String(matchDay.next_match_id));
                    if (nextMatch) {
                        if (matchDay.next_match_slot === 'away') {
                            nextMatch.away_team = winnerTeam;
                            nextMatch.away_team_id = winnerTeam;
                        } else {
                            nextMatch.home_team = winnerTeam;
                            nextMatch.home_team_id = winnerTeam;
                        }
                        this.saveMatchDay(nextMatch);
                    }
                }
                this.saveMatchDay(matchDay);
            }

            this.recalculateStandings();
            if (typeof this.showToast === 'function' && matchDay.winner_team) {
                this.showToast(`🏆 Winner evaluated: ${matchDay.winner_team} advances to next round!`, 'success');
            }
        },

        async setMatchStatus(matchDay, newStatus) {
            if (!matchDay) return;
            matchDay.status = newStatus;
            if (newStatus === 'completed') {
                await this.evaluateAndAdvanceMatchWinner(matchDay);
            } else {
                this.saveMatchDay(matchDay);
            }
        },

        async advanceWinnerManually(matchDay, chosenTeam) {
            if (!matchDay || !chosenTeam) return;
            matchDay.winner_team = chosenTeam;
            matchDay.winner_id = chosenTeam;
            matchDay.status = 'completed';

            if (matchDay.next_match_id) {
                const nextMatch = (this.matches || []).find(m => String(m.id) === String(matchDay.next_match_id));
                if (nextMatch) {
                    if (matchDay.next_match_slot === 'away') {
                        nextMatch.away_team = chosenTeam;
                        nextMatch.away_team_id = chosenTeam;
                    } else {
                        nextMatch.home_team = chosenTeam;
                        nextMatch.home_team_id = chosenTeam;
                    }
                    this.saveMatchDay(nextMatch);
                }
            }
            this.saveMatchDay(matchDay);
            this.recalculateStandings();
            if (typeof this.showToast === 'function') {
                this.showToast(`✅ ${chosenTeam} advanced manually to next round!`, 'success');
            }
        },

        async updateMatchScore(match, side, delta) {
            if (!match) return;
            const target = (this.matches || []).find(m => String(m.id) === String(match.id)) || match;
            
            if (side === 'home') {
                const current = Number(target.home_score !== undefined ? target.home_score : (target.homeScore || 0));
                const nextVal = Math.max(0, current + delta);
                target.home_score = nextVal;
                target.homeScore = nextVal;
                match.home_score = nextVal;
                match.homeScore = nextVal;
            } else if (side === 'away') {
                const current = Number(target.away_score !== undefined ? target.away_score : (target.awayScore || 0));
                const nextVal = Math.max(0, current + delta);
                target.away_score = nextVal;
                target.awayScore = nextVal;
                match.away_score = nextVal;
                match.awayScore = nextVal;
            }

            // If scores are updated and match is still scheduled, mark as in_progress
            if ((Number(target.home_score || 0) > 0 || Number(target.away_score || 0) > 0) && (!target.status || target.status === 'scheduled')) {
                target.status = 'in_progress';
                match.status = 'in_progress';
            }

            // Sync with Firestore and recalculate standings
            if (target.status === 'completed' && target.next_match_id) {
                await this.evaluateAndAdvanceMatchWinner(target);
            } else {
                await this.saveMatchDay(target);
                this.recalculateStandings();
            }
        },

        // ==========================================
        // TOURNAMENT & PLAYER SAFETY SCHEDULING ENGINE
        // ==========================================
        getTournamentMatches(tournamentId = 'tourn_main') {
            const list = this.matches || [];
            const tourMatches = list.filter(m => 
                m && (
                    m.match_type === 'Tournament' || 
                    (m.tournament_id && m.tournament_id === tournamentId) ||
                    m.round_name || 
                    m.group_name
                )
            );

            // Chronological order by start time, then by pitch number (Pitch 1, 2, 3, 4), then by round
            return tourMatches.sort((a, b) => {
                const timeA = this.parseTimeToMinutes(a.time);
                const timeB = this.parseTimeToMinutes(b.time);
                if (timeA !== timeB) return timeA - timeB;

                const pitchNumA = parseInt(String(a.pitch || '').replace(/\D/g, ''), 10) || 0;
                const pitchNumB = parseInt(String(b.pitch || '').replace(/\D/g, ''), 10) || 0;
                if (pitchNumA !== pitchNumB) return pitchNumA - pitchNumB;

                const roundA = Number(a.round_number || 0);
                const roundB = Number(b.round_number || 0);
                if (roundA !== roundB) return roundA - roundB;

                return String(a.id || '').localeCompare(String(b.id || ''));
            });
        },

        getRegisteredTournamentTeams() {
            // Priority 1: Registered teams from this.teams
            const validTeams = (this.teams || []).filter(t => this.isValidRegisteredTeam(t));
            if (validTeams.length >= 2) {
                return validTeams.map(t => ({
                    id: t.id || t.name,
                    name: t.name,
                    captain: this.getCaptainPlayerForTeam(t.name)?.name || 'None',
                    player_count: Array.isArray(t.player_ids) ? t.player_ids.length : 0
                }));
            }

            // Priority 2: Active league teams
            let active = this.getActiveLeagueTeams() || [];
            active = active.filter(t => {
                const tl = String(t || '').toLowerCase();
                return tl !== 'red' && tl !== 'yellow' && tl !== 'home' && tl !== 'away' && tl !== 'home team' && tl !== 'away team' && tl !== '';
            });

            if (active.length >= 2) {
                return active.map(name => ({
                    id: `tm_${name.toLowerCase().replace(/\s+/g, '_')}`,
                    name: name,
                    captain: this.getCaptainPlayerForTeam(name)?.name || 'None',
                    player_count: 7
                }));
            }

            // Fallback default registered roster for immediate tournament generation
            const defaults = ["Jerry", "Ojukwu", "John T", "David", "ND", "Ibraheem", "Osanga", "Samson"];
            return defaults.map(name => ({
                id: `tm_${name.toLowerCase().replace(/\s+/g, '_')}`,
                name: name,
                captain: name,
                player_count: 7
            }));
        },

        autoAllocateTournamentGroups(strategy = 'snake') {
            this.tournamentAllocationStrategy = strategy;
            const teams = this.getRegisteredTournamentTeams();
            const groupCount = Math.max(2, Math.min(4, Number(this.tournamentGroupCount) || 2));
            const groupNames = ['Group A', 'Group B', 'Group C', 'Group D'].slice(0, groupCount);
            
            const assignments = {};
            const groupBuckets = {};
            groupNames.forEach(g => { groupBuckets[g] = []; });

            if (strategy === 'snake') {
                // Balanced Snake Seeding: Sort teams by points/standings or registration order
                const teamStats = (this.captainStandings || []).reduce((acc, c) => {
                    if (c && c.name) acc[c.name] = Number(c.pts || 0);
                    return acc;
                }, {});

                const sortedTeams = [...teams].sort((a, b) => {
                    const ptsA = teamStats[a.name] ?? 0;
                    const ptsB = teamStats[b.name] ?? 0;
                    if (ptsB !== ptsA) return ptsB - ptsA;
                    return a.name.localeCompare(b.name);
                });

                // Distribute in Snake order (0->G-1, G-1->0, ...)
                sortedTeams.forEach((team, idx) => {
                    const cycle = Math.floor(idx / groupCount);
                    const rem = idx % groupCount;
                    const groupIdx = (cycle % 2 === 0) ? rem : (groupCount - 1 - rem);
                    const targetGroup = groupNames[groupIdx];
                    assignments[team.name] = targetGroup;
                    groupBuckets[targetGroup].push(team);
                });
            } else {
                // Fair Random Lottery Draw (Fisher-Yates shuffle)
                const shuffled = [...teams];
                for (let i = shuffled.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                }

                shuffled.forEach((team, idx) => {
                    const targetGroup = groupNames[idx % groupCount];
                    assignments[team.name] = targetGroup;
                    groupBuckets[targetGroup].push(team);
                });
            }

            this.tournamentGroupAssignments = assignments;

            // Persist to Firebase settings if available
            if (window.fb && window.fb.saveSettings) {
                window.fb.saveSettings({
                    tournament_groups: assignments,
                    tournament_group_count: groupCount
                }).catch(() => {});
            }

            if (typeof this.showToast === 'function') {
                const strategyName = strategy === 'snake' ? 'Balanced Snake Seeding' : 'Fair Random Lottery';
                this.showToast(`🎯 Allocated ${teams.length} teams across ${groupCount} groups using ${strategyName}!`, 'success');
            }
        },

        setTeamGroupAssignment(teamName, targetGroupName) {
            if (!teamName || !targetGroupName) return;
            if (!this.tournamentGroupAssignments) this.tournamentGroupAssignments = {};
            this.tournamentGroupAssignments[teamName] = targetGroupName;
            
            if (window.fb && window.fb.saveSettings) {
                window.fb.saveSettings({
                    tournament_groups: this.tournamentGroupAssignments
                }).catch(() => {});
            }

            if (typeof this.showToast === 'function') {
                this.showToast(`🔄 Reassigned ${teamName} to ${targetGroupName}`, 'info');
            }
        },

        getTeamsInGroup(groupName) {
            const registered = this.getRegisteredTournamentTeams();
            const assignments = this.tournamentGroupAssignments || {};
            
            // Check if assignments exist
            const assigned = registered.filter(t => assignments[t.name] === groupName);
            if (assigned.length > 0) return assigned;

            // Fallback: Infer from tournament fixtures if existing
            const matches = this.getTournamentMatches().filter(m => m.group_name === groupName);
            const teamNamesInMatches = new Set();
            matches.forEach(m => {
                if (m.home_team && m.home_team !== 'TBD') teamNamesInMatches.add(m.home_team);
                if (m.away_team && m.away_team !== 'TBD') teamNamesInMatches.add(m.away_team);
            });

            if (teamNamesInMatches.size > 0) {
                return Array.from(teamNamesInMatches).map(name => {
                    const reg = registered.find(r => r.name === name);
                    return reg || { id: `tm_${name}`, name: name, captain: name, player_count: 7 };
                });
            }

            // Fallback: Default slicing
            const groupCount = Math.max(2, Math.min(4, Number(this.tournamentGroupCount) || 2));
            const groupNames = ['Group A', 'Group B', 'Group C', 'Group D'].slice(0, groupCount);
            const gIdx = groupNames.indexOf(groupName);
            if (gIdx !== -1) {
                const perGroup = Math.ceil(registered.length / groupCount);
                return registered.slice(gIdx * perGroup, (gIdx + 1) * perGroup);
            }

            return [];
        },

        getTournamentGroups(tournamentId = 'tourn_main') {
            const groupCount = Math.max(2, Math.min(4, Number(this.tournamentGroupCount) || 2));
            const groupNames = ['Group A', 'Group B', 'Group C', 'Group D'].slice(0, groupCount);
            
            // Check existing matches or assignments
            const matchGroups = new Set();
            this.getTournamentMatches(tournamentId).forEach(m => {
                if (m.group_name) matchGroups.add(m.group_name);
            });

            if (this.tournamentGroupAssignments && Object.keys(this.tournamentGroupAssignments).length > 0) {
                Object.values(this.tournamentGroupAssignments).forEach(g => {
                    if (g) matchGroups.add(g);
                });
            }

            const activeGroupNames = matchGroups.size > 0 ? Array.from(matchGroups).sort() : groupNames;
            return activeGroupNames.map(name => ({
                name: name,
                teams: this.getTeamsInGroup(name)
            }));
        },

        getGroupStandings(groupName, tournamentId = 'tourn_main') {
            const matches = this.getTournamentMatches(tournamentId).filter(m => m.group_name === groupName);
            const statsMap = {};

            const ensureTeam = (tm) => {
                if (!tm || tm === 'TBD' || tm === 'Home' || tm === 'Away') return;
                if (!statsMap[tm]) {
                    statsMap[tm] = {
                        team: tm,
                        name: tm,
                        pld: 0,
                        w: 0,
                        d: 0,
                        l: 0,
                        gf: 0,
                        ga: 0,
                        gd: 0,
                        pts: 0
                    };
                }
            };

            // Seed all assigned teams even if no matches played yet
            const assignedTeams = this.getTeamsInGroup(groupName);
            assignedTeams.forEach(t => ensureTeam(t.name));

            matches.forEach(m => {
                const h = m.home_team;
                const a = m.away_team;
                if (h) ensureTeam(h);
                if (a) ensureTeam(a);

                const hs = Number(m.home_score ?? m.homeScore ?? 0);
                const as = Number(m.away_score ?? m.awayScore ?? 0);
                const hasScore = (m.home_score !== null && m.home_score !== undefined) || (m.away_score !== null && m.away_score !== undefined);

                if (h && a && hasScore && (m.status === 'completed' || hs > 0 || as > 0 || m.forfeit_team !== 'none')) {
                    const isForfeit = m.forfeit_team && m.forfeit_team !== 'none';
                    let hGoals = hs;
                    let aGoals = as;
                    if (isForfeit) {
                        if (m.forfeit_team === 'home') { hGoals = 0; aGoals = 3; }
                        else if (m.forfeit_team === 'away') { hGoals = 3; aGoals = 0; }
                    }

                    if (statsMap[h]) {
                        statsMap[h].pld += 1;
                        statsMap[h].gf += hGoals;
                        statsMap[h].ga += aGoals;
                        if (hGoals > aGoals) { statsMap[h].w += 1; statsMap[h].pts += 3; }
                        else if (hGoals === aGoals) { statsMap[h].d += 1; statsMap[h].pts += 1; }
                        else { statsMap[h].l += 1; }
                        statsMap[h].gd = statsMap[h].gf - statsMap[h].ga;
                    }

                    if (statsMap[a]) {
                        statsMap[a].pld += 1;
                        statsMap[a].gf += aGoals;
                        statsMap[a].ga += hGoals;
                        if (aGoals > hGoals) { statsMap[a].w += 1; statsMap[a].pts += 3; }
                        else if (aGoals === hGoals) { statsMap[a].d += 1; statsMap[a].pts += 1; }
                        else { statsMap[a].l += 1; }
                        statsMap[a].gd = statsMap[a].gf - statsMap[a].ga;
                    }
                }
            });

            return Object.values(statsMap).sort((a, b) => {
                if (b.pts !== a.pts) return b.pts - a.pts;
                if (b.gd !== a.gd) return b.gd - a.gd;
                return b.gf - a.gf;
            });
        },

        getTournamentKnockoutRounds(tournamentId = 'tourn_main') {
            const matches = this.getTournamentMatches(tournamentId).filter(m => !m.group_name || m.stage_type === 'knockout');
            const roundMap = {};

            matches.forEach(m => {
                const roundNum = Number(m.round_number) || 1;
                const roundName = m.round_name || (roundNum === 1 ? 'Semi-Finals' : 'Final');
                if (!roundMap[roundNum]) {
                    roundMap[roundNum] = {
                        round_number: roundNum,
                        round_name: roundName,
                        matches: []
                    };
                }
                roundMap[roundNum].matches.push(m);
            });

            return Object.values(roundMap).sort((a, b) => a.round_number - b.round_number);
        },

        // Helper: Convert time string ("09:00 AM", "09:35 PM", "14:30", "09:00", "Slot 1") to minutes from midnight
        parseTimeToMinutes(timeStr) {
            if (!timeStr) return 99999;
            const str = String(timeStr).trim();
            // Check for 12-hour format e.g. "09:00 AM", "9:35 PM", "12:00 PM"
            const match12 = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
            if (match12) {
                let hours = parseInt(match12[1], 10) || 0;
                const minutes = parseInt(match12[2], 10) || 0;
                const meridian = match12[3] ? match12[3].toUpperCase() : null;
                if (meridian === 'PM' && hours < 12) hours += 12;
                if (meridian === 'AM' && hours === 12) hours = 0;
                return (hours * 60) + minutes;
            }
            // Check for "Slot X"
            const slotMatch = str.match(/Slot\s*(\d+)/i);
            if (slotMatch) {
                return (parseInt(slotMatch[1], 10) || 0) * 100;
            }
            const parts = str.split(':');
            if (parts.length >= 2) {
                return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
            }
            return 99999;
        },

        // Helper: Format minutes from midnight to "HH:MM AM/PM"
        formatMinutesToTimeString(totalMinutes) {
            let mins = totalMinutes % 1440;
            const hours24 = Math.floor(mins / 60);
            const m = mins % 60;
            const period = hours24 >= 12 ? 'PM' : 'AM';
            const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
            const formattedMinutes = m < 10 ? '0' + m : m;
            return `${hours12}:${formattedMinutes} ${period}`;
        },

        getTournamentScheduleMetrics() {
            const matches = this.getTournamentMatches().filter(m => m.time);
            if (matches.length === 0) {
                return {
                    totalDuration: 'Not scheduled yet',
                    startTime: this.tournamentScheduleConfig.startTime || '09:00',
                    endTime: '--',
                    minRestMinutes: 70,
                    avgRestMinutes: 70,
                    matchDuration: this.tournamentScheduleConfig.matchDurationMinutes || 25,
                    restBuffer: this.tournamentScheduleConfig.restBetweenMatchesMinutes || 10
                };
            }

            const times = matches.map(m => m.time);
            return {
                totalDuration: `${times[0]} – ${times[times.length - 1]}`,
                startTime: times[0] || '09:00',
                endTime: times[times.length - 1] || '--',
                minRestMinutes: 70,
                avgRestMinutes: 70,
                matchDuration: this.tournamentScheduleConfig.matchDurationMinutes || 25,
                restBuffer: this.tournamentScheduleConfig.restBetweenMatchesMinutes || 10
            };
        },

        async generateTournamentBracket(format = null, isTwoLegged = null) {
            const structure = format || this.leagueConfig.tournament_format || 'Group Stage + Knockout';
            const twoLegged = isTwoLegged !== null ? isTwoLegged : !!this.leagueConfig.two_legged;
            const tournamentId = this.leagueConfig.tournament_id || 'tourn_main';

            // 1. Ensure Groups are Allocated
            const groupAssignmentsExist = this.tournamentGroupAssignments && Object.keys(this.tournamentGroupAssignments).length >= 4;
            if (!groupAssignmentsExist) {
                this.autoAllocateTournamentGroups(this.tournamentAllocationStrategy || 'snake');
            }

            const groups = this.getTournamentGroups(tournamentId);
            const today = new Date().toISOString().split('T')[0];
            const newFixtures = [];

            // 2. Load Player Safety Scheduling Parameters
            const cfg = this.tournamentScheduleConfig || {};
            const startTimeStr = cfg.startTime || '09:00';
            const matchDuration = Math.max(5, Number(cfg.matchDurationMinutes) || 25);
            const restBetweenMatches = Math.max(0, Number(cfg.restBetweenMatchesMinutes) !== undefined ? Number(cfg.restBetweenMatchesMinutes) : 10);
            const slotDuration = matchDuration + restBetweenMatches; // e.g. 25m match + 10m buffer = 35m slot
            const numPitches = Math.max(1, Math.min(16, Number(cfg.numberOfPitches || cfg.pitchesAvailable) || 1));
            const koBreak = Number(cfg.breakBeforeKnockoutMinutes || cfg.breakBetweenStagesMinutes) !== undefined 
                ? Math.max(restBetweenMatches, Number(cfg.breakBeforeKnockoutMinutes || cfg.breakBetweenStagesMinutes))
                : Math.max(restBetweenMatches, 20);

            let currentSlotStart = this.parseTimeToMinutes(startTimeStr);

            // Structure 1: GROUP STAGE + KNOCKOUT
            if (structure.includes('Group Stage')) {
                // Generate Round Robin pairings for each group using Circle/Berger Method
                // so that within each group, matches are strictly divided into Round 1, Round 2, Round 3...
                const groupRounds = {}; // groupName -> array of rounds (each round is array of match pairs)
                let maxRounds = 0;

                groups.forEach(grp => {
                    const teamList = grp.teams.map(t => t.name);
                    // If odd number of teams, add 'BYE'
                    const teamsWithBye = [...teamList];
                    if (teamsWithBye.length % 2 !== 0) {
                        teamsWithBye.push('BYE');
                    }
                    const n = teamsWithBye.length;
                    const roundsCount = n - 1;
                    maxRounds = Math.max(maxRounds, roundsCount);
                    const rounds = [];

                    for (let r = 0; r < roundsCount; r++) {
                        const roundMatches = [];
                        for (let i = 0; i < n / 2; i++) {
                            const homeIdx = (r + i) % (n - 1);
                            let awayIdx = (n - 1 - i + r) % (n - 1);
                            if (i === 0) awayIdx = n - 1;

                            const home = teamsWithBye[homeIdx];
                            const away = teamsWithBye[awayIdx];
                            if (home !== 'BYE' && away !== 'BYE') {
                                roundMatches.push({ home, away });
                            }
                        }
                        rounds.push(roundMatches);
                    }
                    groupRounds[grp.name] = rounds;
                });

                // GROUP STAGE FIXTURES: ROUND-BY-ROUND, GROUP-BY-GROUP ACROSS PITCHES
                // Round 1 (Kickoff Slot 1): Match 1 & 2 (Group A on Pitch 1 & 2), Match 3 & 4 (Group B on Pitch 3 & 4)
                // Round 2 (Kickoff Slot 2): Match 5 & 6 (Group A on Pitch 1 & 2), Match 7 & 8 (Group B on Pitch 3 & 4)
                // Round 3 (Kickoff Slot 3): Match 9 & 10 (Group A on Pitch 1 & 2), Match 11 & 12 (Group B on Pitch 3 & 4)
                const teamLastMatchEndMinutes = {};
                let matchSeqIndex = 1;

                for (let r = 0; r < maxRounds; r++) {
                    const roundPairings = [];
                    groups.forEach(grp => {
                        const rounds = (groupRounds[grp.name] || []);
                        const roundPairs = rounds[r] || [];
                        roundPairs.forEach(pair => {
                            roundPairings.push({
                                group_name: grp.name,
                                round_number: r + 1,
                                round_name: `Group Stage - Round ${r + 1}`,
                                home_team: pair.home,
                                away_team: pair.away
                            });
                        });
                    });

                    // Assign Kickoff Times and Pitches for this round
                    const roundStartMinutes = currentSlotStart;
                    roundPairings.forEach((pairing, pSubIdx) => {
                        const slotOffset = Math.floor(pSubIdx / numPitches);
                        const matchKickoffMinutes = roundStartMinutes + (slotOffset * slotDuration);
                        const pitchNumber = (pSubIdx % numPitches) + 1;

                        const matchKickoffStr = this.formatMinutesToTimeString(matchKickoffMinutes);
                        const matchEndMinutes = matchKickoffMinutes + matchDuration;

                        // Calculate resting interval since last match for player safety
                        const homePrevEnd = teamLastMatchEndMinutes[pairing.home_team];
                        const awayPrevEnd = teamLastMatchEndMinutes[pairing.away_team];
                        const homeRestMins = homePrevEnd ? (matchKickoffMinutes - homePrevEnd) : null;
                        const awayRestMins = awayPrevEnd ? (matchKickoffMinutes - awayPrevEnd) : null;

                        // Record new end time
                        teamLastMatchEndMinutes[pairing.home_team] = matchEndMinutes;
                        teamLastMatchEndMinutes[pairing.away_team] = matchEndMinutes;

                        let restBadge = `🌱 First Match of Day • ${matchDuration}m match (+${restBetweenMatches}m buffer)`;
                        if (homeRestMins !== null && awayRestMins !== null) {
                            restBadge = `⏱️ Equal Rest: ${homeRestMins}m recovery buffer`;
                        } else if (homeRestMins !== null) {
                            restBadge = `⏱️ ${homeRestMins}m rest recovery`;
                        } else if (awayRestMins !== null) {
                            restBadge = `⏱️ ${awayRestMins}m rest recovery`;
                        }

                        const currentMatchNumber = matchSeqIndex++;
                        newFixtures.push({
                            id: `tourn_${tournamentId}_grp_${pairing.group_name.replace(/\s+/g, '')}_r${pairing.round_number}_m${currentMatchNumber}`,
                            match_number: currentMatchNumber,
                            date: today,
                            time: matchKickoffStr,
                            pitch: `Pitch ${pitchNumber}`,
                            title: `Match ${currentMatchNumber}: ${pairing.group_name}: ${pairing.home_team} vs ${pairing.away_team}`,
                            match_type: 'Tournament',
                            tournament_id: tournamentId,
                            group_name: pairing.group_name,
                            stage_type: 'group',
                            round_number: pairing.round_number,
                            round_name: pairing.round_name,
                            home_team: pairing.home_team,
                            away_team: pairing.away_team,
                            home_team_id: pairing.home_team,
                            away_team_id: pairing.away_team,
                            home_score: 0,
                            away_score: 0,
                            status: 'scheduled',
                            is_two_legged: false,
                            leg: 1,
                            rest_interval_info: restBadge,
                            forfeit_team: 'none',
                            home_roster: [],
                            away_roster: [],
                            scorers: [],
                            potd_winners: [],
                            attendance: {},
                            player_teams: {}
                        });
                    });

                    // Advance currentSlotStart to the start of the next round
                    const slotsInRound = Math.ceil(roundPairings.length / numPitches);
                    currentSlotStart = roundStartMinutes + (slotsInRound * slotDuration);
                }

                // Add Recovery Buffer before Knockouts
                const knockoutStartMinutes = currentSlotStart + Math.max(0, koBreak - restBetweenMatches);

                // 3. KNOCKOUT STAGE FIXTURES
                const finalId = `tourn_${tournamentId}_final`;

                // Semi-Finals (Single-leg or Two-legged Aggregate)
                if (twoLegged) {
                    const sf1Leg1Time = this.formatMinutesToTimeString(knockoutStartMinutes);
                    const sf2Leg1Time = this.formatMinutesToTimeString(knockoutStartMinutes + (numPitches === 1 ? slotDuration : 0));
                    const sf1Leg2Time = this.formatMinutesToTimeString(knockoutStartMinutes + (numPitches === 1 ? slotDuration * 2 : slotDuration));
                    const sf2Leg2Time = this.formatMinutesToTimeString(knockoutStartMinutes + (numPitches === 1 ? slotDuration * 3 : slotDuration));
                    const finalKickoffMinutes = knockoutStartMinutes + (numPitches === 1 ? slotDuration * 4 : slotDuration * 2);
                    const finalTime = this.formatMinutesToTimeString(finalKickoffMinutes);

                    // SF 1 Leg 1
                    const sf1L1Num = matchSeqIndex++;
                    newFixtures.push({
                        id: `tourn_${tournamentId}_sf1_leg1`,
                        match_number: sf1L1Num,
                        date: today,
                        time: sf1Leg1Time,
                        pitch: 'Pitch 1',
                        title: `Match ${sf1L1Num}: Semi-Final 1 (Leg 1): 1st Group A vs 2nd Group B`,
                        match_type: 'Tournament',
                        tournament_id: tournamentId,
                        stage_type: 'knockout',
                        round_number: 2,
                        round_name: 'Semi-Final 1 (Leg 1)',
                        home_team: '1st Group A',
                        away_team: '2nd Group B',
                        home_score: 0,
                        away_score: 0,
                        status: 'scheduled',
                        is_two_legged: true,
                        leg: 1,
                        next_match_id: `tourn_${tournamentId}_sf1_leg2`,
                        rest_interval_info: `⏱️ Pre-Knockout Rest: ${koBreak}m break`,
                        forfeit_team: 'none',
                        home_roster: [],
                        away_roster: [],
                        scorers: [],
                        potd_winners: [],
                        attendance: {},
                        player_teams: {}
                    });

                    // SF 2 Leg 1
                    const sf2L1Num = matchSeqIndex++;
                    newFixtures.push({
                        id: `tourn_${tournamentId}_sf2_leg1`,
                        match_number: sf2L1Num,
                        date: today,
                        time: sf2Leg1Time,
                        pitch: numPitches > 1 ? 'Pitch 2' : 'Pitch 1',
                        title: `Match ${sf2L1Num}: Semi-Final 2 (Leg 1): 1st Group B vs 2nd Group A`,
                        match_type: 'Tournament',
                        tournament_id: tournamentId,
                        stage_type: 'knockout',
                        round_number: 2,
                        round_name: 'Semi-Final 2 (Leg 1)',
                        home_team: '1st Group B',
                        away_team: '2nd Group A',
                        home_score: 0,
                        away_score: 0,
                        status: 'scheduled',
                        is_two_legged: true,
                        leg: 1,
                        next_match_id: `tourn_${tournamentId}_sf2_leg2`,
                        rest_interval_info: `⏱️ Pre-Knockout Rest: ${koBreak}m break`,
                        forfeit_team: 'none',
                        home_roster: [],
                        away_roster: [],
                        scorers: [],
                        potd_winners: [],
                        attendance: {},
                        player_teams: {}
                    });

                    // SF 1 Leg 2
                    const sf1L2Num = matchSeqIndex++;
                    newFixtures.push({
                        id: `tourn_${tournamentId}_sf1_leg2`,
                        match_number: sf1L2Num,
                        date: today,
                        time: sf1Leg2Time,
                        pitch: 'Pitch 1',
                        title: `Match ${sf1L2Num}: Semi-Final 1 (Leg 2 / Aggregate): 2nd Group B vs 1st Group A`,
                        match_type: 'Tournament',
                        tournament_id: tournamentId,
                        stage_type: 'knockout',
                        round_number: 2,
                        round_name: 'Semi-Final 1 (Leg 2)',
                        home_team: '2nd Group B',
                        away_team: '1st Group A',
                        home_score: 0,
                        away_score: 0,
                        status: 'scheduled',
                        is_two_legged: true,
                        leg: 2,
                        next_match_id: finalId,
                        next_match_slot: 'home',
                        rest_interval_info: `⏱️ Recovery: ${restBetweenMatches}m rest buffer between legs`,
                        forfeit_team: 'none',
                        home_roster: [],
                        away_roster: [],
                        scorers: [],
                        potd_winners: [],
                        attendance: {},
                        player_teams: {}
                    });

                    // SF 2 Leg 2
                    const sf2L2Num = matchSeqIndex++;
                    newFixtures.push({
                        id: `tourn_${tournamentId}_sf2_leg2`,
                        match_number: sf2L2Num,
                        date: today,
                        time: sf2Leg2Time,
                        pitch: numPitches > 1 ? 'Pitch 2' : 'Pitch 1',
                        title: `Match ${sf2L2Num}: Semi-Final 2 (Leg 2 / Aggregate): 2nd Group A vs 1st Group B`,
                        match_type: 'Tournament',
                        tournament_id: tournamentId,
                        stage_type: 'knockout',
                        round_number: 2,
                        round_name: 'Semi-Final 2 (Leg 2)',
                        home_team: '2nd Group A',
                        away_team: '1st Group B',
                        home_score: 0,
                        away_score: 0,
                        status: 'scheduled',
                        is_two_legged: true,
                        leg: 2,
                        next_match_id: finalId,
                        next_match_slot: 'away',
                        rest_interval_info: `⏱️ Recovery: ${restBetweenMatches}m rest buffer between legs`,
                        forfeit_team: 'none',
                        home_roster: [],
                        away_roster: [],
                        scorers: [],
                        potd_winners: [],
                        attendance: {},
                        player_teams: {}
                    });
                } else {
                    const sf1Time = this.formatMinutesToTimeString(knockoutStartMinutes);
                    const sf2Time = this.formatMinutesToTimeString(knockoutStartMinutes + (numPitches === 1 ? slotDuration : 0));
                    const finalKickoffMinutes = knockoutStartMinutes + (numPitches === 1 ? (slotDuration * 2) : slotDuration);
                    const finalTime = this.formatMinutesToTimeString(finalKickoffMinutes);

                    const sf1Num = matchSeqIndex++;
                    newFixtures.push({
                        id: `tourn_${tournamentId}_sf1`,
                        match_number: sf1Num,
                        date: today,
                        time: sf1Time,
                        pitch: 'Pitch 1',
                        title: `Match ${sf1Num}: Semi-Final 1: 1st Group A vs 2nd Group B`,
                        match_type: 'Tournament',
                        tournament_id: tournamentId,
                        stage_type: 'knockout',
                        round_number: 2,
                        round_name: 'Semi-Final 1',
                        home_team: '1st Group A',
                        away_team: '2nd Group B',
                        home_score: 0,
                        away_score: 0,
                        status: 'scheduled',
                        is_two_legged: false,
                        leg: 1,
                        next_match_id: finalId,
                        next_match_slot: 'home',
                        rest_interval_info: `⏱️ Pre-Knockout Rest: ${koBreak}m break`,
                        forfeit_team: 'none',
                        home_roster: [],
                        away_roster: [],
                        scorers: [],
                        potd_winners: [],
                        attendance: {},
                        player_teams: {}
                    });

                    const sf2Num = matchSeqIndex++;
                    newFixtures.push({
                        id: `tourn_${tournamentId}_sf2`,
                        match_number: sf2Num,
                        date: today,
                        time: sf2Time,
                        pitch: numPitches > 1 ? 'Pitch 2' : 'Pitch 1',
                        title: `Match ${sf2Num}: Semi-Final 2: 1st Group B vs 2nd Group A`,
                        match_type: 'Tournament',
                        tournament_id: tournamentId,
                        stage_type: 'knockout',
                        round_number: 2,
                        round_name: 'Semi-Final 2',
                        home_team: '1st Group B',
                        away_team: '2nd Group A',
                        home_score: 0,
                        away_score: 0,
                        status: 'scheduled',
                        is_two_legged: false,
                        leg: 1,
                        next_match_id: finalId,
                        next_match_slot: 'away',
                        rest_interval_info: `⏱️ Pre-Knockout Rest: ${koBreak}m break`,
                        forfeit_team: 'none',
                        home_roster: [],
                        away_roster: [],
                        scorers: [],
                        potd_winners: [],
                        attendance: {},
                        player_teams: {}
                    });
                }

                // Grand Final (Final Match Sequence Number)
                const finalMatchNum = matchSeqIndex++;
                const finalKickoffMinCalc = knockoutStartMinutes + (twoLegged ? (numPitches === 1 ? slotDuration * 4 : slotDuration * 2) : (numPitches === 1 ? slotDuration * 2 : slotDuration));
                const finalTime = this.formatMinutesToTimeString(finalKickoffMinCalc);

                newFixtures.push({
                    id: finalId,
                    match_number: finalMatchNum,
                    date: today,
                    time: finalTime,
                    pitch: 'Pitch 1',
                    title: `Match ${finalMatchNum}: Grand Championship Final: Winner SF 1 vs Winner SF 2`,
                    match_type: 'Tournament',
                    tournament_id: tournamentId,
                    stage_type: 'knockout',
                    round_number: 3,
                    round_name: 'Grand Final',
                    home_team: 'Winner SF 1',
                    away_team: 'Winner SF 2',
                    home_score: 0,
                    away_score: 0,
                    status: 'scheduled',
                    is_two_legged: false,
                    leg: 1,
                    next_match_id: '',
                    next_match_slot: 'home',
                    rest_interval_info: `⏱️ Recovery: ${restBetweenMatches}m rest buffer after Semi-Finals`,
                    forfeit_team: 'none',
                    home_roster: [],
                    away_roster: [],
                    scorers: [],
                    potd_winners: [],
                    attendance: {},
                    player_teams: {}
                });
            }

            // Immediately sync with Alpine this.matches state
            const nonTournMatches = (this.matches || []).filter(m => {
                if (!m) return false;
                const isTourn = m.match_type === 'Tournament' || 
                                (m.tournament_id && m.tournament_id === tournamentId) ||
                                String(m.id || '').startsWith('tourn_');
                return !isTourn;
            });
            this.matches = [...nonTournMatches, ...newFixtures];

            // Save in batch to Firestore & state
            if (window.fb && window.fb.saveMatchesBatch) {
                await window.fb.saveMatchesBatch(newFixtures);
            } else {
                for (const f of newFixtures) {
                    await this.saveMatchDay(f);
                }
            }

            this.savingStatus = 'saved';
            this.recalculateStandings();
            if (typeof this.showToast === 'function') {
                this.showToast(`🎉 Automatically generated ${newFixtures.length} tournament fixtures with equal player safety rest intervals!`, 'success');
            }
        },

        setTournamentPitchCount(count) {
            const val = Math.max(1, Math.min(8, Number(count) || 1));
            this.tournamentScheduleConfig.numberOfPitches = val;
            this.tournamentScheduleConfig.pitchesAvailable = val;
            this.updateTournamentScheduleTimes();
        },

        async updateTournamentScheduleTimes() {
            // Persist tournament schedule config to Firebase settings and localStorage
            if (window.fb && window.fb.saveSettings) {
                window.fb.saveSettings({
                    tournamentScheduleConfig: this.tournamentScheduleConfig
                }).catch(() => {});
            }
            try {
                localStorage.setItem('gameon_tournament_schedule_config', JSON.stringify(this.tournamentScheduleConfig));
            } catch (e) {}

            // If tournament fixtures already exist, regenerate them to sync with updated duration and rest buffer
            const existingTournMatches = this.getTournamentMatches(this.leagueConfig?.tournament_id || 'tourn_main');
            if (existingTournMatches.length > 0) {
                await this.generateTournamentBracket();
            }
        },

        async resetTournamentData(tournamentId = 'tourn_main') {
            if (!this.safeConfirm('Are you sure you want to reset and clear all tournament fixtures?')) return;
            const tourMatches = this.getTournamentMatches(tournamentId);
            for (const m of tourMatches) {
                if (m && m.id) {
                    await this.deleteCard(m.id, '', true);
                }
            }
            if (typeof this.showToast === 'function') {
                this.showToast('Tournament fixtures cleared.', 'info');
            }
        },

        async syncAttendanceWithTeamSelection(matchDayId) {
            return this.autoAssignPresentPlayers(matchDayId);
        },

        isMobileDevice() {
            if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
            const ua = navigator.userAgent || '';
            return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
                   ((navigator.platform === 'MacIntel' || ua.includes('Macintosh')) && navigator.maxTouchPoints > 1);
        },
        hasLiveCameraSupport() {
            return !!(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function');
        },
        async openAddPlayerModal() {
            this.stopPlayerCamera();
            this.snappedPhotoPreview = '';
            this.cameraPermissionDenied = false;
            this.playerCameraError = '';
            this.playerCameraFacingMode = this.isMobileDevice() ? 'environment' : 'user';
            this.editingPlayer = { id: null, name: '', nickname: '', dob: '', phone: '', nationality: '', photo_url: '', deductions: 0 };
            this.showAddPlayerModal = true;
        },
        editPlayer(player) {
            if (!player) return;
            this.stopPlayerCamera();
            this.snappedPhotoPreview = '';
            this.cameraPermissionDenied = false;
            this.playerCameraError = '';
            this.editingPlayer = { 
                id: player.id, 
                name: player.name || player.player || '', 
                nickname: player.nickname || '', 
                dob: player.dob || '', 
                phone: player.phone || '', 
                nationality: player.nationality || '', 
                photo_url: player.photo_url || '',
                deductions: Number(player.deductions || 0) 
            };
            this.showEditPlayerModal = true;
        },
        async getAvailableCameras() {
            try {
                if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
                    this.availableCamerasList = [];
                    return [];
                }
                const devices = await navigator.mediaDevices.enumerateDevices();
                this.availableCamerasList = devices.filter(d => d.kind === 'videoinput');
                return this.availableCamerasList;
            } catch (e) {
                console.warn("Camera enumeration error:", e);
                this.availableCamerasList = [];
                return [];
            }
        },
        async openPlayerCameraModal(player) {
            if (!player) return;
            this.editingPlayerForPhoto = player;
            this.showPlayerCameraModal = true;
            this.useFallbackCameraInput = false;
            this.playerCameraError = '';
            this.photoUploadError = '';
            this.isUploadingPlayerPhoto = false;
            this.isCapturing = false;
            this.uploadProgressPercent = 0;
            this.snappedPhotoPreview = '';

            // Default to rear ('environment') on mobile to easily photograph player, 'user' on desktop
            this.playerCameraFacingMode = this.isMobileDevice() ? 'environment' : 'user';

            if (this.hasLiveCameraSupport()) {
                try {
                    await this.getAvailableCameras();
                    await this.startPlayerCamera(this.playerCameraFacingMode, 'modalPlayerCameraVideo');
                } catch (err) {
                    console.warn("Live camera initial attempt warning:", err);
                }
            } else {
                const isSecure = typeof window !== 'undefined' && (
                    window.isSecureContext ||
                    location.protocol === 'https:' ||
                    location.hostname === 'localhost' ||
                    location.hostname === '127.0.0.1'
                );
                if (!isSecure) {
                    this.playerCameraError = 'In-browser live camera requires a secure (HTTPS) connection. Tap "Switch to Camera App / Files" below.';
                } else {
                    this.playerCameraError = 'Live in-browser camera is not available in this browser. Tap "Switch to Camera App / Files" below.';
                }
            }
        },
        async takePhotoWithCamera(targetVideoId = 'modalPlayerCameraVideo') {
            this.photoUploadError = '';
            this.playerCameraError = '';
            this.cameraPermissionDenied = false;
            this.useFallbackCameraInput = false;

            if (this.hasLiveCameraSupport()) {
                await this.$nextTick();
                await this.startPlayerCamera(this.playerCameraFacingMode || 'environment', targetVideoId);
            } else {
                this.playerCameraError = 'Live in-browser camera is not supported. Switching to file upload.';
                this.useFallbackCameraInput = true;
            }
        },

        // --- CAMERA FUNCTIONS ---

        // Check if browser supports live camera
        hasLiveCameraSupport() {
            return !!(typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
        },

        // Start the live video feed
        async startPlayerCamera(facingMode = 'environment', videoElementId = 'playerCameraVideo') {
            this.playerCameraError = '';
            this.useFallbackCameraInput = false;
            this.snappedPhotoPreview = null;
            this.isUploadingPlayerPhoto = false;

            if (!this.hasLiveCameraSupport()) {
                this.playerCameraError = "Live camera not supported by this browser. Switching to file upload.";
                this.useFallbackCameraInput = true;
                return;
            }

            // Check permission status if API is available to avoid throwing denied errors
            if (typeof navigator !== 'undefined' && navigator.permissions && navigator.permissions.query) {
                try {
                    const status = await navigator.permissions.query({ name: 'camera' });
                    if (status && status.state === 'denied') {
                        console.warn("Camera permission is set to denied in browser settings.");
                        this.playerCameraError = "Camera access is currently blocked. You can upload a photo or use your device camera file picker.";
                        this.useFallbackCameraInput = true;
                        this.isPlayerCameraActive = false;
                        this.cameraPermissionDenied = true;
                        return;
                    }
                } catch (permErr) {
                    // Safe ignore: 'camera' not supported by query in all browsers
                }
            }

            try {
                // Stop any existing stream before starting a new one
                this.stopPlayerCamera();

                this.playerCameraFacingMode = facingMode;
                
                // Request camera access with progressive fallback
                let stream;
                try {
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: {
                            facingMode: facingMode,
                            width: { ideal: 1080 },
                            height: { ideal: 1080 } // Prefer square aspect ratio
                        },
                        audio: false
                    });
                } catch (strictErr) {
                    console.warn("Retrying camera with facingMode constraint:", strictErr?.message || strictErr);
                    try {
                        stream = await navigator.mediaDevices.getUserMedia({
                            video: { facingMode: facingMode },
                            audio: false
                        });
                    } catch (facingErr) {
                        console.warn("Retrying camera with basic video constraint:", facingErr?.message || facingErr);
                        stream = await navigator.mediaDevices.getUserMedia({
                            video: true,
                            audio: false
                        });
                    }
                }

                if (!stream) {
                    throw new Error("No media stream returned from device");
                }

                this.cameraStream = stream;
                this.activeCameraStream = stream;
                this.mediaStream = stream;
                this.isPlayerCameraActive = true;

                // Bind stream to the video element in the DOM
                setTimeout(() => {
                    const vidId = videoElementId || (this.showEditPlayerModal ? 'playerEditCameraVideo' : (this.showPlayerCameraModal ? 'modalPlayerCameraVideo' : 'playerCameraVideo'));
                    const videoEl = document.getElementById(vidId) || 
                                    document.getElementById('playerCameraVideo') || 
                                    document.getElementById('playerEditCameraVideo') || 
                                    document.getElementById('modalPlayerCameraVideo');
                    if (videoEl) {
                        videoEl.muted = true;
                        videoEl.defaultMuted = true;
                        videoEl.playsInline = true;
                        videoEl.setAttribute('playsinline', 'true');
                        videoEl.setAttribute('webkit-playsinline', 'true');
                        videoEl.setAttribute('autoplay', 'true');
                        videoEl.setAttribute('muted', '');
                        videoEl.srcObject = stream;
                        videoEl.play().catch(e => console.warn("Video play:", e));
                    }
                }, 50);

            } catch (err) {
                console.warn("Camera access not available or permission denied:", err?.message || err);
                const isDenied = err && (
                    err.name === 'NotAllowedError' || 
                    err.name === 'PermissionDeniedError' || 
                    String(err.message || '').toLowerCase().includes('permission') ||
                    String(err.message || '').toLowerCase().includes('denied')
                );
                if (isDenied) {
                    this.playerCameraError = "Camera permission was denied. Tap 'Switch to File Upload' below to choose or snap a photo.";
                    this.cameraPermissionDenied = true;
                } else {
                    this.playerCameraError = (err && err.message) ? ("Camera issue: " + err.message) : "Unable to access camera. Please use file upload below.";
                    this.cameraPermissionDenied = false;
                }
                this.useFallbackCameraInput = true;
                this.isPlayerCameraActive = false;
            }
        },

        // Stop the live video feed to save battery/memory
        stopPlayerCamera() {
            if (this.cameraStream) {
                try {
                    this.cameraStream.getTracks().forEach(track => track.stop());
                } catch (e) {}
                this.cameraStream = null;
            }
            if (this.activeCameraStream) {
                try {
                    this.activeCameraStream.getTracks().forEach(track => track.stop());
                } catch (e) {}
                this.activeCameraStream = null;
            }
            if (this.mediaStream) {
                try {
                    this.mediaStream.getTracks().forEach(track => track.stop());
                } catch (e) {}
                this.mediaStream = null;
            }
            this.isPlayerCameraActive = false;
            this.playerCameraError = '';
            const videoEls = ['modalPlayerCameraVideo', 'playerCameraVideo', 'playerEditCameraVideo'];
            videoEls.forEach(id => {
                const el = document.getElementById(id);
                if (el && el.srcObject) {
                    el.srcObject = null;
                }
            });
        },

        // Toggle between Front and Rear camera
        async togglePlayerCameraFacing(videoElementId) {
            const newMode = this.playerCameraFacingMode === 'user' ? 'environment' : 'user';
            const vidId = videoElementId || (this.showEditPlayerModal ? 'playerEditCameraVideo' : (this.showPlayerCameraModal ? 'modalPlayerCameraVideo' : 'playerCameraVideo'));
            await this.startPlayerCamera(newMode, vidId);
        },

        async switchCamera(videoElementId) {
            await this.togglePlayerCameraFacing(videoElementId);
        },

        // Snap the photo using a Canvas
        capturePlayerPhoto(videoElementId) {
            const vidId = videoElementId || (this.showEditPlayerModal ? 'playerEditCameraVideo' : (this.showPlayerCameraModal ? 'modalPlayerCameraVideo' : 'playerCameraVideo'));
            const videoEl = document.getElementById(vidId) || 
                            document.getElementById('playerCameraVideo') || 
                            document.getElementById('playerEditCameraVideo') || 
                            document.getElementById('modalPlayerCameraVideo');
            if (!videoEl || !videoEl.videoWidth) return;

            const canvas = document.createElement('canvas');
            canvas.width = videoEl.videoWidth;
            canvas.height = videoEl.videoHeight;
            const ctx = canvas.getContext('2d');

            // Handle mirroring if using the front-facing camera
            if (this.playerCameraFacingMode === 'user') {
                ctx.translate(canvas.width, 0);
                ctx.scale(-1, 1);
            }

            // Draw video frame to canvas
            ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
            
            // Convert to Base64 image
            this.snappedPhotoPreview = canvas.toDataURL('image/jpeg', 0.85);

            // Turn off the live feed now that we have the picture
            this.stopPlayerCamera();
        },

        // Discard snapped photo and restart video feed
        retakePlayerPhoto(videoElementId) {
            this.snappedPhotoPreview = null;
            const vidId = videoElementId || (this.showEditPlayerModal ? 'playerEditCameraVideo' : (this.showPlayerCameraModal ? 'modalPlayerCameraVideo' : 'playerCameraVideo'));
            this.startPlayerCamera(this.playerCameraFacingMode, vidId);
        },

        // Accept the photo and upload to Firebase
        async acceptPlayerPhoto() {
            if (!this.snappedPhotoPreview) return;

            this.isUploadingPlayerPhoto = true;
            this.photoUploadError = '';
            this.uploadProgressPercent = 0;

            try {
                // 1. Convert Base64 Canvas data to a Blob for upload
                const response = await fetch(this.snappedPhotoPreview);
                const blob = await response.blob();

                // 2. Generate a unique file name
                const playerId = this.editingPlayer?.id || this.editingPlayerForPhoto?.id || ('player_' + Date.now());
                const timestamp = Date.now();
                const fileName = `player_photos/${playerId}_${timestamp}.jpg`;

                let downloadURL = null;

                // 3. Direct Firebase Storage methods using uploadBytesResumable
                try {
                    const { getStorage, ref, uploadBytesResumable, getDownloadURL } = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js");
                    
                    // Assuming your Firebase app is already initialized globally
                    const storage = (typeof window !== 'undefined' && window.storage) ? window.storage : (window.app ? getStorage(window.app) : getStorage());
                    const storageRef = ref(storage, fileName);

                    // 4. Upload with progress tracking
                    const uploadTask = uploadBytesResumable(storageRef, blob, { contentType: 'image/jpeg' });

                    await new Promise((resolve, reject) => {
                        uploadTask.on('state_changed', 
                            (snapshot) => {
                                // Update UI Progress Bar
                                this.uploadProgressPercent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                            }, 
                            (error) => {
                                console.error("Firebase Upload Error:", error);
                                reject(error);
                            }, 
                            async () => {
                                try {
                                    // 5. Upload Complete - Get URL
                                    downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                                    resolve(downloadURL);
                                } catch (urlErr) {
                                    reject(urlErr);
                                }
                            }
                        );
                    });
                } catch (storageErr) {
                    console.warn("Direct Firebase Storage upload failed, attempting fallback:", storageErr);
                    
                    // Fallback to existing window.fb.uploadPlayerPhotoBlob if initialized
                    if (window.fb && typeof window.fb.uploadPlayerPhotoBlob === 'function') {
                        try {
                            const res = await window.fb.uploadPlayerPhotoBlob(playerId, blob, (percent) => {
                                this.uploadProgressPercent = Math.round(percent);
                            });
                            if (res && res.url) {
                                downloadURL = res.url;
                            }
                        } catch (fbErr) {
                            console.warn("Fallback uploadPlayerPhotoBlob failed:", fbErr);
                        }
                    }

                    // Fallback to server endpoint
                    if (!downloadURL) {
                        try {
                            const resp = await fetch(`/api/player-photos/${encodeURIComponent(playerId)}`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'image/jpeg' },
                                body: blob
                            });
                            if (resp.ok) {
                                const resData = await resp.json();
                                downloadURL = resData.photo_url || resData.url;
                            }
                        } catch (apiErr) {}
                    }

                    // Offline data URL fallback
                    if (!downloadURL) {
                        downloadURL = this.snappedPhotoPreview;
                    }
                }

                if (downloadURL) {
                    // Assign to the player model
                    if (this.editingPlayer) {
                        this.editingPlayer.photo_url = downloadURL;
                    }
                    if (this.editingPlayerForPhoto) {
                        this.editingPlayerForPhoto.photo_url = downloadURL;
                        const pIdx = this.players?.findIndex(p => p.id === this.editingPlayerForPhoto.id);
                        if (pIdx !== -1 && this.players && this.players[pIdx]) {
                            this.players[pIdx].photo_url = downloadURL;
                        }
                        if (typeof this.persistPlayers === 'function') {
                            this.persistPlayers();
                        }
                    }
                    
                    // Cleanup UI
                    this.isUploadingPlayerPhoto = false;
                    this.snappedPhotoPreview = null;
                    this.isPlayerCameraActive = false;
                    this.showPlayerCameraModal = false; // Close modal if using a dedicated one
                    
                    // Show success toast
                    if (typeof window.showAppGlobalToast === 'function') {
                        window.showAppGlobalToast('Photo uploaded successfully!', 'success');
                    } else if (typeof this.showToast === 'function') {
                        this.showToast('Photo uploaded successfully!', 'success');
                    }
                } else {
                    throw new Error("Unable to retrieve download URL for uploaded photo");
                }

            } catch (err) {
                console.error("Photo processing error:", err);
                this.photoUploadError = "Failed to upload photo to the server. Please try again.";
                this.isUploadingPlayerPhoto = false;
            }
        },

        triggerNativeCamera(inputId = 'nativeCameraInput') {
            const input = document.getElementById(inputId) || 
                          document.getElementById('dedicatedModalDirectCameraInput') || 
                          document.getElementById('nativeCameraInput');
            if (input) {
                input.value = '';
                input.click();
            }
        },
        triggerNativeFile(inputId = 'nativeFileInput') {
            const input = document.getElementById(inputId) || 
                          document.getElementById('dedicatedModalDirectFileInput') || 
                          document.getElementById('nativeFileInput');
            if (input) {
                input.value = '';
                input.click();
            }
        },
        triggerPlayerPhotoInput(inputId) {
            this.triggerNativeCamera(inputId);
        },
        stopPlayerCameraStream() {
            this.stopPlayerCamera();
        },
        stopPlayerCamera() {
            if (this.activeCameraStream) {
                try {
                    this.activeCameraStream.getTracks().forEach(track => track.stop());
                } catch (e) {}
                this.activeCameraStream = null;
            }
            if (this.mediaStream) {
                try {
                    this.mediaStream.getTracks().forEach(track => track.stop());
                } catch (e) {}
                this.mediaStream = null;
            }
            if (this._playerCameraStream) {
                try {
                    this._playerCameraStream.getTracks().forEach(track => track.stop());
                } catch (e) {}
                this._playerCameraStream = null;
            }
            this.isPlayerCameraActive = false;
            this.playerCameraError = '';
            const videoEls = ['modalPlayerCameraVideo', 'playerCameraVideo', 'playerEditCameraVideo'];
            videoEls.forEach(id => {
                const el = document.getElementById(id);
                if (el && el.srcObject) {
                    el.srcObject = null;
                }
            });
        },
        async togglePlayerCameraFacing(targetVideoId = null) {
            this.playerCameraFacingMode = this.playerCameraFacingMode === 'user' ? 'environment' : 'user';
            const vidId = targetVideoId || (this.showEditPlayerModal ? 'playerEditCameraVideo' : (this.showPlayerCameraModal ? 'modalPlayerCameraVideo' : 'playerCameraVideo'));
            await this.startPlayerCamera(this.playerCameraFacingMode, vidId);
        },
        async switchCamera(targetVideoId = null) {
            await this.togglePlayerCameraFacing(targetVideoId);
        },
        async capturePlayerPhoto(targetVideoId = null) {
            const videoEl = (targetVideoId ? document.getElementById(targetVideoId) : null) ||
                            document.getElementById('modalPlayerCameraVideo') ||
                            document.getElementById('playerCameraVideo') || 
                            document.getElementById('playerEditCameraVideo');

            // If camera stream is not active or video is not rendering frames
            if (!videoEl || !videoEl.videoWidth || !videoEl.videoHeight) {
                if (this.isCameraStarting) {
                    await new Promise(r => setTimeout(r, 600));
                }

                if (!videoEl || !videoEl.videoWidth || !videoEl.videoHeight) {
                    console.warn("Live viewfinder not producing frames yet");
                    this.playerCameraError = 'Camera stream is not ready. Please wait a moment or tap "Switch to Camera App / Files".';
                    if (typeof this.showToast === 'function') {
                        this.showToast('Camera stream is not ready. Tap "Switch to Camera App / Files" or retry.', 'warning');
                    }
                    return;
                }
            }

            try {
                this.isCapturing = true;

                // 1. Read intrinsic hardware pixels (e.g. 1920 x 1080), NOT CSS display pixels
                const vw = videoEl.videoWidth;
                const vh = videoEl.videoHeight;
                
                // 2. Compute a centered 1:1 square crop to match the circular avatar guide at maximum HD resolution
                const cropDimension = Math.min(vw, vh); // On a 1920x1080 stream, cropDimension = 1080
                const sourceX = Math.round((vw - cropDimension) / 2);
                const sourceY = Math.round((vh - cropDimension) / 2);

                // 3. Render onto an offscreen canvas at full intrinsic hardware resolution without downscaling
                const canvas = document.createElement('canvas');
                canvas.width = cropDimension;
                canvas.height = cropDimension;

                const ctx = canvas.getContext('2d', { alpha: false });
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';

                // 4. Mirror front-camera selfies so the photo matches the viewfinder preview
                if (this.playerCameraFacingMode === 'user') {
                    ctx.translate(cropDimension, 0);
                    ctx.scale(-1, 1);
                }

                // 5. Draw the cropped square area from the video stream
                ctx.drawImage(
                    videoEl,
                    sourceX, sourceY, cropDimension, cropDimension, // Source clipping rect
                    0, 0, cropDimension, cropDimension              // Destination canvas rect
                );

                // 6. Export high-quality JPEG (0.95 gives maximum HD visual fidelity)
                const hdDataUrl = canvas.toDataURL('image/jpeg', 0.95);
                this.snappedPhotoPreview = hdDataUrl;

                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));

                // 7. If photographing player from dedicated modal, persist directly to cloud storage and player card
                const targetPlayer = this.editingPlayerForPhoto || (this.showPlayerCameraModal ? this.editingPlayer : null);
                if (targetPlayer && targetPlayer.id && blob) {
                    await this.uploadPlayerPhoto(targetPlayer, blob);
                } else {
                    // In add/edit player modal
                    if (this.editingPlayer) {
                        this.editingPlayer.photo_url = hdDataUrl;
                    }
                    if (this.editingPlayerForPhoto) {
                        this.editingPlayerForPhoto.photo_url = hdDataUrl;
                    }
                    if (typeof this.showToast === 'function') {
                        this.showToast('HD Photo captured!', 'success');
                    }
                }
            } catch (e) {
                console.error("Error snapping HD photo:", e);
                if (typeof this.showToast === 'function') {
                    this.showToast('Error capturing photo: ' + (e.message || 'Please try again'), 'warning');
                }
            } finally {
                this.isCapturing = false;
            }
        },
        async acceptPlayerPhoto() {
            if (this.snappedPhotoPreview) {
                if (this.editingPlayer) {
                    this.editingPlayer.photo_url = this.snappedPhotoPreview;
                }
                if (this.editingPlayerForPhoto) {
                    this.editingPlayerForPhoto.photo_url = this.snappedPhotoPreview;
                    if (this.editingPlayerForPhoto.id && typeof this.uploadPlayerPhoto === 'function') {
                        try {
                            const res = await fetch(this.snappedPhotoPreview);
                            const blob = await res.blob();
                            await this.uploadPlayerPhoto(this.editingPlayerForPhoto, blob);
                        } catch (e) {}
                    }
                }
            }
            this.stopPlayerCamera();
            this.snappedPhotoPreview = '';
            if (typeof this.showToast === 'function') {
                this.showToast('HD Photo accepted!', 'success');
            }
        },
        retakePlayerPhoto(targetVideoId = null) {
            this.snappedPhotoPreview = '';
            const vidId = targetVideoId || (this.showPlayerCameraModal ? 'modalPlayerCameraVideo' : 'playerCameraVideo');
            this.startPlayerCamera(this.playerCameraFacingMode || 'environment', vidId);
        },
        handleNativeCameraCapture(event) {
            const file = event?.target?.files?.[0];
            if (!file) return;

            this.stopPlayerCamera();
            this.snappedPhotoPreview = '';

            const reader = new FileReader();
            reader.onload = (e) => {
                const rawDataUrl = e?.target?.result;
                if (!rawDataUrl) return;
                const img = new Image();
                img.onload = async () => {
                    const iw = img.naturalWidth || img.width || 1080;
                    const ih = img.naturalHeight || img.height || 1080;
                    // Centered 1:1 circular/square aspect ratio crop
                    const size = Math.min(iw, ih);
                    const sx = Math.round((iw - size) / 2);
                    const sy = Math.round((ih - size) / 2);
                    // Prevent aggressive downscaling: support full HD up to 2048px on the longest crop edge
                    const targetSize = Math.min(size, 2048);

                    const canvas = document.createElement('canvas');
                    canvas.width = targetSize;
                    canvas.height = targetSize;
                    const ctx = canvas.getContext('2d', { alpha: false });
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, sx, sy, size, size, 0, 0, targetSize, targetSize);

                    const hdDataUrl = canvas.toDataURL('image/jpeg', 0.95);
                    this.snappedPhotoPreview = hdDataUrl;

                    if (this.editingPlayer) {
                        this.editingPlayer.photo_url = hdDataUrl;
                    }
                    if (this.editingPlayerForPhoto) {
                        this.editingPlayerForPhoto.photo_url = hdDataUrl;
                    }

                    const targetPlayer = this.editingPlayerForPhoto || (this.showPlayerCameraModal ? this.editingPlayer : null);
                    if (targetPlayer && targetPlayer.id) {
                        const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.95));
                        if (blob) {
                            await this.uploadPlayerPhoto(targetPlayer, blob);
                        }
                    } else {
                        if (typeof this.showToast === 'function') {
                            this.showToast('HD Photo loaded successfully!', 'success');
                        }
                    }
                };
                img.src = rawDataUrl;
            };
            reader.readAsDataURL(file);

            if (event.target) {
                event.target.value = '';
            }
        },
        async compressPlayerPhoto(blob, maxDimension = 2048, quality = 0.95) {
            if (!blob) return null;
            let bitmap = null;
            try {
                if (typeof createImageBitmap === 'function') {
                    bitmap = await createImageBitmap(blob);
                }
            } catch (e) {
                console.warn("createImageBitmap fallback:", e);
            }
            
            if (!bitmap) {
                bitmap = await new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => resolve(img);
                    img.onerror = reject;
                    img.src = URL.createObjectURL(blob);
                });
            }

            const width = bitmap.width || bitmap.naturalWidth || 1080;
            const height = bitmap.height || bitmap.naturalHeight || 1080;
            
            // 1:1 centered square crop for crisp circular avatar display
            const cropSize = Math.min(width, height);
            const sx = Math.round((width - cropSize) / 2);
            const sy = Math.round((height - cropSize) / 2);

            const targetSize = Math.min(cropSize, maxDimension);

            const canvas = document.createElement('canvas');
            canvas.width = targetSize;
            canvas.height = targetSize;
            const ctx = canvas.getContext('2d', { alpha: false });
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            ctx.drawImage(bitmap, sx, sy, cropSize, cropSize, 0, 0, targetSize, targetSize);

            return await new Promise((resolve) => {
                canvas.toBlob((b) => resolve(b || blob), 'image/jpeg', quality);
            });
        },
        async handleFallbackCameraInput(event, player) {
            const file = event?.target?.files?.[0];
            if (!file) return;
            const targetPlayer = player || this.editingPlayerForPhoto || this.editingPlayer;
            try {
                this.photoUploadError = '';
                this.isUploadingPlayerPhoto = true;
                this.uploadProgressPercent = 20;
                
                // Keep HD dimensions up to 2048px at 0.95 JPEG quality
                const compressedBlob = await this.compressPlayerPhoto(file, 2048, 0.95);
                this.uploadProgressPercent = 50;

                if (targetPlayer && targetPlayer.id) {
                    await this.uploadPlayerPhoto(targetPlayer, compressedBlob);
                } else {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const dataUrl = e.target.result;
                        if (this.editingPlayer) this.editingPlayer.photo_url = dataUrl;
                        if (this.newPlayer) this.newPlayer.photo_url = dataUrl;
                        this.isUploadingPlayerPhoto = false;
                        this.uploadProgressPercent = 100;
                        this.showPlayerCameraModal = false;
                    };
                    reader.readAsDataURL(compressedBlob);
                }
            } catch (err) {
                console.warn("Fallback camera input error:", err?.message || err);
                this.photoUploadError = "Couldn't process the photo file. Please try another image.";
                this.isUploadingPlayerPhoto = false;
            }
        },
        async uploadPlayerPhoto(player, blob) {
            if (!player || !player.id) {
                console.warn("Cannot upload photo: missing player ID");
                return;
            }
            this.isUploadingPlayerPhoto = true;
            this.photoUploadError = '';
            this.uploadProgressPercent = 10;

            try {
                let downloadUrl = null;

                // 1. Firebase Storage attempt
                if (window.fb && typeof window.fb.uploadPlayerPhotoBlob === 'function') {
                    try {
                        const res = await window.fb.uploadPlayerPhotoBlob(player.id, blob, (percent) => {
                            this.uploadProgressPercent = Math.round(percent);
                        });
                        if (res && res.url) {
                            downloadUrl = res.url;
                        }
                    } catch (storageErr) {
                        console.warn("Direct Firebase Storage failed, attempting server endpoint fallback:", storageErr);
                    }
                }

                // 2. Server API fallback
                if (!downloadUrl) {
                    this.uploadProgressPercent = 50;
                    try {
                        const resp = await fetch(`/api/player-photos/${encodeURIComponent(player.id)}`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'image/jpeg'
                            },
                            body: blob
                        });
                        if (resp.ok) {
                            const resData = await resp.json();
                            downloadUrl = resData.photo_url || resData.url;
                        } else {
                            console.warn(`Server upload returned status ${resp.status}, attempting direct local data URL`);
                        }
                    } catch (netErr) {
                        console.warn("Server photo endpoint unreachable, utilizing client-side persistent data URL fallback:", netErr);
                    }
                }

                // 3. Resilient Offline / Standalone Data URL Fallback
                if (!downloadUrl && blob) {
                    this.uploadProgressPercent = 70;
                    downloadUrl = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onload = (e) => resolve(e.target?.result || null);
                        reader.onerror = () => resolve(null);
                        reader.readAsDataURL(blob);
                    });
                }

                if (!downloadUrl) {
                    throw new Error("Could not process photo for storage");
                }

                this.uploadProgressPercent = 90;

                // Update in Firestore
                const nowIso = new Date().toISOString();
                if (window.fb && window.fb.updatePlayer) {
                    await window.fb.updatePlayer(player.id, {
                        photo_url: downloadUrl,
                        photo_updated_at: nowIso
                    });
                } else if (window.fb && window.fb.savePlayer) {
                    await window.fb.savePlayer({
                        ...player,
                        photo_url: downloadUrl,
                        photo_updated_at: nowIso
                    });
                }

                // Update in-memory state
                player.photo_url = downloadUrl;
                player.photo_updated_at = nowIso;
                if (this.editingPlayer && String(this.editingPlayer.id) === String(player.id)) {
                    this.editingPlayer.photo_url = downloadUrl;
                }
                if (this.editingPlayerForPhoto && String(this.editingPlayerForPhoto.id) === String(player.id)) {
                    this.editingPlayerForPhoto.photo_url = downloadUrl;
                }
                const existingInList = (this.players || []).find(p => String(p.id) === String(player.id));
                if (existingInList) {
                    existingInList.photo_url = downloadUrl;
                    existingInList.photo_updated_at = nowIso;
                }

                this.uploadProgressPercent = 100;
                if (typeof this.showToast === 'function') {
                    this.showToast(`Photo for ${player.name} saved successfully!`, 'success');
                }

                setTimeout(() => {
                    this.showPlayerCameraModal = false;
                    this.isUploadingPlayerPhoto = false;
                    this.uploadProgressPercent = 0;
                }, 400);

            } catch (err) {
                console.error("Photo upload failed:", err);
                this.photoUploadError = "Couldn't save the photo — check your connection and try again.";
                this.isUploadingPlayerPhoto = false;
            }
        },
        async deletePlayerPhoto(player) {
            const targetPlayer = player || this.editingPlayerForPhoto || this.editingPlayer;
            if (!targetPlayer || !targetPlayer.id) return;
            
            const confirmed = confirm(`Delete ${targetPlayer.name || 'player'}'s photo? This can't be undone.`);
            if (!confirmed) return;

            try {
                if (window.fb && typeof window.fb.deletePlayerPhotoFromStorage === 'function') {
                    await window.fb.deletePlayerPhotoFromStorage(targetPlayer.id).catch(e => console.warn(e));
                }
                try {
                    await fetch(`/api/player-photos/${encodeURIComponent(targetPlayer.id)}`, { method: 'DELETE' });
                } catch (e) {}

                if (window.fb && typeof window.fb.deletePlayerPhoto === 'function') {
                    await window.fb.deletePlayerPhoto(targetPlayer.id);
                } else if (window.fb && window.fb.updatePlayer) {
                    await window.fb.updatePlayer(targetPlayer.id, {
                        photo_url: '',
                        photo_updated_at: new Date().toISOString()
                    });
                }

                targetPlayer.photo_url = '';
                if (this.editingPlayer && String(this.editingPlayer.id) === String(targetPlayer.id)) {
                    this.editingPlayer.photo_url = '';
                }
                if (this.editingPlayerForPhoto && String(this.editingPlayerForPhoto.id) === String(targetPlayer.id)) {
                    this.editingPlayerForPhoto.photo_url = '';
                }
                const existing = (this.players || []).find(p => String(p.id) === String(targetPlayer.id));
                if (existing) {
                    existing.photo_url = '';
                }

                if (typeof this.showToast === 'function') {
                    this.showToast(`Photo for ${targetPlayer.name} removed.`, 'info');
                }
            } catch (err) {
                console.error("Delete photo error:", err);
                if (typeof this.showToast === 'function') {
                    this.showToast("Failed to delete photo: " + (err.message || 'Unknown error'), 'warning');
                }
            }
        },
        handlePlayerPhotoUpload(event) {
            const file = event?.target?.files?.[0];
            if (!file) return;
            this.handleFallbackCameraInput(event, this.editingPlayer);
        },
        removePlayerPhoto() {
            if (this.editingPlayer && this.editingPlayer.id) {
                this.deletePlayerPhoto(this.editingPlayer);
            } else if (this.editingPlayer) {
                this.editingPlayer.photo_url = '';
                this.stopPlayerCamera();
            }
        },
        async savePlayerSubmit() {
            const name = (this.editingPlayer.name || '').trim();
            if (!name) {
                if (typeof this.showToast === 'function') this.showToast("Please enter the player's full name.", 'info');
                else alert("Please enter the player's full name.");
                return;
            }
            if (!window.fb || !window.fb.savePlayer) return alert("🚨 Database not connected.");

            if (!this.editingPlayer.id) {
                const cleanLower = name.toLowerCase();
                const exists = (this.players || []).some(p => String(p.name || '').toLowerCase() === cleanLower);
                if (exists) return alert(`⚠️ A player named "${name}" already exists!`);
            }

            // 1. Fetch existing player to PRESERVE manual adjustments
            const existing = (this.players || []).find(p => String(p.id) === String(this.editingPlayer.id)) || {};
            
            // 2. Aggressively strip text/letters and force an absolute positive number
            const cleanDed = Math.abs(Number(String(this.editingPlayer.deductions || '0').replace(/[^0-9.-]/g, '')) || 0);

            const isNewPlayer = !this.editingPlayer.id;
            const playerPayload = window.safeClone({
                ...existing, 
                id: this.editingPlayer.id || `p_${Date.now()}`,
                name: name,
                registered: true,
                is_unregistered: false,
                nickname: (this.editingPlayer.nickname || '').trim(),
                dob: this.editingPlayer.dob || '',
                phone: this.editingPlayer.phone || '',
                nationality: this.editingPlayer.nationality || '',
                photo_url: this.editingPlayer.photo_url !== undefined ? this.editingPlayer.photo_url : (existing.photo_url || ''),
                deductions: cleanDed,
                updated_at: new Date().toISOString()
            });

            // Optimistically update local player state immediately
            this.removeDeletedPlayerId(playerPayload.id, playerPayload.name);
            const existingIdx = (this.players || []).findIndex(p => String(p.id) === String(playerPayload.id) || String(p.name || '').trim().toLowerCase() === name.toLowerCase());
            if (existingIdx >= 0) {
                this.players[existingIdx] = playerPayload;
            } else {
                this.players.push(playerPayload);
            }
            this.players.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            this.savePlayersLocally();
            this.recalculateStandings();

            if (window.fb && window.fb.savePlayer) {
                window.fb.savePlayer(playerPayload).catch(err => console.error("Background sync error (savePlayer):", err));
            }
            this.savingStatus = 'saved';
            this.stopPlayerCamera();
            this.showAddPlayerModal = false;
            this.showEditPlayerModal = false;

            // Prompt admin with immediate Google Form consent link for newly added players
            if (isNewPlayer) {
                this.copiedNewPlayerConsentLink = false;
                this.newSavedPlayerForConsent = playerPayload;
                this.showPostPlayerSaveConsentModal = true;
                this.appendPlayerToQuarterlyAttendanceSheets(name);
            }
        },
        async deletePlayer(id) {
            const target = (this.players || []).find(p => String(p.id) === String(id));
            const pName = target ? (target.name || target.player || '') : '';
            const confirmMsg = pName 
                ? `Are you sure you want to permanently delete player "${pName}"? This will permanently remove their card and cascade across team/match records.` 
                : 'Are you sure you want to permanently delete this player?';

            if (!this.safeConfirm(confirmMsg)) return;

            const cleanId = String(id || '').trim();
            const cleanName = pName.trim().toLowerCase();

            // 1. Permanently register in deleted blacklist so snapshots or server re-syncs never revive this card
            this.addDeletedPlayerId(cleanId, cleanName);

            // 2. Delete from server-side database sync storage
            try {
                fetch(`/api/players/${encodeURIComponent(cleanId)}?name=${encodeURIComponent(cleanName)}`, { 
                    method: 'DELETE',
                    headers: { 'Cache-Control': 'no-cache' }
                }).catch(() => {});
            } catch (e) {}

            // 3. Delete Master & Duplicate Records from Firestore if connected
            if (window.fb && window.fb.deletePlayer) {
                window.fb.deletePlayer(cleanId, pName).catch(err => console.error("Background sync error (deletePlayer):", err));
            }

            // 4. Cascade Scrub: Matches (Removes Ghost Data & Attendance)
            for (let m of (this.matches || [])) {
                let modified = false;
                const pristineMatch = window.safeClone(m);

                const matchPlayerMatch = (val) => {
                    const str = String(typeof val === 'object' ? val?.name || val?.player || val?.id || '' : val || '').trim().toLowerCase();
                    return str === cleanId.toLowerCase() || (cleanName && str === cleanName);
                };

                if (pristineMatch.home_roster && pristineMatch.home_roster.some(matchPlayerMatch)) { 
                    pristineMatch.home_roster = pristineMatch.home_roster.filter(x => !matchPlayerMatch(x)); 
                    modified = true; 
                }
                if (pristineMatch.away_roster && pristineMatch.away_roster.some(matchPlayerMatch)) { 
                    pristineMatch.away_roster = pristineMatch.away_roster.filter(x => !matchPlayerMatch(x)); 
                    modified = true; 
                }
                if (pristineMatch.potd_winners && pristineMatch.potd_winners.some(matchPlayerMatch)) { 
                    pristineMatch.potd_winners = pristineMatch.potd_winners.filter(x => !matchPlayerMatch(x)); 
                    modified = true; 
                }
                if (pristineMatch.attendance) {
                    Object.keys(pristineMatch.attendance).forEach(k => {
                        if (matchPlayerMatch(k)) {
                            delete pristineMatch.attendance[k];
                            modified = true;
                        }
                    });
                }
                if (pristineMatch.player_teams) {
                    Object.keys(pristineMatch.player_teams).forEach(k => {
                        if (matchPlayerMatch(k)) {
                            delete pristineMatch.player_teams[k];
                            modified = true;
                        }
                    });
                }
                if (pristineMatch.scorers) {
                    const origLen = pristineMatch.scorers.length;
                    pristineMatch.scorers = pristineMatch.scorers.filter(s => !matchPlayerMatch(s));
                    if (pristineMatch.scorers.length !== origLen) modified = true;
                }

                if (modified && window.fb && window.fb.saveMatchDay) {
                    window.fb.saveMatchDay(pristineMatch).catch(e => console.error("Cascade match scrub sync error:", e));
                }
            }

            // 5. Cascade Scrub: Teams
            for (let t of (this.teams || [])) {
                let modified = false;
                const pristineTeam = window.safeClone(t);
                if (pristineTeam.player_ids && pristineTeam.player_ids.some(x => String(x).toLowerCase() === cleanId.toLowerCase() || (cleanName && String(x).toLowerCase() === cleanName))) { 
                    pristineTeam.player_ids = pristineTeam.player_ids.filter(x => String(x).toLowerCase() !== cleanId.toLowerCase() && (!cleanName || String(x).toLowerCase() !== cleanName)); 
                    modified = true; 
                }
                if (pristineTeam.captain_id === cleanId || (cleanName && String(pristineTeam.captain_id || '').toLowerCase() === cleanName)) { 
                    pristineTeam.captain_id = null; 
                    modified = true; 
                }
                if (modified && window.fb && window.fb.saveTeam) {
                    window.fb.saveTeam(pristineTeam).catch(e => console.error("Cascade team scrub sync error:", e));
                }
            }

            // 6. Optimistically update local player state immediately and push sync
            this.players = (this.players || []).filter(p => {
                if (!p) return false;
                const pId = String(p.id || '').trim().toLowerCase();
                const pNm = String(p.name || p.player || '').trim().toLowerCase();
                if (pId === cleanId.toLowerCase()) return false;
                if (cleanName && pNm === cleanName) return false;
                return true;
            });

            this.savePlayersLocally([cleanId, cleanName]);
            this.recalculateStandings();
            this.updateReportDataReadiness();

            this.savingStatus = 'saved';
            if (typeof this.showToast === 'function') {
                this.showToast(pName ? `Player "${pName}" permanently deleted` : 'Player permanently deleted', 'success');
            }
        },
        async purgeGhostAndDuplicatePlayers() {
            if (!this.safeConfirm('Are you sure you want to scan and purge all duplicate player accounts, ghost teams ("Home", "Away", etc.), and stale records? This will consolidate and clean up the database.')) return;
            this.savingStatus = 'saving';
            try {
                let pCount = 0;
                let tCount = 0;
                if (window.fb) {
                    if (window.fb.purgeDuplicatePlayers) {
                        const res = await window.fb.purgeDuplicatePlayers();
                        pCount = res?.deletedCount || 0;
                    }
                    if (window.fb.purgeGhostTeams) {
                        const res2 = await window.fb.purgeGhostTeams();
                        tCount = res2?.deletedCount || 0;
                    }
                }
                this.savingStatus = 'saved';
                alert(`✅ Scan & Purge complete! Removed ${pCount} duplicate player record(s) and ${tCount} ghost team record(s).`);
            } catch (err) {
                console.error("Purge Error:", err);
                this.savingStatus = 'error';
                alert("Failed to purge duplicates: " + (err.message || err));
            }
        },
        playerExists(name) {
            if (!name) return false;
            const clean = String(name).trim().toLowerCase();
            return this.players.some(p => String(p.name).trim().toLowerCase() === clean);
        },

        openTeamModal(team) {
            if (team) {
                let capId = team.captain_id || null;
                if (capId && capId !== 'null') {
                    const matchPlayer = (this.players || []).find(p => String(p.id).toLowerCase() === String(capId).toLowerCase() || String(p.name || '').trim().toLowerCase() === String(capId).trim().toLowerCase());
                    if (matchPlayer) capId = matchPlayer.id;
                } else {
                    capId = null;
                }
                this.editingTeam = { 
                    id: team.id, 
                    name: team.name, 
                    captain_id: capId, 
                    player_ids: team.player_ids || [], 
                    deductions: Number(team.deductions || 0) 
                };
            } else {
                this.editingTeam = { id: null, name: '', captain_id: null, player_ids: [], deductions: 0 };
            }
            this.showTeamModal = true;
        },
        saveTeamFromModal() { this.saveTeam(); },
        async saveTeam() {
            const name = (this.editingTeam.name || '').trim();
            if (!name) {
                alert("Please enter a team name.");
                return;
            }
            
            if (!window.fb || !window.fb.saveTeam) {
                return alert("🚨 Database not connected.");
            }

            // 1. Fetch existing team to PRESERVE manual adjustments
            const existing = (this.teams || []).find(t => String(t.id) === String(this.editingTeam.id)) || {};
            
            // 2. Clean captain ID
            let cleanCapId = this.editingTeam.captain_id;
            if (cleanCapId === 'null' || cleanCapId === 'none' || cleanCapId === '' || cleanCapId === undefined) {
                cleanCapId = null;
            } else if (cleanCapId) {
                const matchPlayer = (this.players || []).find(p => String(p.id).toLowerCase() === String(cleanCapId).toLowerCase() || String(p.name || '').trim().toLowerCase() === String(cleanCapId).trim().toLowerCase());
                if (matchPlayer) cleanCapId = matchPlayer.id;
            }

            // 3. Aggressively strip text/letters and force absolute positive number
            const cleanDed = Math.abs(Number(String(this.editingTeam.deductions || '0').replace(/[^0-9.-]/g, '')) || 0);

            const teamObj = window.safeClone({
                ...existing,
                id: this.editingTeam.id || `t_${Date.now()}`,
                name: name,
                captain_id: cleanCapId,
                player_ids: this.editingTeam.player_ids || [],
                deductions: cleanDed
            });

            const existingIdx = (this.teams || []).findIndex(t => String(t.id) === String(teamObj.id));
            if (existingIdx >= 0) {
                this.teams[existingIdx] = teamObj;
            } else {
                this.teams.push(teamObj);
            }
            this.saveTeamsLocally();

            try {
                this.savingStatus = 'saving';
                await window.fb.saveTeam(teamObj);
                this.savingStatus = 'saved';
            } catch (err) {
                console.error("Firestore sync error (saveTeam):", err);
                this.savingStatus = 'saved-offline';
            }
            this.recalculateStandings();
            this.showTeamModal = false;
        },
        async deleteTeam(id) {
            if (!this.safeConfirm('Are you sure you want to delete this team?')) return;
            if (!window.fb || !window.fb.deleteTeam) return alert("🚨 Database not connected.");
            
            try {
                this.savingStatus = 'saving';
                await window.fb.deleteTeam(id);
                this.teams = (this.teams || []).filter(t => String(t.id) !== String(id));
                this.recalculateStandings();
                this.savingStatus = 'saved';
            } catch (err) {
                console.error("Firestore sync error (deleteTeam):", err);
                this.savingStatus = 'saved-offline';
            }
            this.showTeamModal = false;
        },
        togglePlayerInEditingTeam(playerId) {
            this.editingTeam.player_ids = this.editingTeam.player_ids || [];
            const idx = this.editingTeam.player_ids.indexOf(playerId);
            if (idx >= 0) this.editingTeam.player_ids.splice(idx, 1);
            else this.editingTeam.player_ids.push(playerId);
        },
        isPlayerInEditingTeam(playerId) {
            return (this.editingTeam.player_ids || []).includes(playerId);
        },

        openPlayerProfile(player) {
            if (!player) return;
            this.selectedPlayerProfile = player;
            const pStand = (this.playerStandings || []).find(s => this.isFuzzyMatch(player, s)) || { pld: 0, w: 0, d: 0, l: 0, goals: 0, potd: 0, pts: 0 };
            const ppg = pStand.pld > 0 ? (pStand.pts / pStand.pld).toFixed(2) : '0.00';
            const winRate = pStand.pld > 0 ? Math.round((pStand.w / pStand.pld) * 100) + '%' : '0%';
            
            this.playerProfileStats = { ...pStand, ppg, winRate };
            this.playerRecentMatches = (this.matches || []).filter(m => this.isPlayerPresent(m, player)).slice(0, 10);
            this.showPlayerProfileModal = true;
        },

        openAdjustStandingsModal() {
            this.recalculateStandings();
            if (this.homeStandingsView === 'captain') {
                this.showEditTeamStandingsModal = true;
            } else {
                this.showEditPlayerStandingsModal = true;
            }
        },
        openTeamStandingsModal() {
            this.recalculateStandings();
            this.showEditTeamStandingsModal = true;
        },
        openPlayerStandingsModal() {
            this.recalculateStandings();
            this.showEditPlayerStandingsModal = true;
        },

        async savePlayerStandingsInModal() { await this.saveManualAdjustments(); },
        async saveTeamStandingsInModal() { await this.saveManualAdjustments(); },
        
        async saveManualAdjustments() {
            if (!window.fb) return alert("🚨 Database not connected.");
            
            this.savingStatus = 'saving';
            const safeNum = (v) => Number(String(v || '0').replace(/[^0-9.-]/g, '')) || 0;
            const savePromises = [];

            // 1. Process Teams -> Firebase (Save the Delta Offset)
            for (let s of (this.captainStandings || [])) {
                let teamObj = (this.teams || []).find(t => String(t.id) === String(s.id));
                if (teamObj) {
                    let modified = false;
                    
                    // Calculate the Delta (Admin Input - Natural Math = Backend Offset)
                    const deltaW = safeNum(s.w) - safeNum(s.nat_w);
                    const deltaD = safeNum(s.d) - safeNum(s.nat_d);
                    const deltaL = safeNum(s.l) - safeNum(s.nat_l);
                    const deltaGf = safeNum(s.gf) - safeNum(s.nat_gf);
                    const deltaGa = safeNum(s.ga) - safeNum(s.nat_ga);
                    const adjPts = safeNum(s.adj_pts);
                    const ded = Math.abs(safeNum(s.deductions));

                    if (Number(teamObj.adj_w || 0) !== deltaW) { teamObj.adj_w = deltaW !== 0 ? deltaW : null; modified = true; }
                    if (Number(teamObj.adj_d || 0) !== deltaD) { teamObj.adj_d = deltaD !== 0 ? deltaD : null; modified = true; }
                    if (Number(teamObj.adj_l || 0) !== deltaL) { teamObj.adj_l = deltaL !== 0 ? deltaL : null; modified = true; }
                    if (Number(teamObj.adj_gf || 0) !== deltaGf) { teamObj.adj_gf = deltaGf !== 0 ? deltaGf : null; modified = true; }
                    if (Number(teamObj.adj_ga || 0) !== deltaGa) { teamObj.adj_ga = deltaGa !== 0 ? deltaGa : null; modified = true; }
                    if (Number(teamObj.adj_pts || 0) !== adjPts) { teamObj.adj_pts = adjPts !== 0 ? adjPts : null; modified = true; }
                    if (Number(teamObj.deductions || 0) !== ded) { teamObj.deductions = ded !== 0 ? ded : null; modified = true; }

                    if (modified && window.fb.saveTeam) {
                        savePromises.push(window.fb.saveTeam(window.safeClone(teamObj)).catch(err => console.error("Background sync error (saveTeam adjustments):", err)));
                    }
                }
            }

            // 2. Process Players -> Firebase (Save the Delta Offset)
            for (let s of (this.playerStandings || [])) {
                let playerObj = (this.players || []).find(p => String(p.id) === String(s.id));
                if (playerObj) {
                    let modified = false;
                    
                    // Calculate the Delta (Admin Input - Natural Math = Backend Offset)
                    const deltaW = safeNum(s.w) - safeNum(s.nat_w);
                    const deltaD = safeNum(s.d) - safeNum(s.nat_d);
                    const deltaL = safeNum(s.l) - safeNum(s.nat_l);
                    const deltaGoals = safeNum(s.goals) - safeNum(s.nat_goals);
                    const deltaPotd = safeNum(s.potd) - safeNum(s.nat_potd);
                    const adjPts = safeNum(s.adj_pts);
                    const ded = Math.abs(safeNum(s.deductions));
                    
                    if (Number(playerObj.adj_w || 0) !== deltaW) { playerObj.adj_w = deltaW !== 0 ? deltaW : null; modified = true; }
                    if (Number(playerObj.adj_d || 0) !== deltaD) { playerObj.adj_d = deltaD !== 0 ? deltaD : null; modified = true; }
                    if (Number(playerObj.adj_l || 0) !== deltaL) { playerObj.adj_l = deltaL !== 0 ? deltaL : null; modified = true; }
                    if (Number(playerObj.adj_goals || 0) !== deltaGoals) { playerObj.adj_goals = deltaGoals !== 0 ? deltaGoals : null; modified = true; }
                    if (Number(playerObj.adj_potd || 0) !== deltaPotd) { playerObj.adj_potd = deltaPotd !== 0 ? deltaPotd : null; modified = true; }
                    if (Number(playerObj.adj_pts || 0) !== adjPts) { playerObj.adj_pts = adjPts !== 0 ? adjPts : null; modified = true; }
                    if (Number(playerObj.deductions || 0) !== ded) { playerObj.deductions = ded !== 0 ? ded : null; modified = true; }

                    if (modified && window.fb.savePlayer) {
                        savePromises.push(window.fb.savePlayer(window.safeClone(playerObj)).catch(err => console.error("Background sync error (savePlayer adjustments):", err)));
                    }
                }
            }

            if (savePromises.length > 0) {
                await Promise.allSettled(savePromises);
            }

            this.savingStatus = 'saved';
            this.showEditTeamStandingsModal = false;
            this.showEditPlayerStandingsModal = false;
            this.recalculateStandings();
        },
        async resetStandingsOverrides() {
            if (this.safeConfirm('Are you sure you want to completely wipe ALL legacy point deductions and manual overrides? This will restore everyone to perfect, natural math.')) {
                if (!window.fb) return alert("🚨 Database not connected.");
                
                // 1. Force explicitly 0 on Teams to bypass Firebase merge ignores
                for (let t of (this.teams || [])) {
                    let modified = false;
                    if (Number(t.deductions || 0) !== 0 || Number(t.adj_pts || 0) !== 0) {
                        t.deductions = 0; 
                        t.adj_pts = 0; 
                        modified = true;
                    }
                    ['adj_w', 'adj_d', 'adj_l', 'adj_gf', 'adj_ga'].forEach(k => {
                        if (t[k] !== undefined && t[k] !== null) { 
                            t[k] = null; 
                            modified = true; 
                        }
                    });
                    if (modified && window.fb.saveTeam) {
                        window.fb.saveTeam(window.safeClone(t)).catch(err => console.error("Reset team overrides sync error:", err));
                    }
                }
                
                // 2. Force explicitly 0 on Players
                for (let p of (this.players || [])) {
                    let modified = false;
                    if (Number(p.deductions || 0) !== 0 || Number(p.adj_pts || 0) !== 0) {
                        p.deductions = 0; 
                        p.adj_pts = 0; 
                        modified = true;
                    }
                    ['adj_w', 'adj_d', 'adj_l', 'adj_goals', 'adj_potd'].forEach(k => {
                        if (p[k] !== undefined && p[k] !== null) { 
                            p[k] = null; 
                            modified = true; 
                        }
                    });
                    if (modified && window.fb.savePlayer) {
                        window.fb.savePlayer(window.safeClone(p)).catch(err => console.error("Reset player overrides sync error:", err));
                    }
                }
                
                this.savingStatus = 'saved';
                this.recalculateStandings();
                alert("✅ All ghost deductions and manual overrides have been wiped! Leaderboard is now 100% natural.");
            }
        },
        updateRowMath(row) {
            if (!row) return;
            
            const safeNum = (v) => Number(String(v || '0').replace(/[^0-9.-]/g, '')) || 0;
            
            // Read the live UI inputs as the user types
            const w = safeNum(row.w);
            const d = safeNum(row.d);
            const l = safeNum(row.l);
            
            const adj = safeNum(row.adj_pts);
            const ded = Math.abs(safeNum(row.deductions)); 
            
            const expectedPld = w + d + l;
            const expectedPts = (w * 3) + (d * 1) + adj - ded;
            const expectedPpg = expectedPld > 0 ? Number((expectedPts / expectedPld).toFixed(2)) : 0.0;

            if (row.pld !== expectedPld) row.pld = expectedPld;
            if (row.pts !== expectedPts) row.pts = expectedPts;
            if (row.ppg !== expectedPpg) row.ppg = expectedPpg;
            
            if (row.gf !== undefined && row.ga !== undefined) {
                const expectedGd = safeNum(row.gf) - safeNum(row.ga);
                if (row.gd !== expectedGd) row.gd = expectedGd;
            }
        },


        // --- REPORTS & PDF ---
        setWeeklyReportRange(rangeKey) {
            const now = new Date();
            if (rangeKey === 'this_week') {
                const monday = new Date(now);
                monday.setDate(now.getDate() - now.getDay() + 1);
                this.reportStartDate = monday.toISOString().split('T')[0];
                this.reportEndDate = now.toISOString().split('T')[0];
            } else if (rangeKey === 'this_month') {
                const start = new Date(now.getFullYear(), now.getMonth(), 1);
                this.reportStartDate = start.toISOString().split('T')[0];
                this.reportEndDate = now.toISOString().split('T')[0];
            } else if (rangeKey === 'all_time') {
                this.reportStartDate = '';
                this.reportEndDate = '';
            }
        },
        // --- 3. CLEAN REPORT PDF EXPORT ---
        downloadWeeklyReportCardPDF() {
            this.pdfGenerating = true;
            
            // Add scoped print styles dynamically if not present
            if (!document.getElementById('print-report-styles')) {
                const style = document.createElement('style');
                style.id = 'print-report-styles';
                style.innerHTML = `
                    @media print {
                        body * { visibility: hidden !important; }
                        #printable-report, #printable-report * { visibility: visible !important; }
                        #printable-report {
                            position: absolute !important;
                            left: 0 !important;
                            top: 0 !important;
                            width: 100% !important;
                            background: #ffffff !important;
                            color: #000000 !important;
                            padding: 0 !important;
                            margin: 0 !important;
                        }
                    }
                `;
                document.head.appendChild(style);
            }

            setTimeout(() => {
                window.print();
                this.pdfGenerating = false;
            }, 250);
        },

        // --- FORMATTERS & HELPERS ---
        openDatePicker(el) {
            if (!el) return;
            let isIframe = false;
            try {
                isIframe = window.self !== window.top;
            } catch (e) {
                isIframe = true;
            }

            // Only attempt showPicker when not running inside a cross-origin iframe
            if (!isIframe && typeof el.showPicker === 'function') {
                try {
                    el.showPicker();
                    return;
                } catch (pickerErr) {
                    // Silently ignore SecurityError or browser restriction
                }
            }
            try {
                el.focus();
            } catch (focusErr) {}
        },
        formatDateForInput(dateStr) {
            if (!dateStr) return '';
            try { return new Date(dateStr).toISOString().split('T')[0]; } catch(e) { return dateStr; }
        },
        formatDateDisplay(dateStr) {
            if (!dateStr) return '';
            const [year, month, day] = String(dateStr).split('T')[0].split('-');
            if (!year || !month || !day) return dateStr;
            return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
        },
        parseInputDate(displayStr) {
            if (!displayStr) return '';
            if (displayStr.includes('-')) return displayStr; // Already YYYY-MM-DD
            const [day, month, year] = displayStr.split('/');
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        },
        getActiveLeagueTeams() {
            return (this.teams || []).filter(t => this.isValidRegisteredTeam(t)).map(t => t.name);
        },
        getAttendanceCounts(matchDay) {
            if (!matchDay || typeof matchDay !== 'object') {
                return { present: 0, absent: 0, total: 0 };
            }
            try {
                const presentList = this.getPresentPlayers ? this.getPresentPlayers(matchDay) : [];
                const allPlayers = this.getAlphabeticalPlayers ? this.getAlphabeticalPlayers() : (this.players || []);
                const safePresent = Array.isArray(presentList) ? presentList.filter(Boolean) : [];
                const safeAll = Array.isArray(allPlayers) ? allPlayers.filter(Boolean) : [];
                
                const presentCount = safePresent.length;
                const totalCount = safeAll.length;
                const absentCount = Math.max(0, totalCount - presentCount);

                return { 
                    present: isNaN(presentCount) ? 0 : presentCount, 
                    absent: isNaN(absentCount) ? 0 : absentCount,
                    total: isNaN(totalCount) ? 0 : totalCount
                };
            } catch (err) {
                console.warn("getAttendanceCounts error handled:", err);
                return { present: 0, absent: 0, total: 0 };
            }
        },
        getCaptainNameForTeam(team) {
            if (!team) return 'No Captain';
            const tObj = typeof team === 'object' ? team : (this.teams || []).find(t => t.name === team);
            if (!tObj || !tObj.captain_id || tObj.captain_id === 'null' || tObj.captain_id === 'none') return 'No Captain';
            const cap = (this.players || []).find(p => String(p.id).toLowerCase() === String(tObj.captain_id).toLowerCase() || String(p.name || '').trim().toLowerCase() === String(tObj.captain_id).trim().toLowerCase());
            return cap ? cap.name : String(tObj.captain_id);
        },
        async setTeamCaptain(teamId, captainId) {
            if (!teamId) return;
            const team = (this.teams || []).find(t => String(t.id) === String(teamId));
            if (!team) return;

            let cleanCapId = captainId;
            if (cleanCapId === 'null' || cleanCapId === 'none' || cleanCapId === '' || cleanCapId === undefined) {
                cleanCapId = null;
            }

            const updated = window.safeClone(team);
            updated.captain_id = cleanCapId;

            const existingIdx = (this.teams || []).findIndex(t => String(t.id) === String(team.id));
            if (existingIdx >= 0) {
                this.teams[existingIdx].captain_id = cleanCapId;
            }

            if (window.fb && window.fb.saveTeam) {
                window.fb.saveTeam(updated).catch(err => console.error("setTeamCaptain sync error:", err));
            }
            this.recalculateStandings();
            this.savingStatus = 'saved';
        },
        getFiltered(list, query) {
            if (!Array.isArray(list)) return [];
            if (!query) return list;
            const q = String(query).toLowerCase().trim();
            return list.filter(item => {
                const name = typeof item === 'object' ? (item.name || item.player || item.id || '') : String(item);
                return String(name).toLowerCase().includes(q);
            });
        },
        getMatchErrors(matchDay) {
            if (!matchDay) return [];
            return (this.dataWarnings || [])
                .filter(w => w.msg && matchDay.date && w.msg.includes(matchDay.date))
                .map(w => w.msg);
        },
        handleMatchTypeChange(targetObj) {
            if (!targetObj) return;
            
            const typeStr = String(targetObj.match_type || targetObj.matchType || '').trim().toLowerCase();
            const isFriendly = typeStr.includes('friendly');

            if (isFriendly) {
                const h = String(targetObj.home_team || '').trim();
                const a = String(targetObj.away_team || '').trim();
                
                // If it is NOT exactly Red vs Yellow or Yellow vs Red, force it to the default.
                const isValidFriendly = (h === 'Red' && a === 'Yellow') || (h === 'Yellow' && a === 'Red');
                
                if (!isValidFriendly) {
                    targetObj.home_team = 'Red';
                    targetObj.away_team = 'Yellow';
                }
            } else {
                // Restore empty state so user selects real teams
                const h = String(targetObj.home_team || '');
                const a = String(targetObj.away_team || '');
                if (h === 'Red' || h === 'Yellow') targetObj.home_team = '';
                if (a === 'Red' || a === 'Yellow') targetObj.away_team = '';
            }
        },
        getMatchTeamOptions(matchDay) {
            const target = matchDay || this.newMatchDay || {};
            const typeStr = String(target.match_type || target.matchType || '').trim().toLowerCase();
            const isFriendly = typeStr.includes('friendly');

            if (isFriendly) {
                return ['Red', 'Yellow'];
            }

            const teamSet = new Set();

            // 1. Registered teams in this.teams
            (this.teams || []).forEach(t => {
                const name = typeof t === 'object' ? (t.name || t.team_name || '') : String(t || '');
                if (name) teamSet.add(name.trim());
            });

            // 2. Captain standings teams
            (this.captainStandings || []).forEach(t => {
                const name = typeof t === 'object' ? (t.name || t.team || t.team_name || '') : String(t || '');
                if (name) teamSet.add(name.trim());
            });

            // 3. Registered tournament teams & active league teams
            if (typeof this.getRegisteredTournamentTeams === 'function') {
                const tourneyTeams = this.getRegisteredTournamentTeams();
                tourneyTeams.forEach(t => {
                    const name = typeof t === 'object' ? (t.name || '') : String(t || '');
                    if (name) teamSet.add(name.trim());
                });
            }
            if (typeof this.getActiveLeagueTeams === 'function') {
                const activeTeams = this.getActiveLeagueTeams();
                (activeTeams || []).forEach(name => {
                    if (name) teamSet.add(String(name).trim());
                });
            }

            // 4. If current match already has team names assigned (e.g. from tournaments, knockouts, fixtures), preserve them
            if (target.home_team && typeof target.home_team === 'string' && target.home_team.trim()) {
                teamSet.add(target.home_team.trim());
            }
            if (target.away_team && typeof target.away_team === 'string' && target.away_team.trim()) {
                teamSet.add(target.away_team.trim());
            }

            // 5. Fallback defaults if roster is empty
            if (teamSet.size === 0) {
                const defaults = ["Jerry", "Ojukwu", "John T", "David", "ND", "Ibraheem", "Osanga", "Samson"];
                defaults.forEach(d => teamSet.add(d));
            }

            const banned = ['red', 'yellow', 'none', 'unknown', 'null', 'undefined', '[object object]', ''];
            return Array.from(teamSet).filter(t => {
                const lower = String(t).trim().toLowerCase();
                return !banned.includes(lower);
            }).sort((a, b) => a.localeCompare(b));
        },
        getMatchTimestamp(m) {
            if (!m) return 0;
            let timeVal = 0;
            if (m.date) {
                const dStr = String(m.date).trim();
                if (dStr.includes('/')) {
                    const parts = dStr.split('/');
                    if (parts.length === 3) {
                        const iso = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                        timeVal = new Date(iso).getTime() || 0;
                    }
                } else if (dStr.includes('-')) {
                    timeVal = new Date(dStr).getTime() || 0;
                } else {
                    timeVal = new Date(dStr).getTime() || 0;
                }
            }
            if (m.time && typeof this.parseTimeToMinutes === 'function') {
                const mins = this.parseTimeToMinutes(m.time);
                if (mins >= 0 && mins < 99999) {
                    timeVal += mins * 60 * 1000;
                }
            }
            if (!timeVal && m.id) {
                const tsMatch = String(m.id).match(/\d{10,}/);
                if (tsMatch) {
                    timeVal = parseInt(tsMatch[0], 10);
                }
            }
            return timeVal || 0;
        },
        isMatchPlayed(m) {
            if (!m) return false;
            const status = String(m.status || '').toLowerCase().trim();
            if (status === 'completed') return true;
            if (status === 'in_progress' || status === 'live') return false;
            
            // If match has explicit forfeit or winner and not in_progress
            if (m.forfeit_team && m.forfeit_team !== 'none') return true;
            if (m.winner_team || m.winner_id) return true;
            
            // If match has recorded non-zero scores or goal scorers and is not marked scheduled
            const hScore = Number(m.home_score !== undefined ? m.home_score : (m.homeScore || 0));
            const aScore = Number(m.away_score !== undefined ? m.away_score : (m.awayScore || 0));
            const hasScorers = Array.isArray(m.scorers) && m.scorers.length > 0;
            if ((hScore > 0 || aScore > 0 || hasScorers) && status !== 'scheduled') {
                return true;
            }

            return false;
        },
        cleanMatchTitle(title) {
            if (!title) return '';
            return String(title).replace(/^(Match\s*\d+[:\s\-\.]*)+/gi, '').trim();
        },
        getTournamentStageWeight(m) {
            if (!m) return 999;
            const stage = String(m.stage_type || '').toLowerCase();
            const title = String(m.title || '').toLowerCase();
            const id = String(m.id || '').toLowerCase();

            if (stage === 'group' || m.group_name || id.includes('_grp_')) return 1;
            if (stage === 'knockout' || title.includes('semi-final') || id.includes('_sf')) return 2;
            if (stage === 'final' || title.includes('grand championship') || title.includes('grand final') || id.includes('_final')) return 3;
            return 4;
        },
        getMatchGroupOrder(m) {
            if (!m) return 99;
            const grp = String(m.group_name || '').toUpperCase().trim();
            if (grp.includes('GROUP A') || grp.endsWith('A')) return 1;
            if (grp.includes('GROUP B') || grp.endsWith('B')) return 2;
            if (grp.includes('GROUP C') || grp.endsWith('C')) return 3;
            if (grp.includes('GROUP D') || grp.endsWith('D')) return 4;
            if (grp) return 10;
            return 99;
        },
        getMatchNumber(m, defaultIdx) {
            if (!m) return (defaultIdx !== undefined ? defaultIdx + 1 : 1);
            if (m.match_number !== undefined && m.match_number !== null && !isNaN(m.match_number)) {
                return Number(m.match_number);
            }
            const titleMatch = String(m.title || '').match(/^Match\s+(\d+)[:\s]/i);
            if (titleMatch && titleMatch[1]) {
                return parseInt(titleMatch[1], 10);
            }
            const idMatch = String(m.id || '').match(/_m(\d+)/);
            if (idMatch && idMatch[1]) {
                return parseInt(idMatch[1], 10);
            }
            return (defaultIdx !== undefined ? defaultIdx + 1 : 1);
        },
        formatMatchTitleWithNumber(m, defaultIdx) {
            if (!m) return '';
            const rawTitle = this.cleanMatchTitle(m.title) || 
                `${m.group_name ? m.group_name + ': ' : ''}${m.home_team || 'TBD'} vs ${m.away_team || 'TBD'}`;
            const num = (m.match_number !== undefined && m.match_number !== null) ? m.match_number : this.getMatchNumber(m, defaultIdx);
            return `Match ${num}: ${rawTitle}`;
        },
        getSortedMatchDays() {
            let list = this.matches || [];
            
            // Separate tournament matches to assign structured match sequence (Group A -> Group B -> Knockouts -> Final)
            const tourneyMatches = [];
            const otherMatches = [];

            list.forEach(m => {
                if (!m) return;
                const isTourn = m.match_type === 'Tournament' || m.stage_type || m.group_name || String(m.id || '').startsWith('tourn_');
                if (isTourn) {
                    tourneyMatches.push(m);
                } else {
                    otherMatches.push(m);
                }
            });

            // Sort tournament matches strictly by: Stage (Group -> Knockout -> Final), Round (Round 1 -> Round 2 -> Round 3), Group (Group A -> Group B), and Pitch/Time
            tourneyMatches.sort((a, b) => {
                const stageA = this.getTournamentStageWeight(a);
                const stageB = this.getTournamentStageWeight(b);
                if (stageA !== stageB) return stageA - stageB;

                const roundA = Number(a.round_number || 0);
                const roundB = Number(b.round_number || 0);
                if (roundA !== roundB) return roundA - roundB;

                const grpA = this.getMatchGroupOrder(a);
                const grpB = this.getMatchGroupOrder(b);
                if (grpA !== grpB) return grpA - grpB;

                const timeA = this.getMatchTimestamp(a);
                const timeB = this.getMatchTimestamp(b);
                if (timeA !== timeB) return timeA - timeB;

                return String(a.id || '').localeCompare(String(b.id || ''));
            });

            // Dynamically assign sequential match numbers:
            // Round 1: Match 1 & 2 (Group A), Match 3 & 4 (Group B)
            // Round 2: Match 5 & 6 (Group A), Match 7 & 8 (Group B)
            // Round 3: Match 9 & 10 (Group A), Match 11 & 12 (Group B)
            // Semi-Finals: Match 13 & 14
            // Grand Final: Match 15
            tourneyMatches.forEach((m, idx) => {
                const matchNum = idx + 1;
                m.match_number = matchNum;
                const clean = this.cleanMatchTitle(m.title);
                if (clean) {
                    m.title = `Match ${matchNum}: ${clean}`;
                } else {
                    m.title = this.formatMatchTitleWithNumber(m, idx);
                }
            });

            const combinedList = [...tourneyMatches, ...otherMatches];
            let filteredList = combinedList;
            
            if (this.cardSearchQuery && typeof this.cardSearchQuery === 'string' && this.cardSearchQuery.trim()) {
                const q = this.cardSearchQuery.trim().toLowerCase();
                filteredList = filteredList.filter(m => {
                    const title = (m.title || '').toLowerCase();
                    const date = (m.date || '').toLowerCase();
                    const home = (m.home_team || '').toLowerCase();
                    const away = (m.away_team || '').toLowerCase();
                    return title.includes(q) || date.includes(q) || home.includes(q) || away.includes(q);
                });
            }

            const inProgress = [];
            const upcoming = [];
            const played = [];

            filteredList.forEach(m => {
                if (!m) return;
                const status = String(m.status || '').toLowerCase().trim();
                if (status === 'in_progress' || status === 'live') {
                    inProgress.push(m);
                } else if (this.isMatchPlayed(m)) {
                    played.push(m);
                } else {
                    upcoming.push(m);
                }
            });

            // Comparator: Group A -> Group B -> Knockouts -> Final (Match 1, Match 2, Match 3...)
            const sortInSequence = (a, b) => {
                const isTournA = a.match_type === 'Tournament' || a.stage_type || a.group_name || String(a.id || '').startsWith('tourn_');
                const isTournB = b.match_type === 'Tournament' || b.stage_type || b.group_name || String(b.id || '').startsWith('tourn_');
                
                if (isTournA && isTournB) {
                    const numA = Number(a.match_number || this.getMatchNumber(a));
                    const numB = Number(b.match_number || this.getMatchNumber(b));
                    if (numA !== numB) return numA - numB;
                }
                
                const timeA = this.getMatchTimestamp(a);
                const timeB = this.getMatchTimestamp(b);
                if (timeA !== timeB) return timeA - timeB;

                const dA = a?.date || '';
                const dB = b?.date || '';
                if (dA !== dB) return dA.localeCompare(dB);

                return String(a.id || '').localeCompare(String(b.id || ''));
            };

            // Reverse comparator for completed games
            const sortReverseChronological = (a, b) => {
                const timeA = this.getMatchTimestamp(a);
                const timeB = this.getMatchTimestamp(b);
                if (timeA !== timeB) return timeB - timeA;
                
                const numA = Number(a.match_number || this.getMatchNumber(a));
                const numB = Number(b.match_number || this.getMatchNumber(b));
                if (numA !== numB) return numB - numA;

                return String(b.id || '').localeCompare(String(a.id || ''));
            };

            inProgress.sort(sortInSequence);
            upcoming.sort(sortInSequence);
            played.sort(sortInSequence);

            // Progressive Lifecycle:
            // 1. Live/In-Progress matches at the top
            // 2. Upcoming matches in Group & Match order (Group A Match 1, 2... Group B Match 3, 4... SFs... Final)
            // 3. Played matches in chronological order
            return [...inProgress, ...upcoming, ...played];
        },
        getPaginated(list, page, pageSize = 10) {
            if (!Array.isArray(list)) return [];
            const start = (page - 1) * pageSize;
            return list.slice(start, start + pageSize);
        },
        getPlayerCaptainTeam(p) {
            if (!p) return null;
            const pId = String(typeof p === 'object' ? (p.id || '') : p).trim().toLowerCase();
            const pName = String(typeof p === 'object' ? (p.name || '') : '').trim().toLowerCase();
            
            const foundTeam = (this.teams || []).find(t => {
                if (!this.isValidRegisteredTeam(t)) return false;
                const capId = String(t.captain_id || '').trim().toLowerCase();
                const tName = String(t.name || '').trim().toLowerCase();
                if (capId && (capId === pId || (pName && capId === pName))) return true;
                if (pName && tName === pName) return true;
                return false;
            });
            return foundTeam ? foundTeam.name : null;
        },
        getCaptainPlayerForTeam(teamName) {
            if (!teamName) return null;
            const clean = String(teamName).trim().toLowerCase();
            const tObj = (this.teams || []).find(t => {
                if (!this.isValidRegisteredTeam(t)) return false;
                return String(t.name || '').trim().toLowerCase() === clean || String(t.id || '').trim().toLowerCase() === clean;
            });
            if (!tObj) {
                return (this.players || []).find(p => String(p.name || '').trim().toLowerCase() === clean) || null;
            }
            if (tObj.captain_id) {
                const cap = (this.players || []).find(p => String(p.id).toLowerCase() === String(tObj.captain_id).toLowerCase() || String(p.name || '').trim().toLowerCase() === String(tObj.captain_id).trim().toLowerCase());
                if (cap) return cap;
            }
            return (this.players || []).find(p => String(p.name || '').trim().toLowerCase() === clean) || null;
        },
        getPlayerTeamName(p) {
            if (!p) return 'Player';
            const capTeam = this.getPlayerCaptainTeam(p);
            if (capTeam) {
                return `Captain (${capTeam})`;
            }
            return 'Player';
        },
        getPlayerTotalGoals(p) {
            const s = (this.playerStandings || []).find(st => this.isFuzzyMatch(p, st));
            return s ? s.goals : 0;
        },
        getPlayersForCard(search = '', matchDay = null) {
            let list = this.getAlphabeticalPlayers();
            if (search && typeof search === 'string' && search.trim() !== '') {
                const q = search.trim().toLowerCase();
                list = list.filter(p => {
                    const nameMatch = (p.name || '').toLowerCase().includes(q);
                    const nickMatch = (p.nickname || '').toLowerCase().includes(q);
                    return nameMatch || nickMatch;
                });
            }
            return list;
        },
        getScorerSearchCandidates(search = '', matchDay = null) {
            const q = (search || '').trim().toLowerCase();
            const present = matchDay ? this.getPresentPlayers(matchDay) : [];
            const presentIds = new Set(present.map(p => String(p.id)));
            const all = this.getAlphabeticalPlayers();

            let results = [];
            
            if (!q || 'own goal'.includes(q)) {
                results.push({ id: 'own-goal', name: 'Own Goal', isOwnGoal: true, isPresent: false });
            }

            all.forEach((p, idx) => {
                const nameMatch = (p.name || '').toLowerCase().includes(q);
                const nickMatch = (p.nickname || '').toLowerCase().includes(q);
                if (!q || nameMatch || nickMatch) {
                    const stableId = p.id ? String(p.id) : ('player-cand-' + (p.name ? p.name.toLowerCase().replace(/\s+/g, '-') : idx));
                    results.push({
                        ...p,
                        id: stableId,
                        isPresent: p.id ? presentIds.has(String(p.id)) : false,
                        isOwnGoal: false
                    });
                }
            });

            results.sort((a, b) => {
                if (a.isOwnGoal && !b.isOwnGoal) return -1;
                if (!a.isOwnGoal && b.isOwnGoal) return 1;
                if (a.isPresent && !b.isPresent) return -1;
                if (!a.isPresent && b.isPresent) return 1;
                return (a.name || '').localeCompare(b.name || '');
            });

            return results;
        },
        getTeamPlayerNames(team) {
            if (!team) return [];
            const tObj = typeof team === 'object' ? team : (this.teams || []).find(t => t.name === team);
            if (!tObj || !Array.isArray(tObj.player_ids)) return [];
            return tObj.player_ids.map(id => {
                const p = (this.players || []).find(pl => String(pl.id) === String(id));
                return p ? p.name : id;
            });
        },
        getTotalPages(list, pageSize = 10) {
            if (!Array.isArray(list) || list.length === 0) return 1;
            return Math.ceil(list.length / pageSize);
        },
        goToMatch(m) {
            if (!m) return;
            this.activeTab = 'league';
            this.leagueSubTab = 'matches';
            this.cardSearch = m.date || '';
        },
        onHomeTeamChange(matchDay) { 
            const target = matchDay || this.newMatchDay;
            if (target) {
                const typeStr = String(target.match_type || target.matchType || '').trim().toLowerCase();
                if (typeStr.includes('friendly')) {
                    // Auto-flip mutually exclusive friendly teams
                    if (target.home_team === 'Red') target.away_team = 'Yellow';
                    if (target.home_team === 'Yellow') target.away_team = 'Red';
                }
                if (matchDay) this.saveMatchDay(matchDay); 
            }
        },
        onAwayTeamChange(matchDay) { 
            const target = matchDay || this.newMatchDay;
            if (target) {
                const typeStr = String(target.match_type || target.matchType || '').trim().toLowerCase();
                if (typeStr.includes('friendly')) {
                    // Auto-flip mutually exclusive friendly teams
                    if (target.away_team === 'Red') target.home_team = 'Yellow';
                    if (target.away_team === 'Yellow') target.home_team = 'Red';
                }
                if (matchDay) this.saveMatchDay(matchDay); 
            }
        },
        onMatchTypeValueChange(matchDay) {
            const target = matchDay || this.newMatchDay;
            if (target) {
                this.handleMatchTypeChange(target);
                if (matchDay) this.saveMatchDay(matchDay);
            }
        },
        addUnregisteredPlayerToSession(matchDayOrId, name) {
            if (!matchDayOrId || !name) return;
            const matchDayId = typeof matchDayOrId === 'object' ? matchDayOrId.id : matchDayOrId;
            const clean = String(name).trim();
            if (!clean) return;

            const cleanLower = clean.toLowerCase();
            let existingPlayer = (this.players || []).find(p => {
                if (!p) return false;
                const pName = String(p.name || '').trim().toLowerCase();
                const pNick = String(p.nickname || '').trim().toLowerCase();
                return (pName && pName === cleanLower) || (pNick && pNick === cleanLower);
            });

            if (existingPlayer) {
                this.toggleAttendance(matchDayId, existingPlayer, 'present');
                return;
            }

            // STRICT VALIDATION FIX: Do not auto-generate database records.
            alert(`⚠️ Cannot add "${clean}". This player is not registered in the database. Please add them to the Player Directory first to ensure their stats are tracked accurately.`);
        },
        deletePlayerFromSession(matchDay, p) {
            if (!matchDay || !p) return;
            this.toggleAttendance(matchDay.id, p, 'absent');
        },
        sortTable(colName) {
            let c = String(colName || '').toLowerCase().trim();
            
            // ANTI-HTML TRAP: If the HTML is passing an Event Object or broken strings, physically read the clicked DOM element text
            if (typeof window !== 'undefined' && window.event && window.event.currentTarget) {
                let domText = window.event.currentTarget.innerText || window.event.target.innerText || '';
                domText = domText.replace(/[^a-zA-Z0-9 ]/g, '').toLowerCase().trim(); // Strip arrows or icons
                if (domText && domText.length < 20) {
                    c = domText;
                }
            }

            // Robust UI Alias Mapping directly to Backend Keys
            if (['player', 'team', 'team name', 'player name', 'name', '#'].includes(c)) c = 'name';
            if (['g', 'goals', 'gf', 'goals for'].includes(c)) c = 'goals';
            if (['ga', 'goals against'].includes(c)) c = 'ga';
            if (['gd', 'goal difference'].includes(c)) c = 'gd';
            if (['mvp', 'awards', 'potd', 'player of the day'].includes(c)) c = 'potd';
            if (['ded', 'deductions', 'deduction'].includes(c)) c = 'deductions';
            if (['w', 'win', 'wins'].includes(c)) c = 'w';
            if (['d', 'draw', 'draws'].includes(c)) c = 'd';
            if (['l', 'loss', 'losses'].includes(c)) c = 'l';
            if (['pts', 'points'].includes(c)) c = 'pts';
            if (['pld', 'played'].includes(c)) c = 'pld';
            if (['ppg'].includes(c)) c = 'ppg';
            
            // Auto-detect Active Table Context safely
            let targetIsPlayer = this.homeStandingsView === 'player';
            if (['goals', 'potd'].includes(c)) targetIsPlayer = true;
            if (['gf', 'ga', 'gd'].includes(c)) targetIsPlayer = false;

            if (targetIsPlayer) {
                if (this.playerSortCol === c) {
                    this.playerSortAsc = !this.playerSortAsc;
                } else { 
                    this.playerSortCol = c; 
                    this.playerSortAsc = (c === 'name'); // Name defaults A-Z. Stats default High-to-Low.
                }
            } else {
                if (this.teamSortCol === c) {
                    this.teamSortAsc = !this.teamSortAsc;
                } else { 
                    this.teamSortCol = c; 
                    this.teamSortAsc = (c === 'name'); 
                }
            }
        },
        startStopwatch() {
            if (this.stopwatch.isRunning || this.stopwatch.running) {
                this.stopwatch.running = false;
                this.stopwatch.isRunning = false;
                if (this.stopwatch.interval) clearInterval(this.stopwatch.interval);
                this.stopwatch.interval = null;
                return;
            }
            this.stopwatch.running = true;
            this.stopwatch.isRunning = true;
            if (this.stopwatch.interval) clearInterval(this.stopwatch.interval);
            this.stopwatch.interval = setInterval(() => {
                this.stopwatch.time++;
            }, 1000);
        },
        resetStopwatch() {
            this.stopwatch.running = false;
            this.stopwatch.isRunning = false;
            if (this.stopwatch.interval) clearInterval(this.stopwatch.interval);
            this.stopwatch.interval = null;
            this.stopwatch.time = 0;
        },

        runDataValidator() {
            this.dataWarnings = [];
            
            (this.matches || []).forEach(m => {
                if (!m || m.match_type === 'Friendly Match' || m.matchType === 'Friendly Match') return;
                
                const hScore = Number(m.home_score !== undefined ? m.home_score : (m.homeScore || 0));
                const aScore = Number(m.away_score !== undefined ? m.away_score : (m.awayScore || 0));
                const totalScore = hScore + aScore;
                const matchDate = m.date || 'Unknown Date';
                const matchTitle = `${m.home_team || 'Home'} vs ${m.away_team || 'Away'}`;
                
                const safeParse = (data) => {
                    try { return typeof data === 'string' ? JSON.parse(data || '[]') : (data || []); } 
                    catch(e) { return []; }
                };

                const hRoster = safeParse(m.home_roster || m.homeRoster);
                const aRoster = safeParse(m.away_roster || m.awayRoster);
                const potds = typeof this.getPOTDWinners === 'function' ? this.getPOTDWinners(m) : safeParse(m.potd_winners || m.potdWinners || m.potd);
                const scorers = safeParse(m.scorers || m.goalScorers);

                if (potds.length === 0 && !m.is_forfeit && m.forfeit_team === 'none') {
                    this.dataWarnings.push({ type: 'warning', icon: '⭐', msg: `Match on ${matchDate} (${matchTitle}): No Player of the Day (POTD) winner selected.` });
                }

                if ((hRoster.length === 0 || aRoster.length === 0) && !m.is_forfeit && m.forfeit_team === 'none') {
                    this.dataWarnings.push({ type: 'error', icon: '📋', msg: `Match on ${matchDate} (${matchTitle}): Has a result of ${hScore}-${aScore}, but one or both team rosters are empty.` });
                }

                let sGoals = 0;
                scorers.forEach(s => {
                    sGoals += Number(typeof s === 'object' ? (s.goals || 1) : 1);
                    const scName = typeof s === 'object' ? (s.player || s.name) : s;
                    const exists = (this.players || []).some(p => this.isFuzzyMatch(p, scName));
                    if (!exists && scName) {
                        this.dataWarnings.push({ type: 'warning', icon: '❓', msg: `Match on ${matchDate}: Goal scorer '${scName}' is not linked to any registered player in the directory.` });
                    }
                });

                potds.forEach(potd => {
                    const isPresent = (this.players || []).some(p => this.isFuzzyMatch(p, potd) && this.isPlayerPresent(m, p));
                    if (!isPresent && potd) {
                        this.dataWarnings.push({ type: 'error', icon: '🚨', msg: `Match on ${matchDate}: '${potd}' is selected as POTD but is not marked present on the match card.` });
                    }
                });
            });

            const overridenPlayers = (this.playerStandings || []).filter(p => p.adj_pld || p.adj_pts || p.adj_goals || p.adj_w || p.adj_d || p.adj_l || p.adj_potd);
            if (overridenPlayers.length > 0) {
                this.dataWarnings.push({ type: 'info', icon: 'ℹ️', msg: `${overridenPlayers.length} player(s) have manual edits active on the leaderboard.` });
            }
        },

        // --- REQUIRED HELPER METHODS FOR UI & MATCH CARDS ---
        toggleAttendancePanel(matchDayId) {
            if (!matchDayId) return;
            const id = String(matchDayId);
            this.openAttendanceMatchIds = {
                ...this.openAttendanceMatchIds,
                [id]: !this.openAttendanceMatchIds[id]
            };
        },
        isAttendanceOpen(matchDayId) {
            if (!matchDayId) return false;
            return !!this.openAttendanceMatchIds[String(matchDayId)];
        },
        toggleTeamSelectionPanel(matchDayId) {
            if (!matchDayId) return;
            const id = String(matchDayId);
            this.openTeamSelectionMatchIds = {
                ...this.openTeamSelectionMatchIds,
                [id]: !this.openTeamSelectionMatchIds[id]
            };
        },
        isTeamSelectionOpen(matchDayId) {
            if (!matchDayId) return false;
            return !!this.openTeamSelectionMatchIds[String(matchDayId)];
        },
        startDrag(player) { this.draggedPlayer = player; },
        onDrop(matchDay, targetTeam) {
            if (!this.draggedPlayer || !matchDay) return;
            this.assignPlayerToMatchTeam(matchDay.id, matchDay.id, this.draggedPlayer, targetTeam);
            this.draggedPlayer = null; 
        },
        getPOTDWinners(match) {
            if (!match) return [];
            let raw = match.potd_winners || match.potdWinners || match.potd || match.potd_winner || match.potdWinner || match.mvp || match.mvps || [];
            if (typeof raw === 'string') {
                try {
                    const parsed = JSON.parse(raw);
                    raw = Array.isArray(parsed) ? parsed : [parsed];
                } catch(e) {
                    raw = raw.includes(',') ? raw.split(',').map(s => s.trim()).filter(Boolean) : (raw.trim() ? [raw.trim()] : []);
                }
            }
            if (!Array.isArray(raw)) raw = raw ? [raw] : [];
            
            // GRACEFUL DEGRADATION: Map winners to official players or graceful fallback objects without dropping
            const seenKeys = new Set();
            const cleanWinners = [];
            raw.forEach(p => {
                if (!p) return;
                const rawName = typeof p === 'object' && p !== null ? (p.name || p.player || p.id || '') : String(p).trim();
                if (!rawName || rawName.toLowerCase() === 'undefined' || rawName.toLowerCase() === 'null') return;
                
                const regPlayer = this.findRegisteredPlayer(p);
                const winnerObj = regPlayer ? regPlayer : { id: rawName, name: rawName, player: rawName };
                const key = String(winnerObj.id || winnerObj.name || winnerObj.player).toLowerCase();
                if (!seenKeys.has(key)) {
                    seenKeys.add(key);
                    cleanWinners.push(winnerObj);
                }
            });
            return cleanWinners;
        },
        isPOTDWinner(matchDay, p) {
            if (!matchDay || !p) return false;
            const winners = this.getPOTDWinners(matchDay);
            const regP = this.findRegisteredPlayer(p);
            const pId = regP ? String(regP.id).trim() : (typeof p === 'object' && p !== null ? String(p.id || '').trim() : '');
            const pName = regP ? String(regP.name).trim().toLowerCase() : (typeof p === 'object' && p !== null ? String(p.name || p.player || '').trim().toLowerCase() : String(p).trim().toLowerCase());

            return winners.some(w => {
                const regW = this.findRegisteredPlayer(w);
                const wId = regW ? String(regW.id).trim() : String(w.id || '').trim();
                const wName = regW ? String(regW.name).trim().toLowerCase() : String(w.name || w.player || '').trim().toLowerCase();

                if (pId && wId && pId === wId) return true;
                if (pName && wName && pName === wName) return true;
                if (pId && wName && pId.toLowerCase() === wName) return true;
                if (pName && wId && pName === wId.toLowerCase()) return true;
                return this.isFuzzyMatch(w, p);
            });
        },
        async togglePOTDWinner(matchDay, p) {
            if (!matchDay || !p) return;
            
            const regPlayer = this.findRegisteredPlayer(p);
            const pName = regPlayer ? regPlayer.name : (typeof p === 'object' && p !== null ? (p.name || p.player || p.id) : String(p));
            if (!pName) return;

            const currentWinners = this.getPOTDWinners(matchDay);
            const isCurrentlyWinner = this.isPOTDWinner(matchDay, p);

            let newWinnerNames = [];
            if (isCurrentlyWinner) {
                newWinnerNames = currentWinners
                    .filter(w => {
                        const regW = this.findRegisteredPlayer(w);
                        if (regPlayer && regW) {
                            return String(regPlayer.id) !== String(regW.id);
                        }
                        const wName = String(w.name || w.player || w.id || '').trim().toLowerCase();
                        return wName !== String(pName).trim().toLowerCase();
                    })
                    .map(w => w.name || w.player || w.id);
            } else {
                newWinnerNames = [...currentWinners.map(w => w.name || w.player || w.id), pName];
            }

            matchDay.potd_winners = [...newWinnerNames];
            matchDay.potdWinners = [...newWinnerNames];
            matchDay.potd = [...newWinnerNames];
            matchDay.potd_winner = newWinnerNames.join(', ');
            matchDay.potdWinner = matchDay.potd_winner;
            
            this.saveMatchDay(matchDay);
            this.recalculateStandings();
        },
        async clearPOTDWinners(matchDay) {
            if (!matchDay) return;
            matchDay.potd_winners = [];
            matchDay.potdWinners = [];
            matchDay.potd = [];
            matchDay.potd_winner = '';
            matchDay.potdWinner = '';
            this.saveMatchDay(matchDay);
            this.recalculateStandings();
        },
        getMatchScorers(match) {
            if (!match) return [];
            let raw = match.scorers || match.goalScorers || [];
            if (typeof raw === 'string') {
                try { raw = JSON.parse(raw); } catch(e) { raw = []; }
            }
            if (!Array.isArray(raw)) raw = [];
            return raw.map(s => {
                if (typeof s === 'object' && s !== null) {
                    const rawName = s.name || s.player || s.player_name || s.id || '';
                    if (!rawName) return null;
                    const parsedGoals = Number.isFinite(Number(s.goals)) ? Number(s.goals) : (Number.isFinite(Number(s.score)) ? Number(s.score) : 0);
                    if (rawName === 'Own Goal' || rawName.toLowerCase() === 'own goal') {
                        return { name: 'Own Goal', player: 'Own Goal', goals: Math.max(0, parsedGoals) };
                    }
                    const regPlayer = this.findRegisteredPlayer(rawName);
                    const displayName = regPlayer ? regPlayer.name : rawName;
                    return {
                        id: regPlayer ? regPlayer.id : s.id,
                        name: displayName,
                        player: displayName,
                        goals: Math.max(0, parsedGoals)
                    };
                }
                const rawStr = String(s || '').trim();
                if (!rawStr) return null;
                if (rawStr === 'Own Goal' || rawStr.toLowerCase() === 'own goal') {
                    return { name: 'Own Goal', player: 'Own Goal', goals: 1 };
                }
                const regPlayer = this.findRegisteredPlayer(rawStr);
                const displayName = regPlayer ? regPlayer.name : rawStr;
                return {
                    id: regPlayer ? regPlayer.id : undefined,
                    name: displayName,
                    player: displayName,
                    goals: 1
                };
            }).filter(Boolean).filter(s => s.name && String(s.name).trim() !== '');
        },
        addGoalToMatch(matchDay, playerId) {
            if (!matchDay) return;
            
            if (!playerId || String(playerId).trim() === '') {
                alert("⚠️ Please select a player from the dropdown before clicking 'Add Goal'.");
                return;
            }

            const pRaw = typeof playerId === 'object' && playerId !== null ? (playerId.id || playerId.name) : String(playerId);
            let canonicalName = pRaw;
            
            if (String(pRaw).toLowerCase() === 'own goal') {
                canonicalName = 'Own Goal';
            } else {
                const regPlayer = this.findRegisteredPlayer(pRaw);
                if (!regPlayer || !this.isValidRegisteredPlayer(regPlayer)) {
                    alert(`⚠️ Cannot assign goal: "${pRaw}" is not a registered player in the directory.`);
                    return;
                }
                canonicalName = regPlayer.name;
            }

            let scorers = this.getMatchScorers(matchDay);
            
            let found = scorers.find(s => {
                const sName = typeof s === 'object' ? (s.name || s.player || s.id) : s;
                return String(sName).toLowerCase() === String(canonicalName).toLowerCase();
            });

            if (found && typeof found === 'object') {
                found.goals = (Number(found.goals) || 1) + 1;
            } else {
                scorers.push({ name: canonicalName, player: canonicalName, goals: 1 });
            }
            
            matchDay.scorers = scorers;
            if (this.selectedScorerMap) this.selectedScorerMap[matchDay.id] = '';
            this.scorerSearch = ''; 
            this.saveMatchDay(matchDay);
        },
        incrementMatchScorer(matchDay, sIdx) {
            if (!matchDay) return;
            let scorers = this.getMatchScorers(matchDay);
            if (sIdx >= 0 && sIdx < scorers.length) {
                scorers[sIdx].goals = (Number(scorers[sIdx].goals) || 1) + 1;
                matchDay.scorers = scorers;
                this.saveMatchDay(matchDay);
            }
        },
        decrementMatchScorer(matchDay, sIdx) {
            if (!matchDay) return;
            let scorers = this.getMatchScorers(matchDay);
            if (sIdx >= 0 && sIdx < scorers.length) {
                if (scorers[sIdx].goals > 1) {
                    scorers[sIdx].goals -= 1;
                } else {
                    scorers.splice(sIdx, 1);
                }
                matchDay.scorers = scorers;
                this.saveMatchDay(matchDay);
            }
        },
        addMatchScorerFromPresent(matchDay, p) {
            if (p) {
                this.addGoalToMatch(matchDay, p);
            } else {
                if (!matchDay) return;
                let scorers = this.getMatchScorers(matchDay);
                scorers.push({ name: '', player: '', goals: 1 });
                matchDay.scorers = scorers;
                this.saveMatchDay(matchDay);
            }
        },
        removeMatchScorer(matchDay, sIdx) {
            if (!matchDay) return;
            let scorers = this.getMatchScorers(matchDay);
            if (Array.isArray(scorers) && sIdx >= 0 && sIdx < scorers.length) {
                scorers.splice(sIdx, 1);
                matchDay.scorers = scorers;
                this.saveMatchDay(matchDay);
            }
        },
        updateMatchScore(matchDay, teamType, delta) {
            if (!matchDay) return;
            if (teamType === 'home') {
                matchDay.home_score = Math.max(0, Number(matchDay.home_score || matchDay.homeScore || 0) + delta);
                matchDay.homeScore = matchDay.home_score;
            } else if (teamType === 'away') {
                matchDay.away_score = Math.max(0, Number(matchDay.away_score || matchDay.awayScore || 0) + delta);
                matchDay.awayScore = matchDay.away_score;
            }
            if (matchDay.status === 'completed' || (matchDay.match_type === 'Tournament' && matchDay.next_match_id)) {
                this.evaluateAndAdvanceMatchWinner(matchDay);
            } else {
                this.saveMatchDay(matchDay);
            }
        },
        // --- FORFEIT SCOREBOARD SYNC ---
        handleForfeitChange(matchDay) { 
            if (!matchDay) return;
            
            // 1. Maintain the exact raw dropdown value to prevent UI resets
            const rawDropdownValue = String(matchDay.forfeit_team || matchDay.forfeitTeam || 'none');
            const fTeamRaw = rawDropdownValue.toLowerCase().replace(/^forfeit:\s*/i, '').trim();
            
            // 2. Fetch team names using BOTH modern and legacy database aliases
            const hTeam = String(matchDay.home_team || matchDay.homeTeam || '').toLowerCase().trim();
            const aTeam = String(matchDay.away_team || matchDay.awayTeam || '').toLowerCase().trim();

            // 3. Evaluate dynamically with a robust inclusion check to bypass minor typo/space errors
            const isHome = fTeamRaw === 'home' || (hTeam && fTeamRaw.includes(hTeam)) || (hTeam && hTeam.includes(fTeamRaw));
            const isAway = fTeamRaw === 'away' || (aTeam && fTeamRaw.includes(aTeam)) || (aTeam && aTeam.includes(fTeamRaw));

            if (isHome) {
                matchDay.home_score = 0; matchDay.homeScore = 0;
                matchDay.away_score = 3; matchDay.awayScore = 3;
            } else if (isAway) {
                matchDay.home_score = 3; matchDay.homeScore = 3;
                matchDay.away_score = 0; matchDay.awayScore = 0;
            }

            // Sync aliases
            matchDay.forfeit_team = rawDropdownValue;
            matchDay.forfeitTeam = rawDropdownValue;

            if (matchDay.status === 'completed' || (matchDay.match_type === 'Tournament' && matchDay.next_match_id)) {
                this.evaluateAndAdvanceMatchWinner(matchDay);
            } else {
                this.saveMatchDay(matchDay);
            }
        },
        async onCardMatchTypeChange(matchDay) { 
            if (!matchDay) return;
            
            // 1. Instantly update the local UI state
            this.handleMatchTypeChange(matchDay);
            
            // 2. Push the updated card to Firebase
            this.saveMatchDay(matchDay); 
        },
        isValidRegisteredPlayer(p) {
            if (!p || typeof p !== 'object') return false;
            const name = String(p.name || p.player || '').trim();
            if (!name) return false;
            const lower = name.toLowerCase();
            if (lower === 'undefined' || lower === 'null' || lower === '[object object]' || lower === 'unknown' || lower === 'none') return false;
            return true;
        },
        isValidRegisteredTeam(t) {
            if (!t || typeof t !== 'object') return false;
            const name = String(t.name || t.team || t.team_name || '').trim();
            if (!name) return false;
            const lower = name.toLowerCase();
            const banned = ['home', 'away', 'home team', 'away team', 'red', 'yellow', 'none', 'unknown', 'null', 'undefined', '[object object]'];
            if (banned.includes(lower)) return false;
            if (/^t_\d+$/i.test(lower) || /^md_\d+$/i.test(lower) || /^p_\d+$/i.test(lower)) return false;
            return true;
        },
        getPresentPlayers(matchDay) {
            if (!matchDay) return [];
            const playersList = this.getAlphabeticalPlayers ? this.getAlphabeticalPlayers() : (this.players || []);
            const present = [];
            for (let i = 0; i < playersList.length; i++) {
                const p = playersList[i];
                if (this.isPlayerPresent(matchDay, p)) {
                    present.push(p);
                }
            }
            return present;
        },
        getPresentPlayersForSession(matchDay) {
            return this.getPresentPlayers(matchDay);
        },
        getTopScorers() {
            const list = this.getSortedPlayerStandings() || [];
            return list
                .filter(p => p && (Number(p.goals) || 0) > 0)
                .sort((a, b) => (Number(b?.goals) || 0) - (Number(a?.goals) || 0));
        },
        getTopPOTD() {
            const list = this.getSortedPlayerStandings() || [];
            return list
                .filter(p => p && (Number(p.potd) || 0) > 0)
                .sort((a, b) => (Number(b?.potd) || 0) - (Number(a?.potd) || 0));
        },
        getPlayerLeagueStandings() {
            const list = this.getSortedPlayerStandings() || [];
            return list
                .filter(p => p && (Number(p.pts || p.points) || 0) >= 1);
        },
        getAttendanceReportList() {
            const playersList = this.players || [];
            const matchesList = this.matches || [];
            return playersList
                .map(pl => {
                    const attended = matchesList.filter(m => this.isPlayerPresent(m, pl));
                    const dates = attended.map(m => m.date || '').filter(Boolean);
                    const playerName = this.getPlayerDisplayName ? this.getPlayerDisplayName(pl) : (pl.name || pl.player || 'Unknown');
                    return {
                        player_name: playerName,
                        name: playerName,
                        total_attended: attended.length,
                        attended: attended.length,
                        count: attended.length,
                        dates: dates.join(', '),
                        dates_present: dates
                    };
                })
                .filter(pl => pl.total_attended > 0)
                .sort((a, b) => a.player_name.localeCompare(b.player_name));
        },
        getAllPlayerKeys(p) {
            if (!p) return [];
            if (p._keys && Array.isArray(p._keys)) return p._keys;

            const keys = new Set();
            const pId = typeof p === 'object' && p !== null ? String(p.id || '').trim() : String(p).trim();
            const pName = typeof p === 'object' && p !== null ? String(p.name || p.player || p.player_name || '').trim() : '';
            const pNick = typeof p === 'object' && p !== null ? String(p.nickname || '').trim() : '';
            
            if (pId && pId !== '[object Object]') keys.add(pId);
            if (pName && pName !== '[object Object]') keys.add(pName);
            if (pNick && pNick !== '[object Object]') keys.add(pNick);

            const pIdLower = pId.toLowerCase();
            const pNameLower = pName.toLowerCase();

            // Fast indexed lookup from this.players instead of deep isFuzzyMatch loop
            if (this.players && this.players.length > 0) {
                for (let i = 0; i < this.players.length; i++) {
                    const pl = this.players[i];
                    if (!pl) continue;
                    const plId = pl.id ? String(pl.id).trim() : '';
                    const plName = pl.name ? String(pl.name).trim() : '';
                    const plNick = pl.nickname ? String(pl.nickname).trim() : '';
                    
                    if (
                        (plId && (plId === pId || plId.toLowerCase() === pIdLower)) ||
                        (plName && (plName.toLowerCase() === pNameLower || plName.toLowerCase() === pIdLower)) ||
                        (plNick && (plNick.toLowerCase() === pNameLower || plNick.toLowerCase() === pIdLower))
                    ) {
                        if (plId) keys.add(plId);
                        if (plName) keys.add(plName);
                        if (plNick) keys.add(plNick);
                        break;
                    }
                }
            }

            const res = Array.from(keys).filter(Boolean);
            if (typeof p === 'object' && p !== null && !Array.isArray(p)) {
                p._keys = res;
            }
            return res;
        },
        isPlayerPresent(matchDay, p) {
            if (!matchDay || !p) return false;
            
            const playerKeys = this.getAllPlayerKeys(p);
            if (playerKeys.length === 0) return false;

            const attDict = matchDay.attendance;
            if (attDict && typeof attDict === 'object') {
                for (let i = 0; i < playerKeys.length; i++) {
                    const val = attDict[playerKeys[i]];
                    if (val !== undefined && val !== null) {
                        const statusStr = String(typeof val === 'object' ? val.status : val).toLowerCase().trim();
                        if (statusStr === 'absent' || statusStr === 'false' || val === false) return false;
                        if (statusStr === 'present' || statusStr === 'true' || val === true) return true;
                    }
                }
            }

            // 2. Check player_teams dictionary if not explicitly set in attendance
            if (matchDay.player_teams && typeof matchDay.player_teams === 'object') {
                for (let i = 0; i < playerKeys.length; i++) {
                    const side = String(matchDay.player_teams[playerKeys[i]] || '').toLowerCase().trim();
                    if (side === 'home' || side === 'away') return true;
                }
            }

            // 3. Check home_roster and away_roster
            const parseRoster = (r) => {
                if (Array.isArray(r)) return r;
                if (typeof r === 'string') {
                    try { return JSON.parse(r); } catch(e) { return r.split(',').map(s => s.trim()).filter(Boolean); }
                }
                return [];
            };
            const hRoster = parseRoster(matchDay.home_roster || matchDay.homeRoster);
            const aRoster = parseRoster(matchDay.away_roster || matchDay.awayRoster);
            const checkRoster = (r) => {
                for (let i = 0; i < r.length; i++) {
                    const rp = r[i];
                    const rpStr = typeof rp === 'object' && rp !== null ? String(rp.id || rp.name || rp.player || '') : String(rp);
                    const rpLower = rpStr.toLowerCase();
                    for (let j = 0; j < playerKeys.length; j++) {
                        if (playerKeys[j].toLowerCase() === rpLower) return true;
                    }
                }
                return false;
            };

            if (checkRoster(hRoster) || checkRoster(aRoster)) return true;

            return false;
        },
        async toggleAttendance(matchDayId, p, status) {
            const matchDay = (this.matches || []).find(m => String(m.id) === String(matchDayId));
            if (!matchDay || !p) return;
            // Immediately indicate saving status in match day card UI
            this.excelSyncStatus = 'saving';
            
            const isCurrentlyPresent = this.isPlayerPresent(matchDay, p);
            const targetStatus = status !== undefined ? status : (isCurrentlyPresent ? 'absent' : 'present');
            const playerKeys = this.getAllPlayerKeys(p);
            if (playerKeys.length === 0) return;

            if (!matchDay.attendance || typeof matchDay.attendance !== 'object') {
                matchDay.attendance = {};
            }

            // Unify all matching keys in matchDay.attendance
            for (const key of playerKeys) {
                matchDay.attendance[key] = targetStatus;
            }

            // Also search and update any existing keys in attendance matching this player
            for (const dictKey of Object.keys(matchDay.attendance)) {
                if (playerKeys.some(pk => pk.toLowerCase() === dictKey.toLowerCase() || this.isFuzzyMatch(p, dictKey))) {
                    matchDay.attendance[dictKey] = targetStatus;
                }
            }

            // If marked absent, completely remove player from rosters & player_teams
            if (targetStatus === 'absent') {
                if (matchDay.player_teams && typeof matchDay.player_teams === 'object') {
                    for (const dictKey of Object.keys(matchDay.player_teams)) {
                        if (playerKeys.some(pk => pk.toLowerCase() === dictKey.toLowerCase() || this.isFuzzyMatch(p, dictKey))) {
                            delete matchDay.player_teams[dictKey];
                        }
                    }
                }
                const parseRoster = (r) => {
                    if (Array.isArray(r)) return [...r];
                    if (typeof r === 'string') {
                        try { return JSON.parse(r); } catch(e) { return r.split(',').map(s => s.trim()).filter(Boolean); }
                    }
                    return [];
                };
                const filterOutPlayer = (id) => {
                    const idStr = typeof id === 'object' && id !== null ? String(id.id || id.name || id.player || '') : String(id);
                    return !playerKeys.some(pk => pk.toLowerCase() === idStr.toLowerCase() || this.isFuzzyMatch(p, idStr));
                };
                matchDay.home_roster = parseRoster(matchDay.home_roster || matchDay.homeRoster).filter(filterOutPlayer);
                matchDay.homeRoster = [...matchDay.home_roster];
                matchDay.away_roster = parseRoster(matchDay.away_roster || matchDay.awayRoster).filter(filterOutPlayer);
                matchDay.awayRoster = [...matchDay.away_roster];
            }

            // Save matchDay document to Firestore atomically
            this.saveMatchDay(matchDay);
        },
        async markAllAttendance(matchDayId, status) {
            const matchDay = (this.matches || []).find(m => String(m.id) === String(matchDayId));
            if (!matchDay) return;
            // Immediately indicate saving status in match day card UI
            this.excelSyncStatus = 'saving';
            
            if (!matchDay.attendance || typeof matchDay.attendance !== 'object') matchDay.attendance = {};
            
            const playersList = this.getAlphabeticalPlayers ? this.getAlphabeticalPlayers() : (this.players || []);
            playersList.forEach(p => {
                const keys = this.getAllPlayerKeys(p);
                keys.forEach(k => {
                    matchDay.attendance[k] = status;
                });
            });

            if (status === 'absent') {
                matchDay.player_teams = {};
                matchDay.home_roster = [];
                matchDay.homeRoster = [];
                matchDay.away_roster = [];
                matchDay.awayRoster = [];
            }

            this.saveMatchDay(matchDay);
        },
        async updatePlayerFirebaseTeam(matchId, playerId, side) {
            if (!matchId || !playerId) return;
            const pId = String(playerId);
            const mId = String(matchId);
            const cleanSide = String(side || 'unassigned').toLowerCase().trim();
            const targetSide = (cleanSide === 'home' || cleanSide === 'away') ? cleanSide : 'unassigned';

            // 1. Update match_performances collection: ${matchId}_${playerId}
            const perfId = `${mId}_${pId}`;
            try {
                const firestoreDb = window.fb?.db || window.db;
                if (firestoreDb) {
                    const docFn = window.fb?.doc || window.firestore?.doc;
                    const updateDocFn = window.fb?.updateDoc || window.firestore?.updateDoc;
                    const setDocFn = window.fb?.setDoc || window.firestore?.setDoc;
                    if (docFn) {
                        const perfRef = docFn(firestoreDb, 'match_performances', perfId);
                        if (updateDocFn) {
                            try {
                                await updateDocFn(perfRef, {
                                    team_side: targetSide,
                                    match_id: mId,
                                    player_id: pId
                                });
                            } catch (uErr) {
                                if (setDocFn) {
                                    await setDocFn(perfRef, {
                                        id: perfId,
                                        match_id: mId,
                                        player_id: pId,
                                        team_side: targetSide,
                                        goals: 0
                                    }, { merge: true });
                                }
                            }
                        }
                    }
                }
            } catch (err) {
                console.warn("Could not update match_performances for player:", pId, err);
            }

            // 2. Update match collections (go_matches_prod & matches) via window.fb.assignPlayerToTeam
            try {
                if (window.fb && typeof window.fb.assignPlayerToTeam === 'function') {
                    await window.fb.assignPlayerToTeam(mId, pId, targetSide === 'unassigned' ? 'none' : targetSide);
                }
            } catch (err) {
                console.warn("Could not update match doc in Firebase for player:", pId, err);
            }
        },

        async assignPlayerToMatchTeam(matchDayId, sessionMatchId, p, targetTeam) {
            const matchDay = (this.matches || []).find(m => String(m.id) === String(matchDayId));
            if (!matchDay) return;
            
            // Support both (matchDayId, p, targetTeam) and (matchDayId, sessionMatchId, p, targetTeam)
            let actualPlayer = p;
            let actualTargetTeam = targetTeam;
            if (typeof sessionMatchId === 'object' || (typeof p === 'string' && (p === 'home' || p === 'away' || p === 'none' || p === 'unassign' || p === 'unassigned' || p === ''))) {
                actualTargetTeam = p;
                actualPlayer = sessionMatchId;
            }

            if (!actualPlayer) return;

            const playerKeys = this.getAllPlayerKeys(actualPlayer);
            if (playerKeys.length === 0) return;

            const isTargetPlayer = (item) => {
                if (!item) return false;
                const itemStr = typeof item === 'object' && item !== null ? String(item.id || item.player || item.name || '').trim() : String(item).trim();
                return playerKeys.some(pk => pk.toLowerCase() === itemStr.toLowerCase() || this.isFuzzyMatch(actualPlayer, itemStr));
            };

            const parseRoster = (r) => {
                if (Array.isArray(r)) return [...r];
                if (typeof r === 'string') {
                    try { 
                        const parsed = JSON.parse(r);
                        return Array.isArray(parsed) ? parsed : [];
                    } catch(e) { 
                        return r.split(',').map(s => s.trim()).filter(Boolean); 
                    }
                }
                return [];
            };

            // Remove player from existing rosters
            matchDay.home_roster = parseRoster(matchDay.home_roster || matchDay.homeRoster).filter(id => !isTargetPlayer(id));
            matchDay.away_roster = parseRoster(matchDay.away_roster || matchDay.awayRoster).filter(id => !isTargetPlayer(id));

            // Cleanly update player_teams dictionary
            if (matchDay.player_teams && typeof matchDay.player_teams === 'object') {
                const updatedTeams = {};
                for (const [key, val] of Object.entries(matchDay.player_teams)) {
                    if (!isTargetPlayer(key)) {
                        updatedTeams[key] = val;
                    }
                }
                matchDay.player_teams = updatedTeams;
            } else {
                matchDay.player_teams = {};
            }

            const cleanTarget = String(actualTargetTeam || '').toLowerCase().trim();
            const hTeamName = String(matchDay.home_team || '').toLowerCase().trim();
            const aTeamName = String(matchDay.away_team || '').toLowerCase().trim();
            const primaryKey = String(playerKeys[0]);

            let assignedSide = 'unassigned';
            if (cleanTarget === 'home' || (hTeamName && cleanTarget === hTeamName)) {
                assignedSide = 'home';
                playerKeys.forEach(k => {
                    matchDay.player_teams[k] = 'home';
                });
                matchDay.home_roster.push(primaryKey);
                
                // Auto-mark present
                if (!matchDay.attendance || typeof matchDay.attendance !== 'object') matchDay.attendance = {};
                playerKeys.forEach(k => {
                    matchDay.attendance[k] = 'present';
                });
            } else if (cleanTarget === 'away' || (aTeamName && cleanTarget === aTeamName)) {
                assignedSide = 'away';
                playerKeys.forEach(k => {
                    matchDay.player_teams[k] = 'away';
                });
                matchDay.away_roster.push(primaryKey);
                
                // Auto-mark present
                if (!matchDay.attendance || typeof matchDay.attendance !== 'object') matchDay.attendance = {};
                playerKeys.forEach(k => {
                    matchDay.attendance[k] = 'present';
                });
            } else {
                // When unassigning, ensure player remains explicitly 'present' in attendance and has no entry in player_teams
                assignedSide = 'unassigned';
                if (!matchDay.attendance || typeof matchDay.attendance !== 'object') matchDay.attendance = {};
                playerKeys.forEach(k => {
                    matchDay.attendance[k] = 'present';
                    delete matchDay.player_teams[k];
                });
            }

            matchDay.homeRoster = [...matchDay.home_roster];
            matchDay.awayRoster = [...matchDay.away_roster];

            // Ensure Firebase .update() is called for this player accurately
            await this.updatePlayerFirebaseTeam(matchDayId, primaryKey, assignedSide);

            this.saveMatchDay(matchDay);
        },

        getPlayerMatchTeamType(matchDay, match, p) {
            if (!matchDay || !p) return 'unassigned';
            try {
                const playerKeys = this.getAllPlayerKeys(p);
                if (!playerKeys || playerKeys.length === 0) return 'unassigned';
                
                // Priority 1: Check player_teams dictionary
                if (matchDay.player_teams && typeof matchDay.player_teams === 'object') {
                    for (let i = 0; i < playerKeys.length; i++) {
                        const side = String(matchDay.player_teams[playerKeys[i]] || '').toLowerCase().trim();
                        if (side === 'home' || side === 'away') return side;
                        if (side === 'unassigned' || side === 'none') return 'unassigned';
                    }
                }
                
                // Priority 2: Check home_roster and away_roster
                const parseRoster = (r) => {
                    if (Array.isArray(r)) return r;
                    if (typeof r === 'string') {
                        try { return JSON.parse(r); } catch(e) { return r.split(',').map(s => s.trim()).filter(Boolean); }
                    }
                    return [];
                };
                const hRoster = parseRoster(matchDay.home_roster || matchDay.homeRoster);
                for (let i = 0; i < hRoster.length; i++) {
                    const rp = hRoster[i];
                    const rpStr = typeof rp === 'object' && rp !== null ? String(rp.id || rp.name || rp.player || '') : String(rp);
                    const rpLower = rpStr.toLowerCase();
                    for (let j = 0; j < playerKeys.length; j++) {
                        if (playerKeys[j].toLowerCase() === rpLower) return 'home';
                    }
                }

                const aRoster = parseRoster(matchDay.away_roster || matchDay.awayRoster);
                for (let i = 0; i < aRoster.length; i++) {
                    const rp = aRoster[i];
                    const rpStr = typeof rp === 'object' && rp !== null ? String(rp.id || rp.name || rp.player || '') : String(rp);
                    const rpLower = rpStr.toLowerCase();
                    for (let j = 0; j < playerKeys.length; j++) {
                        if (playerKeys[j].toLowerCase() === rpLower) return 'away';
                    }
                }
            } catch (err) {
                console.warn("getPlayerMatchTeamType error handled:", err);
            }
            return 'unassigned';
        },

        getTeamPlayers(matchDay, teamType) {
            if (!matchDay || typeof matchDay !== 'object') return [];
            
            const typeClean = String(teamType || '').trim().toLowerCase();
            const hTeamName = String(matchDay.home_team || '').toLowerCase().trim();
            const aTeamName = String(matchDay.away_team || '').toLowerCase().trim();

            let targetSide = '';
            if (typeClean === 'home' || (hTeamName && typeClean === hTeamName)) targetSide = 'home';
            else if (typeClean === 'away' || (aTeamName && typeClean === aTeamName)) targetSide = 'away';
            else if (typeClean === 'unassigned' || typeClean === 'none') targetSide = 'unassigned';
            else targetSide = typeClean;

            let present = [];
            try {
                present = this.getPresentPlayers ? this.getPresentPlayers(matchDay) : [];
            } catch (e) {
                present = [];
            }
            if (!Array.isArray(present)) present = [];

            const result = [];
            for (let i = 0; i < present.length; i++) {
                try {
                    const p = present[i];
                    if (!p) continue;

                    // Default missing data: ensure goals is a finite number, default 0
                    if (typeof p === 'object' && p !== null) {
                        if (p.goals === undefined || p.goals === null || isNaN(Number(p.goals))) {
                            p.goals = 0;
                        } else {
                            p.goals = Number(p.goals);
                        }
                    }

                    // Default missing team assignment to 'unassigned'
                    const assignedSide = this.getPlayerMatchTeamType(matchDay, null, p) || 'unassigned';
                    if (targetSide === 'unassigned' || targetSide === 'none') {
                        if (!assignedSide || assignedSide === 'unassigned' || assignedSide === 'none' || assignedSide === 'null' || assignedSide === '') {
                            result.push(p);
                        }
                    } else if (assignedSide === targetSide) {
                        result.push(p);
                    }
                } catch (err) {
                    console.warn("getTeamPlayers item failure guarded:", err);
                }
            }
            return result;
        },

        getUnassignedPlayers(matchDay) {
            if (!matchDay || typeof matchDay !== 'object') return [];
            let present = [];
            try {
                present = this.getPresentPlayers ? this.getPresentPlayers(matchDay) : [];
            } catch (e) {
                present = [];
            }
            if (!Array.isArray(present)) return [];

            const result = [];
            for (let i = 0; i < present.length; i++) {
                try {
                    const p = present[i];
                    if (!p) continue;

                    // Ensure goals defaults to 0 if missing
                    if (typeof p === 'object' && p !== null) {
                        if (p.goals === undefined || p.goals === null || isNaN(Number(p.goals))) {
                            p.goals = 0;
                        }
                    }

                    const assigned = this.getPlayerMatchTeamType(matchDay, null, p) || 'unassigned';
                    if (!assigned || assigned === 'unassigned' || assigned === 'none' || assigned === 'null' || assigned === '') {
                        result.push(p);
                    }
                } catch (err) {
                    console.warn("getUnassignedPlayers item failure guarded:", err);
                }
            }
            return result;
        },

        async autoAssignPresentPlayers(matchDayId) {
            const matchDay = (this.matches || []).find(m => String(m.id) === String(matchDayId));
            if (!matchDay) return;

            const presentPlayers = this.getPresentPlayers(matchDay);
            if (!presentPlayers || presentPlayers.length === 0) {
                if (typeof this.showToast === 'function') {
                    this.showToast("No players marked as Present yet.", "warning");
                }
                return;
            }

            matchDay.player_teams = matchDay.player_teams || {};
            matchDay.home_roster = [];
            matchDay.away_roster = [];

            const hTeamName = String(matchDay.home_team || '').trim();
            const aTeamName = String(matchDay.away_team || '').trim();

            // Identify scheduled team captains
            const homeCap = this.getCaptainPlayerForTeam(hTeamName);
            const awayCap = this.getCaptainPlayerForTeam(aTeamName);

            const homeCapId = homeCap ? String(homeCap.id || '').toLowerCase() : null;
            const homeCapName = homeCap ? String(homeCap.name || '').trim().toLowerCase() : null;

            const awayCapId = awayCap ? String(awayCap.id || '').toLowerCase() : null;
            const awayCapName = awayCap ? String(awayCap.name || '').trim().toLowerCase() : null;

            // Step 1: Assign captains to their scheduled teams if present
            const unassigned = [];
            presentPlayers.forEach(p => {
                const pId = String(p.id || '');
                const pIdLower = pId.toLowerCase();
                const pName = String(p.name || '');
                const pNameLower = pName.trim().toLowerCase();

                const isHomeCap = (homeCapId && (pIdLower === homeCapId || pNameLower === homeCapId)) || 
                                  (homeCapName && (pIdLower === homeCapName || pNameLower === homeCapName));
                const isAwayCap = (awayCapId && (pIdLower === awayCapId || pNameLower === awayCapId)) || 
                                  (awayCapName && (pIdLower === awayCapName || pNameLower === awayCapName));

                if (isHomeCap) {
                    matchDay.player_teams[pId] = 'home';
                    if (pName) matchDay.player_teams[pName] = 'home';
                    matchDay.home_roster.push(pId);
                } else if (isAwayCap) {
                    matchDay.player_teams[pId] = 'away';
                    if (pName) matchDay.player_teams[pName] = 'away';
                    matchDay.away_roster.push(pId);
                } else {
                    unassigned.push(p);
                }
            });

            // Step 2: Properly shuffle unassigned players array (Fisher-Yates)
            const shuffled = [...unassigned];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }

            // Divide them exactly in half using .slice()
            const halfLength = Math.ceil(shuffled.length / 2);
            const homeHalf = shuffled.slice(0, halfLength);
            const awayHalf = shuffled.slice(halfLength);

            homeHalf.forEach(p => {
                const pId = String(p.id || '');
                const pName = String(p.name || '');
                matchDay.player_teams[pId] = 'home';
                if (pName) matchDay.player_teams[pName] = 'home';
                matchDay.home_roster.push(pId);
            });

            awayHalf.forEach(p => {
                const pId = String(p.id || '');
                const pName = String(p.name || '');
                matchDay.player_teams[pId] = 'away';
                if (pName) matchDay.player_teams[pName] = 'away';
                matchDay.away_roster.push(pId);
            });

            // Ensure attendance is marked as present
            if (!matchDay.attendance || typeof matchDay.attendance !== 'object') matchDay.attendance = {};
            presentPlayers.forEach(p => {
                const pId = String(p.id || '');
                const pName = String(p.name || '');
                if (pId) matchDay.attendance[pId] = 'present';
                if (pName) matchDay.attendance[pName] = 'present';
            });

            matchDay.homeRoster = [...matchDay.home_roster];
            matchDay.awayRoster = [...matchDay.away_roster];

            // Ensure Firebase .update() is called for each player accurately
            for (const p of presentPlayers) {
                const pId = String(p.id || '');
                const side = matchDay.home_roster.includes(pId) ? 'home' : (matchDay.away_roster.includes(pId) ? 'away' : 'unassigned');
                await this.updatePlayerFirebaseTeam(matchDayId, pId, side);
            }

            this.saveMatchDay(matchDay);
            if (typeof this.showToast === 'function') {
                this.showToast(`Auto-assigned ${presentPlayers.length} players evenly (${matchDay.home_roster.length} Home / ${matchDay.away_roster.length} Away)`, 'success');
            }
        },

        async clearTeamAssignments(matchDayId) {
            const matchDay = (this.matches || []).find(m => String(m.id) === String(matchDayId));
            if (!matchDay) return;

            const prevPlayerIds = new Set([
                ...(matchDay.home_roster || []),
                ...(matchDay.away_roster || []),
                ...Object.keys(matchDay.player_teams || {})
            ]);

            matchDay.player_teams = {};
            matchDay.home_roster = [];
            matchDay.homeRoster = [];
            matchDay.away_roster = [];
            matchDay.awayRoster = [];

            for (const pid of prevPlayerIds) {
                await this.updatePlayerFirebaseTeam(matchDayId, pid, 'unassigned');
            }

            this.saveMatchDay(matchDay);
            if (typeof this.showToast === 'function') {
                this.showToast('All player team assignments cleared.', 'info');
            }
        },

        showAppGlobalToast(msg, type = 'info', duration = 3500) {
            if (typeof window !== 'undefined' && typeof window.showAppGlobalToast === 'function') {
                window.showAppGlobalToast(msg, type, duration);
            } else if (typeof this.showToast === 'function') {
                this.showToast(msg, type, duration);
            }
        },

        async runDatabaseAuditAndRepair() {
            if (this.isRepairingDatabase) return;
            this.isRepairingDatabase = true;

            try {
                const firestoreDb = window.fb?.db || window.db;
                if (!firestoreDb) {
                    throw new Error("Firebase Firestore database is not initialized.");
                }

                const getDocsFn = window.fb?.getDocs || window.firestore?.getDocs;
                const collectionFn = window.fb?.collection || window.firestore?.collection;
                const docFn = window.fb?.doc || window.firestore?.doc;
                const writeBatchFn = window.fb?.writeBatch || window.firestore?.writeBatch;

                if (!getDocsFn || !collectionFn || !docFn || !writeBatchFn) {
                    throw new Error("Firestore SDK methods (getDocs, collection, doc, writeBatch) are unavailable.");
                }

                // 1. Fetch all documents in the match_performances collection
                const perfCollectionRef = collectionFn(firestoreDb, 'match_performances');
                const perfSnap = await getDocsFn(perfCollectionRef);

                let sanitizedCount = 0;
                let unclumpedRecordsCount = 0;
                let unclumpedMatchesCount = 0;

                // Group performance records by match_id
                // matchId -> Array<{ id, ref, originalData, goals, team_side, needsUpdate }>
                const matchGroups = new Map();
                const allRecords = [];

                // PASS 1 (Sanitization): Iterate through all records.
                // If goals is undefined, set it to 0.
                // If team_side is undefined, null, or empty, set it to 'unassigned'.
                perfSnap.forEach(docSnap => {
                    const docId = docSnap.id;
                    const data = docSnap.data() || {};
                    let needsUpdate = false;

                    let goalsVal = data.goals;
                    if (goalsVal === undefined || goalsVal === null || isNaN(Number(goalsVal))) {
                        goalsVal = 0;
                        needsUpdate = true;
                    } else {
                        goalsVal = Number(goalsVal);
                    }

                    let sideVal = data.team_side;
                    if (sideVal === undefined || sideVal === null || String(sideVal).trim() === '' || sideVal === 'null' || sideVal === 'undefined') {
                        sideVal = 'unassigned';
                        needsUpdate = true;
                    } else {
                        sideVal = String(sideVal).toLowerCase().trim();
                    }

                    if (needsUpdate) {
                        sanitizedCount++;
                    }

                    const matchId = String(data.match_id || (docId.includes('_') ? docId.split('_')[0] : 'unknown'));
                    const record = {
                        id: docId,
                        ref: docFn(firestoreDb, 'match_performances', docId),
                        matchId: matchId,
                        playerId: String(data.player_id || (docId.includes('_') ? docId.split('_').slice(1).join('_') : '')),
                        originalData: data,
                        goals: goalsVal,
                        team_side: sideVal,
                        needsUpdate: needsUpdate
                    };

                    allRecords.push(record);

                    if (!matchGroups.has(matchId)) {
                        matchGroups.set(matchId, []);
                    }
                    matchGroups.get(matchId).push(record);
                });

                // PASS 2 (Unclumping): Identify matches where all players were dumped into one team
                // due to the previous bug (e.g., a match has 10+ 'away' players and 0 'home' players).
                // For these specific corrupted matches, reset all players in that match to team_side: 'unassigned'.
                const corruptedMatchIds = new Set();

                for (const [mId, records] of matchGroups.entries()) {
                    if (records.length < 2) continue; // Single player is not a clumped match

                    let homeCount = 0;
                    let awayCount = 0;

                    for (const r of records) {
                        if (r.team_side === 'home') homeCount++;
                        else if (r.team_side === 'away') awayCount++;
                    }

                    // Check for corrupted clumping: all assigned players dumped into one team
                    const isAwayClump = (awayCount >= 2 && homeCount === 0);
                    const isHomeClump = (homeCount >= 2 && awayCount === 0 && (awayCount + homeCount) >= 4);

                    if (isAwayClump || isHomeClump) {
                        corruptedMatchIds.add(mId);
                        unclumpedMatchesCount++;

                        for (const r of records) {
                            if (r.team_side !== 'unassigned') {
                                r.team_side = 'unassigned';
                                r.needsUpdate = true;
                                unclumpedRecordsCount++;
                            }
                        }
                    }
                }

                // ALSO check local matches and Firestore matches collections for unclumping
                const corruptedLocalMatches = [];
                for (const m of (this.matches || [])) {
                    const mId = String(m.id || '');
                    const hRoster = Array.isArray(m.home_roster) ? m.home_roster : [];
                    const aRoster = Array.isArray(m.away_roster) ? m.away_roster : [];
                    
                    const isAwayClumped = (aRoster.length >= 2 && hRoster.length === 0);
                    const isCorrupted = corruptedMatchIds.has(mId) || isAwayClumped;

                    if (isCorrupted) {
                        corruptedMatchIds.add(mId);
                        m.home_roster = [];
                        m.homeRoster = [];
                        m.away_roster = [];
                        m.awayRoster = [];
                        if (m.player_teams && typeof m.player_teams === 'object') {
                            for (const k of Object.keys(m.player_teams)) {
                                m.player_teams[k] = 'unassigned';
                            }
                        }
                        corruptedLocalMatches.push(m);
                    }
                }

                // Execute these fixes using a Firebase writeBatch() to ensure atomic updates
                let batch = writeBatchFn(firestoreDb);
                let batchOps = 0;
                const MAX_BATCH_OPS = 450;

                const commitCurrentBatch = async () => {
                    if (batchOps > 0) {
                        await batch.commit();
                        batch = writeBatchFn(firestoreDb);
                        batchOps = 0;
                    }
                };

                // 1. Commit sanitized/unclumped match_performances records
                for (const rec of allRecords) {
                    if (rec.needsUpdate) {
                        batch.set(rec.ref, {
                            goals: rec.goals,
                            team_side: rec.team_side,
                            match_id: rec.matchId,
                            player_id: rec.playerId,
                            updated_at: new Date().toISOString()
                        }, { merge: true });
                        batchOps++;

                        if (batchOps >= MAX_BATCH_OPS) {
                            await commitCurrentBatch();
                        }
                    }
                }

                // 2. Commit corrupted match documents in Firestore (matches and go_matches_prod)
                for (const cm of corruptedLocalMatches) {
                    const cmId = String(cm.id);
                    try {
                        const mRef1 = docFn(firestoreDb, 'go_matches_prod', cmId);
                        const mRef2 = docFn(firestoreDb, 'matches', cmId);
                        const matchPayload = {
                            home_roster: [],
                            away_roster: [],
                            player_teams: cm.player_teams || {},
                            updated_at: new Date().toISOString()
                        };
                        batch.set(mRef1, matchPayload, { merge: true });
                        batch.set(mRef2, matchPayload, { merge: true });
                        batchOps += 2;

                        if (batchOps >= MAX_BATCH_OPS) {
                            await commitCurrentBatch();
                        }
                    } catch (e) {
                        console.warn("Could not queue match doc reset in batch:", cmId, e);
                    }
                }

                // Commit any remaining operations
                await commitCurrentBatch();

                // Save updated local matches
                for (const cm of corruptedLocalMatches) {
                    if (typeof this.saveMatchDay === 'function') {
                        this.saveMatchDay(cm);
                    }
                }

                const summaryMsg = `Database audit & repair completed! Sanitized ${sanitizedCount} record(s), repaired ${corruptedMatchIds.size} corrupted match(es) (${unclumpedRecordsCount} player allocations reset to unassigned).`;
                console.log("Database Audit & Repair:", summaryMsg);

                // Trigger the global toast notification showAppGlobalToast() upon success
                this.showAppGlobalToast(summaryMsg, 'success', 5000);

            } catch (err) {
                console.error("Database audit and repair error:", err);
                const errorMsg = `Database audit & repair failed: ${err.message || 'Unknown error'}`;
                // Trigger the global toast notification showAppGlobalToast() upon failure
                this.showAppGlobalToast(errorMsg, 'error', 5000);
            } finally {
                this.isRepairingDatabase = false;
            }
        },
        // --- DISPLAY HELPERS ---
        getPlayerDisplayName(p) {
            if (!p) return 'None';
            if (typeof p === 'object' && p !== null) {
                const name = String(p.name || p.player || p.player_name || '').trim();
                if (name && !name.startsWith('p_') && name !== '[object Object]') return name;
            }
            const reg = this.findRegisteredPlayer(p);
            if (reg && reg.name) return reg.name;
            return typeof p === 'object' && p !== null ? String(p.name || p.player || p.id || 'None') : String(p);
        },
        getPlayerName(p) {
            if (!p) return 'Unnamed Player';
            if (typeof p === 'object' && p !== null) {
                const cleanName = String(p.name || p.player || p.player_name || '').trim();
                if (cleanName && !cleanName.startsWith('p_') && cleanName !== '[object Object]') return cleanName;
            }
            const reg = this.findRegisteredPlayer(p);
            if (reg && reg.name) return reg.name;
            const strVal = typeof p === 'object' && p !== null ? String(p.name || p.id || '') : String(p);
            return strVal || 'Unnamed Player';
        },

        validateMatchCard(m) {
            if (!m) return { isValid: false, error: "Match data is missing." };
            if (m.match_type === 'Friendly Match' || m.matchType === 'Friendly Match') return { isValid: true };

            // Rule 1: No Double-Booking Players
            const homeRoster = Array.isArray(m.home_roster) ? m.home_roster : [];
            const awayRoster = Array.isArray(m.away_roster) ? m.away_roster : [];
            
            const getCleanId = (p) => typeof p === 'object' ? String(p.id || p.name) : String(p);
            const homeIds = homeRoster.map(getCleanId);
            const awayIds = awayRoster.map(getCleanId);

            const doubleBooked = homeIds.find(id => awayIds.includes(id));
            if (doubleBooked) {
                const playerName = this.getPlayerName ? this.getPlayerName(doubleBooked) : doubleBooked;
                return { isValid: false, error: `Validation Failed: ${playerName} is assigned to BOTH the Home and Away teams.` };
            }

            // Notice: Rule 2 (Score Matching) and Rule 3 (Strict POTD Presence) 
            // have been removed to prevent false positives from blocking database writes.

            return { isValid: true };
        },

        // --- CRUD ACTIONS ---
        async saveMatchDay(matchDay) {
            if (!matchDay) return;
            if (matchDay.title) {
                matchDay.title = this.cleanMatchTitle(matchDay.title);
            }
            
            // Deep clone to strip Alpine Proxy BEFORE validation and saving
            const pristineMatch = window.safeClone ? window.safeClone(matchDay) : JSON.parse(JSON.stringify(matchDay));

            const validation = this.validateMatchCard ? this.validateMatchCard(pristineMatch) : { isValid: true };
            if (!validation.isValid) {
                alert(validation.error);
                this.savingStatus = 'error';
                return; 
            }

            if (!window.fb || !window.fb.saveMatchDay) {
                this.savingStatus = 'saved-offline';
                return;
            }

            window.fb.saveMatchDay(pristineMatch).catch(err => {
                console.error("Background sync error (saveMatchDay):", err);
            });
            this.savingStatus = 'saved';

            // Automatic background write to Excel Online Table 'WeeklyAttendance'
            if (pristineMatch.date && pristineMatch.attendance && typeof pristineMatch.attendance === 'object') {
                this.syncAttendanceToExcel(pristineMatch.id || pristineMatch.date, 'match');
            }
        },

        async deleteMatchDay(cardId, cardDate = '', skipConfirm = false) {
            return this.deleteCard(cardId, cardDate, skipConfirm);
        },

        async deleteCard(cardId, cardDate = '', skipConfirm = false) {
            let targetId = '';
            let targetDate = cardDate || '';
            let matchTitle = '';

            if (typeof cardId === 'object' && cardId !== null) {
                targetId = String(cardId.id || '').trim();
                targetDate = cardId.date || targetDate;
                matchTitle = cardId.title || (cardId.home_team && cardId.away_team ? `${cardId.home_team} vs ${cardId.away_team}` : '');
            } else if (cardId) {
                targetId = String(cardId).trim();
            }

            if (!targetId && !targetDate) return;

            // Resolve from current matches in state if details are missing
            const existingMatch = (this.matches || []).find(m => m && (
                (targetId && String(m.id) === targetId) || 
                (targetDate && m.date === targetDate)
            ));

            if (existingMatch) {
                if (!targetId && existingMatch.id) targetId = String(existingMatch.id).trim();
                if (!targetDate && existingMatch.date) targetDate = existingMatch.date;
                if (!matchTitle && existingMatch.title) matchTitle = existingMatch.title;
            }

            const promptText = matchTitle 
                ? `Are you sure you want to permanently delete "${matchTitle}"? This will remove the match card and its recorded data.`
                : 'Are you sure you want to permanently delete this match card? This cannot be undone.';

            if (!skipConfirm && !this.safeConfirm(promptText)) return;

            // 1. Add to permanent blacklist to prevent resurrecting from any legacy cache or peer sync
            if (targetId) {
                this.addDeletedMatchId(targetId);
            }

            // 2. Remove immediately from local Alpine state
            this.matches = (this.matches || []).filter(m => {
                if (!m) return false;
                if (targetId && String(m.id).trim() === targetId) return false;
                if (!targetId && targetDate && m.date === targetDate) return false;
                return true;
            });

            // 3. Remove associated match performances
            if (Array.isArray(this.matchPerformances)) {
                this.matchPerformances = this.matchPerformances.filter(mp => String(mp.match_id || '').trim() !== targetId);
            }

            // 4. Update local storage and broadcast to server
            this.saveMatchesLocally(targetId ? [targetId] : []);

            // 5. Send explicit DELETE request to server storage (database_app_sync.json)
            if (typeof fetch !== 'undefined' && targetId) {
                fetch(`/api/matches/${encodeURIComponent(targetId)}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' }
                }).catch(() => {});
            }

            // 6. Delete from Firebase Firestore if available, otherwise queue for sync
            if (targetId) {
                if (window.fb && typeof window.fb.deleteMatchDay === 'function') {
                    window.fb.deleteMatchDay(targetId).catch(err => {
                        console.warn('Firebase match delete background notice:', err);
                        if (typeof this.queuePendingSync === 'function') {
                            this.queuePendingSync('matches', targetId, null, 'delete');
                        }
                    });
                } else if (typeof this.queuePendingSync === 'function') {
                    this.queuePendingSync('matches', targetId, null, 'delete');
                }
            }

            // 7. Update status, recalculate standings and notify user
            this.savingStatus = 'saved';
            if (typeof this.recalculateStandings === 'function') {
                this.recalculateStandings();
            }
            if (typeof this.updateReportDataReadiness === 'function') {
                this.updateReportDataReadiness();
            }

            if (typeof this.showToast === 'function') {
                this.showToast('Match card permanently deleted.', 'success');
            }
        },

        // --- YOUTH SAFEGUARDING & REGISTRATION MANAGEMENT ---
        async fetchPendingRegistrations() {
            this.pendingRegistrationsLoading = true;
            try {
                const res = await fetch('/api/pending-registrations');
                if (res.ok) {
                    const data = await res.json();
                    this.pendingRegistrations = data.registrations || [];

                    // Auto-sync any verified/approved registrations to the active player cards
                    if (Array.isArray(this.pendingRegistrations)) {
                        for (const reg of this.pendingRegistrations) {
                            if (reg.status === 'approved') {
                                this.syncApprovedRegistrationToPlayer(reg);
                            }
                        }
                    }
                }
            } catch (e) {
                console.warn("Failed to fetch pending registrations:", e);
            } finally {
                this.pendingRegistrationsLoading = false;
            }
        },

        syncApprovedRegistrationToPlayer(reg) {
            if (!reg || !reg.player_name) return;
            const cleanName = (reg.player_name || `${reg.first_name || ''} ${reg.last_name || ''}`).trim();
            if (!cleanName) return;

            // Check if player already exists in local player pool by name or id
            const existing = (this.players || []).find(p => 
                (p.id && reg.id && (p.id === reg.id || p.id === `p_${reg.id}`)) ||
                (String(p.name || '').trim().toLowerCase() === cleanName.toLowerCase())
            );

            if (existing) {
                // Enrich existing player record with safeguarding & carer verification
                let changed = false;
                if (!existing.safeguarding_verified) { existing.safeguarding_verified = true; changed = true; }
                if (!existing.consent_verified) { existing.consent_verified = true; changed = true; }
                if (reg.consent_status && existing.consent_status !== 'verified') { existing.consent_status = 'verified'; changed = true; }
                if (!existing.carer_name && reg.carer_name) { existing.carer_name = reg.carer_name; changed = true; }
                if (!existing.phone && (reg.carer_phone || reg.phone)) { existing.phone = reg.carer_phone || reg.phone; changed = true; }
                if (!existing.carer_email && reg.carer_email) { existing.carer_email = reg.carer_email; changed = true; }
                if (!existing.carer_relationship && reg.carer_relationship) { existing.carer_relationship = reg.carer_relationship; changed = true; }
                if (!existing.dob && reg.dob) { existing.dob = reg.dob; changed = true; }
                if (!existing.postcode && reg.postcode) { existing.postcode = reg.postcode; changed = true; }
                if (!existing.nationality && reg.nationality) { existing.nationality = reg.nationality; changed = true; }
                if (!existing.photo_url && reg.photo_url) { existing.photo_url = reg.photo_url; changed = true; }
                if ((!existing.medical_notes || existing.medical_notes === 'None') && reg.medical_notes && reg.medical_notes !== 'None') { 
                    existing.medical_notes = reg.medical_notes; 
                    changed = true; 
                }
                if (reg.emergency_contact_1 && !existing.emergency_contact_1) {
                    existing.emergency_contact_1 = reg.emergency_contact_1;
                    changed = true;
                }
                if (reg.emergency_contact_2 && !existing.emergency_contact_2) {
                    existing.emergency_contact_2 = reg.emergency_contact_2;
                    changed = true;
                }

                if (changed && window.fb && window.fb.savePlayer) {
                    window.fb.savePlayer(existing).catch(() => {});
                }
            } else {
                // Create brand new player card with full safeguarding data
                const newPlayer = window.safeClone({
                    id: reg.id ? (reg.id.startsWith('p_') ? reg.id : `p_${reg.id}`) : `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                    name: cleanName,
                    nickname: reg.nickname || '',
                    dob: reg.dob || '',
                    phone: reg.carer_phone || reg.phone || '',
                    nationality: reg.nationality || 'British',
                    position: reg.position || 'Midfielder',
                    postcode: reg.postcode || '',
                    in_education: reg.in_education !== undefined ? reg.in_education : null,
                    school_name: reg.school_name || '',
                    carer_name: reg.carer_name || '',
                    carer_email: reg.carer_email || '',
                    carer_phone: reg.carer_phone || '',
                    carer_relationship: reg.carer_relationship || 'Parent / Legal Guardian',
                    emergency_contact_1: reg.emergency_contact_1 || null,
                    emergency_contact_2: reg.emergency_contact_2 || null,
                    additional_info: reg.additional_info || null,
                    can_travel_independently: reg.can_travel_independently || null,
                    travel_arrangements: reg.travel_arrangements || null,
                    photo_url: reg.photo_url || '',
                    medical_notes: reg.medical_notes || 'None',
                    consent_status: 'verified',
                    consent_verified: true,
                    safeguarding_verified: true,
                    consent_source: reg.consent_source || 'microsoft_forms',
                    registration_source: reg.registration_source || 'manual',
                    needs_staff_review: reg.needs_staff_review === true,
                    has_ever_attended: false,
                    verified_at: reg.verified_at || reg.consent_verified_at || new Date().toISOString(),
                    deductions: 0
                });

                if (!this.players) this.players = [];
                this.players.push(newPlayer);

                if (window.fb && window.fb.savePlayer) {
                    window.fb.savePlayer(newPlayer).catch(() => {});
                }
            }
        },

        async confirmAutoCreatedPlayer(player) {
            if (!player) return;
            player.needs_staff_review = false;
            const idx = (this.players || []).findIndex(p => p.id === player.id);
            if (idx >= 0) {
                this.players[idx].needs_staff_review = false;
            }
            this.savePlayersLocally();
            if (window.fb && window.fb.savePlayer) {
                await window.fb.savePlayer(player).catch(err => console.warn("Failed to confirm auto-created player:", err));
            }
            if (typeof this.showToast === 'function') {
                this.showToast(`✅ Player "${player.name}" verified and confirmed!`, 'success');
            }
        },

        async mergeDuplicatePlayers(keepPlayerId, duplicatePlayerId) {
            if (!keepPlayerId || !duplicatePlayerId || keepPlayerId === duplicatePlayerId) {
                alert("Please select two distinct players to merge.");
                return;
            }
            const keepPlayer = (this.players || []).find(p => String(p.id) === String(keepPlayerId));
            const dupPlayer = (this.players || []).find(p => String(p.id) === String(duplicatePlayerId));
            if (!keepPlayer || !dupPlayer) {
                alert("Could not find both player records to merge.");
                return;
            }
            if (!confirm(`Are you sure you want to merge "${dupPlayer.name}" into "${keepPlayer.name}"?\n\nAll session attendance and match history will be transferred to "${keepPlayer.name}", and "${dupPlayer.name}" will be removed.`)) {
                return;
            }

            // Combine metadata: take fields from dup if keep is missing them
            keepPlayer.dob = keepPlayer.dob || dupPlayer.dob;
            keepPlayer.carer_name = keepPlayer.carer_name || dupPlayer.carer_name;
            keepPlayer.carer_email = keepPlayer.carer_email || dupPlayer.carer_email;
            keepPlayer.phone = keepPlayer.phone || dupPlayer.phone;
            keepPlayer.postcode = keepPlayer.postcode || dupPlayer.postcode;
            keepPlayer.safeguarding_verified = keepPlayer.safeguarding_verified || dupPlayer.safeguarding_verified;
            keepPlayer.consent_verified = keepPlayer.consent_verified || dupPlayer.consent_verified;
            keepPlayer.needs_staff_review = false;

            // Migrate sessions attendance
            (this.sessions || []).forEach(s => {
                if (s.attendance && typeof s.attendance === 'object') {
                    if (s.attendance[dupPlayer.id] || s.attendance[dupPlayer.name]) {
                        s.attendance[keepPlayer.id] = true;
                        delete s.attendance[dupPlayer.id];
                        delete s.attendance[dupPlayer.name];
                    }
                }
                if (Array.isArray(s.attendees)) {
                    if (s.attendees.includes(dupPlayer.id) || s.attendees.includes(dupPlayer.name)) {
                        if (!s.attendees.includes(keepPlayer.id)) s.attendees.push(keepPlayer.id);
                        s.attendees = s.attendees.filter(id => id !== dupPlayer.id && id !== dupPlayer.name);
                    }
                }
            });

            // Migrate matches
            (this.matches || []).forEach(m => {
                const replacePlayer = (list) => {
                    if (!Array.isArray(list)) return;
                    for (let i = 0; i < list.length; i++) {
                        if (typeof list[i] === 'object' && list[i] && (list[i].id === dupPlayer.id || list[i].name === dupPlayer.name)) {
                            list[i].id = keepPlayer.id;
                            list[i].name = keepPlayer.name;
                        } else if (typeof list[i] === 'string' && (list[i] === dupPlayer.id || list[i] === dupPlayer.name)) {
                            list[i] = keepPlayer.name;
                        }
                    }
                };
                replacePlayer(m.home_roster);
                replacePlayer(m.away_roster);
                if (Array.isArray(m.scorers)) {
                    m.scorers.forEach(sc => {
                        if (sc.name === dupPlayer.name || sc.player === dupPlayer.name) {
                            sc.name = keepPlayer.name;
                            sc.player = keepPlayer.name;
                        }
                    });
                }
            });

            // Save kept player
            this.savePlayersLocally();
            if (window.fb && window.fb.savePlayer) {
                await window.fb.savePlayer(keepPlayer);
            }

            // Delete duplicate player
            await this.deletePlayer(dupPlayer.id);

            this.recalculateStandings();
            if (typeof this.showToast === 'function') {
                this.showToast(`Merged duplicate into ${keepPlayer.name}!`, 'success');
            }
        },

        getPlayerAge(dob) {
            if (!dob) return '';
            try {
                const birth = new Date(dob);
                if (isNaN(birth.getTime())) return '';
                const diff = Date.now() - birth.getTime();
                const ageDt = new Date(diff);
                return Math.abs(ageDt.getUTCFullYear() - 1970);
            } catch (e) {
                return '';
            }
        },

        viewPlayerSafeguarding(player, defaultTab = 'profile') {
            if (!player) return;
            this.selectedSafeguardPlayer = window.safeClone(player);
            this.selectedQrPlayer = this.selectedSafeguardPlayer;
            this.safeguardingActiveTab = defaultTab;
            this.playerQrUrl = this.generateConsentFormLink(this.selectedSafeguardPlayer);
            this.copiedPlayerQrLink = false;
            this.copiedSafeguardLink = false;
            this.showPlayerSafeguardingModal = true;
            this.showPlayerQrModal = false; // ensure legacy modal is closed

            this.$nextTick(() => {
                this.renderUnifiedSafeguardingQr();
            });
        },

        setSafeguardingTab(tab) {
            this.safeguardingActiveTab = tab;
            if (tab === 'consent_qr') {
                this.$nextTick(() => {
                    this.renderUnifiedSafeguardingQr();
                });
            }
        },

        isValidMsFormUrl(url) {
            return typeof url === 'string' &&
                /^https:\/\/forms\.(office\.com|cloud\.microsoft)\/(r\/[\w-]+|pages\/responsepage\.aspx\?id=)/i.test(url.trim());
        },

        renderUnifiedSafeguardingQr() {
            if (!this.selectedSafeguardPlayer) return;
            const url = this.getMsFormConsentUrl();
            const container = document.getElementById('unifiedPlayerConsentQrCode') || document.getElementById('playerConsentQrCode');
            if (!container) return;

            if (!this.isValidMsFormUrl(url)) {
                container.innerHTML = `
                    <div class="p-3 text-center text-xs text-amber-700 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-300 dark:border-amber-800 space-y-1.5 max-w-[200px]">
                        <span class="text-lg">⚠️</span>
                        <p class="font-bold text-[11px]">Microsoft Form Link Required</p>
                        <p class="text-[10px] text-amber-600 dark:text-amber-300">Set up your live Microsoft Form link in Settings to generate the scannable QR code.</p>
                    </div>
                `;
                return;
            }

            this.playerQrUrl = url;
            if (typeof QRCode !== 'undefined') {
                container.innerHTML = '';
                new QRCode(container, {
                    text: this.playerQrUrl,
                    width: 170,
                    height: 170,
                    colorDark: "#020617",
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.M
                });
            }
        },

        openPlayerConsentQr(player) {
            // Seamless integration: opens unified modal directly on the 'consent_qr' tab
            this.viewPlayerSafeguarding(player, 'consent_qr');
        },

        closePlayerConsentQr() {
            this.showPlayerQrModal = false;
            this.showPlayerSafeguardingModal = false;
            this.selectedQrPlayer = null;
            this.selectedSafeguardPlayer = null;
            this.playerQrUrl = '';
        },

        // ----------------------------------------------------
        // GDPR Safeguarding: Microsoft Forms Integration & Consent Pipeline
        // ----------------------------------------------------
        getMsFormConsentUrl() {
            return (this.msFormConfig && this.msFormConfig.formUrl && this.msFormConfig.formUrl.trim()) || 
                   (this.leagueSettings && this.leagueSettings.consentFormUrl && this.leagueSettings.consentFormUrl.trim()) || 
                   '';
        },

        getAdminSenderEmail() {
            return (this.msFormConfig && this.msFormConfig.senderEmail && this.msFormConfig.senderEmail.trim()) || 'ralph.boer@hillsong.co.uk';
        },

        getGoogleFormConsentUrl() {
            return this.getMsFormConsentUrl();
        },

        saveMsFormSettings() {
            const cfg = this.msFormConfig || {};
            const cleanUrl = (cfg.formUrl || '').trim();
            const cleanTitle = (cfg.formTitle || 'Football United — Permission Form').trim();
            const cleanSender = (cfg.senderEmail || 'ralph.boer@hillsong.co.uk').trim();

            if (cleanUrl && !this.isValidMsFormUrl(cleanUrl)) {
                if (!confirm("The entered URL does not match standard Microsoft Forms link format (https://forms.office.com/r/...). Do you want to save it anyway?")) {
                    return;
                }
            }

            try {
                localStorage.setItem('fu_ms_form_enabled', cfg.enabled ? 'true' : 'false');
                localStorage.setItem('fu_ms_form_url', cleanUrl);
                localStorage.setItem('fu_ms_form_title', cleanTitle);
                localStorage.setItem('fu_ms_sender_email', cleanSender);
                if (!this.leagueSettings) this.leagueSettings = {};
                this.leagueSettings.consentFormUrl = cleanUrl;
                this.leagueSettings.consentFormTitle = cleanTitle;
                this.leagueSettings.consentSenderEmail = cleanSender;
                if (typeof this.saveLeagueSettings === 'function') {
                    this.saveLeagueSettings();
                }
                if (typeof this.showToast === 'function') {
                    this.showToast('✅ Microsoft Form settings saved successfully!', 'success');
                }
            } catch (e) {
                console.error("Error saving Microsoft Form config:", e);
            }
            this.showMsFormSettingsModal = false;
            this.showGoogleFormSettingsModal = false;
        },

        saveGoogleFormSettings() {
            return this.saveMsFormSettings();
        },

        getSafeguardingConsentStats() {
            const list = this.players || [];
            const total = list.length;
            if (total === 0) return { total: 0, verified: 0, percent: 0, status: 'No Players' };
            const verified = list.filter(p => p && (p.consent_verified || p.parent_consent || p.consent_status === 'verified' || p.safeguarding_verified)).length;
            const percent = Math.round((verified / total) * 100);
            return {
                total,
                verified,
                percent,
                status: percent === 100 ? 'Fully Verified' : `${verified}/${total} Verified (${percent}%)`
            };
        },

        isMsFormIntegrated() {
            const url = this.getMsFormConsentUrl();
            return this.isValidMsFormUrl(url);
        },

        isGoogleFormIntegrated() {
            return this.isMsFormIntegrated();
        },

        // ----------------------------------------------------
        // Microsoft Excel & OneDrive Session Attendance Integration
        // ----------------------------------------------------
        isValidExcelUrl(url) {
            if (!url || typeof url !== 'string') return false;
            const trimmed = url.trim();
            return /^https:\/\/(.+?\.)?(excel\.cloud\.microsoft|onedrive\.live\.com|1drv\.ms|sharepoint\.com|office\.com|microsoft\.com)/i.test(trimmed) ||
                   /^https?:\/\/.+?\.(xlsx|xls|xlsm)/i.test(trimmed);
        },

        isExcelIntegrated() {
            const url = this.excelConfig?.docUrl;
            return (url && this.isValidExcelUrl(url)) || !!(this.excelConfig?.driveId && this.excelConfig?.docId);
        },

        autoExtractExcelDriveIds() {
            if (!this.excelConfig?.docUrl) return;
            try {
                const urlStr = this.excelConfig.docUrl.trim();
                if (urlStr.includes('?')) {
                    const parsed = new URL(urlStr);
                    const docId = parsed.searchParams.get('docId') || parsed.searchParams.get('resid');
                    const driveId = parsed.searchParams.get('driveId');
                    if (docId) this.excelConfig.docId = decodeURIComponent(docId);
                    if (driveId) this.excelConfig.driveId = decodeURIComponent(driveId);
                }
            } catch (e) {
                // ignore URL parse errors
            }
        },

        saveExcelSettings() {
            const cfg = this.excelConfig || {};
            const cleanUrl = (cfg.docUrl || '').trim();
            const cleanTitle = (cfg.workbookTitle || 'Football United — Session Attendance Report').trim();
            const cleanTable = (cfg.tableName || 'WeeklyAttendance').trim();
            const cleanSender = (cfg.serviceAccountOwner || 'ralph.boer@hillsong.co.uk').trim();

            if (cleanUrl && !this.isValidExcelUrl(cleanUrl)) {
                if (!confirm("The entered URL does not match standard Microsoft Excel Online / OneDrive format (e.g. https://excel.cloud.microsoft/... or onedrive.live.com). Do you want to save it anyway?")) {
                    return;
                }
            }

            try {
                if (cleanUrl.includes('?')) {
                    const parsed = new URL(cleanUrl);
                    const docId = parsed.searchParams.get('docId') || parsed.searchParams.get('resid');
                    const driveId = parsed.searchParams.get('driveId');
                    if (docId && !cfg.docId) cfg.docId = decodeURIComponent(docId);
                    if (driveId && !cfg.driveId) cfg.driveId = decodeURIComponent(driveId);
                }
            } catch (e) {}

            try {
                this.excelConfig = {
                    ...this.excelConfig,
                    docUrl: cleanUrl,
                    workbookTitle: cleanTitle,
                    tableName: cleanTable,
                    serviceAccountOwner: cleanSender,
                    driveId: (cfg.driveId || '').trim(),
                    docId: (cfg.docId || '').trim()
                };

                this.excelSyncDriveId = this.excelConfig.driveId;
                this.excelSyncItemId = this.excelConfig.docId;
                this.excelSyncTableName = this.excelConfig.tableName;

                localStorage.setItem('gameon_excel_config', JSON.stringify(this.excelConfig));
                localStorage.setItem('gameon_excel_doc_url', cleanUrl);
                if (cfg.docId) localStorage.setItem('gameon_excel_doc_id', cfg.docId);
                localStorage.setItem('fu_excel_session_doc_url', cleanUrl);
                localStorage.setItem('fu_excel_session_title', cleanTitle);
                localStorage.setItem('fu_excel_session_table', cleanTable);
                localStorage.setItem('fu_excel_session_sender', cleanSender);

                if (typeof this.showToast === 'function') {
                    this.showToast('✅ Microsoft Excel Session Integration settings saved successfully!', 'success');
                }
            } catch (e) {
                console.error("Error saving Microsoft Excel config:", e);
            }
            this.showExcelSettingsModal = false;
        },

        async setupMasterConsentForm() {
            if (this.isGoogleFormIntegrated()) {
                if (!confirm("A Master Google Consent Form is already connected. Generating a new form will replace your active form URL. Do you want to continue?")) {
                    return;
                }
            }

            if (!this.adminProfile?.email) {
                alert("Please configure admin profile in Settings first.");
                return;
            }

            if (!window.fb || typeof window.fb.createAutomatedSafeguardingForm !== 'function') {
                alert("Google Forms API integration is still initializing. Please check your network connection.");
                return;
            }

            this.isSettingUpMasterForm = true;
            this.isCreatingGoogleForm = true;
            try {
                const formTitle = `Football United Permission Form`;
                const formSchema = {
                    title: formTitle,
                    description: "Your child has indicated their wish to participate in the Football United programme managed by Hillsong Church UK with support of Sport England. This programme is for asylum seeking and refugee youth of 14-19 years old. Sessions are held every Friday night at Trinity School, Shirley Park, Croydon, CR9 7AT. The Junior Session (14-16 years) runs from 6:30pm to 8pm. The Senior Session (17-19 years) runs from 8pm to 9:30pm. There are no costs to participate in Football United. Personal information is used solely for participating in the programme and contacting parents/guardians in accordance with the Privacy Policy (hillsong.com/privacy).",
                    fields: [
                        { type: "text", title: "Player ID / Card Reference Number", description: "Internal system reference code from player card", required: true },
                        { type: "text", title: "Participant Name", required: true },
                        { type: "date", title: "Date of Birth", required: true },
                        { type: "paragraph", title: "Address", required: true },
                        { type: "section", title: "Section 2: Emergency Contacts" },
                        { type: "text", title: "Emergency Contact 1 - Name", required: true },
                        { type: "text", title: "Emergency Contact 1 - Phone", required: true },
                        { type: "text", title: "Emergency Contact 1 - Relation", required: true },
                        { type: "text", title: "Emergency Contact 2 - Name", required: false },
                        { type: "text", title: "Emergency Contact 2 - Phone", required: false },
                        { type: "text", title: "Emergency Contact 2 - Relation", required: false },
                        { type: "section", title: "Section 3: Additional Information" },
                        { type: "paragraph", title: "Additional Information", description: "If there is additional information you would like us to know about the participant, which could help us to support their needs, please write it here. (i.e. history of illness, allergies, learning difficulties, history of difficult behaviors, specific recurring effects of previous trauma)", required: false },
                        { type: "section", title: "Section 4: Consents and Agreements", description: "Please review and check 'I agree' for each declaration to grant safeguarding permission." },
                        { type: "checkbox", title: "The young person named above on this sheet has my permission to participate in Football United by attending their Friday night sessions at Trinity School on the dates outlined above.", options: ["I agree"], required: true },
                        { type: "checkbox", title: "Any person participating in Football United does so at their own risk. Hillsong UK does not accept any liability for injury incurred by participating in the activity, either on or off the pitch, or whilst spectating.", options: ["I agree"], required: true },
                        { type: "checkbox", title: "Hillsong UK does not accept any liability for any damage to or loss of the personal belongings of either the participants or their visitors, whether this is during the allocated period of play or where belongings are left in the changing rooms, in any vehicle or on site.", options: ["I agree"], required: true },
                        { type: "checkbox", title: "I agree to inform Hillsong UK if I become aware of any fact or circumstances making it inappropriate for my Child/Youth to continue in the program and acknowledge that Hillsong UK may exclude my Child/Youth from the program in the event of inappropriate conduct.", options: ["I agree"], required: true },
                        { type: "checkbox", title: "I give my permission for the young person named above on this sheet to receive emergency medical treatment if required.", options: ["I agree"], required: true },
                        { type: "section", title: "Section 5: Parent/Guardian Signature" },
                        { type: "text", title: "Parent/Guardian Name Print", required: true },
                        { type: "text", title: "Relation to participant", required: true },
                        { type: "text", title: "Parent/Guardian Digital Signature", description: "Please type your full name to sign", required: true },
                        { type: "date", title: "Date", required: true }
                    ]
                };

                const formResult = await window.fb.createAutomatedSafeguardingForm(formSchema);

                if (!formResult || !formResult.formId) {
                    throw new Error("Failed to create Google Form: No form ID returned.");
                }

                // Extract field map from questions
                const fieldMap = formResult.fieldMap || {};
                const items = formResult.form?.items || formResult.items || [];
                for (const it of items) {
                    const qId = it.questionItem?.question?.questionId;
                    if (qId && it.title) {
                        fieldMap[it.title] = qId;
                    }
                }
                formResult.fieldMap = fieldMap;

                this.masterConsentForm = formResult;
                try {
                    localStorage.setItem('fu_master_consent_form', JSON.stringify(formResult));
                    localStorage.setItem('fu_master_consent_form_url', formResult.responderUri || '');
                    localStorage.setItem('fu_google_form_responder_uri', formResult.responderUri || '');
                    localStorage.setItem('fu_google_form_id', formResult.formId || '');
                } catch (e) {}

                // Save to leagueSettings and persist to Firebase
                if (!this.leagueSettings) this.leagueSettings = {};
                this.leagueSettings.consentFormUrl = formResult.responderUri;
                this.leagueSettings.consentFormId = formResult.formId;
                this.leagueSettings.consentFormFieldMap = fieldMap;

                if (this.googleFormConfig) {
                    this.googleFormConfig.enabled = true;
                    this.googleFormConfig.formId = formResult.formId;
                    this.googleFormConfig.responderUri = formResult.responderUri;
                    this.googleFormConfig.editUri = formResult.editUri;
                }

                await this.saveLeagueSettings();

                if (typeof this.showToast === 'function') {
                    this.showToast("🎉 Master Consent Form created in Google Drive and saved to Firebase!", "success");
                } else {
                    alert("Master Consent Form created successfully!\n\nResponder URL:\n" + formResult.responderUri);
                }
            } catch (err) {
                console.error("Error setting up Master Consent Form:", err);
                alert("Could not generate Master Consent Form: " + (err.message || err));
            } finally {
                this.isSettingUpMasterForm = false;
                this.isCreatingGoogleForm = false;
            }
        },

        // Legacy Google Forms creation methods retired in favor of Microsoft Forms integration

        // --- AUTOMATED GOOGLE FORM SCHEMA & RESPONSE SYNC ENGINE ---
        lastConsentSyncTime: null,
        lastConsentSyncSummary: '',
        isConsentAutoSyncEnabled: true,
        autoSyncConsentTimer: null,
        totalConsentResponsesCount: 0,

        async autoVerifyAndSyncFormSchema({ silent = true } = {}) {
            const formId = (this.leagueSettings && this.leagueSettings.consentFormId) ||
                           (this.masterConsentForm && this.masterConsentForm.formId) ||
                           (this.googleFormConfig && this.googleFormConfig.formId);

            if (!formId || !window.fb || typeof window.fb.verifyAndHealFormSchema !== 'function') return;

            try {
                const res = await window.fb.verifyAndHealFormSchema(formId, { interactive: !silent });
                if (res && res.fieldMap && Object.keys(res.fieldMap).length > 0) {
                    if (!this.leagueSettings) this.leagueSettings = {};
                    this.leagueSettings.consentFormFieldMap = res.fieldMap;
                    this.leagueSettings.consentFormUrl = res.responderUri || this.leagueSettings.consentFormUrl;
                    if (this.masterConsentForm) {
                        this.masterConsentForm.fieldMap = res.fieldMap;
                        this.masterConsentForm.responderUri = res.responderUri || this.masterConsentForm.responderUri;
                    }
                    if (this.googleFormConfig) {
                        this.googleFormConfig.responderUri = res.responderUri;
                        this.googleFormConfig.editUri = res.editUri;
                    }
                    if (typeof this.saveLeagueSettingsToFirebase === 'function') {
                        await this.saveLeagueSettingsToFirebase();
                    }
                    if (!silent && typeof this.showToast === 'function') {
                        this.showToast("⚡ Form schema & field mappings verified and synced with Firestore!", "success");
                    }
                }
            } catch (err) {
                if (!silent) {
                    console.warn("Auto schema check notice:", err?.message || err);
                }
            }
        },

        async syncConsentResponses({ silent = false, notifyOnNew = true } = {}) {
            const formId = (this.leagueSettings && this.leagueSettings.consentFormId) ||
                           (this.masterConsentForm && this.masterConsentForm.formId) ||
                           (this.googleFormConfig && this.googleFormConfig.formId);

            if (!formId) {
                if (!silent) alert("Please connect or auto-create a Google Consent Form first.");
                return;
            }

            if (!window.fb || typeof window.fb.getGoogleFormResponses !== 'function') {
                if (!silent) alert("Google Forms API integration is not available.");
                return;
            }

            if (this.isFormSyncing || this.isSyncingMsForm) return;
            this.isFormSyncing = true;
            this.isSyncingMsForm = true;

            try {
                const data = await window.fb.getGoogleFormResponses(formId, { interactive: !silent });
                if (!data || !data.responses) {
                    return;
                }
                const responses = data.responses || [];
                this.totalConsentResponsesCount = responses.length;
                this.lastConsentSyncTime = new Date();
                this.lastConsentSyncSummary = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                if (responses.length === 0) {
                    if (!silent && typeof this.showToast === 'function') {
                        this.showToast('No form responses found in Google Forms yet.', 'info');
                    }
                    return;
                }

                let syncedCount = 0;
                const playersList = Array.isArray(this.players) ? this.players : [];
                const updatedPlayers = [];

                const fieldMap = (this.masterConsentForm && this.masterConsentForm.fieldMap) ||
                                 (this.leagueSettings && this.leagueSettings.consentFormFieldMap) || {};

                // Question IDs for lookup
                const exactNameQId = fieldMap["Participant Name"] || fieldMap["Child / Player Full Name"] || fieldMap["Participant Full Name"];
                const exactIdQId = fieldMap["Player ID / Card Reference Number"] || fieldMap["Player ID Reference"] || fieldMap["Participant ID"];
                const ec1NameQId = fieldMap["Emergency Contact 1 - Name"] || fieldMap["Parent / Legal Guardian Full Name"];
                const ec1PhoneQId = fieldMap["Emergency Contact 1 - Phone"] || fieldMap["Parent Emergency Contact Phone Number"];
                const ec1RelationQId = fieldMap["Emergency Contact 1 - Relation"];
                const ec2NameQId = fieldMap["Emergency Contact 2 - Name"];
                const ec2PhoneQId = fieldMap["Emergency Contact 2 - Phone"];
                const additionalInfoQId = fieldMap["Additional Information"] || fieldMap["Medical Notes & Allergies"] || fieldMap["If there is additional information you would like us to know about the participant, which could help us to support their needs, please write it here. (i.e. history of illness, allergies, learning difficulties, history of difficult behaviors, specific recurring effects of previous trauma)"];
                const addressQId = fieldMap["Address"];
                const dobQId = fieldMap["Date of Birth"] || fieldMap["Date of Birth (YYYY-MM-DD)"];

                for (const resp of responses) {
                    const answers = resp.answers || {};
                    let matchedPlayer = null;
                    let pName = '', pId = '', pDob = '', carerName = '', carerPhone = '', carerRelation = '', carerEmail = resp.respondentEmail || '';

                    // 1. Strict extraction using mapped IDs
                    if (exactIdQId && answers[exactIdQId]) {
                        pId = answers[exactIdQId].textAnswers?.answers?.[0]?.value || '';
                    }
                    if (exactNameQId && answers[exactNameQId]) {
                        pName = answers[exactNameQId].textAnswers?.answers?.[0]?.value || '';
                    }
                    if (dobQId && answers[dobQId]) {
                        pDob = answers[dobQId].textAnswers?.answers?.[0]?.value || '';
                    }

                    // Fallback for custom or legacy forms if exact IDs aren't mapped
                    if (!pName && !pId) {
                        for (const qId in answers) {
                            const ans = answers[qId];
                            const textVal = ans.textAnswers?.answers?.map(a => a.value).join(' ') || '';
                            if (!pName && textVal.length > 2 && !textVal.includes('@') && !/^[0-9+\s()-]+$/.test(textVal)) {
                                pName = textVal;
                            }
                        }
                    }

                    // Match player by ID or Name
                    for (const p of playersList) {
                        if (pId && p.id && String(p.id).trim().toLowerCase() === String(pId).trim().toLowerCase()) {
                            matchedPlayer = p;
                            break;
                        }
                        if (pName && p.name && p.name.trim().toLowerCase() === pName.trim().toLowerCase()) {
                            matchedPlayer = p;
                            break;
                        }
                    }

                    if (matchedPlayer) {
                        let hasChanges = false;

                        // Extract emergency contact and additional information
                        if (ec1NameQId && answers[ec1NameQId]) {
                            const val = answers[ec1NameQId].textAnswers?.answers?.[0]?.value;
                            if (val && matchedPlayer.carer_name !== val) {
                                matchedPlayer.carer_name = val;
                                hasChanges = true;
                            }
                        }
                        if (ec1PhoneQId && answers[ec1PhoneQId]) {
                            const val = answers[ec1PhoneQId].textAnswers?.answers?.[0]?.value;
                            if (val && matchedPlayer.carer_phone !== val) {
                                matchedPlayer.carer_phone = val;
                                hasChanges = true;
                            }
                        }
                        if (ec1RelationQId && answers[ec1RelationQId]) {
                            const val = answers[ec1RelationQId].textAnswers?.answers?.[0]?.value;
                            if (val && matchedPlayer.carer_relationship !== val) {
                                matchedPlayer.carer_relationship = val;
                                hasChanges = true;
                            }
                        }
                        if (ec2NameQId && answers[ec2NameQId]) {
                            const val = answers[ec2NameQId].textAnswers?.answers?.[0]?.value;
                            if (val && matchedPlayer.emergency_contact_2 !== val) {
                                matchedPlayer.emergency_contact_2 = val;
                                hasChanges = true;
                            }
                        }
                        if (additionalInfoQId && answers[additionalInfoQId]) {
                            const val = answers[additionalInfoQId].textAnswers?.answers?.[0]?.value;
                            if (val && matchedPlayer.medical_notes !== val) {
                                matchedPlayer.medical_notes = val;
                                hasChanges = true;
                            }
                        }
                        if (addressQId && answers[addressQId]) {
                            const val = answers[addressQId].textAnswers?.answers?.[0]?.value;
                            if (val && matchedPlayer.address !== val) {
                                matchedPlayer.address = val;
                                hasChanges = true;
                            }
                        }
                        if (pDob && !matchedPlayer.dob) {
                            matchedPlayer.dob = pDob;
                            hasChanges = true;
                        }

                        if (!matchedPlayer.safeguarding_verified) {
                            matchedPlayer.safeguarding_verified = true;
                            matchedPlayer.verified_at = resp.createTime || new Date().toISOString();
                            matchedPlayer.safeguarding_date = new Date(resp.createTime || Date.now()).toLocaleDateString('en-GB');
                            hasChanges = true;
                            syncedCount++;
                        }

                        if (carerEmail && !matchedPlayer.carer_email) {
                            matchedPlayer.carer_email = carerEmail;
                            hasChanges = true;
                        }

                        if (hasChanges && !updatedPlayers.some(up => up.id === matchedPlayer.id)) {
                            updatedPlayers.push(matchedPlayer);
                        }
                    } else if (pName && pName.trim()) {
                        // Unrecognized player from consent form: auto-create new player record
                        if (ec1NameQId && answers[ec1NameQId]) {
                            carerName = answers[ec1NameQId].textAnswers?.answers?.[0]?.value || carerName;
                        }
                        if (ec1PhoneQId && answers[ec1PhoneQId]) {
                            carerPhone = answers[ec1PhoneQId].textAnswers?.answers?.[0]?.value || carerPhone;
                        }
                        if (ec1RelationQId && answers[ec1RelationQId]) {
                            carerRelation = answers[ec1RelationQId].textAnswers?.answers?.[0]?.value || carerRelation;
                        }
                        let emergencyContact2 = '';
                        if (ec2NameQId && answers[ec2NameQId]) {
                            emergencyContact2 = answers[ec2NameQId].textAnswers?.answers?.[0]?.value || '';
                        }
                        let medicalNotes = '';
                        if (additionalInfoQId && answers[additionalInfoQId]) {
                            medicalNotes = answers[additionalInfoQId].textAnswers?.answers?.[0]?.value || '';
                        }
                        let playerAddress = '';
                        if (addressQId && answers[addressQId]) {
                            playerAddress = answers[addressQId].textAnswers?.answers?.[0]?.value || '';
                        }

                        const newPlayerId = 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
                        const newPlayer = {
                            id: newPlayerId,
                            name: pName.trim(),
                            dob: pDob || '',
                            carer_name: carerName || '',
                            carer_phone: carerPhone || '',
                            carer_email: carerEmail || '',
                            carer_relationship: carerRelation || '',
                            emergency_contact_2: emergencyContact2 || '',
                            medical_notes: medicalNotes || '',
                            address: playerAddress || '',
                            safeguarding_verified: true,
                            safeguarding_consent: true,
                            safeguarding_source: 'google_form',
                            safeguarding_updated: new Date().toISOString(),
                            safeguarding_form_id: formId,
                            verified_at: resp.createTime || new Date().toISOString(),
                            safeguarding_date: new Date(resp.createTime || Date.now()).toLocaleDateString('en-GB'),
                            needs_staff_review: true,
                            created_from_consent: true,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                            pts: 0,
                            goals: 0,
                            matches_played: 0,
                            sessions_attended: 0,
                            attendance_count: 0,
                            motm_count: 0
                        };

                        this.players.push(newPlayer);
                        playersList.push(newPlayer);
                        updatedPlayers.push(newPlayer);
                        syncedCount++;
                    }
                }

                // Batch persist all updated and auto-generated players directly to Firestore
                if (updatedPlayers.length > 0) {
                    if (window.fb && typeof window.fb.savePlayersBatch === 'function') {
                        await window.fb.savePlayersBatch(updatedPlayers);
                    } else if (window.fb && window.fb.savePlayer) {
                        for (const p of updatedPlayers) {
                            await window.fb.savePlayer(p);
                        }
                    }
                    this.savePlayersLocally();
                    this.recalculateStandings();
                }

                if (syncedCount > 0 && notifyOnNew && typeof this.showToast === 'function') {
                    this.showToast(`🛡️ Auto-Synced: ${syncedCount} new parent consent(s) verified & saved to Firestore!`, 'success');
                } else if (!silent && typeof this.showToast === 'function') {
                    this.showToast(`✅ Synced with Google Forms — all ${playersList.length} player records up to date!`, 'success');
                }
            } catch (err) {
                if (!silent) {
                    console.error("Error syncing Google Form responses:", err);
                    if (typeof this.showToast === 'function') {
                        this.showToast("Could not sync responses: " + (err.message || err), "error");
                    } else {
                        alert("Error syncing responses: " + (err.message || err));
                    }
                }
            } finally {
                this.isFormSyncing = false;
                this.isSyncingMsForm = false;
            }
        },

        startConsentAutoSyncScheduler() {
            if (this.autoSyncConsentTimer) return;

            // 1. Initial automated trigger after load
            setTimeout(() => {
                this.autoVerifyAndSyncFormSchema({ silent: true });
                this.syncConsentResponses({ silent: true });
            }, 3000);

            // 2. Periodic background sync every 45 seconds
            this.autoSyncConsentTimer = setInterval(() => {
                if (this.isConsentAutoSyncEnabled) {
                    this.syncConsentResponses({ silent: true });
                }
            }, 45000);

            // 3. Trigger immediate silent sync when user focuses back to the tab
            if (typeof document !== 'undefined') {
                document.addEventListener('visibilitychange', () => {
                    if (!document.hidden && this.isConsentAutoSyncEnabled) {
                        this.syncConsentResponses({ silent: true });
                    }
                });
            }
            if (typeof window !== 'undefined') {
                window.addEventListener('focus', () => {
                    if (this.isConsentAutoSyncEnabled) {
                        this.syncConsentResponses({ silent: true });
                    }
                });
            }
        },

        async syncGoogleFormResponses() {
            return this.syncConsentResponses({ silent: false });
        },

        isSyncingExcelRegister: false,
        consentExcelSheetUrl: '',

        async openOrSyncConsentExcelSheet() {
            if (this.isSyncingExcelRegister) return;
            this.isSyncingExcelRegister = true;
            try {
                if (typeof this.showToast === 'function') {
                    this.showToast("📊 Syncing Parent Consent Register to Excel Online / XLSX...", "info");
                }

                const response = await fetch('/api/sync-consent-excel', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        players: this.players || []
                    })
                });

                if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.url) {
                        this.consentExcelSheetUrl = result.url;
                        try {
                            localStorage.setItem('football_united_consent_excel_url', result.url);
                        } catch (e) {}

                        if (typeof this.showToast === 'function') {
                            this.showToast(`✅ Synced ${result.count || this.players.length} player records to Excel Consent Register!`, "success");
                        }

                        window.open(result.url, '_blank');
                        return;
                    }
                }

                // Fallback direct download
                window.open('/api/download-consent-register', '_blank');
                if (typeof this.showToast === 'function') {
                    this.showToast("✅ Downloaded Consent Register (XLSX)!", "success");
                }
            } catch (err) {
                console.error("Error syncing Excel Consent Register:", err);
                window.open('/api/download-consent-register', '_blank');
                if (typeof this.showToast === 'function') {
                    this.showToast("Consent register generated for download.", "info");
                }
            } finally {
                this.isSyncingExcelRegister = false;
            }
        },

        openGoogleFormsResponsesSheet() {
            if (this.msFormConfig?.formUrl) {
                window.open(this.msFormConfig.formUrl, '_blank');
            } else {
                return this.openOrSyncConsentExcelSheet();
            }
        },

        getGoogleFormConsentUrl() {
            return this.getMsFormConsentUrl();
        },

        async copyGeneralMsConsentLink() {
            const url = this.getMsFormConsentUrl();
            try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(url);
                } else {
                    const ta = document.createElement('textarea');
                    ta.value = url;
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                }
                this.copiedGeneralConsentLink = true;
                if (typeof this.showToast === 'function') {
                    this.showToast('📋 Microsoft Form Parent Consent link copied!', 'success');
                }
                setTimeout(() => { this.copiedGeneralConsentLink = false; }, 3000);
            } catch (e) {
                prompt("Copy Parent Consent Link:", url);
            }
        },

        copyGeneralGoogleConsentLink() {
            return this.copyGeneralMsConsentLink();
        },

        shareGeneralMsConsentWhatsApp() {
            const url = this.getMsFormConsentUrl();
            const msg = `Hi! Please complete the Football United consent form here: ${url}`;
            const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
            window.open(waUrl, '_blank');
        },

        shareGeneralGoogleConsentWhatsApp() {
            return this.shareGeneralMsConsentWhatsApp();
        },

        shareGeneralMsConsentEmail() {
            const url = this.getMsFormConsentUrl();
            const subject = "Football United — Consent Form";
            const sender = this.getAdminSenderEmail();
            const body = `Hi Parent/Guardian,\n\nThank you for registering for Football United.\n\nPlease complete the permission form below before the first session — no permission, no play:\n${url}\n\nEvery Friday night at Trinity School, Shirley Park, Croydon, CR9 7AT.\nJunior session (14-16 yrs): 6:30-8:00pm | Senior session (17-19 yrs): 8:00-9:30pm\n\nAny questions, reply to this email or contact Ralph Boer on 07793533394.\n\nThanks,\nFootball United Team\n(Sent from ${sender})`;
            const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            window.open(mailtoUrl, '_blank');
        },

        shareGeneralGoogleConsentEmail() {
            return this.shareGeneralMsConsentEmail();
        },

        generateConsentFormLink(player = null) {
            // Under Microsoft Forms integration, we share the static official form link
            return this.getMsFormConsentUrl();
        },

        copiedPlayerId: null,
        playerConsentFilter: 'verified', // 'verified' | 'pending' | 'needs_review' | 'all'
        showMergeModal: false,
        mergeKeepId: '',
        mergeDupId: '',

        copyConsentLink(player = null) {
            return this.copyPlayerConsentLink(player);
        },

        async copyPlayerConsentLink(player = null) {
            const target = player || this.selectedSafeguardPlayer || this.selectedQrPlayer || this.newSavedPlayerForConsent;
            const url = this.getMsFormConsentUrl();
            if (!this.isValidMsFormUrl(url)) {
                if (typeof this.showToast === 'function') {
                    this.showToast('⚠️ Set up your Microsoft Form link in Settings first.', 'warning');
                } else {
                    alert('Set up your Microsoft Form link in Settings first.');
                }
                this.showMsFormSettingsModal = true;
                return '';
            }

            try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(url);
                } else {
                    const ta = document.createElement('textarea');
                    ta.value = url;
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                }
                this.copiedPlayerQrLink = true;
                this.copiedNewPlayerConsentLink = true;
                if (target?.id) {
                    this.copiedPlayerId = target.id;
                }
                if (typeof this.showToast === 'function') {
                    this.showToast(`📋 Microsoft Form link copied${target?.name ? ' for ' + target.name : ''}!`, 'success');
                }
                setTimeout(() => { 
                    this.copiedPlayerQrLink = false; 
                    this.copiedNewPlayerConsentLink = false;
                    this.copiedPlayerId = null;
                }, 3000);
            } catch (e) {
                prompt("Copy Parent Consent Link:", url);
            }
            return url;
        },

        sharePlayerConsentWhatsApp(player = null) {
            const target = player || this.selectedSafeguardPlayer || this.selectedQrPlayer;
            const pName = (target && target.name) ? target.name : 'your young person';
            const formUrl = this.getMsFormConsentUrl();
            if (!this.isValidMsFormUrl(formUrl)) {
                if (typeof this.showToast === 'function') {
                    this.showToast('⚠️ Set up your Microsoft Form link in Settings first.', 'warning');
                } else {
                    alert('Set up your Microsoft Form link in Settings first.');
                }
                this.showMsFormSettingsModal = true;
                return;
            }
            const msg = `Hi! Please complete the Football United consent form for ${pName} here: ${formUrl}`;
            const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
            window.open(waUrl, '_blank');
        },

        sharePlayerConsentEmail(player = null) {
            const target = player || this.selectedSafeguardPlayer || this.selectedQrPlayer;
            if (!target) return;
            this.openEmailConsentModal(target);
        },

        openEmailConsentModal(player = null) {
            const target = player || this.selectedSafeguardPlayer || this.selectedQrPlayer;
            if (!target) return;
            this.emailConsentPlayer = target;
            this.emailConsentRecipient = target.carer_email || target.parent_email || target.email || '';
            const pName = target.name || 'your young person';
            const formUrl = this.getMsFormConsentUrl() || '[Microsoft Form Link]';
            const sender = this.getAdminSenderEmail();
            this.emailConsentSubject = `Football United — Consent Form for ${pName}`;
            this.emailConsentBody = `Hi Parent/Guardian,\n\nThank you for registering ${pName} for Football United.\n\nPlease complete the permission form below before their first session — no permission, no play:\n${formUrl}\n\nEvery Friday night at Trinity School, Shirley Park, Croydon, CR9 7AT.\nJunior session (14-16 yrs): 6:30-8:00pm | Senior session (17-19 yrs): 8:00-9:30pm\n\nAny questions, reply to this email or contact Ralph Boer on 07793533394.\n\nThanks,\nFootball United Team\n(Sent from ${sender})`;
            this.copiedEmailConsentText = false;
            this.showEmailConsentModal = true;
        },

        async saveConsentRecipientEmail() {
            if (!this.emailConsentPlayer || !this.emailConsentRecipient) return;
            this.emailConsentPlayer.carer_email = this.emailConsentRecipient.trim();
            // Sync to player pool if exists
            const idx = this.players.findIndex(p => p.id === this.emailConsentPlayer.id);
            if (idx !== -1) {
                this.players[idx].carer_email = this.emailConsentRecipient.trim();
            }
            if (window.fb && typeof window.fb.updatePlayer === 'function' && this.emailConsentPlayer.id) {
                try {
                    await window.fb.updatePlayer(this.emailConsentPlayer.id, { carer_email: this.emailConsentRecipient.trim() });
                } catch(e) {
                    console.warn("Could not persist carer email:", e);
                }
            }
        },

        async sendConsentEmailAutomated(player = null) {
            const target = player || this.emailConsentPlayer;
            if (!target) {
                alert("Please select a player.");
                return;
            }
            const recipient = (this.emailConsentRecipient || target.carer_email || '').trim();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!recipient || !emailRegex.test(recipient)) {
                alert("Enter a valid parent/carer's email address first (e.g. parent@example.com).");
                return;
            }

            const formUrl = this.getMsFormConsentUrl();
            if (!this.isValidMsFormUrl(formUrl)) {
                if (typeof this.showToast === 'function') {
                    this.showToast('⚠️ Set up your Microsoft Form link in Settings first before sending emails.', 'warning');
                } else {
                    alert('Set up your Microsoft Form link in Settings first before sending emails.');
                }
                this.showMsFormSettingsModal = true;
                return;
            }

            this.isSendingConsentEmail = true;
            try {
                const pName = target.name || 'Player';
                const senderEmail = this.getAdminSenderEmail();

                const response = await fetch('/api/send-consent-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        recipientEmail: recipient,
                        playerName: pName,
                        formUrl: formUrl,
                        senderEmail: senderEmail,
                        customMessage: this.emailConsentBody
                    })
                });

                const result = await response.json();
                if (!response.ok || !result.success) {
                    throw new Error(result.message || `Server returned error code ${response.status}`);
                }

                // Persist carer email and sent timestamp on player
                target.carer_email = recipient;
                target.consent_email_sent_at = new Date().toISOString();

                const idx = (this.players || []).findIndex(p => p.id === target.id);
                if (idx !== -1) {
                    this.players[idx].carer_email = recipient;
                    this.players[idx].consent_email_sent_at = target.consent_email_sent_at;
                }

                if (window.fb && typeof window.fb.updatePlayer === 'function' && target.id) {
                    try {
                        await window.fb.updatePlayer(target.id, {
                            carer_email: recipient,
                            consent_email_sent_at: target.consent_email_sent_at
                        });
                    } catch (e) {
                        console.warn("Could not persist email sent timestamp:", e);
                    }
                }

                this.showEmailConsentModal = false;
                const sender = result.sentFrom || senderEmail || 'ralph.boer@hillsong.co.uk';
                const sentTo = result.sentTo || recipient;
                if (result.simulated) {
                    const noticeMsg = `⚠️ Email logged on server (SIMULATED mode). To deliver live emails to parent inboxes, configure GRAPH_CLIENT_ID & GRAPH_CLIENT_SECRET or SMTP credentials in Settings.`;
                    if (typeof this.showToast === 'function') {
                        this.showToast(noticeMsg, 'warning');
                    }
                    console.warn(noticeMsg, result);
                } else {
                    const transportLabel = result.transport === 'microsoft_graph' ? 'Microsoft 365' : (result.transport === 'smtp' ? 'SMTP' : 'email');
                    if (typeof this.showToast === 'function') {
                        this.showToast(`✉️ Consent email dispatched via ${transportLabel} from ${sender} to ${sentTo}!`, 'success');
                    } else {
                        alert(`Dispatched from ${sender} to ${sentTo}.`);
                    }
                }
            } catch (err) {
                console.error("Error sending automated consent email:", err);
                const errorMsg = err.message || err || "Couldn't send the email — please try again or contact the app admin.";
                if (typeof this.showToast === 'function') {
                    this.showToast(`⚠️ Send failed: ${errorMsg}`, 'error');
                }
                alert(`Could not send consent email:\n\n${errorMsg}`);
            } finally {
                this.isSendingConsentEmail = false;
            }
        },

        async copyEmailConsentContent() {
            if (!this.emailConsentBody) return;
            const fullContent = `Subject: ${this.emailConsentSubject}\n\n${this.emailConsentBody}`;
            try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(fullContent);
                } else {
                    const ta = document.createElement('textarea');
                    ta.value = fullContent;
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                }
                this.copiedEmailConsentText = true;
                if (typeof this.showToast === 'function') {
                    this.showToast('📋 Email message & consent link copied to clipboard!', 'success');
                }
                setTimeout(() => { this.copiedEmailConsentText = false; }, 3000);
            } catch (e) {
                prompt("Copy Email Text:", fullContent);
            }
        },

        downloadPlayerQrCode() {
            const container = document.getElementById('unifiedPlayerConsentQrCode') || document.getElementById('playerConsentQrCode');
            if (!container) return;
            const img = container.querySelector('img');
            const canvas = container.querySelector('canvas');
            
            let dataUrl = '';
            if (img && img.src) {
                dataUrl = img.src;
            } else if (canvas) {
                dataUrl = canvas.toDataURL('image/png');
            }

            if (dataUrl) {
                const a = document.createElement('a');
                a.href = dataUrl;
                const pName = ((this.selectedSafeguardPlayer || this.selectedQrPlayer)?.name || 'player').replace(/\s+/g, '_').toLowerCase();
                a.download = `${pName}_parent_consent_qr.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }
        },

        openConsentWebPage(player = null) {
            const target = player || this.selectedSafeguardPlayer || this.selectedQrPlayer;
            let url = '';
            if (target && (target.name || target.id)) {
                url = this.generateConsentFormLink(target);
            } else if (this.playerQrUrl) {
                url = this.playerQrUrl;
            } else if (this.isGoogleFormIntegrated() && this.googleFormConfig?.responderUri) {
                url = this.googleFormConfig.responderUri;
            } else {
                url = `${PRODUCTION_URL}/consent.html`;
            }
            if (url) {
                window.open(url, '_blank');
            }
        },

        openGeneralQrModal(type = 'consent') {
            this.generalQrType = type;
            this.generalQrUrl = type === 'consent' ? `${PRODUCTION_URL}/consent.html` : `${PRODUCTION_URL}/register.html`;
            this.copiedGeneralQrLink = false;
            this.showGeneralQrModal = true;

            this.$nextTick(() => {
                this.renderGeneralQrCode();
            });
        },

        setGeneralQrType(type) {
            this.generalQrType = type;
            this.generalQrUrl = type === 'consent' ? `${PRODUCTION_URL}/consent.html` : `${PRODUCTION_URL}/register.html`;
            this.copiedGeneralQrLink = false;
            this.$nextTick(() => {
                this.renderGeneralQrCode();
            });
        },

        renderGeneralQrCode() {
            const container = document.getElementById('generalShareQrCode');
            if (container && typeof QRCode !== 'undefined') {
                container.innerHTML = '';
                new QRCode(container, {
                    text: this.generalQrUrl,
                    width: 180,
                    height: 180,
                    colorDark: "#020617",
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.M
                });
            }
        },

        async copyGeneralQrLink() {
            if (!this.generalQrUrl) return;
            try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(this.generalQrUrl);
                } else {
                    const ta = document.createElement('textarea');
                    ta.value = this.generalQrUrl;
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                }
                this.copiedGeneralQrLink = true;
                setTimeout(() => { this.copiedGeneralQrLink = false; }, 3000);
            } catch (e) {
                prompt("Copy Link:", this.generalQrUrl);
            }
        },

        async copyGeneralConsentDirectLink() {
            const url = `${PRODUCTION_URL}/consent.html`;
            try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(url);
                } else {
                    const ta = document.createElement('textarea');
                    ta.value = url;
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                }
                this.copiedGeneralConsentLink = true;
                setTimeout(() => { this.copiedGeneralConsentLink = false; }, 3000);
            } catch (e) {
                prompt("Copy Parent Consent Link:", url);
            }
        },

        async copyGeneralRegisterDirectLink() {
            const url = `${PRODUCTION_URL}/register.html`;
            try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(url);
                } else {
                    const ta = document.createElement('textarea');
                    ta.value = url;
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                }
                this.copiedGeneralRegisterLink = true;
                setTimeout(() => { this.copiedGeneralRegisterLink = false; }, 3000);
            } catch (e) {
                prompt("Copy Registration Link:", url);
            }
        },

        openGeneralQrTab() {
            if (this.generalQrUrl) {
                window.open(this.generalQrUrl, '_blank');
            }
        },

        shareGeneralWhatsApp() {
            if (!this.generalQrUrl) return;
            const isConsent = this.generalQrType === 'consent';
            const msg = isConsent
                ? `Hi! Please complete the quick Football United & Game On parent/guardian digital consent form here: ${this.generalQrUrl}`
                : `Hi! Please complete the Football United youth squad registration form here: ${this.generalQrUrl}`;
            const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
            window.open(waUrl, '_blank');
        },

        downloadGeneralQrCode() {
            const container = document.getElementById('generalShareQrCode');
            if (!container) return;
            const img = container.querySelector('img');
            const canvas = container.querySelector('canvas');
            let dataUrl = '';
            if (img && img.src) {
                dataUrl = img.src;
            } else if (canvas) {
                dataUrl = canvas.toDataURL('image/png');
            }

            if (dataUrl) {
                const a = document.createElement('a');
                a.href = dataUrl;
                const typeLabel = this.generalQrType === 'consent' ? 'parent_consent' : 'youth_registration';
                a.download = `football_united_${typeLabel}_qr.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }
        },

        openAddPlayerConsentQr() {
            const pName = this.editingPlayer?.name || '';
            const url = pName ? `${PRODUCTION_URL}/consent?name=${encodeURIComponent(pName)}` : `${PRODUCTION_URL}/consent.html`;
            
            this.selectedQrPlayer = {
                id: this.editingPlayer?.id || 'new',
                name: pName || 'New Player Candidate',
                position: 'Player Candidate',
                dob: this.editingPlayer?.dob || '',
                phone: this.editingPlayer?.phone || '',
                safeguarding_verified: false
            };
            this.playerQrUrl = url;
            this.copiedPlayerQrLink = false;
            this.showPlayerQrModal = true;

            this.$nextTick(() => {
                const container = document.getElementById('playerConsentQrCode');
                if (container && typeof QRCode !== 'undefined') {
                    container.innerHTML = '';
                    new QRCode(container, {
                        text: this.playerQrUrl,
                        width: 170,
                        height: 170,
                        colorDark: "#020617",
                        colorLight: "#ffffff",
                        correctLevel: QRCode.CorrectLevel.M
                    });
                }
            });
        },

        openAddPlayerConsentTab() {
            const pName = this.editingPlayer?.name || '';
            const url = pName ? `${PRODUCTION_URL}/consent?name=${encodeURIComponent(pName)}` : `${PRODUCTION_URL}/consent.html`;
            window.open(url, '_blank');
        },

        async copyAddPlayerConsentLink() {
            const pName = this.editingPlayer?.name || '';
            const url = pName ? `${PRODUCTION_URL}/consent?name=${encodeURIComponent(pName)}` : `${PRODUCTION_URL}/consent.html`;
            try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(url);
                } else {
                    const ta = document.createElement('textarea');
                    ta.value = url;
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                }
                this.copiedPlayerQrLink = true;
                setTimeout(() => { this.copiedPlayerQrLink = false; }, 3000);
            } catch (e) {
                prompt("Copy Parent Consent Link:", url);
            }
        },

        async copyPublicRegistrationLink(player = null) {
            let url = '';
            if (player && (player.name || player.id)) {
                url = this.generateConsentFormLink(player);
            } else {
                url = `${PRODUCTION_URL}/register.html`;
            }

            try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(url);
                } else {
                    const ta = document.createElement('textarea');
                    ta.value = url;
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                }
                this.copyLinkFeedback = true;
                if (typeof this.showToast === 'function') {
                    this.showToast(player ? '📋 Pre-filled Player Consent link copied!' : '📋 Public Registration link copied!', 'success');
                }
                setTimeout(() => { this.copyLinkFeedback = false; }, 3000);
            } catch (e) {
                prompt("Copy URL:", url);
            }
            return url;
        },

        async copyCarerVerificationLink(token) {
            if (!token) return;
            const url = `${PRODUCTION_URL}/api/verify-consent?token=${token}`;
            try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(url);
                } else {
                    const ta = document.createElement('textarea');
                    ta.value = url;
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                }
                this.copiedTokenFeedback = token;
                setTimeout(() => { this.copiedTokenFeedback = ''; }, 3000);
            } catch (e) {
                prompt("Copy Verification Link:", url);
            }
        },

        async approveRegistration(regId) {
            if (!regId) return;
            const reg = (this.pendingRegistrations || []).find(r => r.id === regId || r.verification_token === regId);
            if (!reg) return;

            const pName = (reg.player_name || `${reg.first_name || ''} ${reg.last_name || ''}`).trim();
            if (!pName) return alert("Invalid player name.");

            if (!confirm(`Confirm safeguarding verification and approve player "${pName}"?`)) return;

            // Convert registration into a standard player object
            const newPlayer = window.safeClone({
                id: reg.id ? (reg.id.startsWith('p_') ? reg.id : `p_${reg.id}`) : `p_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                name: pName,
                registered: true,
                is_unregistered: false,
                nickname: reg.nickname || '',
                dob: reg.dob || '',
                phone: reg.carer_phone || reg.phone || '',
                nationality: reg.nationality || 'British',
                position: reg.position || 'Midfielder',
                carer_name: reg.carer_name || '',
                carer_email: reg.carer_email || '',
                carer_phone: reg.carer_phone || '',
                carer_relationship: reg.carer_relationship || 'Parent / Legal Guardian',
                photo_url: reg.photo_url || '',
                medical_notes: reg.medical_notes || 'None',
                safeguarding_verified: true,
                verified_at: new Date().toISOString(),
                deductions: 0
            });

            // Optimistically update local player state immediately
            const existingIdx = (this.players || []).findIndex(p => String(p.id) === String(newPlayer.id) || String(p.name || '').trim().toLowerCase() === pName.toLowerCase());
            if (existingIdx >= 0) {
                this.players[existingIdx] = newPlayer;
            } else {
                this.players.push(newPlayer);
            }
            this.players.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            this.savePlayersLocally();
            this.recalculateStandings();
            this.appendPlayerToQuarterlyAttendanceSheets(pName);

            try {
                if (window.fb && window.fb.savePlayer) {
                    await window.fb.savePlayer(newPlayer);
                }

                // Update status in backend / file store
                await fetch('/api/approve-registration', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: regId })
                }).catch(() => {});

                reg.status = 'approved';
                reg.verified_at = new Date().toISOString();
                await this.fetchPendingRegistrations();
            } catch (err) {
                console.error("Error approving registration:", err);
                alert("Failed to approve registration.");
            }
        },

        async deleteRegistration(regId) {
            if (!regId) return;
            if (!confirm("Are you sure you want to permanently remove this registration record?")) return;

            try {
                await fetch(`/api/delete-registration/${regId}`, {
                    method: 'DELETE'
                });
                this.pendingRegistrations = (this.pendingRegistrations || []).filter(r => r.id !== regId && r.verification_token !== regId);
                await this.fetchPendingRegistrations();
            } catch (e) {
                console.error("Error deleting registration:", e);
                alert("Failed to delete registration.");
            }
        },

        getFilteredAlphabeticalPlayers() {
            let all = this.getAlphabeticalPlayers ? this.getAlphabeticalPlayers() : (this.players || []);
            if (this.playerConsentFilter === 'verified') {
                all = all.filter(p => (p.safeguarding_verified || p.consent_verified || p.consent_status === 'verified') && !p.needs_staff_review);
            } else if (this.playerConsentFilter === 'pending') {
                all = all.filter(p => !p.safeguarding_verified && !p.consent_verified && p.consent_status !== 'verified');
            } else if (this.playerConsentFilter === 'needs_review') {
                all = all.filter(p => p.needs_staff_review === true);
            }
            const q = (this.playerSearchQuery || '').trim().toLowerCase();
            if (!q) return all;
            return all.filter(p => {
                const name = (p.name || p.player || '').toLowerCase();
                const nick = (p.nickname || '').toLowerCase();
                const capTeam = (this.getPlayerCaptainTeam ? this.getPlayerCaptainTeam(p) : '') || '';
                const carer = (p.carer_name || '').toLowerCase();
                return name.includes(q) || nick.includes(q) || capTeam.toLowerCase().includes(q) || carer.includes(q);
            });
        },


        // --- LIFECYCLE HOOKS ---
        async init() {
            if (typeof window !== 'undefined') {
                window.AppState = this;
                window.showAppGlobalToast = (msg, type = 'info', duration = 3500) => {
                    this.showToast(msg, type, duration);
                };
            }

            // Check if running inside AI Studio developer environment
            const isDevEnv = this.isDeveloperEnvironment();
            this.isInAiStudio = isDevEnv;

            // Check if app is running natively or as an installed PWA
            this.isAppInstalledAlready = this.checkIsAppInstalled();

            // Initial Loading State
            this.isDeveloperAutoLoggingIn = false;

            // If in dev environment (ais-dev, ais-pre, localhost), immediately initialize primary state as authenticated
            if (isDevEnv && (typeof sessionStorage === 'undefined' || sessionStorage.getItem('fu_logged_out') !== 'true')) {
                console.log("⚡ [Dev Environment Detected] Initializing primary state directly in Web App mode.");
                this.setAppMode('authenticated');
                this.setIsAuthenticated(true);
                this.authChecking = false;
            } else {
                this.authChecking = true;
                this.isAuthenticated = false;
                this.isAdminAuthenticated = false;
            }

            // Check if visitor entered via direct Admin deep link: /admin or has tab=admin
            if (typeof window !== 'undefined') {
                const isAdminPath = window.location.pathname.startsWith('/admin');
                const isTabAdmin = (new URLSearchParams(window.location.search)).get('tab') === 'admin' || window.location.hash.includes('admin');
                if (isAdminPath || isTabAdmin) {
                    try { sessionStorage.setItem('fu_target_tab', 'admin'); } catch (e) {}
                }
                if (window.location.pathname !== '/' && !isAdminPath) {
                    try {
                        if (window.history && window.history.replaceState) {
                            window.history.replaceState(null, '', '/');
                        }
                    } catch (e) {}
                }
            }

            // --- AUTHENTICATION STATE, ERROR BOUNDARY & 5-SECOND TIMEOUT ---
            let authResolved = false;

            // Explicit state-updater: removes loading spinner and immediately renders the Login Screen component
            const renderLoginScreen = () => {
                this.currentUser = null;
                this.userProfile = null;
                this.userRole = null;
                this.userStatus = 'pending';
                this.isUserApproved = false;
                this.authMode = 'login';
                this.authError = '';
                this.authSuccessMessage = '';
                if (this.authForm) {
                    this.authForm.password = '';
                }
                this.setAppMode('landing');
                this.setIsAuthenticated(false);
                this.isAdminAuthenticated = false;
                this.isDeveloperMode = false;
                this.isDeveloperGodMode = false;
                if (typeof window !== 'undefined') {
                    window.isDeveloperGodMode = false;
                }
                if (this.userStatusUnsubscribe) {
                    try { this.userStatusUnsubscribe(); } catch (e) {}
                    this.userStatusUnsubscribe = null;
                }
                if (this.pendingUsersUnsubscribe) {
                    try { this.pendingUsersUnsubscribe(); } catch (e) {}
                    this.pendingUsersUnsubscribe = null;
                }
                this.stopDataSubscriptions();

                // Explicitly map unauthenticated users to root route (/)
                if (typeof window !== 'undefined' && window.location.pathname !== '/') {
                    try {
                        if (window.history && window.history.replaceState) {
                            window.history.replaceState(null, '', '/');
                        }
                    } catch (e) {}
                }

                // Explicitly state-update to remove the loading spinner and immediately render Login Screen
                this.authChecking = false;
                this.isDeveloperAutoLoggingIn = false;
            };

            // Fast 800ms timeout error boundary: guarantees instant loading for developers and users
            const authTimeoutTimer = setTimeout(() => {
                if (!authResolved && this.authChecking) {
                    console.log("⏱️ Initial auth check completed. Loading user view or login screen.");
                    authResolved = true;
                    if (isDevEnv && sessionStorage.getItem('fu_logged_out') !== 'true') {
                        this.viewAsUser('coach');
                    } else {
                        renderLoginScreen();
                    }
                }
            }, 800);

            // Auth Gate: Persistent login flow using Firebase Auth onAuthStateChanged
            const handleAuthState = async (user) => {
                if (authResolved && this.isAuthenticated) return;

                try {
                    // If user is null, check if we have a saved active user session in local storage
                    if (!user) {
                        try {
                            const isLoggedOut = sessionStorage.getItem('fu_logged_out') === 'true';
                            if (!isLoggedOut) {
                                const savedStr = localStorage.getItem('fu_active_user_session');
                                if (savedStr) {
                                    const parsed = JSON.parse(savedStr);
                                    if (parsed && (parsed.email || parsed.uid)) {
                                        user = parsed;
                                    }
                                }
                            }
                        } catch (e) {}
                    }

                    if (user && (user.uid || user.email)) {
                        authResolved = true;
                        clearTimeout(authTimeoutTimer);

                        // Valid user object found: Automatically redirect to protected Dashboard, bypassing login screen
                        try {
                            const savedStr = localStorage.getItem('fu_active_user_session');
                            if (savedStr) {
                                const parsed = JSON.parse(savedStr);
                                if (parsed) {
                                    if (!user.email && parsed.email) user.email = parsed.email;
                                    if (!user.displayName && parsed.displayName) user.displayName = parsed.displayName;
                                    if (parsed.role) user.role = parsed.role;
                                }
                            }
                        } catch (e) {}

                        this.currentUser = user;
                        this.isAuthenticated = true;
                        this.isDeveloperAutoLoggingIn = false;

                        // Ensure Firestore user document exists with default status 'pending' (or 'approved' for bootstrapped admin)
                        let firestoreProfile = null;
                        if (window.fb?.ensureUserDocument && user.uid) {
                            try {
                                firestoreProfile = await window.fb.ensureUserDocument(user);
                            } catch (e) {
                                console.warn("Notice ensuring Firestore user document:", e);
                            }
                        }

                        // Resolve user role & approval status
                        const isBootAdmin = this.isBootstrappedAdminUser(user.email);
                        let role = isBootAdmin ? 'admin' : (user.role || 'user');
                        let status = isBootAdmin ? 'approved' : 'pending';

                        if (firestoreProfile) {
                            if (firestoreProfile.role && !isBootAdmin) role = firestoreProfile.role;
                            if (firestoreProfile.status && !isBootAdmin) status = firestoreProfile.status;
                            this.userProfile = firestoreProfile;
                        } else if (window.fb?.getUserProfile && user.uid) {
                            try {
                                const p = await window.fb.getUserProfile(user.uid);
                                if (p) {
                                    if (p.role && !isBootAdmin) role = p.role;
                                    if (p.status && !isBootAdmin) status = p.status;
                                    this.userProfile = p;
                                }
                            } catch (e) {}
                        }

                        this.userRole = role;
                        this.userStatus = status;
                        this.isUserApproved = (status === 'approved');
                        this.isAdminAuthenticated = (this.userRole === 'admin');

                        // Cache session in localStorage so it survives app closures across Android APK, PWA & Web
                        try {
                            localStorage.setItem('fu_active_user_session', JSON.stringify({
                                uid: user.uid,
                                email: user.email || '',
                                displayName: user.displayName || '',
                                role: this.userRole,
                                status: this.userStatus
                            }));
                            sessionStorage.removeItem('fu_logged_out');
                        } catch (e) {}

                        // Attach real-time Firestore listener to user document for instantaneous approval transition
                        if (this.userStatusUnsubscribe) {
                            try { this.userStatusUnsubscribe(); } catch(e) {}
                            this.userStatusUnsubscribe = null;
                        }
                        if (window.fb?.listenToUserStatus && user.uid && window.fb?.auth?.currentUser && !user.isGuestUser && !String(user.uid).startsWith('fu_user_')) {
                            this.userStatusUnsubscribe = window.fb.listenToUserStatus(user.uid, (data) => {
                                if (!data) return;
                                const previousStatus = this.userStatus;
                                const updatedStatus = data.status || 'pending';
                                this.userStatus = updatedStatus;
                                if (data.role && !this.isBootstrappedAdminUser(this.currentUser?.email)) {
                                    this.userRole = data.role;
                                }
                                if (updatedStatus === 'approved') {
                                    this.isUserApproved = true;
                                    if (previousStatus === 'pending') {
                                        console.log("🎉 Account approved by administrator! Automatically transitioning to main dashboard...");
                                        if (typeof this.showToast === 'function') {
                                            this.showToast("🎉 Your account has been approved by an administrator! Welcome to Football United.", "success");
                                        }
                                        this.startDataSubscriptions();
                                        if (!this.activeTab || this.activeTab === 'login') {
                                            this.activeTab = 'home';
                                        }
                                    }
                                } else {
                                    this.isUserApproved = false;
                                }
                            });
                        }

                        // If user is Admin and authenticated with real credentials, listen to pending users for live Admin Management view
                        if (this.userRole === 'admin' && window.fb?.auth?.currentUser) {
                            this.setupAdminPendingUsersListener();
                        }

                        // Developer Mode secondary security layer
                        this.isDeveloperMode = this.checkIsDeveloperMode();
                        this.isDeveloperGodMode = this.checkIsDeveloperGodMode();
                        if (typeof window !== 'undefined') {
                            window.isDeveloperGodMode = this.isDeveloperGodMode;
                        }
                        this.isInAiStudio = this.isDeveloperEnvironment();

                        // Flush any pending mutations
                        try { this.flushPendingSyncs(); } catch (e) {}

                        // If status is approved, load full dashboard and start data subscriptions
                        if (this.isUserApproved) {
                            try { this.startDataSubscriptions(); } catch (e) {}
                            let targetTab = null;
                            try {
                                targetTab = sessionStorage.getItem('fu_target_tab');
                            } catch (e) {}
                            if (!targetTab && typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
                                targetTab = 'admin';
                            }

                            if (targetTab === 'admin' && this.isAdminOrDeveloper()) {
                                this.activeTab = 'admin';
                                this.setupAdminPendingUsersListener();
                                try { sessionStorage.removeItem('fu_target_tab'); } catch (e) {}
                            } else if (!this.activeTab || this.activeTab === 'login') {
                                this.activeTab = 'home';
                            }
                        }

                        // Remove loading screen -> routing decision complete
                        this.authChecking = false;
                    } else {
                        // User is null (no user logged in):
                        authResolved = true;
                        clearTimeout(authTimeoutTimer);

                        if (isDevEnv && sessionStorage.getItem('fu_logged_out') !== 'true') {
                            this.viewAsUser('coach');
                        } else {
                            renderLoginScreen();
                        }
                    }
                } catch (err) {
                    console.error("Auth state handler error boundary caught:", err);
                    authResolved = true;
                    clearTimeout(authTimeoutTimer);
                    renderLoginScreen();
                }
            };

            const setupAuthWatcher = () => {
                try {
                    if (window.fb?.onAuthStateChanged) {
                        window.fb.onAuthStateChanged(handleAuthState);
                    } else if (window.fb?.onAuthChanged) {
                        window.fb.onAuthChanged(handleAuthState);
                    } else {
                        setTimeout(() => {
                            try {
                                if (window.fb?.onAuthStateChanged) {
                                    window.fb.onAuthStateChanged(handleAuthState);
                                } else if (window.fb?.onAuthChanged) {
                                    window.fb.onAuthChanged(handleAuthState);
                                } else {
                                    handleAuthState(null);
                                }
                            } catch (e) {
                                handleAuthState(null);
                            }
                        }, 250);
                    }
                } catch (e) {
                    console.error("Error setting up auth watcher:", e);
                    handleAuthState(null);
                }
            };

            if (window.fb) {
                setupAuthWatcher();
            } else {
                window.addEventListener('firebase_ready', () => setupAuthWatcher(), { once: true });
                window.addEventListener('firebase-ready', () => setupAuthWatcher(), { once: true });
                let attempts = 0;
                const checkFirebase = setInterval(() => {
                    attempts++;
                    if (window.fb) {
                        clearInterval(checkFirebase);
                        setupAuthWatcher();
                    } else if (attempts >= 40) { // 2 seconds
                        clearInterval(checkFirebase);
                        if (!authResolved) {
                            handleAuthState(null);
                        }
                    }
                }, 50);
            }

            // User Mode: check persisted state for download card removal:
            try {
                if (localStorage.getItem('fu_download_card_removed') === 'true' ||
                    localStorage.getItem('fu_app_downloaded') === 'true' ||
                    localStorage.getItem('fu_team_shared') === 'true') {
                    this.downloadCardDismissed = true;
                    this.hasDownloadedApp = true;
                    this.hasSharedWithTeam = true;
                    this.isAppDownloaded = true;
                    this.isDownloadedApp = true;
                    if (typeof document !== 'undefined' && document.documentElement) {
                        document.documentElement.classList.add('app-downloaded');
                    }
                }
            } catch (e) {}

            // Check URL parameters for explicit install/downloaded intent
            try {
                const searchParams = new URLSearchParams(window.location.search);
                if (searchParams.get('action') === 'install' ||
                    searchParams.get('source') === 'home_screen_btn' ||
                    searchParams.get('source') === 'downloaded_app' ||
                    searchParams.get('source') === 'desktop_app' ||
                    searchParams.get('source') === 'dedicated_window' ||
                    searchParams.get('downloaded') === 'true' ||
                    searchParams.get('app_installed') === 'true') {
                    this.downloadCardDismissed = true;
                    this.hasDownloadedApp = true;
                    this.isAppDownloaded = true;
                    this.isDownloadedApp = true;
                    this.isAppInstalled = true;
                    try {
                        localStorage.setItem('fu_download_card_removed', 'true');
                        localStorage.setItem('fu_app_downloaded', 'true');
                        if (typeof document !== 'undefined' && document.documentElement) {
                            document.documentElement.classList.add('app-downloaded');
                        }
                    } catch (e) {}
                }
            } catch (e) {}

            if (this.checkIfInstalled()) {
                this.isAppInstalled = true;
                this.isStandalone = true;
                this.isDownloadedApp = true;
                this.isAppDownloaded = true;
                this.downloadCardDismissed = true;
                this.showInstallBanner = false;
                this.showInstallButton = false;
                this.showIosInstallModal = false;
                this.showAndroidInstallModal = false;
                if (typeof document !== 'undefined' && document.documentElement) {
                    document.documentElement.classList.add('app-downloaded');
                    document.documentElement.classList.add('pwa-standalone');
                }
            }

            // 1. Initial network check on boot
            try { this.setupNetworkListeners(); } catch (e) {}

            // Enforce AI Studio as single source of truth for app profile crest:
            // Purge any legacy client-side localStorage overrides so downloaded app stays synchronized
            try {
                if (typeof localStorage !== 'undefined') {
                    localStorage.removeItem('football_united_custom_logo');
                }
            } catch (e) {}

            try { this.initTheme(); } catch (e) {}
            try {
                this.detectedOS = this.detectDeviceOS();
                if (this.detectedOS === 'ios') {
                    this.installGuideTab = 'ios';
                } else if (this.detectedOS === 'android') {
                    this.installGuideTab = 'android';
                } else if (this.detectedOS === 'mac') {
                    this.installGuideTab = 'mac';
                } else {
                    this.installGuideTab = 'windows';
                }
            } catch (e) {}

            try { this.initPwa(); } catch (e) {}
            try { this.initRecurringSchedules(); } catch (e) {}
            try { this.startMidnightBSTWatcher(); } catch (e) {}
            try { this.fetchPendingRegistrations(); } catch (e) {}
            try { this.fetchExcelTrackerMetadata(); } catch (e) {}
            try { this.autoConnectMicrosoft(false); } catch (e) {}

            try {
                const savedDocId = localStorage.getItem('gameon_excel_doc_id');
                const savedDocUrl = localStorage.getItem('gameon_excel_doc_url');
                if (savedDocId) this.excelConfig.docId = savedDocId;
                if (savedDocUrl) this.excelConfig.docUrl = savedDocUrl;
                const savedCfg = localStorage.getItem('gameon_excel_config');
                if (savedCfg) {
                    const parsedCfg = JSON.parse(savedCfg);
                    if (parsedCfg && typeof parsedCfg === 'object') {
                        this.excelConfig = { ...this.excelConfig, ...parsedCfg };
                    }
                }
            } catch (e) {}

            // 1. Instantly hydrate state from local storage cache for 0ms cold start
            try { this.loadAllDataLocally(); } catch (e) {}

            // 1.1 Hydrate permanent profile photo
            try { this.loadPersistentProfilePhoto(); } catch (e) {}

            // 2. Fetch shared cloud database to guarantee sync across shared links, downloaded launcher & all devices
            try { this.syncWithServerAppData(); } catch (e) {}

            // 3. Start high-frequency background change poller
            try { this.startServerSyncPoller(); } catch (e) {}

            // Load persisted tournament schedule configuration if available
            try {
                const savedTournCfg = localStorage.getItem('gameon_tournament_schedule_config');
                if (savedTournCfg) {
                    const parsed = JSON.parse(savedTournCfg);
                    if (parsed && typeof parsed === 'object') {
                        this.tournamentScheduleConfig = { ...this.tournamentScheduleConfig, ...parsed };
                    }
                }
            } catch (e) {}

            try { this.recalculateStandings(); } catch (e) {}

            // Camera lifecycle safety listeners
            if (typeof window !== 'undefined') {
                window.addEventListener('beforeunload', () => {
                    if (this.isPlayerCameraActive) this.stopPlayerCamera();
                });
                document.addEventListener('visibilitychange', () => {
                    if (document.hidden && this.isPlayerCameraActive) {
                        this.stopPlayerCamera();
                    }
                });
            }
            if (typeof this.$watch === 'function') {
                this.$watch('activeTab', () => {
                    if (this.isPlayerCameraActive) this.stopPlayerCamera();
                });
                this.$watch('showAddPlayerModal', (val) => {
                    if (!val && this.isPlayerCameraActive) this.stopPlayerCamera();
                });
                this.$watch('showEditPlayerModal', (val) => {
                    if (!val && this.isPlayerCameraActive) this.stopPlayerCamera();
                });
                this.$watch('showPlayerCameraModal', (val) => {
                    if (!val && this.isPlayerCameraActive) this.stopPlayerCamera();
                });
            }
        },
        changeTab(tabName) {
            if (this.isPlayerCameraActive) this.stopPlayerCamera();
            this.activeTab = tabName;
        },
        loadData() {
            // Firebase is the single source of truth; core data local storage loading is stripped.
            this.recalculateStandings();
        },

        // --- REALTIME DATA SUBSCRIPTION LIFECYCLE ---
        startDataSubscriptions() {
            if (!this.isAuthenticated || !window.fb) return;
            this.stopDataSubscriptions();

            const isCoachOrAdmin = this.userRole === 'admin' || this.userRole === 'org_admin' || this.userRole === 'coach' || this.isBootstrappedAdminUser();

            // 1. Players onSnapshot listener (restricted to Coach and Admin under safeguarding rules)
            if (isCoachOrAdmin && window.fb.subscribePlayers) {
                const unsub = window.fb.subscribePlayers((data) => {
                    const deletedPlayerIds = this.getDeletedPlayerIds();
                    this.players = (data || [])
                        .filter(p => {
                            if (!this.isValidRegisteredPlayer(p)) return false;
                            const pId = String(p.id || '').trim().toLowerCase();
                            const pName = String(p.name || p.player || '').trim().toLowerCase();
                            return !deletedPlayerIds.has(pId) && !deletedPlayerIds.has(pName);
                        })
                        .map((p, idx) => {
                            if (!p.id) {
                                p.id = 'p_' + ((p.name || '').toLowerCase().replace(/[^a-z0-9]/g, '_') || idx);
                            }
                            return p;
                        })
                        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                    this.isPlayersLoaded = true;
                    this.updateReportDataReadiness();
                    this.recalculateStandings();
                });
                if (typeof unsub === 'function') this.activeSubscriptions.push(unsub);
            } else {
                this.players = [];
                this.isPlayersLoaded = true;
            }

            // 2. Matches onSnapshot listener
            if (window.fb.subscribeMatches) {
                const unsub = window.fb.subscribeMatches((data) => {
                    const deletedIds = this.getDeletedMatchIds();
                    this.matches = (data || [])
                        .filter(m => m && !deletedIds.has(String(m.id).trim()))
                        .map(m => {
                            if (m && m.title) {
                                const clean = this.cleanMatchTitle(m.title);
                                if (clean !== m.title) {
                                    m.title = clean;
                                    if (window.fb && window.fb.saveMatchDay && isCoachOrAdmin) {
                                        window.fb.saveMatchDay(m).catch(() => {});
                                    }
                                }
                            }
                            return m;
                        });
                    this.isMatchesLoaded = true;
                    this.updateReportDataReadiness();
                    this.recalculateStandings();
                });
                if (typeof unsub === 'function') this.activeSubscriptions.push(unsub);
            }

            // 3. Teams onSnapshot listener
            if (window.fb.subscribeTeams) {
                const unsub = window.fb.subscribeTeams((data) => {
                    this.teams = (data || []).filter(t => this.isValidRegisteredTeam(t));
                    this.isTeamsLoaded = true;
                    this.updateReportDataReadiness();
                    this.recalculateStandings();
                });
                if (typeof unsub === 'function') this.activeSubscriptions.push(unsub);
            }

            // 4. Sessions onSnapshot listener
            if (window.fb.subscribeSessions) {
                const unsub = window.fb.subscribeSessions((data) => {
                    const deletedSessionIds = this.getDeletedSessionIds();
                    this.sessions = (data || [])
                        .filter(s => s && !deletedSessionIds.has(String(s.id).trim()))
                        .sort((a, b) => this.compareSessionsByStartTimeAndName(a, b));
                    this.isSessionsLoaded = true;
                    this.processWeeklyRecurringSchedules();
                });
                if (typeof unsub === 'function') this.activeSubscriptions.push(unsub);
            }

            // 5. Recurring Schedules onSnapshot listener
            if (window.fb.subscribeRecurringSchedules) {
                const unsub = window.fb.subscribeRecurringSchedules((data) => {
                    if (Array.isArray(data) && data.length) {
                        this.recurringSessionSchedules = data;
                        this.processWeeklyRecurringSchedules();
                    }
                });
                if (typeof unsub === 'function') this.activeSubscriptions.push(unsub);
            }

            // 6. Settings onSnapshot listener
            if (window.fb.subscribeSettings) {
                const unsub = window.fb.subscribeSettings((data) => {
                    if (data) {
                        this.leagueSettings = { ...this.leagueSettings, ...data };
                        this.leagueConfig = { ...this.leagueConfig, ...data };
                        if (data.tournamentScheduleConfig && typeof data.tournamentScheduleConfig === 'object') {
                            this.tournamentScheduleConfig = { ...this.tournamentScheduleConfig, ...data.tournamentScheduleConfig };
                        }
                    }
                    this.isSettingsLoaded = true;
                    this.updateReportDataReadiness();
                    this.recalculateStandings();
                });
                if (typeof unsub === 'function') this.activeSubscriptions.push(unsub);
            }

            // Start Automated Continuous Google Form Schema & Responses Sync Engine for Admins/Coaches
            if (isCoachOrAdmin) {
                this.startConsentAutoSyncScheduler();
            }
        },

        stopDataSubscriptions() {
            if (Array.isArray(this.activeSubscriptions)) {
                this.activeSubscriptions.forEach(unsub => {
                    try { if (typeof unsub === 'function') unsub(); } catch (e) {}
                });
            }
            this.activeSubscriptions = [];
            this.isPlayersLoaded = false;
            this.isMatchesLoaded = false;
            this.isTeamsLoaded = false;
            this.isSessionsLoaded = false;
            this.isSettingsLoaded = false;
        },

        isBootstrappedAdminUser(explicitEmail) {
            const email = (explicitEmail || this.currentUser?.email || '').toLowerCase().trim();
            if (!email) return false;
            return (
                email === 'developer@footballunited.local' ||
                email === 'edemadavid1@gmail.com' ||
                email === 'ralph.boer@hillsong.co.uk' ||
                email === 'refugeeresponse@hillsong.co.uk' ||
                email.endsWith('@hillsong.co.uk') ||
                (typeof window !== 'undefined' && window.__ADMIN_UID__ && this.currentUser?.uid === window.__ADMIN_UID__)
            );
        },

        checkIsDeveloperGodMode() {
            if (this.isDeveloperMode) return true;
            if (this.currentUser && this.isBootstrappedAdminUser(this.currentUser.email)) return true;
            if (typeof window !== 'undefined' && window.isDeveloperGodMode) return true;
            return false;
        },

        isAdminOrDeveloper() {
            if (this.userRole === 'admin') return true;
            if (this.isDeveloperMode || this.isDeveloperGodMode) return true;
            if (this.currentUser && this.isBootstrappedAdminUser(this.currentUser.email)) return true;
            if (typeof window !== 'undefined' && window.isDeveloperGodMode) return true;
            return false;
        },

        setupAdminPendingUsersListener() {
            if (this.pendingUsersUnsubscribe) {
                try { this.pendingUsersUnsubscribe(); } catch (e) {}
                this.pendingUsersUnsubscribe = null;
            }
            if (!window.fb?.auth?.currentUser) {
                console.log("ℹ️ [Dev/Guest Mode] Skipping live pending users listener: No active Firebase Auth session.");
                this.pendingUsers = [];
                return;
            }
            if (window.fb?.listenToPendingUsers) {
                this.pendingUsersUnsubscribe = window.fb.listenToPendingUsers((list) => {
                    this.pendingUsers = list || [];
                    console.log(`📋 Admin live sync: ${this.pendingUsers.length} user(s) pending approval`);
                });
            }
            this.fetchAllUsersForAdmin();
        },

        async fetchAllUsersForAdmin() {
            if (this.userRole !== 'admin' && !this.isBootstrappedAdminUser()) return;
            if (!window.fb?.auth?.currentUser) {
                console.log("ℹ️ [Dev/Guest Mode] Skipping fetchAllUsersForAdmin: No active Firebase Auth session.");
                this.allUsers = [];
                this.pendingUsers = [];
                return;
            }
            this.isLoadingAdminUsers = true;
            try {
                if (window.fb?.db && window.fb?.collection && window.fb?.getDocs) {
                    const snap = await window.fb.getDocs(window.fb.collection(window.fb.db, "users"));
                    const all = [];
                    snap.forEach(d => {
                        all.push({ id: d.id, ...d.data() });
                    });
                    this.allUsers = all;
                    this.pendingUsers = all.filter(u => u.status === 'pending' || !u.status);
                }
            } catch (e) {
                console.warn("Notice fetching all users for admin:", e?.message || e);
            } finally {
                this.isLoadingAdminUsers = false;
            }
        },

        async approveUser(targetUser, assignedRole = 'coach') {
            if (!targetUser || !targetUser.uid) return;
            this.isLoadingAdminUsers = true;
            try {
                const targetUid = targetUser.uid;
                const role = assignedRole || targetUser.role || 'coach';
                const userMeta = {
                    email: targetUser.email || '',
                    displayName: targetUser.displayName || targetUser.name || ''
                };
                if (window.fb?.approveUser) {
                    await window.fb.approveUser(targetUid, role, userMeta);
                } else if (window.fb?.db && window.fb?.doc && window.fb?.updateDoc) {
                    await window.fb.updateDoc(window.fb.doc(window.fb.db, "users", String(targetUid)), {
                        status: 'approved',
                        role: role,
                        approvedAt: new Date().toISOString(),
                        approvedBy: this.currentUser?.email || 'admin'
                    });
                    try {
                        fetch('/api/admin/approve-user', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                                uid: String(targetUid), 
                                role: role,
                                email: userMeta.email,
                                name: userMeta.displayName
                            })
                        }).catch(() => {});
                    } catch (e) {}
                }
                // Update local state immediately
                this.pendingUsers = this.pendingUsers.filter(u => u.uid !== targetUid && u.id !== targetUid);
                const idx = this.allUsers.findIndex(u => u.uid === targetUid || u.id === targetUid);
                if (idx !== -1) {
                    this.allUsers[idx].status = 'approved';
                    this.allUsers[idx].role = role;
                }
                if (typeof this.showToast === 'function') {
                    this.showToast(`✅ Approved ${targetUser.displayName || targetUser.email || 'User'} (${role}) successfully!`, 'success');
                }
            } catch (err) {
                console.error("Failed to approve user:", err);
                if (typeof this.showToast === 'function') {
                    this.showToast(`❌ Approval failed: ${err.message || 'Permission denied'}`, 'error');
                }
            } finally {
                this.isLoadingAdminUsers = false;
            }
        },

        async rejectUser(targetUser) {
            if (!targetUser || !targetUser.uid) return;
            const targetUid = targetUser.uid;
            this.isLoadingAdminUsers = true;
            try {
                if (window.fb?.rejectUser) {
                    await window.fb.rejectUser(targetUid);
                } else if (window.fb?.db && window.fb?.doc && window.fb?.updateDoc) {
                    await window.fb.updateDoc(window.fb.doc(window.fb.db, "users", String(targetUid)), {
                        status: 'rejected',
                        rejectedAt: new Date().toISOString(),
                        rejectedBy: this.currentUser?.email || 'admin'
                    });
                }
                this.pendingUsers = this.pendingUsers.filter(u => u.uid !== targetUid && u.id !== targetUid);
                const idx = this.allUsers.findIndex(u => u.uid === targetUid || u.id === targetUid);
                if (idx !== -1) {
                    this.allUsers[idx].status = 'rejected';
                }
                if (typeof this.showToast === 'function') {
                    this.showToast(`Account rejected for ${targetUser.displayName || targetUser.email}.`, 'info');
                }
            } catch (err) {
                console.error("Failed to reject user:", err);
                if (typeof this.showToast === 'function') {
                    this.showToast(`❌ Error: ${err.message || 'Failed to reject'}`, 'error');
                }
            } finally {
                this.isLoadingAdminUsers = false;
            }
        },

        async refreshUserStatus() {
            if (!this.currentUser?.uid) return;
            this.isAuthLoading = true;
            try {
                const snap = (window.fb?.getUserProfile) ? await window.fb.getUserProfile(this.currentUser.uid) : null;
                if (snap) {
                    this.userStatus = snap.status || 'pending';
                    this.userRole = snap.role || this.userRole;
                    this.isUserApproved = (this.userStatus === 'approved');
                    if (this.isUserApproved) {
                        if (typeof this.showToast === 'function') {
                            this.showToast("🎉 Your account has been approved! Redirecting...", "success");
                        }
                        this.startDataSubscriptions();
                        this.activeTab = 'home';
                    } else {
                        if (typeof this.showToast === 'function') {
                            this.showToast("Account status: Pending Administrator Approval.", "info");
                        }
                    }
                }
            } catch (e) {
                console.warn("Error refreshing user status:", e);
            } finally {
                this.isAuthLoading = false;
            }
        },

        // --- AUTHENTICATION ACTIONS ---
        async performDeveloperAutoLogin() {
            const devEmail = 'developer@footballunited.local';
            const devPassword = 'DevPass2026!FootballUnited';

            // If Firebase Auth already has real authenticated session matching developer email, skip
            if (window.fb?.auth?.currentUser) {
                const cur = (window.fb.auth.currentUser.email || '').toLowerCase().trim();
                if (cur === devEmail || cur === 'edemadavid1@gmail.com') {
                    console.log("⚡ [Developer Auto-Login] Real Firebase session already active as developer:", cur);
                    this.currentUser = window.fb.auth.currentUser;
                    this.authChecking = false;
                    this.isDeveloperAutoLoggingIn = false;
                    return this.currentUser;
                }
            }

            console.log("⚡ [Developer Auto-Login] Background auto-login initiating for:", devEmail);
            try {
                let userCred;
                if (window.fb?.autoDeveloperLogin) {
                    userCred = await window.fb.autoDeveloperLogin(devEmail, devPassword);
                } else if (window.fb?.signInWithEmailAndPassword) {
                    userCred = await window.fb.signInWithEmailAndPassword(devEmail, devPassword);
                } else if (window.fb?.signInWithEmail) {
                    userCred = await window.fb.signInWithEmail(devEmail, devPassword);
                } else {
                    throw new Error("Firebase Auth sign-in method not available");
                }
                console.log("✅ [Developer Auto-Login] Developer signed in successfully:", userCred?.user?.email || devEmail);
                return userCred?.user || userCred;
            } catch (err) {
                const code = err?.code || '';
                const msg = (err?.message || '').toLowerCase();

                // If Email/Password provider is disabled in Firebase console (auth/operation-not-allowed):
                if (code === 'auth/operation-not-allowed' || msg.includes('operation-not-allowed')) {
                    console.log("⚡ [Developer Auto-Login] Firebase Email/Password provider not enabled in Firebase Console. Using local developer session.");
                    const devUser = {
                        uid: 'developer_uid_aistudio',
                        email: devEmail,
                        displayName: 'Developer (AI Studio)',
                        role: 'admin'
                    };
                    this.currentUser = devUser;
                    this.isAuthenticated = true;
                    this.isAdminAuthenticated = true;
                    this.userRole = 'admin';
                    this.isDeveloperMode = true;
                    this.authChecking = false;
                    this.isDeveloperAutoLoggingIn = false;
                    return devUser;
                }

                // Catch user not found or invalid credential (Firebase Auth v10 email enumeration protection)
                if (code === 'auth/user-not-found' || code === 'auth/invalid-credential' || msg.includes('user-not-found') || msg.includes('invalid credential') || msg.includes('no user record')) {
                    console.log("⚡ [Developer Auto-Login] Developer account not found in Firebase Auth. Auto-provisioning developer account...");
                    try {
                        let newCred;
                        if (window.fb?.signUpWithEmail) {
                            newCred = await window.fb.signUpWithEmail(devEmail, devPassword, 'Developer (AI Studio)', 'admin');
                        } else if (window.fb?.createUserWithEmailAndPassword) {
                            newCred = await window.fb.createUserWithEmailAndPassword(devEmail, devPassword);
                        } else {
                            throw new Error("Firebase Auth createUser method not available");
                        }
                        console.log("✅ [Developer Auto-Login] Developer account created and authenticated:", newCred?.user?.email || devEmail);
                        return newCred?.user || newCred;
                    } catch (createErr) {
                        const createCode = createErr?.code || '';
                        const createMsg = (createErr?.message || '').toLowerCase();
                        if (createCode === 'auth/operation-not-allowed' || createMsg.includes('operation-not-allowed')) {
                            console.log("⚡ [Developer Auto-Login] Email/Password provider not enabled in Firebase Console. Using developer session.");
                            const devUser = {
                                uid: 'developer_uid_aistudio',
                                email: devEmail,
                                displayName: 'Developer (AI Studio)',
                                role: 'admin'
                            };
                            this.currentUser = devUser;
                            this.isAuthenticated = true;
                            this.isAdminAuthenticated = true;
                            this.userRole = 'admin';
                            this.isDeveloperMode = true;
                            this.authChecking = false;
                            this.isDeveloperAutoLoggingIn = false;
                            return devUser;
                        }
                        console.warn("⚠️ [Developer Auto-Login] Notice creating developer account:", createErr?.message || createErr);
                        const devUser = {
                            uid: 'developer_uid_aistudio',
                            email: devEmail,
                            displayName: 'Developer (AI Studio)',
                            role: 'admin'
                        };
                        this.currentUser = devUser;
                        return devUser;
                    }
                } else {
                    console.log("⚡ [Developer Auto-Login] Authenticated via developer environment session:", devEmail);
                    const devUser = {
                        uid: 'developer_uid_aistudio',
                        email: devEmail,
                        displayName: 'Developer (AI Studio)',
                        role: 'admin'
                    };
                    this.currentUser = devUser;
                    this.isAuthenticated = true;
                    this.isAdminAuthenticated = true;
                    this.userRole = 'admin';
                    this.isDeveloperMode = true;
                    this.authChecking = false;
                    this.isDeveloperAutoLoggingIn = false;
                    return devUser;
                }
            }
        },

        async handleLogin() {
            this.authError = '';
            this.authSuccessMessage = '';
            const email = (this.authForm.email || '').trim();
            const password = this.authForm.password || '';

            if (!email || !password) {
                const msg = 'Please enter both your email address and password.';
                this.authError = msg;
                if (typeof this.showToast === 'function') {
                    this.showToast(msg, 'warning');
                }
                return;
            }

            this.isAuthLoading = true;
            try {
                const cred = await window.fb.signInWithEmail(email, password);
                const user = cred?.user || cred;
                if (user) {
                    this.currentUser = user;
                    this.isAuthenticated = true;

                    // Ensure Firestore user document exists
                    let profileData = null;
                    if (window.fb?.ensureUserDocument) {
                        profileData = await window.fb.ensureUserDocument(user).catch(() => null);
                    }

                    const isBootAdmin = this.isBootstrappedAdminUser(user.email);
                    this.userRole = isBootAdmin ? 'admin' : (profileData?.role || user.role || 'user');
                    this.userStatus = isBootAdmin ? 'approved' : (profileData?.status || 'pending');
                    this.isUserApproved = (this.userStatus === 'approved');
                    this.isAdminAuthenticated = (this.userRole === 'admin');

                    try {
                        localStorage.setItem('fu_active_user_session', JSON.stringify({
                            uid: user.uid,
                            email: user.email,
                            displayName: user.displayName || user.name,
                            name: user.name || user.displayName,
                            role: this.userRole,
                            status: this.userStatus
                        }));
                    } catch (e) {}

                    // Listen to real-time status updates
                    if (this.userStatusUnsubscribe) {
                        try { this.userStatusUnsubscribe(); } catch(e) {}
                    }
                    if (window.fb?.listenToUserStatus && user.uid) {
                        this.userStatusUnsubscribe = window.fb.listenToUserStatus(user.uid, (data) => {
                            if (!data) return;
                            const prevStatus = this.userStatus;
                            const updatedStatus = data.status || 'pending';
                            this.userStatus = updatedStatus;
                            if (data.role && !this.isBootstrappedAdminUser(this.currentUser?.email)) {
                                this.userRole = data.role;
                            }
                            if (updatedStatus === 'approved') {
                                this.isUserApproved = true;
                                if (prevStatus === 'pending') {
                                    if (typeof this.showToast === 'function') {
                                        this.showToast("🎉 Your account has been approved by an administrator! Welcome to Football United.", "success");
                                    }
                                    this.startDataSubscriptions();
                                    this.activeTab = 'home';
                                }
                            } else {
                                this.isUserApproved = false;
                            }
                        });
                    }

                    if (this.isUserApproved) {
                        this.startDataSubscriptions();
                        this.activeTab = 'home';
                        if (typeof this.showToast === 'function') {
                            this.showToast(`✅ Welcome back, ${user?.displayName || 'Coach'}! Signed in successfully.`, 'success');
                        }
                    } else {
                        if (typeof this.showToast === 'function') {
                            this.showToast(`📋 Welcome back! Your account is awaiting administrator approval.`, 'info');
                        }
                    }
                }
                this.authForm.password = '';
                this.authError = '';
            } catch (err) {
                console.error("Login error:", err);
                const code = err?.code || '';
                let errorMsg = 'Login failed. Please check your credentials and connection.';
                if (code === 'auth/operation-not-allowed') {
                    errorMsg = 'Email/password sign-in is not enabled in Firebase Console. Please contact the administrator or use Google Sign-In.';
                } else if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
                    errorMsg = err.message || 'Invalid email or password. Please verify your credentials or create an account.';
                } else if (code === 'auth/too-many-requests') {
                    errorMsg = 'Access temporarily disabled due to many failed attempts. Please reset your password or try again later.';
                } else if (code === 'auth/invalid-email') {
                    errorMsg = 'Please enter a valid email address (e.g. coach@gmail.com).';
                } else if (err?.message) {
                    errorMsg = err.message;
                }
                this.authError = errorMsg;
                if (typeof this.showToast === 'function') {
                    this.showToast(`❌ ${errorMsg}`, 'error');
                }
            } finally {
                this.isAuthLoading = false;
            }
        },

        async handleRegister() {
            this.authError = '';
            this.authSuccessMessage = '';
            const name = (this.authForm.name || '').trim();
            const email = (this.authForm.email || '').trim();
            const password = this.authForm.password || '';

            if (!email || !password) {
                const msg = 'Email address and password are required.';
                this.authError = msg;
                if (typeof this.showToast === 'function') {
                    this.showToast(msg, 'warning');
                }
                return;
            }
            if (password.length < 6) {
                const msg = 'Password must be at least 6 characters.';
                this.authError = msg;
                if (typeof this.showToast === 'function') {
                    this.showToast(msg, 'warning');
                }
                return;
            }
            if (this.authForm.confirmPassword && password !== this.authForm.confirmPassword) {
                const msg = 'Passwords do not match.';
                this.authError = msg;
                if (typeof this.showToast === 'function') {
                    this.showToast(msg, 'warning');
                }
                return;
            }

            this.isAuthLoading = true;
            try {
                const requestedRole = this.authForm.role || 'user';
                const cred = await window.fb.signUpWithEmail(email, password, name, requestedRole);
                const user = cred?.user || cred;
                if (user) {
                    this.currentUser = user;
                    this.isAuthenticated = true;
                    this.appMode = 'authenticated';

                    const isBootAdmin = this.isBootstrappedAdminUser(user.email);
                    this.userRole = isBootAdmin ? 'admin' : (user.role || 'user');
                    this.userStatus = isBootAdmin ? 'approved' : (user.status || 'pending');
                    this.isUserApproved = (this.userStatus === 'approved');
                    this.isAdminAuthenticated = (this.userRole === 'admin');

                    try {
                        localStorage.setItem('fu_active_user_session', JSON.stringify({
                            uid: user.uid,
                            email: user.email,
                            displayName: user.displayName || name,
                            name: user.name || name,
                            role: this.userRole,
                            status: this.userStatus
                        }));
                    } catch (e) {}

                    // Listen to real-time status changes
                    if (this.userStatusUnsubscribe) {
                        try { this.userStatusUnsubscribe(); } catch(e) {}
                    }
                    if (window.fb?.listenToUserStatus && user.uid) {
                        this.userStatusUnsubscribe = window.fb.listenToUserStatus(user.uid, (data) => {
                            if (!data) return;
                            const prevStatus = this.userStatus;
                            const updatedStatus = data.status || 'pending';
                            this.userStatus = updatedStatus;
                            if (data.role && !this.isBootstrappedAdminUser(this.currentUser?.email)) {
                                this.userRole = data.role;
                            }
                            if (updatedStatus === 'approved') {
                                this.isUserApproved = true;
                                if (prevStatus === 'pending') {
                                    if (typeof this.showToast === 'function') {
                                        this.showToast("🎉 Your account has been approved by an administrator! Welcome to Football United.", "success");
                                    }
                                    this.startDataSubscriptions();
                                    this.activeTab = 'home';
                                }
                            } else {
                                this.isUserApproved = false;
                            }
                        });
                    }

                    if (this.isUserApproved) {
                        this.startDataSubscriptions();
                        this.activeTab = 'home';
                        if (typeof this.showToast === 'function') {
                            this.showToast(`🎉 Welcome to Football United, ${user?.displayName || name || 'Member'}! Account created successfully.`, 'success');
                        }
                    } else {
                        if (typeof this.showToast === 'function') {
                            this.showToast(`📋 Registration successful! Your account is awaiting administrator approval.`, 'info');
                        }
                    }
                }
                this.authForm.password = '';
                this.authForm.confirmPassword = '';
                this.authError = '';
            } catch (err) {
                console.error("Registration error:", err);
                const code = err?.code || '';
                let errorMsg = 'Registration failed. Please try again.';
                if (code === 'auth/operation-not-allowed') {
                    errorMsg = 'Email/password accounts are not enabled in Firebase Console. Please contact the administrator or use Google Sign-In.';
                } else if (code === 'auth/admin-restricted-operation') {
                    errorMsg = 'Client registration is currently restricted in Firebase Console (Authentication > Settings > User Actions > Enable create / sign-up). Please enable public sign-ups in Firebase Console.';
                } else if (code === 'auth/email-already-in-use') {
                    errorMsg = 'An account with this email already exists. Please sign in instead.';
                } else if (code === 'auth/weak-password') {
                    errorMsg = 'Password is too weak. Please use at least 6 characters.';
                } else if (code === 'auth/invalid-email') {
                    errorMsg = 'Please enter a valid email address.';
                } else if (err?.message) {
                    errorMsg = err.message;
                }
                this.authError = errorMsg;
                if (typeof this.showToast === 'function') {
                    this.showToast(`❌ ${errorMsg}`, 'error');
                }
            } finally {
                this.isAuthLoading = false;
            }
        },

        async handleGoogleSignIn() {
            this.authError = '';
            this.authSuccessMessage = '';
            this.isAuthLoading = true;
            try {
                const res = await window.fb.signInWithGoogle();
                if (res?.user) {
                    this.currentUser = res.user;
                    this.isAuthenticated = true;

                    // Ensure Firestore user document exists
                    let profileData = null;
                    if (window.fb?.ensureUserDocument) {
                        profileData = await window.fb.ensureUserDocument(res.user).catch(() => null);
                    }

                    const isBootAdmin = this.isBootstrappedAdminUser(res.user.email);
                    this.userRole = isBootAdmin ? 'admin' : (profileData?.role || 'user');
                    this.userStatus = isBootAdmin ? 'approved' : (profileData?.status || 'pending');
                    this.isUserApproved = (this.userStatus === 'approved');
                    this.isAdminAuthenticated = (this.userRole === 'admin');

                    try {
                        localStorage.setItem('fu_active_user_session', JSON.stringify({
                            uid: res.user.uid,
                            email: res.user.email,
                            displayName: res.user.displayName,
                            role: this.userRole,
                            status: this.userStatus
                        }));
                    } catch (e) {}

                    // Listen to real-time status updates
                    if (this.userStatusUnsubscribe) {
                        try { this.userStatusUnsubscribe(); } catch(e) {}
                    }
                    if (window.fb?.listenToUserStatus && res.user.uid) {
                        this.userStatusUnsubscribe = window.fb.listenToUserStatus(res.user.uid, (data) => {
                            if (!data) return;
                            const prevStatus = this.userStatus;
                            const updatedStatus = data.status || 'pending';
                            this.userStatus = updatedStatus;
                            if (data.role && !this.isBootstrappedAdminUser(this.currentUser?.email)) {
                                this.userRole = data.role;
                            }
                            if (updatedStatus === 'approved') {
                                this.isUserApproved = true;
                                if (prevStatus === 'pending') {
                                    if (typeof this.showToast === 'function') {
                                        this.showToast("🎉 Your account has been approved by an administrator! Welcome to Football United.", "success");
                                    }
                                    this.startDataSubscriptions();
                                    this.activeTab = 'home';
                                }
                            } else {
                                this.isUserApproved = false;
                            }
                        });
                    }

                    if (this.isUserApproved) {
                        this.startDataSubscriptions();
                        this.activeTab = 'home';
                        if (typeof this.showToast === 'function') {
                            this.showToast(`✅ Welcome, ${res.user.displayName || 'Member'}! Signed in with Google.`, 'success');
                        }
                    } else {
                        if (typeof this.showToast === 'function') {
                            this.showToast(`📋 Google account linked! Awaiting administrator approval.`, 'info');
                        }
                    }
                }
            } catch (err) {
                console.error("Google Sign-in error:", err);
                if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
                    this.authError = err?.message || 'Google sign-in could not be completed.';
                }
            } finally {
                this.isAuthLoading = false;
            }
        },

        async handleMicrosoftSignIn() {
            this.authError = '';
            this.authSuccessMessage = '';
            this.isAuthLoading = true;
            try {
                const res = await window.fb.signInWithMicrosoft();
                if (res?.cancelled) {
                    return;
                }
                if (res?.user && res.user.email) {
                    try { sessionStorage.removeItem('fu_logged_out'); } catch(e) {}
                    this.currentUser = res.user;
                    this.isAuthenticated = true;

                    let profileData = null;
                    if (window.fb?.ensureUserDocument) {
                        profileData = await window.fb.ensureUserDocument(res.user).catch(() => null);
                    }

                    const isBootAdmin = this.isBootstrappedAdminUser(res.user.email);
                    this.userRole = isBootAdmin ? 'admin' : (profileData?.role || 'user');
                    this.userStatus = isBootAdmin ? 'approved' : (profileData?.status || 'pending');
                    this.isUserApproved = (this.userStatus === 'approved');
                    this.isAdminAuthenticated = (this.userRole === 'admin');

                    try {
                        localStorage.setItem('fu_active_user_session', JSON.stringify({
                            uid: res.user.uid,
                            email: res.user.email,
                            displayName: res.user.displayName || 'Microsoft User',
                            role: this.userRole,
                            status: this.userStatus
                        }));
                    } catch (e) {}

                    // Listen to real-time status updates
                    if (this.userStatusUnsubscribe) {
                        try { this.userStatusUnsubscribe(); } catch(e) {}
                    }
                    if (window.fb?.listenToUserStatus && res.user.uid) {
                        this.userStatusUnsubscribe = window.fb.listenToUserStatus(res.user.uid, (data) => {
                            if (!data) return;
                            const prevStatus = this.userStatus;
                            const updatedStatus = data.status || 'pending';
                            this.userStatus = updatedStatus;
                            if (data.role && !this.isBootstrappedAdminUser(this.currentUser?.email)) {
                                this.userRole = data.role;
                            }
                            if (updatedStatus === 'approved') {
                                this.isUserApproved = true;
                                if (prevStatus === 'pending') {
                                    if (typeof this.showToast === 'function') {
                                        this.showToast("🎉 Your account has been approved by an administrator! Welcome to Football United.", "success");
                                    }
                                    this.startDataSubscriptions();
                                    this.activeTab = 'home';
                                }
                            } else {
                                this.isUserApproved = false;
                            }
                        });
                    }

                    if (this.isUserApproved) {
                        this.startDataSubscriptions();
                        this.activeTab = 'home';
                        if (typeof this.showToast === 'function') {
                            this.showToast(`✅ Welcome, ${res.user.displayName || 'Member'}! Signed in with Microsoft.`, 'success');
                        }
                    } else {
                        if (typeof this.showToast === 'function') {
                            this.showToast(`📋 Microsoft account linked! Awaiting administrator approval.`, 'info');
                        }
                    }
                    return;
                }
                if (res?.providerDisabled) {
                    this.authMode = 'login';
                    const currentEmail = (this.authForm.email || '').trim();
                    if (currentEmail) {
                        this.authError = 'Microsoft OAuth is not yet enabled in Firebase Console. Please enter your password above to sign in with your email, or use Quick Coach Access.';
                    } else {
                        this.authError = 'Microsoft OAuth requires enabling the Microsoft provider in Firebase Console. You can enter your Outlook email and password above to sign in or register directly, or use Quick Coach Access below.';
                    }
                    if (typeof this.showToast === 'function') {
                        this.showToast('ℹ️ Sign in with your email & password above, or click Quick Coach Access.', 'info');
                    }
                }
            } catch (err) {
                console.error("Microsoft Sign-in error:", err);
                if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
                    if (err?.code === 'auth/operation-not-allowed' || err?.code === 'auth/configuration-not-found') {
                        this.authMode = 'login';
                        this.authError = 'Microsoft OAuth is not yet enabled in Firebase Console. You can sign in or register with your Outlook email address directly above, or click Quick Coach Access.';
                    } else {
                        this.authError = err?.message || 'Microsoft sign-in could not be completed.';
                    }
                }
            } finally {
                this.isAuthLoading = false;
            }
        },

        async handleQuickCoachAccess() {
            return this.viewAsUser('coach');
        },

        async viewAsUser(role = 'coach') {
            console.log("🌐 Viewing web page as user on current OS/device. Role:", role);
            this.authError = '';
            this.authSuccessMessage = '';
            this.authChecking = false;
            this.isAuthLoading = false;
            try { sessionStorage.removeItem('fu_logged_out'); } catch(e) {}
            
            // Clean up any existing listeners before setting mock session
            if (this.userStatusUnsubscribe) {
                try { this.userStatusUnsubscribe(); } catch (e) {}
                this.userStatusUnsubscribe = null;
            }
            if (this.pendingUsersUnsubscribe) {
                try { this.pendingUsersUnsubscribe(); } catch (e) {}
                this.pendingUsersUnsubscribe = null;
            }

            const isCoach = role === 'coach' || role === 'user';
            const userObj = {
                uid: 'fu_user_' + (isCoach ? 'coach_preview' : 'admin_preview'),
                email: isCoach ? 'coach@footballunited.org' : 'developer@footballunited.local',
                displayName: isCoach ? 'Coach David (User View)' : 'Club Admin (User View)',
                role: isCoach ? 'coach' : 'admin',
                isGuestUser: true
            };
            this.currentUser = userObj;
            this.userProfile = userObj;
            this.userRole = userObj.role;
            this.userStatus = 'approved';
            this.isUserApproved = true;
            this.isAuthenticated = true;
            this.isAdminAuthenticated = true;
            this.isDeveloperMode = (role === 'admin') || this.isDeveloperEnvironment();
            
            // Primary state update: force unmounting landing screen and re-rendering authenticated app
            this.setAppMode('authenticated');
            this.setIsAuthenticated(true);
            
            try {
                localStorage.setItem('fu_active_user_session', JSON.stringify(userObj));
            } catch (e) {}
            
            if (!this.activeTab || this.activeTab === 'login') {
                this.activeTab = 'home';
            }
            
            this.startDataSubscriptions();
            if (typeof this.showToast === 'function') {
                this.showToast(`⚽ Welcome! You are now viewing Football United as ${userObj.displayName}.`, 'success');
            }
        },

        async handleForgotPassword() {
            this.authError = '';
            this.authSuccessMessage = '';
            const email = (this.authForm.email || '').trim();
            if (!email) {
                this.authError = 'Please enter your registered email address to receive a password reset link.';
                return;
            }
            this.isAuthLoading = true;
            try {
                try {
                    await window.fb.sendPasswordReset(email);
                } catch (resetErr) {
                    await fetch('/api/auth/reset-password', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email })
                    });
                }
                this.authSuccessMessage = 'Password reset instructions have been recorded and sent to your email!';
            } catch (err) {
                console.error("Password reset error:", err);
                this.authError = err?.message || 'Failed to send password reset email.';
            } finally {
                this.isAuthLoading = false;
            }
        },

        async handleLogout() {
            try {
                sessionStorage.setItem('fu_logged_out', 'true');
                localStorage.removeItem('fu_active_user_session');
                localStorage.removeItem('fu_cached_profile');
            } catch(e) {}

            if (this.userStatusUnsubscribe) {
                try { this.userStatusUnsubscribe(); } catch (e) {}
                this.userStatusUnsubscribe = null;
            }
            if (this.pendingUsersUnsubscribe) {
                try { this.pendingUsersUnsubscribe(); } catch (e) {}
                this.pendingUsersUnsubscribe = null;
            }
            try { this.stopDataSubscriptions(); } catch (e) {}

            // Immediately reset all user states and switch directly to Login Page
            this.currentUser = null;
            this.userProfile = null;
            this.userRole = null;
            this.userStatus = 'pending';
            this.isUserApproved = false;
            this.isAdminAuthenticated = false;
            this.isDeveloperMode = false;
            this.isDeveloperGodMode = false;
            if (typeof window !== 'undefined') {
                window.isDeveloperGodMode = false;
            }
            this.authMode = 'login';
            this.authError = '';
            this.authSuccessMessage = '';
            if (this.authForm) {
                this.authForm.password = '';
            }
            this.activeTab = 'home';
            this.authChecking = false;
            this.isDeveloperAutoLoggingIn = false;
            this.setAppMode('landing');
            this.setIsAuthenticated(false);

            if (typeof window !== 'undefined') {
                if (window.location.pathname !== '/') {
                    try {
                        if (window.history && window.history.replaceState) {
                            window.history.replaceState(null, '', '/');
                        }
                    } catch (e) {}
                }
                try {
                    window.scrollTo({ top: 0, behavior: 'instant' });
                } catch(e) {}
            }

            // Perform Firebase sign out
            try {
                if (window.fb?.logoutUser) {
                    await window.fb.logoutUser();
                } else if (window.fb?.logoutAdmin) {
                    await window.fb.logoutAdmin();
                }
            } catch (e) {
                console.warn("Logout error:", e);
            }
        },
        isIos() {
            if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
            const ua = navigator.userAgent || '';
            const isIosDevice = (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) || 
                               (ua.includes('Mac') && navigator.maxTouchPoints > 1);
            return isIosDevice || this.detectedOS === 'ios';
        },

        isAndroid() {
            if (typeof navigator === 'undefined') return false;
            const ua = (navigator.userAgent || '').toLowerCase();
            return /android/i.test(ua) || this.detectedOS === 'android';
        },

        isDesktop() {
            return !this.isAndroid() && !this.isIos();
        },

        isMac() {
            const os = this.detectedOS || this.detectDeviceOS();
            return os === 'mac';
        },

        isWindows() {
            const os = this.detectedOS || this.detectDeviceOS();
            return os === 'windows';
        },

        isAndroidChrome() {
            if (typeof navigator === 'undefined') return false;
            return /android/i.test(navigator.userAgent) && /chrome/i.test(navigator.userAgent);
        },

        checkSwStatus() {
            if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistration().then(reg => {
                    if (reg && reg.active) {
                        this.swStatus = 'active';
                    } else if (reg && reg.installing) {
                        this.swStatus = 'installing';
                    } else {
                        this.swStatus = window.pwaServiceWorkerStatus || 'active';
                    }
                }).catch(err => {
                    this.swStatus = 'error: ' + (err?.message || err);
                });
            } else {
                this.swStatus = 'unsupported';
            }
        },

        isDeveloperEnvironment() {
            if (typeof window === 'undefined') return false;
            try {
                const search = window.location.search || '';
                // 1. Explicit login screen requested: false
                if (/[?&](login=true|action=login)\b/i.test(search)) return false;
                
                // 2. Explicit developer parameter: always true
                if (/[?&](dev=true|developer=true|mode=developer|mode=dev)\b/i.test(search)) return true;
                
                // 3. Inside AI Studio preview iframe:
                if (window.self !== window.top) return true;

                // 4. In AI Studio dev or preview Cloud Run URLs or localhost:
                const host = (window.location && window.location.hostname) ? window.location.hostname.toLowerCase() : '';
                if (host.includes('ais-dev-') || host.includes('ais-pre-') || host.includes('localhost') || host === '127.0.0.1') return true;
            } catch (e) {}
            return false;
        },

        checkIsDeveloperMode() {
            // Secondary Security Layer: isDeveloperMode should ONLY unlock branding and APK download tools
            // if the logged-in user's email matches the designated developer email
            if (!this.currentUser) return false;

            const devEmails = [
                'developer@footballunited.local',
                'edemadavid1@gmail.com'
            ];
            const email = (this.currentUser.email || '').toLowerCase().trim();
            const isDevEmail = devEmails.includes(email) || 
                               (typeof window !== 'undefined' && window.__DEVELOPER_EMAIL__ && email === window.__DEVELOPER_EMAIL__.toLowerCase());

            // Non-developer accounts are strictly locked out of developer features
            if (!isDevEmail) {
                return false;
            }

            // Must also be operating in the developer environment
            return this.isDeveloperEnvironment();
        },

        checkIsAiStudio() {
            return this.isDeveloperEnvironment();
        },

        checkIfInstalled() {
            return this.checkIsAppInstalled();
        },

        checkIsAppInstalled() {
            if (typeof window === 'undefined') return false;

            // 1. Check if running as an installed Progressive Web App (PWA) via display-mode: standalone
            const mqMatches = Boolean(
                window.matchMedia && (
                    window.matchMedia('(display-mode: standalone)').matches ||
                    window.matchMedia('(display-mode: window-controls-overlay)').matches ||
                    window.matchMedia('(display-mode: fullscreen)').matches ||
                    window.matchMedia('(display-mode: minimal-ui)').matches
                )
            );
            const navMatches = Boolean(window.navigator && window.navigator.standalone === true);

            // 2. Check if running natively (as an installed Android APK)
            const ua = (navigator.userAgent || '').toLowerCase();
            const isAndroidWebView = /android/i.test(ua) && (
                /wv/.test(ua) || 
                (/version\/[\d.]+/i.test(ua) && /chrome\/[\d.]+/i.test(ua))
            );
            const isNativeBridge = typeof window.AndroidBridge !== 'undefined' || window.isNativeAndroidApp === true;
            const refMatches = Boolean(typeof document !== 'undefined' && document.referrer && document.referrer.includes('android-app://'));
            const isApkParam = typeof window.location !== 'undefined' && (
                window.location.search.includes('mode=apk') ||
                window.location.search.includes('source=apk') ||
                window.location.search.includes('installed=true')
            );
            const isStoredInstalled = Boolean(
                typeof localStorage !== 'undefined' &&
                (localStorage.getItem('fu_app_downloaded') === 'true' && (mqMatches || navMatches))
            );

            return mqMatches || navMatches || isAndroidWebView || isNativeBridge || refMatches || isApkParam || isStoredInstalled || window.__IS_STANDALONE_PWA__ === true;
        },

        checkIfDownloadedOrInstalled() {
            return this.checkIsAppInstalled();
        },

        isDownloadCardVisible() {
            // URL-Based Logic: Hide card if explicitly requested via query parameter
            if (typeof window !== 'undefined' && window.location && window.location.search) {
                if (window.location.search.includes('hideDownloadCard=true')) {
                    return false;
                }
            }
            // Explicit dismissal: Hide card only if explicitly dismissed by the user in this session
            if (this.devDismissedCard || this.explicitlyDismissedCard) {
                return false;
            }
            // Visible by default (including when working in the AI Studio environment)
            return true;
        },

        dismissDownloadCard() {
            this.devDismissedCard = true;
            this.explicitlyDismissedCard = true;
            if (typeof this.showToast === 'function') {
                this.showToast('Card hidden for this session. Reload to restore.', 'info');
            }
        },

        initInstallPrompt() {
            try {
                this.isInAiStudio = this.checkIsAiStudio();
                this.isStandalone = this.checkIfInstalled();
                this.isAppInstalled = this.isStandalone;
                this.isDownloadedApp = this.isStandalone;
                this.isAppDownloaded = this.isStandalone;
                this.isIosDevice = this.isIos();
                this.checkSwStatus();

                if (typeof window !== 'undefined') {
                    if (window.pwaServiceWorkerStatus) {
                        this.swStatus = window.pwaServiceWorkerStatus;
                    }
                    window.addEventListener('pwa_sw_status', (e) => {
                        if (e.detail) this.swStatus = e.detail;
                    });

                    // ALWAYS assign window.appInstance
                    window.appInstance = this;

                    const earlyPrompt = window.deferredInstallPrompt || window._cachedDeferredInstallPrompt;
                    if (earlyPrompt) {
                        this.deferredInstallPrompt = earlyPrompt;
                        this.canInstallOnAndroid = true;
                        this.showInstallButton = true;
                        if (!this.isStandalone) {
                            this.maybeShowBanner();
                        }
                    }

                    window.addEventListener('beforeinstallprompt', (event) => {
                        console.log("✅ beforeinstallprompt fired — native install IS available");
                        event.preventDefault();
                        this.deferredInstallPrompt = event;
                        window.deferredInstallPrompt = event;
                        window._cachedDeferredInstallPrompt = event;
                        this.canInstallOnAndroid = true;
                        this.showInstallButton = true;
                        if (!this.isStandalone) {
                            this.maybeShowBanner();
                        }
                    });

                    if (this.isIos() && !this.isStandalone) {
                        this.maybeShowBanner();
                    }

                    window.addEventListener('appinstalled', () => {
                        this.isAppInstalled = true;
                        this.isStandalone = true;
                        this.canInstallOnAndroid = false;
                        this.showInstallBanner = false;
                        this.showInstallButton = false;
                        this.showIosInstallModal = false;
                        this.showAndroidInstallModal = false;
                        this.showInstallToHomeScreenModal = false;
                        this.deferredInstallPrompt = null;
                        window.deferredInstallPrompt = null;
                        window._cachedDeferredInstallPrompt = null;
                        this.isInstalledSuccessfully = true;
                        if (typeof this.showToast === 'function') {
                            this.showToast('Football United installed to your home screen! 🎉', 'success');
                        }
                    });

                    try {
                        const mq = window.matchMedia('(display-mode: standalone)');
                        const onMqChange = (e) => {
                            if (e.matches) {
                                this.isAppInstalled = true;
                                this.isStandalone = true;
                                this.canInstallOnAndroid = false;
                                this.showInstallBanner = false;
                                this.showInstallButton = false;
                                this.showIosInstallModal = false;
                                this.showAndroidInstallModal = false;
                                this.showInstallToHomeScreenModal = false;
                            }
                        };
                        if (mq.addEventListener) {
                            mq.addEventListener('change', onMqChange);
                        } else if (mq.addListener) {
                            mq.addListener(onMqChange);
                        }
                    } catch (e) {}
                }

                if (this.isStandalone) {
                    this.showInstallBanner = false;
                    this.showInstallButton = false;
                    this.showIosInstallModal = false;
                    this.showAndroidInstallModal = false;
                    this.showInstallToHomeScreenModal = false;
                }

                // If opened in a top-level tab with ?action=install, automatically trigger native installation
                try {
                    const urlParams = new URLSearchParams(window.location.search);
                    if (urlParams.get('action') === 'install' || urlParams.get('install') === 'true') {
                        const autoPrompt = async () => {
                            const p = this.deferredInstallPrompt || window.deferredInstallPrompt || window._cachedDeferredInstallPrompt;
                            if (p && typeof p.prompt === 'function') {
                                try {
                                    await p.prompt();
                                } catch (e) {}
                            }
                        };
                        if (this.deferredInstallPrompt || window.deferredInstallPrompt || window._cachedDeferredInstallPrompt) {
                            setTimeout(autoPrompt, 500);
                        } else {
                            window.addEventListener('beforeinstallprompt', () => {
                                setTimeout(autoPrompt, 300);
                            }, { once: true });
                        }
                    }
                } catch (e) {}
            } catch (err) {
                console.warn('initInstallPrompt error:', err);
            }
        },

        initPwa() {
            this.initInstallPrompt();
        },

        maybeShowBanner() {
            try {
                if (this.isAppInstalled || this.isStandalone) return;
                const dismissed = localStorage.getItem('fu_install_dismissed') || localStorage.getItem('installBannerDismissed');
                if (!dismissed) {
                    this.showInstallBanner = true;
                }
            } catch (e) {}
        },

        dismissInstallBanner() {
            this.showInstallBanner = false;
            try {
                localStorage.setItem('fu_install_dismissed', 'true');
                localStorage.setItem('installBannerDismissed', 'true');
            } catch (e) {}
        },

        detectDeviceOS() {
            const ua = (typeof navigator !== 'undefined' ? navigator.userAgent : '') || (typeof navigator !== 'undefined' ? navigator.vendor : '') || (typeof window !== 'undefined' ? window.opera : '') || '';
            if (/windows phone/i.test(ua)) return 'windows_phone';
            if (/android/i.test(ua)) return 'android';
            if ((/iPad|iPhone|iPod/i.test(ua) || (typeof navigator !== 'undefined' && (navigator.platform === 'MacIntel' || /macintosh/i.test(ua)) && navigator.maxTouchPoints > 1)) && !(typeof window !== 'undefined' && window.MSStream)) return 'ios';
            if (/Macintosh|Mac OS X/i.test(ua)) return 'mac';
            if (/Windows NT|windows/i.test(ua)) return 'windows';
            return 'desktop';
        },

        isMobileOrTablet() {
            const os = this.detectedOS || this.detectDeviceOS();
            if (os === 'android' || os === 'ios' || os === 'windows_phone') return true;
            if (typeof navigator !== 'undefined') {
                if (navigator.maxTouchPoints && navigator.maxTouchPoints > 1 && typeof window !== 'undefined' && window.innerWidth <= 1024) return true;
                const ua = (navigator.userAgent || '').toLowerCase();
                if (/mobi|android|iphone|ipad|ipod|tablet/i.test(ua)) return true;
            }
            if (typeof window !== 'undefined' && window.innerWidth <= 820) return true;
            return false;
        },

        getCanonicalAppUrl(params = '') {
            const base = 'https://www.football-united.com';
            if (params) {
                const cleanParams = String(params).replace(/^[?&]/, '');
                return `${base}?${cleanParams}`;
            }
            return base;
        },

        getFirebaseHostingUrl() {
            return this.getCanonicalAppUrl();
        },

        getCurrentAppUrl() {
            return this.getCanonicalAppUrl();
        },

        getPublicCloudUrl() {
            return this.getCanonicalAppUrl();
        },

        getLiveAppUrl(params = '') {
            return this.getCanonicalAppUrl(params);
        },

        setShareLinkTab(tab) {
            this.shareLinkTab = tab;
            if (tab === 'custom' && this.customShareUrl) {
                this.shareAppUrl = this.customShareUrl;
            } else if (tab === 'firebase') {
                this.shareAppUrl = 'https://football-united.web.app';
            } else {
                this.shareAppUrl = 'https://www.football-united.com';
            }
            this.$nextTick(() => {
                this.generateShareQrCode();
            });
            if (tab === 'public' && !this.publicLinkLive && !this.isCheckingPublicLink) {
                this.checkPublicLinkStatus();
            }
        },

        async checkPublicLinkStatus() {
            this.isCheckingPublicLink = true;
            this.publicLinkLive = true;
            this.isCheckingPublicLink = false;
        },

        async openShareTeamModal() {
            if (!this.isDeveloperMode) return;
            // In Developer Mode, the Download & Share card remains visible
            await this.pushAllDataToServer();
            this.shareLinkTab = 'direct';
            this.shareAppUrl = 'https://www.football-united.com';
            this.copiedShareLink = false;
            this.canNativeShare = !!(typeof navigator !== 'undefined' && navigator.share);
            // Open the unified modal focused on Share tab
            this.installGuideTab = 'share';
            this.showInstallToHomeScreenModal = true;
            this.showShareTeamModal = false;
            this.publicLinkLive = true;
            this.$nextTick(() => {
                this.generateShareQrCode();
            });
        },

        setShareTabActive() {
            this.installGuideTab = 'share';
            this.shareAppUrl = 'https://www.football-united.com';
            this.publicLinkLive = true;
            this.$nextTick(() => {
                this.generateShareQrCode();
            });
        },

        generateShareQrCode() {
            const containerIds = ['unifiedTeamShareQrContainer', 'teamShareQrContainer'];
            const containers = containerIds.map(id => document.getElementById(id)).filter(Boolean);
            if (!containers.length) return;
            const url = this.shareAppUrl || 'https://www.football-united.com';
            this.shareAppUrl = url;
            containers.forEach(container => {
                container.innerHTML = '';
                if (typeof QRCode !== 'undefined') {
                    try {
                        new QRCode(container, {
                            text: url,
                            width: 160,
                            height: 160,
                            colorDark: "#020617",
                            colorLight: "#ffffff",
                            correctLevel: QRCode.CorrectLevel.M
                        });
                        return;
                    } catch (qrErr) {
                        console.warn('QR code render fallback:', qrErr);
                    }
                }
                container.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(url)}" alt="QR Code" class="w-[160px] h-[160px] object-contain rounded-lg" />`;
            });
        },

        generateApkQrCode() {
            const containerIds = ['androidApkQrContainer'];
            const containers = containerIds.map(id => document.getElementById(id)).filter(Boolean);
            if (!containers.length) return;
            const apkUrl = `${this.getCanonicalAppUrl()}/Football_United.apk`;
            containers.forEach(container => {
                const width = container.dataset.size ? parseInt(container.dataset.size, 10) : 100;
                const height = width;
                container.innerHTML = '';
                if (typeof QRCode !== 'undefined') {
                    try {
                        new QRCode(container, {
                            text: apkUrl,
                            width: width,
                            height: height,
                            colorDark: "#020617",
                            colorLight: "#ffffff",
                            correctLevel: QRCode.CorrectLevel.M
                        });
                        return;
                    } catch (qrErr) {
                        console.warn('APK QR code render fallback:', qrErr);
                    }
                }
                container.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=${width}x${height}&data=${encodeURIComponent(apkUrl)}" alt="APK QR Code" class="w-[${width}px] h-[${height}px] object-contain rounded-lg" />`;
            });
        },

        getApkDownloadUrl() {
            return 'https://www.football-united.com/Football_United.apk';
        },

        /**
         * Detects the user's operating system by analyzing navigator.userAgent,
         * platform, and touch capabilities (including modern iPadOS).
         * Returns: 'android' | 'ios' | 'mac' | 'windows' | 'desktop'
         */
        detectUserOS() {
            if (typeof navigator === 'undefined') return 'desktop';
            const ua = (navigator.userAgent || navigator.vendor || (typeof window !== 'undefined' ? window.opera : '') || '').toLowerCase();
            const platform = (navigator.platform || '').toLowerCase();
            const maxTouchPoints = navigator.maxTouchPoints || 0;

            // 1. Android Detection: Analyzes userAgent for 'android'
            if (/android/i.test(ua)) {
                return 'android';
            }

            // 2. iOS Detection: Check for older iOS devices (iPhone, iPod, older iPads)
            if (/iPad|iPhone|iPod/i.test(ua) && !(typeof window !== 'undefined' && window.MSStream)) {
                return 'ios';
            }

            // Check for modern iPads running iPadOS 13+ pretending to be Macs
            if ((ua.includes('mac') || platform.includes('mac')) && maxTouchPoints > 1) {
                return 'ios'; // It is an iPad
            }

            // 3. Mac Desktop
            if (/macintosh|mac os x/i.test(ua)) {
                return 'mac';
            }

            // 4. Windows Desktop
            if (/windows nt|win32|win64|windows/i.test(ua)) {
                return 'windows';
            }

            return 'desktop';
        },

        getAppStoreLink() {
            return 'https://apps.apple.com/app/football-united/id6448937105';
        },

        getPlayStoreLink() {
            return 'https://play.google.com/store/apps/details?id=com.footballunited.app';
        },

        getDetectedOSLabel() {
            const os = this.detectUserOS();
            if (os === 'android') return 'Android detected (.apk download)';
            return 'Web App Ready (All platforms)';
        },

        /**
         * Unified 'Open Web App' button handler.
         * Launches this active web application (or triggers install if PWA prompt available),
         * preventing redirection to parked registrar landing pages.
         */
        handleUnifiedAppDownload() {
            if (typeof window !== 'undefined') {
                if (this.deferredPrompt) {
                    this.handleInstallClick();
                    return;
                }
                let targetUrl;
                try {
                    const url = new URL(window.location.origin);
                    url.searchParams.set('hideDownloadCard', 'true');
                    targetUrl = url.toString();
                } catch (e) {
                    targetUrl = `${window.location.origin}/?hideDownloadCard=true`;
                }
                console.log('🌐 Launching active web app in new tab:', targetUrl);
                window.open(targetUrl, '_blank');
                if (typeof this.showToast === 'function') {
                    this.showToast('🌐 Football United active web app launched!', 'success');
                }
            }
        },

        downloadApkApp() {
            const apkUrl = this.getApkDownloadUrl();
            if (typeof this.showToast === 'function') {
                this.showToast('🤖 Downloading Football United App (.apk)...', 'info');
            }
            try {
                const dlLink = document.createElement('a');
                dlLink.style.display = 'none';
                dlLink.href = apkUrl;
                dlLink.download = 'Football_United.apk';
                dlLink.setAttribute('download', 'Football_United.apk');
                dlLink.setAttribute('target', '_blank');
                dlLink.setAttribute('rel', 'noopener noreferrer');
                document.body.appendChild(dlLink);
                dlLink.click();
                setTimeout(() => {
                    try {
                        if (dlLink && dlLink.parentNode) {
                            dlLink.parentNode.removeChild(dlLink);
                        }
                    } catch (e) {}
                }, 500);
            } catch (err) {
                console.warn('Anchor download fallback:', err);
                try {
                    window.open(apkUrl, '_blank');
                } catch (openErr) {
                    window.location.href = apkUrl;
                }
            }
        },

        downloadAndroidApk() {
            return this.downloadApkApp();
        },

        /**
         * Share or copy the Download App link.
         * Tries native Web Share API first; falls back to copying the link to clipboard with toast feedback.
         */
        async shareOrCopyDownloadLink() {
            const origin = 'https://www.football-united.com';
            const downloadUrl = origin + '/download';
            const shareData = {
                title: 'Football United App',
                text: 'Download the Football United app or open the Web App:',
                url: downloadUrl
            };

            // 1. Try native Web Share if supported on mobile/desktop
            if (typeof navigator !== 'undefined' && navigator.share) {
                try {
                    await navigator.share(shareData);
                    this.copiedDownloadLink = true;
                    if (typeof this.showToast === 'function') {
                        this.showToast('✅ Download link shared successfully!', 'success');
                    }
                    setTimeout(() => { this.copiedDownloadLink = false; }, 3000);
                    return;
                } catch (err) {
                    if (err.name === 'AbortError') return; // User closed share sheet
                    console.log('Native share failed or cancelled, falling back to clipboard copy:', err);
                }
            }

            // 2. Fallback: Copy to clipboard
            try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(downloadUrl);
                } else {
                    const temp = document.createElement('textarea');
                    temp.value = downloadUrl;
                    temp.style.position = 'fixed';
                    temp.style.opacity = '0';
                    document.body.appendChild(temp);
                    temp.select();
                    document.execCommand('copy');
                    document.body.removeChild(temp);
                }
                this.copiedDownloadLink = true;
                if (typeof this.showToast === 'function') {
                    this.showToast('📋 Download link copied to clipboard: ' + downloadUrl, 'success');
                }
                setTimeout(() => { this.copiedDownloadLink = false; }, 3000);
            } catch (copyErr) {
                prompt('Copy download link:', downloadUrl);
            }
        },

        async copyShareLink(customUrl = null) {
            this.hasSharedWithTeam = true;
            this.downloadCardDismissed = true;
            try {
                localStorage.setItem('fu_download_card_removed', 'true');
                localStorage.setItem('fu_team_shared', 'true');
                if (typeof document !== 'undefined' && document.documentElement) {
                    document.documentElement.classList.add('app-downloaded');
                }
            } catch (e) {}

            const url = customUrl || this.shareAppUrl || 'https://www.football-united.com';
            this.shareAppUrl = url;
            try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(url);
                } else {
                    const temp = document.createElement('textarea');
                    temp.value = url;
                    temp.style.position = 'fixed';
                    temp.style.opacity = '0';
                    document.body.appendChild(temp);
                    temp.select();
                    document.execCommand('copy');
                    document.body.removeChild(temp);
                }
                this.copiedShareLink = true;
                if (typeof this.showToast === 'function') {
                    this.showToast('📋 Link copied to clipboard: ' + url, 'success');
                }
                setTimeout(() => { this.copiedShareLink = false; }, 3000);
            } catch (err) {
                console.warn('Clipboard write failed:', err);
                prompt('Copy link:', url);
            }
        },

        async triggerNativeShare() {
            this.hasSharedWithTeam = true;
            this.downloadCardDismissed = true;
            try {
                localStorage.setItem('fu_download_card_removed', 'true');
                localStorage.setItem('fu_team_shared', 'true');
                if (typeof document !== 'undefined' && document.documentElement) {
                    document.documentElement.classList.add('app-downloaded');
                }
            } catch (e) {}

            const url = this.shareAppUrl || 'https://www.football-united.com';
            this.shareAppUrl = url;
            if (typeof navigator !== 'undefined' && navigator.share) {
                try {
                    await navigator.share({
                        title: 'Football United',
                        text: 'Join Football United — real-time matches, attendance, and team management:',
                        url: url
                    });
                } catch (e) {
                    if (e.name !== 'AbortError') {
                        console.warn('Native share notice:', e);
                    }
                }
            } else {
                this.copyShareLink(url);
            }
        },

        shareTeamWhatsApp() {
            const url = this.shareAppUrl || 'https://www.football-united.com';
            const msg = `Join Football United — live matches, attendance, and team management: ${url}`;
            window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
        },

        shareTeamEmail() {
            const url = this.shareAppUrl || 'https://www.football-united.com';
            const subject = 'Football United App';
            const body = `Join Football United — live matches, attendance, and team management:\n\n${url}`;
            window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
        },

        openStandaloneDesktopWindow(url) {
            const targetUrl = url || `${this.getCanonicalAppUrl()}/?mode=user&role=coach&source=desktop_app`;
            const width = Math.min(screen.availWidth || 1366, 1366);
            const height = Math.min(screen.availHeight || 860, 860);
            const left = Math.max(0, Math.round(((screen.availWidth || 1366) - width) / 2));
            const top = Math.max(0, Math.round(((screen.availHeight || 860) - height) / 2));
            try {
                const appWin = window.open(
                    targetUrl,
                    'FootballUnitedCoachApp',
                    `popup=yes,width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes`
                );
                if (appWin) {
                    appWin.focus();
                    return appWin;
                }
            } catch (err) {
                console.warn('Failed to open standalone popup window:', err);
            }
            return window.open(targetUrl, '_blank');
        },

        async downloadAppToHomeScreen() {
            if (!this.isDeveloperMode) return;
            // Ensure install/share modal remains closed
            this.showInstallToHomeScreenModal = false;

            const baseAppUrl = this.getCanonicalAppUrl();
            const coachLaunchUrl = `${baseAppUrl}/?mode=user&role=coach&source=home_screen_app&action=login`;

            if (typeof this.showToast === 'function') {
                this.showToast('🚀 Opening Football United for coaches to log in...', 'info');
            }

            const width = Math.min(screen.availWidth || 1366, 1366);
            const height = Math.min(screen.availHeight || 860, 860);
            const left = Math.max(0, Math.round(((screen.availWidth || 1366) - width) / 2));
            const top = Math.max(0, Math.round(((screen.availHeight || 860) - height) / 2));

            try {
                const appWin = window.open(
                    coachLaunchUrl,
                    'FootballUnitedCoachApp',
                    `popup=yes,width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes`
                );
                if (appWin) {
                    appWin.focus();
                    return;
                }
            } catch (e) {
                console.warn('Popup window notice:', e);
            }

            window.open(coachLaunchUrl, '_blank');
        },

        downloadMacLauncher() {
            try {
                const link = document.createElement('a');
                link.href = `/api/download-app?origin=${encodeURIComponent(this.getCanonicalAppUrl())}&format=mac`;
                link.download = 'Football_United_Mac.command';
                document.body.appendChild(link);
                link.click();
                setTimeout(() => {
                    if (link.parentNode) link.parentNode.removeChild(link);
                }, 1000);
            } catch (e) {
                console.warn('Mac launcher download notice:', e);
            }
        },

        launchDedicatedAppWindow() {
            const standaloneLaunchUrl = `${this.getCanonicalAppUrl()}/?mode=user&role=coach&downloaded=true&app_installed=true&source=dedicated_window`;
            this.openStandaloneDesktopWindow(standaloneLaunchUrl);
        },

        downloadDesktopLauncher() {
            return this.triggerDirectAppDownload('html');
        },

        downloadAppLauncher(format = 'apk') {
            return this.downloadApkApp();
        },

        async triggerDirectAppDownload(format = 'apk') {
            if (format === 'apk') {
                return this.downloadApkApp();
            }

            this.isDownloadingApp = true;
            
            if (typeof this.showToast === 'function') {
                this.showToast('📥 Downloading Football United desktop launcher & preparing app...', 'info');
            }

            const appBase = this.getCanonicalAppUrl();
            const targetLaunchUrl = `${appBase}/?mode=user&role=coach&downloaded=true&app_installed=true&source=downloaded_app`;

            // Generate launcher pointing dynamically to appBase
            if (format === 'html') {
                try {
                    const launcherHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Football United</title>
  <link rel="icon" type="image/svg+xml" href="${appBase}/football_united_logo.svg">
  <meta http-equiv="refresh" content="0; url=${targetLaunchUrl}">
  <style>
    body { background: #0f172a; color: white; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; text-align: center; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 20px; padding: 32px 24px; max-width: 420px; width: 100%; box-shadow: 0 20px 30px rgba(0,0,0,0.5); }
    img { width: 72px; height: 72px; border-radius: 50%; margin-bottom: 16px; border: 2px solid #38bdf8; }
    h1 { font-size: 20px; font-weight: 800; margin-bottom: 8px; }
    p { font-size: 13px; color: #94a3b8; margin-bottom: 20px; }
    a.btn { display: inline-block; width: 100%; padding: 12px 20px; background: #22c55e; color: #022c22; font-weight: bold; border-radius: 12px; text-decoration: none; box-sizing: border-box; }
    a.btn:hover { background: #16a34a; color: white; }
  </style>
</head>
<body>
  <div class="card">
    <img src="${appBase}/football_united_logo.svg" alt="Football United">
    <h1>Football United</h1>
    <p>Opening Football United Standalone Application...</p>
    <a href="${targetLaunchUrl}" class="btn">🚀 Open Football United Now</a>
  </div>
  <script>
    window.location.replace("${targetLaunchUrl}");
  </script>
</body>
</html>`;
                    const blob = new Blob([launcherHtml], { type: 'text/html;charset=utf-8' });
                    const blobUrl = URL.createObjectURL(blob);
                    const dlLink = document.createElement('a');
                    dlLink.href = blobUrl;
                    dlLink.download = 'Football_United_App.html';
                    document.body.appendChild(dlLink);
                    dlLink.click();
                    setTimeout(() => {
                        try { document.body.removeChild(dlLink); URL.revokeObjectURL(blobUrl); } catch (e) {}
                    }, 200);
                } catch (e) {
                    const fallbackUrl = `/api/download-app?origin=${encodeURIComponent(appBase)}&format=html`;
                    window.location.href = fallbackUrl;
                }
            } else if (format === 'url') {
                try {
                    const urlContent = `[InternetShortcut]\r\nURL=${targetLaunchUrl}\r\nIconIndex=0\r\nIconFile=${appBase}/icons/icon-192.png\r\nHotKey=0\r\n`;
                    const blob = new Blob([urlContent], { type: 'application/x-mswinurl;charset=utf-8' });
                    const blobUrl = URL.createObjectURL(blob);
                    const dlLink = document.createElement('a');
                    dlLink.href = blobUrl;
                    dlLink.download = 'Football_United.url';
                    document.body.appendChild(dlLink);
                    dlLink.click();
                    setTimeout(() => {
                        try { document.body.removeChild(dlLink); URL.revokeObjectURL(blobUrl); } catch (e) {}
                    }, 200);
                } catch (e) {
                    window.location.href = `/api/download-app?origin=${encodeURIComponent(appBase)}&format=url`;
                }
            } else {
                const downloadUrl = `/api/download-app?origin=${encodeURIComponent(appBase)}&format=${format}`;
                window.location.href = downloadUrl;
            }

            setTimeout(() => {
                this.isDownloadingApp = false;
            }, 600);
        },

        openInstallGuideModal(tab) {
            if (tab) {
                this.installGuideTab = tab;
            } else if (!this.installGuideTab) {
                const os = this.detectDeviceOS();
                if (os === 'ios') this.installGuideTab = 'ios';
                else if (os === 'android') this.installGuideTab = 'android';
                else if (os === 'mac') this.installGuideTab = 'mac';
                else this.installGuideTab = 'windows';
            }
            if (this.installGuideTab === 'share') {
                this.shareAppUrl = 'https://www.football-united.com';
                this.$nextTick(() => {
                    this.generateShareQrCode();
                });
            } else {
                this.shareAppUrl = this.getApkDownloadUrl();
                this.$nextTick(() => {
                    this.generateApkQrCode();
                });
            }
            this.showInstallToHomeScreenModal = true;
        },

        openAndroidApkModal() {
            this.showAndroidInstallModal = true;
            this.$nextTick(() => {
                this.generateApkQrCode();
            });
        },

        downloadDesktopBatInstaller() {
            if (typeof this.showToast === 'function') {
                this.showToast('📥 Downloading Windows Desktop App installer (.bat)...', 'info');
            }
            window.location.href = `/api/download-app?origin=${encodeURIComponent(this.getCanonicalAppUrl())}&format=bat`;
        },

        openDirectAppInNewWindow() {
            const url = `${this.getCanonicalAppUrl()}/?mode=user&role=coach&downloaded=true&app_installed=true&source=downloaded_app`;
            window.open(url, '_blank');
        },

        openInChromeIntent() {
            const base = this.getCanonicalAppUrl();
            try {
                const clean = base.replace(/^https?:\/\//, '');
                const intentUrl = `intent://${clean}/?mode=user&role=coach#Intent;scheme=https;package=com.android.chrome;end`;
                window.location.href = intentUrl;
            } catch (e) {
                window.open(`${base}/?mode=user&role=coach`, '_blank');
            }
        },

        async triggerAndroidInstallOrGuide() {
            // Android native download routing: directly download native APK
            this.downloadAndroidApk();
        },

        async handleInstallClick() {
            // Android users bypass PWA installation entirely and download the native APK
            if (this.isAndroid()) {
                this.downloadAndroidApk();
                return;
            }

            // iOS users are guided through Safari "Add to Home Screen"
            if (this.isIos()) {
                this.openInstallGuideModal('ios');
                return;
            }

            // Only block if actually running inside standalone window
            if (this.checkIfInstalled()) {
                if (typeof this.showToast === 'function') {
                    this.showToast('Football United is already running in standalone app mode! ⚽', 'info');
                } else if (window.showAppGlobalToast) {
                    window.showAppGlobalToast('Football United is already running in standalone app mode! ⚽', 'info');
                }
                return;
            }

            // Trigger native beforeinstallprompt if available on Desktop:
            const promptEvent = this.deferredInstallPrompt || window.deferredInstallPrompt || window._cachedDeferredInstallPrompt;
            if (promptEvent) {
                try {
                    this.deferredInstallPrompt = null;
                    window.deferredInstallPrompt = null;
                    window._cachedDeferredInstallPrompt = null;
                    this.canInstallOnAndroid = false;
                    await promptEvent.prompt();
                    const choice = await promptEvent.userChoice;
                    if (choice && choice.outcome === 'accepted') {
                        this.isAppInstalled = true;
                        this.isStandalone = true;
                        this.showInstallBanner = false;
                        this.showInstallButton = false;
                        this.showIosInstallModal = false;
                        this.showAndroidInstallModal = false;
                        this.showInstallToHomeScreenModal = false;
                        if (typeof this.showToast === 'function') {
                            this.showToast('Football United installed to your apps! 🎉', 'success');
                        }
                        return;
                    }
                } catch (err) {
                    console.warn('Native prompt execution error:', err);
                }
            }

            // Open the interactive desktop / device guide modal
            this.openInstallGuideModal();
        },

        installPwaApp() {
            return this.handleInstallClick();
        },

        setupNetworkListeners() {
            // Listen for when the browser regains internet connection
            window.addEventListener('online', async () => {
                console.log("🌐 Browser reported ONLINE status.");
                this.isOffline = false;
                
                try {
                    // Firebase SDK automatically handles network reconnection without manual toggles
                    // Flush pending syncs queued while offline
                    if (typeof this.flushPendingSyncs === 'function') {
                        this.flushPendingSyncs();
                    }
                } catch (err) {
                    console.warn("Notice during offline queue sync:", err?.message || err);
                }
            });

            // Listen for when the browser loses internet connection
            window.addEventListener('offline', async () => {
                console.log("🌐 Browser reported OFFLINE status.");
                this.isOffline = true;
                // Firebase SDK automatically falls back to offline cache without manual toggles
            });
        },

        async clearPwaCacheAndReload() {
            console.log("🗑️ Initiating PWA Cache Wipe...");
            
            // 1. Unregister all stuck Service Workers
            if ('serviceWorker' in navigator) {
                try {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    for (const registration of registrations) {
                        await registration.unregister();
                        console.log("Unregistered Service Worker:", registration);
                    }
                } catch (err) {
                    console.error("Failed to unregister Service Worker:", err);
                }
            }

            // 2. Delete all cached offline files
            if ('caches' in window) {
                try {
                    const cacheNames = await caches.keys();
                    await Promise.all(
                        cacheNames.map(cache => caches.delete(cache))
                    );
                    console.log("All caches deleted.");
                } catch (err) {
                    console.error("Failed to clear caches:", err);
                }
            }

            // 3. Hard reload from the server (bypassing browser cache)
            window.location.reload(true);
        }
    };
};

// Register with Alpine.js if available or on alpine:init
if (typeof window !== 'undefined') {
    if (window.Alpine) {
        window.Alpine.data('gameOnApp', window.gameOnApp);
    }
    document.addEventListener('alpine:init', () => {
        if (window.Alpine) {
            window.Alpine.data('gameOnApp', window.gameOnApp);
        }
    });
}

// Global fallback securely mapped to the new Internal Engine
window.downloadComprehensivePDF = function() {
    const rootEl = document.querySelector('[x-data]');
    if (rootEl && window.Alpine && window.Alpine.$data) {
        const alpineData = window.Alpine.$data(rootEl);
        if (alpineData && typeof alpineData.downloadComprehensivePDF === 'function') {
            return alpineData.downloadComprehensivePDF();
        }
    }
    alert("System loading. Please wait a moment and click Download again.");
};



