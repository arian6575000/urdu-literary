import React from 'react';
import { Screen } from '../../components/design-system';
import { S } from '../../constants/strings';
import { VoiceWriter } from '../../features/voice/VoiceWriter';

export default function VoiceTab() {
  return <Screen title={S.voiceTitle} scroll={false} pad={false}><VoiceWriter /></Screen>;
}
