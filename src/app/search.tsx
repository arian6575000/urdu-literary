import React from 'react';
import { Screen } from '../components/design-system';
import { S } from '../constants/strings';
import { LibraryView } from '../features/library/LibraryView';

// Global search: title, author and text, diacritic-insensitive, with recent searches.
export default function Search() { return <Screen title={S.search} back scroll={false} pad={false}><LibraryView autoFocusSearch showRecents /></Screen>; }
