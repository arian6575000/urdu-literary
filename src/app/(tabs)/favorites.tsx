import React from 'react';
import { Screen } from '../../components/design-system';
import { S } from '../../constants/strings';
import { LibraryView } from '../../features/library/LibraryView';

export default function Favorites() { return <Screen title={S.favSection} scroll={false} pad={false}><LibraryView favoritesOnly /></Screen>; }
