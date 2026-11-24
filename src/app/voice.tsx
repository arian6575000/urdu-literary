import React from 'react';
import { Screen } from '../components/design-system';
import { S } from '../constants/strings';
import { VoiceWriter } from '../features/voice/VoiceWriter';

export default function VoiceScreen() { return <Screen title={S.voiceStudio} back scroll={false} pad={false}><VoiceWriter /></Screen>; }
