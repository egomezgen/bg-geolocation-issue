import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import BackgroundGeolocation, {
	Location,
} from "react-native-background-geolocation";
import { useLocationHistory } from "../contexts/LocationHistoryContext";

const FOREGROUND_WATCH_INTERVAL_MS = 10_000; // 10 seconds

const handleError = (errorCode: number) => {
	console.error("[watchPosition] Foreground error:", errorCode);
};

type WatchSubscription = ReturnType<typeof BackgroundGeolocation.watchPosition>;

/**
 * Hook that watches position updates in foreground
 *
 * This provides more frequent updates (every 10 seconds) when app is active
 * Automatically stops when app goes to background
 */
export const useForegroundLocationWatch = ({
	enabled,
}: {
	enabled: boolean;
}) => {
	const subscriptionRef = useRef<WatchSubscription | null>(null);
	const { addEntry } = useLocationHistory();

	useEffect(() => {
		if (!enabled) {
			return;
		}

		let isCancelled = false;

		const handleLocation = (location: Location) => {
			console.log("[watchPosition] Foreground location:", {
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
		};

		const startWatch = async () => {
			subscriptionRef.current?.remove();
			subscriptionRef.current = null;

			try {
				const subscription = await BackgroundGeolocation.watchPosition(
					{
						interval: FOREGROUND_WATCH_INTERVAL_MS,
						persist: false,
						desiredAccuracy: BackgroundGeolocation.DesiredAccuracy.High,
						timeout: 30_000,
					},
					handleLocation,
					handleError,
				);

				if (isCancelled) {
					subscription.remove();
					return;
				}

				subscriptionRef.current = subscription;
				console.log("[watchPosition] Foreground watchPosition started");
			} catch (error) {
				console.error(
					"[watchPosition] Failed to start foreground watchPosition",
					error,
				);
			}
		};

		const stopWatch = () => {
			isCancelled = true;
			subscriptionRef.current?.remove();
			subscriptionRef.current = null;
			console.log("[watchPosition] Foreground watchPosition stopped");
		};

		// Start watch if app is currently active
		if (AppState.currentState === "active") {
			startWatch();
		}

		const handleAppStateChange = (nextAppState: AppStateStatus) => {
			if (nextAppState === "active") {
				isCancelled = false;
				startWatch();
			} else {
				stopWatch();
			}
		};

		const appStateSubscription = AppState.addEventListener(
			"change",
			handleAppStateChange,
		);

		const providerChangeSubscription = BackgroundGeolocation.onProviderChange(
			() => {
				console.log(
					"[watchPosition] Provider changed - restarting foreground watch",
				);
				startWatch();
			},
		);

		return () => {
			appStateSubscription.remove();
			providerChangeSubscription.remove();
			stopWatch();
		};
	}, [enabled, addEntry]);
};
