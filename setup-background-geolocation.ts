import { Platform } from "react-native";
import BackgroundGeolocation, {
	Config,
} from "react-native-background-geolocation";
import { PERMISSIONS, RESULTS, checkMultiple } from "react-native-permissions";

let setupState: "idle" | "ready" = "idle";
let isLastDisableMotionActivityUpdates: boolean | null = null;

export const checkMotionPermissionFromOS = async (): Promise<boolean> => {
	try {
		const permission = Platform.select({
			ios: [PERMISSIONS.IOS.MOTION],
			android: [PERMISSIONS.ANDROID.ACTIVITY_RECOGNITION],
		});

		if (!permission) {
			return false;
		}

		const result = await checkMultiple(permission);
		const status = Object.values(result)[0];
		return status === RESULTS.GRANTED;
	} catch (error) {
		console.error("checkMotionPermissionFromOS error:", error);
		return false;
	}
};

export const setupBackgroundGeolocationConfig = async (): Promise<{
	success: boolean;
	message: string;
}> => {
	try {
		// Check actual OS permission state
		const hasMotionPermission = await checkMotionPermissionFromOS();
		const shouldDisableMotionActivityUpdates = !hasMotionPermission;

		if (setupState === "ready") {
			console.log("[BG Geolocation] Already ready");

			// Update motion config if permission state changed
			if (
				isLastDisableMotionActivityUpdates !==
				shouldDisableMotionActivityUpdates
			) {
				await BackgroundGeolocation.setConfig({
					activity: {
						disableMotionActivityUpdates: shouldDisableMotionActivityUpdates,
					},
					geolocation: {
						stationaryRadius: 25,
					},
				});

				isLastDisableMotionActivityUpdates = shouldDisableMotionActivityUpdates;

				console.log("[BG Geolocation] Updated motion config", {
					disableMotionActivityUpdates: shouldDisableMotionActivityUpdates,
				});
			}

			return {
				success: true,
				message: "BackgroundGeolocation is ALREADY ready",
			};
		}

		console.log("[BG Geolocation] Setting up BackgroundGeolocation");

		const config: Config = {
			geolocation: {
				desiredAccuracy: BackgroundGeolocation.DesiredAccuracy.High,
				distanceFilter: 50,
				// Minimize stationary geofence radius - critical when motion API is disabled
				// because the geofence becomes the only mechanism to detect movement
				stationaryRadius: 25,
				stopTimeout: 5,
				disableElasticity: false,
				allowIdenticalLocations: false,
				locationAuthorizationRequest: "Any",
				disableLocationAuthorizationAlert: true,
				showsBackgroundLocationIndicator: false,
			},
			activity: {
				disableMotionActivityUpdates: shouldDisableMotionActivityUpdates,
			},
			app: {
				stopOnTerminate: false,
				startOnBoot: true,
				enableHeadless: true,
				notification: {
					title: "Location Tracking Active",
					text: "Your location is being tracked",
					channelName: "Location Updates",
					smallIcon: "mipmap/ic_launcher",
					channelId: "location-tracking-channel",
					priority: BackgroundGeolocation.NotificationPriority.Default,
				},
				backgroundPermissionRationale: {
					title: "Allow background location access?",
					message:
						"This app needs background location access to function properly.",
					positiveAction: "Go to Settings",
					negativeAction: "Cancel",
				},
			},
			logger: {
				debug: false,
				logLevel: BackgroundGeolocation.LogLevel.Info,
			},
			persistence: {
				maxDaysToPersist: 1,
			},
		};

		await BackgroundGeolocation.ready(config);
		console.log("[BG Geolocation] BackgroundGeolocation is: ready");

		setupState = "ready";
		isLastDisableMotionActivityUpdates = shouldDisableMotionActivityUpdates;

		return { success: true, message: "BackgroundGeolocation is NOW ready" };
	} catch (error) {
		console.error(
			"[BG Geolocation] Error setting up background geolocation",
			error,
		);

		setupState = "idle";

		return {
			success: false,
			message: `BackgroundGeolocation setup error: ${JSON.stringify(error)}`,
		};
	}
};
