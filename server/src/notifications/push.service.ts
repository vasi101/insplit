import Expo, { ExpoPushMessage } from 'expo-server-sdk';
import { User } from '../modules/auth/auth.model';

const expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });

export function userPushTokens(user: { pushToken?: string; pushTokens?: string[] }): string[] {
  return [...new Set([...(user.pushTokens ?? []), ...(user.pushToken ? [user.pushToken] : [])])];
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export async function sendPushNotifications(
  pushTokens: string[],
  payload: PushNotificationPayload
): Promise<void> {
  // Filter valid Expo push tokens
  const validTokens = [...new Set(pushTokens.filter((token) => Expo.isExpoPushToken(token)))];

  if (validTokens.length === 0) return;

  const messages: ExpoPushMessage[] = validTokens.map((token) => ({
    to: token,
    sound: 'insplit_chime.wav',
    channelId: 'insplit-chime-v1',
    title: payload.title,
    body: payload.body,
    data: payload.data,
  }));

  // Chunk notifications (Expo recommends max 100 per request)
  const chunks = expo.chunkPushNotifications(messages);

  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      // Log any errors (don't crash the server)
      for (const [idx, ticket] of ticketChunk.entries()) {
        if (ticket.status === 'error') {
          console.error('Push notification error:', ticket.message);
          if (ticket.details?.error === 'DeviceNotRegistered') {
            const token = chunk[idx].to;
            await User.updateMany({}, { $pull: { pushTokens: token, pushDevices: { token } } });
            await User.updateMany({ pushToken: token }, { $unset: { pushToken: 1 } });
          }
        }
      }
    } catch (error) {
      console.error('Failed to send push notification chunk:', error);
    }
  }
}
