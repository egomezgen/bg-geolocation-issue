import { useCallback, useEffect, useState } from "react";
import BackgroundGeolocation from "react-native-background-geolocation";
import { useLocationHistory } from "../contexts/LocationHistoryContext";
import {
	checkMotionPermissionFromOS,
	setupBackgroundGeolocationConfig,
} from "../setup-background-geolocation";

/**
 * Hook that sets up BackgroundGeolocation listeners and configuration
 *
 * IMPORTANT: This effect runs UNCONDITIONALLY on mount - critical for iOS background relaunch
 * When iOS relaunches the app after user moves ~200m, ready() must be called ASAP
 */
export const useSetupLocationTracking = () => {
	const [isReady, setIsReady] = useState(false);
	const [locationPermission, setLocationPermission] =
		useState<string>("unknown");
	const [motionPermission, setMotionPermission] = useState<boolean | null>(
		null,
	);

	const { addEntry } = useLocationHistory();

	const refreshMotionPermission = useCallback(async () => {
		const granted = await checkMotionPermissionFromOS();
		setMotionPermission(granted);
	}, []);

	// Effect 1: UNCONDITIONAL - Register listeners and call ready() immediately
	useEffect(() => {
		console.log("[Location Tracking] Setting up listeners");

		const onLocationSubscription = BackgroundGeolocation.onLocation(
			async (location) => {
				// Skip samples from watchPosition (handled elsewhere)
				if (location.sample) {
					return;
				}

				console.log("[onLocation] New location:", {
					lat: location.coords.latitude,
					lng: location.coords.longitude,
					accuracy: location.coords.accuracy,
					timestamp: location.timestamp,
				});

				addEntry({
					latitude: location.coords.latitude,
					longitude: location.coords.longitude,
					accuracy: location.coords.accuracy ?? null,
					timestamp: new Date(location.timestamp).toISOString(),
				});
			},
			(error) => {
				console.error("[onLocation] Error:", error);
			},
		);

		const onActivityChangeSubscription = BackgroundGeolocation.onActivityChange(
			(activity) => {
				console.log("[onActivityChange] Activity:", {
					activity: activity.activity,
					confidence: activity.confidence,
				});
			},
		);

		const onMotionChangeSubscription = BackgroundGeolocation.onMotionChange(
			async (event) => {
				console.log("[onMotionChange] Motion change:", {
					isMoving: event.isMoving,
					lat: event.location.coords.latitude,
					lng: event.location.coords.longitude,
				});

				const loc = event.location;
				addEntry({
					latitude: loc.coords.latitude,
					longitude: loc.coords.longitude,
					accuracy: loc.coords.accuracy ?? null,
					timestamp: new Date(loc.timestamp).toISOString(),
				});
			},
		);

		const onGeofenceSubscription = BackgroundGeolocation.onGeofence(
			async (event) => {
				console.log("[onGeofence] Geofence event:", {
					action: event.action,
					identifier: event.identifier,
					lat: event.location.coords.latitude,
					lng: event.location.coords.longitude,
				});

				const loc = event.location;
				addEntry({
					latitude: loc.coords.latitude,
					longitude: loc.coords.longitude,
					accuracy: loc.coords.accuracy ?? null,
					timestamp: new Date(loc.timestamp).toISOString(),
				});
			},
		);

		const onProviderChangeSubscription = BackgroundGeolocation.onProviderChange(
			(event) => {
				console.log("[onProviderChange] Provider change:", {
					status: event.status,
					gps: event.gps,
					network: event.network,
				});

				switch (event.status) {
					case BackgroundGeolocation.AUTHORIZATION_STATUS_ALWAYS:
						setLocationPermission("always");
						break;
					case BackgroundGeolocation.AUTHORIZATION_STATUS_WHEN_IN_USE:
						setLocationPermission("foreground");
						break;
					case BackgroundGeolocation.AUTHORIZATION_STATUS_DENIED:
						setLocationPermission("blocked");
						break;
					case BackgroundGeolocation.AUTHORIZATION_STATUS_NOT_DETERMINED:
						setLocationPermission("unknown");
						break;
					default:
						console.log("[onProviderChange] Unhandled status:", event.status);
						break;
				}

				if (!event.gps) {
					console.error("[onProviderChange] GPS provider disabled");
				}

				if (!event.network) {
					console.error("[onProviderChange] Network provider disabled");
				}
			},
		);

		// Call ready() unconditionally - this just initializes config, doesn't need permissions
		const setup = async () => {
			try {
				const config = await setupBackgroundGeolocationConfig();

				if (!config.success) {
					console.error("[Location Tracking]", config.message);
					return;
				}

				console.log(
					"[Location Tracking] BackgroundGeolocation is configured and ready",
				);
				setIsReady(true);
			} catch (error) {
				console.error(
					"[Location Tracking] Error from BackgroundGeolocation setup",
					error,
				);
			}
		};

		setup();

		return () => {
			onLocationSubscription.remove();
			onActivityChangeSubscription.remove();
			onMotionChangeSubscription.remove();
			onGeofenceSubscription.remove();
			onProviderChangeSubscription.remove();
		};
		// UNCONDITIONAL: Must run exactly once on mount for iOS background relaunch
	}, [addEntry]);

	// Effect 2: PERMISSION-GATED - call start() only when permissions are valid
	useEffect(() => {
		if (!isReady) {
			return;
		}

		if (
			locationPermission === "blocked" ||
			locationPermission === "denied" ||
			locationPermission === "unknown"
		) {
			console.error(
				`[Location Tracking] Start skipped: location permission is ${locationPermission}`,
			);
			return;
		}

		const startTracking = async () => {
			try {
				const state = await BackgroundGeolocation.getState();

				if (!state.enabled) {
					await BackgroundGeolocation.start();
					console.log(
						"[Location Tracking] BackgroundGeolocation.start() called successfully",
					);
				} else {
					console.log(
						"[Location Tracking] BackgroundGeolocation is already enabled",
					);
				}
			} catch (error) {
				console.error(
					"[Location Tracking] Error starting BackgroundGeolocation",
					error,
				);
			}
		};

		startTracking();
	}, [isReady, locationPermission]);

	// Sync motion permission state when ready
	useEffect(() => {
		if (!isReady) return;
		refreshMotionPermission();
	}, [isReady, refreshMotionPermission]);

	return {
		isReady,
		locationPermission,
		motionPermission,
		refreshMotionPermission,
	};
};
