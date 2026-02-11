import { AppRegistry } from 'react-native';
import BackgroundGeolocation from 'react-native-background-geolocation';

import App from './App';

/**
 * Android headless task for BackgroundGeolocation
 * Handles events when app is terminated but location tracking continues
 *
 * Events that provide location data:
 * - location: Regular location updates
 * - motionchange: State transitions
 * - geofence: Geofence enter/exit/dwell
 * - heartbeat: Periodic events
 */
const BackgroundGeolocationHeadlessTask = async event => {
  console.log('[BackgroundGeolocation HeadlessTask]', event.name);

  try {
    switch (event.name) {
      case 'location': {
        const location = event.params;
        console.log('[HeadlessTask] Location:', {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
          accuracy: location.coords.accuracy,
        });

        // js should be triggered here
        // Original: await processPosition(position)
        break;
      }

      case 'motionchange': {
        const motionEvent = event.params;
        console.log('[HeadlessTask] Motion change:', {
          isMoving: motionEvent.isMoving,
          lat: motionEvent.location.coords.latitude,
          lng: motionEvent.location.coords.longitude,
        });

        // js should be triggered here
        // Original: await processPosition(position)
        break;
      }

      case 'geofence': {
        const geofenceEvent = event.params;
        console.log('[HeadlessTask] Geofence:', {
          action: geofenceEvent.action,
          identifier: geofenceEvent.identifier,
          lat: geofenceEvent.location.coords.latitude,
          lng: geofenceEvent.location.coords.longitude,
        });

        // js should be triggered here
        // Original: await processPosition(position)
        break;
      }

      case 'terminate': {
        console.log(
          '[HeadlessTask] App terminated, background service continuing',
        );
        break;
      }

      case 'boot': {
        console.log('[HeadlessTask] Device booted, background service started');
        break;
      }

      default: {
        console.log('[HeadlessTask] Unhandled event:', event.name);
        break;
      }
    }
  } catch (error) {
    console.error('[HeadlessTask] Error:', error, 'Event:', event.name);
  }
};

// Register the headless task
BackgroundGeolocation.registerHeadlessTask(BackgroundGeolocationHeadlessTask);

// Register the main application
AppRegistry.registerComponent('BgGeolocationMinimalRepro', () => App);
