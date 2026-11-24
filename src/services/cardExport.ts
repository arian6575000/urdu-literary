import * as MediaLibrary from 'expo-media-library/legacy';
import * as ImagePicker from 'expo-image-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { captureRef } from 'react-native-view-shot';
import { logExport } from '../database/repositories/settings';
import { shareImageFile } from './exporter';
import { exportPixels, type Ratio } from '../features/card/types';

export type ImageFormat = 'png' | 'jpg';

/** Capture the (unscaled, off-screen) export canvas at full resolution: 1080 px wide, height from the ratio. */
export async function captureCard(ref: Parameters<typeof captureRef>[0], ratio: Ratio, fmt: ImageFormat): Promise<string> {
  const { w, h } = exportPixels(ratio);
  return captureRef(ref, { format: fmt === 'png' ? 'png' : 'jpg', quality: 1, width: w, height: h, result: 'tmpfile' });
}
export const shareCardImage = (uri: string, fmt: ImageFormat) => shareImageFile(uri, fmt === 'png' ? 'image/png' : 'image/jpeg');

/** Returns true when saved. Asks for "add photos only" permission the first time. */
export async function saveCardToGallery(uri: string): Promise<'ok' | 'denied'> {
  const perm = await MediaLibrary.requestPermissionsAsync(true);
  if (!perm.granted) return 'denied';
  await MediaLibrary.saveToLibraryAsync(uri);
  await logExport([], 'gallery');
  return 'ok';
}

/** Let the user choose a photo; copy it into app storage so the saved design keeps working later. Returns the stored uri or null if cancelled. */
export async function pickCardImage(): Promise<string | null> {
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85, allowsEditing: false, exif: false });
  if (r.canceled || !r.assets?.[0]) return null;
  const src = new File(r.assets[0].uri);
  const dir = new Directory(Paths.document, 'cards');
  if (!dir.exists) dir.create({ intermediates: true });
  const ext = (r.assets[0].uri.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 4) || 'jpg';
  const dest = new File(dir, `img-${Date.now().toString(36)}.${ext}`);
  src.copy(dest);
  return dest.uri;
}
