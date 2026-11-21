import React from 'react';
import { Screen } from '../components/design-system';
import { S } from '../constants/strings';
import { LibraryView } from '../features/library/LibraryView';

// Screen 12 — Favorites
export default function Favorites() {
  return <Screen title={S.favorites} back scroll={false} pad={false}><LibraryView favoritesOnly /></Screen>;
}
