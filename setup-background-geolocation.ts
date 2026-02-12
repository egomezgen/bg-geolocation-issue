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
					disableMotionActivityUpdates: shouldDisableMotionActivityUpdates,
					stationaryRadius: 25,
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
			desiredAccuracy: BackgroundGeolocation.DESIRED_ACCURACY_HIGH,
			distanceFilter: 50,

			// activity recognitison
			stopTimeout: 5,
			stopOnTerminate: false,
			startOnBoot: true,
			showsBackgroundLocationIndicator: false,
			enableHeadless: true,
			allowIdenticalLocations: false,
			disableElasticity: false,
			disableLocationAuthorizationAlert: true,
			disableMotionActivityUpdates: shouldDisableMotionActivityUpdates,
			foregroundService: true,
			locationAuthorizationRequest: "Any",

			// minimize stationary geofence radius for when critical when motion API is disabled
			// because the geofence becomes the only mechanism to detect movement
			stationaryRadius: 25,

			// android foreground notification
			notification: {
				title: "Genasys Protect Location Updates",
				text: "Your location is being tracked for safety updates",
				channelName: "Location Updates",
				smallIcon: "mipmap/ic_notification",
				channelId: "location_updates",
				priority: BackgroundGeolocation.NOTIFICATION_PRIORITY_DEFAULT,
			},

			backgroundPermissionRationale: {
				title: "Background Location Permission",
				message: "We need permission to track your location in the background",
				positiveAction: "Go to Settings",
				negativeAction: "Cancel",
			},

			// debug - auto-enabled in non-production
			debug: false,
			logLevel: BackgroundGeolocation.LOG_LEVEL_VERBOSE,
			maxDaysToPersist: 1,
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
