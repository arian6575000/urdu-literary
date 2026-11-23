import React from 'react';
import { Screen } from '../components/design-system';
import { S } from '../constants/strings';
import { LibraryView } from '../features/library/LibraryView';

// Choose which writing to turn into a card (opens the card designer).
export default function CardPick() { return <Screen title={S.pickCardT} back scroll={false} pad={false}><LibraryView pickCard startKind="poetry" /></Screen>; }
