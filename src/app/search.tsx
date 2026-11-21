import React from 'react';
import { Screen } from '../components/design-system';
import { S } from '../constants/strings';
import { LibraryView } from '../features/library/LibraryView';

// Screen 13 — Search (title, full text, words, category chips, sort by date; all against the local database)
export default function Search() {
  return <Screen title={S.search} back scroll={false} pad={false}><LibraryView autoFocusSearch /></Screen>;
}
