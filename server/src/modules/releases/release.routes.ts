import { Router } from 'express';
import { Schema, model } from 'mongoose';
import { authMiddleware } from '../../middleware/auth.middleware';
import { adminMiddleware } from '../../middleware/admin.middleware';
import { User } from '../auth/auth.model';
import { sendPushNotifications } from '../../notifications/push.service';

const Release = model('Release', new Schema({
  channel: { type: String, enum: ['production', 'development'], required: true },
  version: { type: String, required: true },
  versionCode: { type: Number, required: true },
  notes: { type: String, required: true },
  downloadUrl: { type: String, required: true },
}, { timestamps: true }).index({ channel: 1, versionCode: 1 }, { unique: true }));

const router = Router();
router.get('/latest', async (req, res, next) => {
  try {
    const channel = req.query.channel === 'development' ? 'development' : 'production';
    const release = await Release.findOne({ channel }).sort({ versionCode: -1 }).lean();
    res.json({ success: true, data: { release } });
  } catch (error) { next(error); }
});

// Publishing is explicit and administrator-only; ordinary checks never broadcast.
router.post('/', authMiddleware, adminMiddleware, async (req, res, next) => {
  const { channel, version, versionCode, notes, downloadUrl, notify } = req.body;
  let validUrl = false;
  try { const url = new URL(downloadUrl); validUrl = url.protocol === 'https:' && !url.username && !url.password; } catch {}
  if (!['production', 'development'].includes(channel) || typeof version !== 'string' ||
      !/^\d+\.\d+\.\d+$/.test(version) || !Number.isSafeInteger(versionCode) || versionCode < 1 ||
      typeof notes !== 'string' || !notes.trim() || notes.length > 10000 || !validUrl ||
      (notify !== undefined && typeof notify !== 'boolean')) {
    res.status(400).json({ success: false, message: 'Invalid release metadata' });
    return;
  }
  try {
    const latest = await Release.findOne({ channel }).sort({ versionCode: -1 });
    if (latest && versionCode <= latest.versionCode) {
      res.status(409).json({ success: false, message: 'versionCode must increase' });
      return;
    }
    const release = await Release.create({ channel, version, versionCode, notes, downloadUrl });
    if (notify === true) {
      // Stream recipients to avoid loading the entire user collection into memory.
      void (async () => {
        for await (const user of User.find({ 'pushDevices.channel': channel }).select('pushDevices').cursor()) {
          await sendPushNotifications(user.pushDevices.filter(device => device.channel === channel).map(device => device.token), {
            title: 'Update available', body: `Insplit ${version} is available. Tap to update.`,
            data: { type: 'APP_RELEASE', channel, versionCode },
          });
        }
      })().catch(error => console.error('Release broadcast failed:', error));
    }
    res.status(201).json({ success: true, data: { release } });
  } catch (error: any) {
    if (error.code === 11000) { res.status(409).json({ success: false, message: 'Release already exists' }); return; }
    next(error);
  }
});
export default router;
