import { apiClient } from './client';
import { ApiResponse } from '../../types';

export interface ImageAsset {
  uri: string;
  name?: string;
  type?: string;
}

export async function uploadImages(images: ImageAsset[]): Promise<string[]> {
  const formData = new FormData();

  images.forEach((img, index) => {
    const filename = img.name || img.uri.split('/').pop() || `photo_${index}.jpg`;
    const match = /\.(\w+)$/.exec(filename);
    const type = img.type || (match ? `image/${match[1]}` : 'image/jpeg');

    // @ts-expect-error React Native FormData file format
    formData.append('images', {
      uri: img.uri,
      name: filename,
      type,
    });
  });

  const res = await apiClient.post<ApiResponse<{ urls: string[] }>>('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return res.data.data!.urls;
}
