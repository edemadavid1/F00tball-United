import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
  Share,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Platform,
} from 'react-native';

// ============================================================================
// CONFIGURATION: Replace this URL with your EAS Build public APK link
// Example: https://expo.dev/artifacts/eas/your-project-id/builds/your-build-id.apk
// ============================================================================
export const ANDROID_APK_DOWNLOAD_URL = 'https://expo.dev/artifacts/eas/placeholder-project/builds/football-united-latest.apk';
export const WEB_APP_URL = 'https://football-united.web.app?hideDownloadCard=true';

/**
 * Download App & Team Sharing Card Component
 * Designed for React Native & Expo mobile screens.
 */
export function DownloadAppTeamShareCard({
  apkUrl = ANDROID_APK_DOWNLOAD_URL,
  webUrl = WEB_APP_URL,
}: {
  apkUrl?: string;
  webUrl?: string;
}) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // 1. Trigger Native Android APK Direct Download
  const handleDownloadAndroidApk = async () => {
    try {
      setIsDownloading(true);

      const canOpen = await Linking.canOpenURL(apkUrl);
      if (canOpen) {
        await Linking.openURL(apkUrl);
      } else {
        // Fallback in case device restrictions or invalid protocol
        Alert.alert(
          'Download Link',
          'Could not open the download link automatically. Opening web fallback instead.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Web App', onPress: () => Linking.openURL(webUrl) },
          ]
        );
      }
    } catch (error) {
      console.error('Error opening APK URL:', error);
      Alert.alert(
        'Download Error',
        'Failed to start the APK download. Please verify your internet connection or try opening the link in your browser.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsDownloading(false);
    }
  };

  // 2. Native System Share with Team
  const handleShareWithTeam = async () => {
    try {
      setIsSharing(true);
      const shareMessage = `⚽ Join Football United!\n\nDownload the Native Android App (.apk) or open the web app:\nDirect APK: ${apkUrl}\nWeb App: ${webUrl}`;
      
      await Share.share({
        title: 'Football United App',
        message: shareMessage,
        url: webUrl, // iOS uses url field
      });
    } catch (error) {
      console.error('Error sharing app:', error);
    } finally {
      setIsSharing(false);
    }
  };

  // 3. Open Deployed Web App Fallback
  const handleOpenWebFallback = () => {
    Linking.openURL(webUrl).catch(() => {
      Alert.alert('Error', 'Could not open web version in browser.');
    });
  };

  return (
    <View style={styles.cardContainer} testID="downloadLauncherShareTeamCard">
      {/* Top Header Badge & Title */}
      <View style={styles.cardHeader}>
        <View style={styles.titleRow}>
          <Text style={styles.cardIcon}>📲</Text>
          <View style={styles.titleTextGroup}>
            <View style={styles.badgeRow}>
              <Text style={styles.cardTitle}>Download App & Team Sharing</Text>
              <View style={styles.apkBadge}>
                <Text style={styles.apkBadgeText}>APK READY</Text>
              </View>
            </View>
            <Text style={styles.cardSubtitle}>
              Install the standalone Android Native app directly to your phone without the Google Play Store.
            </Text>
          </View>
        </View>
      </View>

      {/* Primary Action Buttons */}
      <View style={styles.actionButtonGroup}>
        {/* Android APK Download Button */}
        <TouchableOpacity
          style={[styles.primaryButton, isDownloading && styles.buttonDisabled]}
          onPress={handleDownloadAndroidApk}
          activeOpacity={0.85}
          disabled={isDownloading}
          accessibilityLabel="Download for Android Native APK"
          accessibilityRole="button"
        >
          {isDownloading ? (
            <View style={styles.buttonContentRow}>
              <ActivityIndicator size="small" color="#ffffff" />
              <Text style={styles.primaryButtonText}>Opening Installer...</Text>
            </View>
          ) : (
            <View style={styles.buttonContentRow}>
              <Text style={styles.buttonIcon}>🤖</Text>
              <View style={styles.buttonTextStack}>
                <Text style={styles.primaryButtonText}>Download for Android</Text>
                <Text style={styles.primaryButtonSubtext}>Direct Native APK Installer (.apk)</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>

        {/* Share with Team Button */}
        <TouchableOpacity
          style={[styles.secondaryButton, isSharing && styles.buttonDisabled]}
          onPress={handleShareWithTeam}
          activeOpacity={0.85}
          disabled={isSharing}
          accessibilityLabel="Share with Team"
          accessibilityRole="button"
        >
          {isSharing ? (
            <View style={styles.buttonContentRow}>
              <ActivityIndicator size="small" color="#0f172a" />
              <Text style={styles.secondaryButtonText}>Sharing...</Text>
            </View>
          ) : (
            <View style={styles.buttonContentRow}>
              <Text style={styles.buttonIcon}>👥</Text>
              <View style={styles.buttonTextStack}>
                <Text style={styles.secondaryButtonText}>Share with Team</Text>
                <Text style={styles.secondaryButtonSubtext}>Send APK & Web Link</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Android Installation Tip Notice */}
      <View style={styles.tipBox}>
        <Text style={styles.tipIcon}>💡</Text>
        <View style={styles.tipTextGroup}>
          <Text style={styles.tipTitle}>How to install the APK on your phone:</Text>
          <Text style={styles.tipBody}>
            1. Tap <Text style={styles.tipBold}>"Download for Android"</Text> above.{"\n"}
            2. When downloaded, tap the notification or open your <Text style={styles.tipBold}>Downloads</Text> folder.{"\n"}
            3. Tap <Text style={styles.tipBold}>Install</Text> (if prompted, enable <Text style={styles.tipBold}>"Install Unknown Apps"</Text> for Chrome or Files).
          </Text>
        </View>
      </View>

      {/* Web Version Quick Link */}
      <View style={styles.footerRow}>
        <Text style={styles.footerText}>Prefer using browser?</Text>
        <TouchableOpacity onPress={handleOpenWebFallback} activeOpacity={0.7}>
          <Text style={styles.footerLink}>Open Web Version ↗</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/**
 * HomeScreen containing the Download App & Team Sharing component
 */
export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.screenContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* App Hero / Brand Header */}
        <View style={styles.heroSection}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>⚽</Text>
          </View>
          <Text style={styles.heroTitle}>Football United</Text>
          <Text style={styles.heroSubtitle}>
            League Management, Match Tracking & Team Synchronization
          </Text>
        </View>

        {/* The Download & Team Sharing Card */}
        <DownloadAppTeamShareCard />
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// STYLES: Polished Dark/Light Theme with high contrast & tactile touch targets
// ============================================================================
const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#0f172a', // Slate 900
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center',
    marginVertical: 20,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#10b981', // Emerald 500
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  logoEmoji: {
    fontSize: 32,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  cardContainer: {
    backgroundColor: '#1e293b', // Slate 800
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155', // Slate 700
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
    marginTop: 10,
  },
  cardHeader: {
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cardIcon: {
    fontSize: 24,
    marginRight: 10,
    marginTop: 2,
  },
  titleTextGroup: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.2,
  },
  apkBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  apkBadgeText: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    lineHeight: 17,
  },
  actionButtonGroup: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#10b981', // Emerald 500
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 56,
    justifyContent: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 56,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  buttonTextStack: {
    alignItems: 'flex-start',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  primaryButtonSubtext: {
    color: '#d1fae5',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  secondaryButtonText: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButtonSubtext: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  tipBox: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 12,
    marginTop: 16,
  },
  tipIcon: {
    fontSize: 16,
    marginRight: 8,
    marginTop: 1,
  },
  tipTextGroup: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#e2e8f0',
    marginBottom: 4,
  },
  tipBody: {
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 16,
  },
  tipBold: {
    fontWeight: '700',
    color: '#f8fafc',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  footerText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  footerLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38bdf8',
  },
});
