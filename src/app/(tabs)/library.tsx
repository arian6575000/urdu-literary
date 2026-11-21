import React from 'react';
import { Screen } from '../../components/design-system';
import { S } from '../../constants/strings';
import { LibraryView } from '../../features/library/LibraryView';

// Screen 04 — Writing Library
export default function Library() {
  return <Screen title={S.library} scroll={false} pad={false}><LibraryView /></Screen>;
}
