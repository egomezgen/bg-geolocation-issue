import React from "react";
import {
	Button,
	FlatList,
	Platform,
	SafeAreaView,
	ScrollView,
	StatusBar,
	StyleSheet,
	Text,
	View,
} from "react-native";
import BackgroundGeolocation from "react-native-background-geolocation";
import { PERMISSIONS, requestMultiple } from "react-native-permissions";
import {
	LocationHistoryProvider,
	useLocationHistory,
	type LocationEntry,
} from "./contexts/LocationHistoryContext";
import { useForegroundLocationWatch } from "./hooks/use-foreground-location-watch";
import { useSetupLocationTracking } from "./hooks/use-setup-location-tracking";

function formatDateTime(iso: string): string {
	const d = new Date(iso);
	return d.toLocaleString(undefined, {
		dateStyle: "short",
		timeStyle: "medium",
	});
}

function LocationHistoryView(): React.JSX.Element {
	const { entries, clearHistory } = useLocationHistory();

	const renderItem = ({ item }: { item: LocationEntry }) => (
		<View style={styles.historyItem}>
			<Text style={styles.historyCoords}>
				{item.latitude.toFixed(6)}, {item.longitude.toFixed(6)}
			</Text>
			<Text style={styles.historyMeta}>
				{item.accuracy != null ? `±${Math.round(item.accuracy)} m` : "—"} ·{" "}
				{formatDateTime(item.timestamp)}
			</Text>
		</View>
	);

	return (
		<View style={styles.section}>
			<View style={styles.historyHeader}>
				<Text style={styles.sectionTitle}>Positions History</Text>
				{entries.length > 0 && <Button title="Clean" onPress={clearHistory} />}
			</View>
			{entries.length === 0 ? (
				<Text style={styles.historyEmpty}>No positions registered</Text>
			) : (
				<FlatList
					data={entries}
					renderItem={renderItem}
					keyExtractor={(item) => item.id}
					style={styles.historyList}
					contentContainerStyle={styles.historyListContent}
					scrollEnabled={false}
					nestedScrollEnabled
				/>
			)}
		</View>
	);
}

function App(): React.JSX.Element {
	const {
		isReady,
		locationPermission,
		motionPermission,
		refreshMotionPermission,
	} = useSetupLocationTracking();

	// Enable foreground watch when ready and has permission
	const foregroundEnabled =
		isReady &&
		locationPermission !== "blocked" &&
		locationPermission !== "unknown";

	useForegroundLocationWatch({ enabled: foregroundEnabled });

	const requestLocationPermission = async () => {
		try {
			const status = await BackgroundGeolocation.requestPermission();
			console.log("[App] Permission status:", status);
		} catch (error) {
			console.error("[App] Error requesting permission:", error);
		}
	};

	const requestMotionPermission = async () => {
		try {
			const permission = Platform.select({
				ios: [PERMISSIONS.IOS.MOTION],
				android: [PERMISSIONS.ANDROID.ACTIVITY_RECOGNITION],
				default: [],
			});
			if (permission.length === 0) return;
			const result = await requestMultiple(permission);
			console.log("[App] Motion permission result:", result);
			await refreshMotionPermission();
		} catch (error) {
			console.error("[App] Error requesting motion permission:", error);
		}
	};

	const { addEntry } = useLocationHistory();

	const getCurrentPosition = async () => {
		try {
			const location = await BackgroundGeolocation.getCurrentPosition({
				desiredAccuracy: 100,
				maximumAge: 10000,
				timeout: 25,
			});
			console.log("[App] Current position:", {
				lat: location.coords.latitude,
				lng: location.coords.longitude,
				accuracy: location.coords.accuracy,
			});
			addEntry({
				latitude: location.coords.latitude,
				longitude: location.coords.longitude,
				accuracy: location.coords.accuracy ?? null,
				timestamp: new Date(location.timestamp).toISOString(),
			});
		} catch (error) {
			console.error("[App] Error getting current position:", error);
		}
	};

	const getState = async () => {
		try {
			const state = await BackgroundGeolocation.getState();
			console.log("[App] BackgroundGeolocation state:", {
				enabled: state.enabled,
				isMoving: state.isMoving,
				trackingMode: state.trackingMode,
			});
		} catch (error) {
			console.error("[App] Error getting state:", error);
		}
	};

	return (
		<SafeAreaView style={styles.container}>
			<StatusBar barStyle="dark-content" />
			<ScrollView contentInsetAdjustmentBehavior="automatic">
				<View style={styles.content}>
					<Text style={styles.title}>Background Geolocation Minimal Repro</Text>

					<LocationHistoryView />

					<View style={styles.section}>
						<Text style={styles.sectionTitle}>Status</Text>
						<Text style={styles.text}>
							Setup: {isReady ? "✅ Ready" : "⏳ Initializing"}
						</Text>
						<Text style={styles.text}>Location: {locationPermission}</Text>
						<Text style={styles.text}>
							Motion:{" "}
							{motionPermission === null
								? "—"
								: motionPermission
									? "✅ Granted"
									: "❌ Denied"}
						</Text>
						<Text style={styles.text}>
							Foreground Watch:{" "}
							{foregroundEnabled ? "✅ Active" : "❌ Inactive"}
						</Text>
					</View>

					<View style={styles.section}>
						<Text style={styles.sectionTitle}>Actions</Text>
						<Button
							title="Request Location Permission"
							onPress={requestLocationPermission}
						/>
						<View style={styles.buttonSpacer} />
						<Button
							title="Request Motion Permission"
							onPress={requestMotionPermission}
						/>
						<View style={styles.buttonSpacer} />
						<Button title="Get Current Position" onPress={getCurrentPosition} />
						<View style={styles.buttonSpacer} />
						<Button title="Print State" onPress={getState} />
					</View>

					<View style={styles.section}>
						<Text style={styles.sectionTitle}>Configuration</Text>
						<Text style={styles.configText}>• desiredAccuracy: High</Text>
						<Text style={styles.configText}>• distanceFilter: 50m</Text>
						<Text style={styles.configText}>• stationaryRadius: 25m</Text>
						<Text style={styles.configText}>• stopTimeout: 5min</Text>
						<Text style={styles.configText}>• stopOnTerminate: false</Text>
						<Text style={styles.configText}>• startOnBoot: true</Text>
						<Text style={styles.configText}>• enableHeadless: true</Text>
					</View>

					<View style={styles.section}>
						<Text style={styles.sectionTitle}>Events Registered</Text>
						<Text style={styles.configText}>• onLocation</Text>
						<Text style={styles.configText}>• onMotionChange</Text>
						<Text style={styles.configText}>• onGeofence</Text>
						<Text style={styles.configText}>• onActivityChange</Text>
						<Text style={styles.configText}>• onProviderChange</Text>
						<Text style={styles.configText}>• watchPosition (foreground)</Text>
					</View>

					<View style={styles.section}>
						<Text style={styles.infoText}>
							Check the console logs for location updates and events.
						</Text>
						<Text style={styles.infoText}>
							All business logic callbacks have been replaced with:
						</Text>
						<Text style={styles.codeText}>// js should be triggered here</Text>
					</View>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#f5f5f5",
	},
	content: {
		padding: 20,
	},
	title: {
		fontSize: 24,
		fontWeight: "bold",
		marginBottom: 20,
		textAlign: "center",
	},
	section: {
		backgroundColor: "white",
		borderRadius: 8,
		padding: 15,
		marginBottom: 15,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: "bold",
		marginBottom: 10,
	},
	text: {
		fontSize: 14,
		marginBottom: 5,
	},
	configText: {
		fontSize: 14,
		fontFamily: "monospace",
		marginBottom: 3,
		color: "#555",
	},
	infoText: {
		fontSize: 14,
		marginBottom: 8,
		color: "#666",
	},
	codeText: {
		fontSize: 12,
		fontFamily: "monospace",
		backgroundColor: "#f0f0f0",
		padding: 8,
		marginTop: 4,
		borderRadius: 4,
	},
	buttonSpacer: {
		height: 10,
	},
	historyHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 10,
	},
	historyList: {
		maxHeight: 280,
	},
	historyListContent: {
		paddingBottom: 8,
	},
	historyItem: {
		paddingVertical: 10,
		paddingHorizontal: 12,
		marginBottom: 6,
		backgroundColor: "#f8f9fa",
		borderRadius: 6,
		borderLeftWidth: 3,
		borderLeftColor: "#0d6efd",
	},
	historyCoords: {
		fontSize: 14,
		fontFamily: "monospace",
		fontWeight: "600",
		color: "#111",
		marginBottom: 2,
	},
	historyMeta: {
		fontSize: 12,
		color: "#666",
	},
	historyEmpty: {
		fontSize: 14,
		color: "#666",
		fontStyle: "italic",
	},
});

function AppRoot(): React.JSX.Element {
	return (
		<LocationHistoryProvider>
			<App />
		</LocationHistoryProvider>
	);
}

export default AppRoot;
