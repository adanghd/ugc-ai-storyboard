import React from 'react';
import { AspectRatio, MusicStyle } from './types';
import { AspectRatio16x9Icon, AspectRatio1x1Icon, AspectRatio9x16Icon } from './components/icons';

export const ASPECT_RATIOS: { label: string; value: AspectRatio; icon: React.FC<{className?: string}> }[] = [
  { label: '9:16', value: '9:16', icon: AspectRatio9x16Icon },
  { label: '1:1', value: '1:1', icon: AspectRatio1x1Icon },
  { label: '16:9', value: '16:9', icon: AspectRatio16x9Icon },
];

export const CAMERA_ANGLES = [
  'high angle',
  'side profile',
  "bird's eye view",
  'low angle',
  'macro camera',
  'eye-level',
  '¾ angle',
  'close-up product',
  'POV',
];

export const MUSIC_STYLES: { label: string; value: MusicStyle }[] = [
    { label: 'Chill', value: 'chill' },
    { label: 'Upbeat', value: 'upbeat' },
    { label: 'Cinematic', value: 'cinematic' },
    { label: 'Energetic', value: 'energetic' },
];