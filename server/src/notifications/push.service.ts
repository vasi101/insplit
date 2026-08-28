import Expo, { ExpoPushMessage } from 'expo-server-sdk';

const expo = new Expo();

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
  const validTokens = pushTokens.filter((token) => Expo.isExpoPushToken(token));

  if (validTokens.length === 0) return;

  const messages: ExpoPushMessage[] = validTokens.map((token) => ({
    to: token,
    sound: 'default',
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
      ticketChunk.forEach((ticket, idx) => {
        if (ticket.status === 'error') {
          console.error(`Push notification error for token ${validTokens[idx]}:`, ticket.message);
        }
      });
    } catch (error) {
      console.error('Failed to send push notification chunk:', error);
    }
  }
}
