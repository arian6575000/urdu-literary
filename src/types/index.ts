export interface Writing {
  id: string; title: string; content: string; category_id: string; author: string;
  original_transcript: string; is_favorite: number; word_count: number; created_at: number; updated_at: number;
}
export interface WritingVersion { id: number; writing_id: string; title: string; content: string; created_at: number }
export interface DictEntry { id: number; word: string; note: string; wrong_forms: string; created_at: number }
export interface VoiceSession { id: string; writing_id: string | null; engine: string; started_at: number; ended_at: number | null; status: string }
export interface VoiceTranscript { id: number; session_id: string; original_text: string; edited_text: string; created_at: number }
export type SortOrder = 'newest' | 'oldest' | 'title' | 'words';
export interface Collection { id: string; title: string; description: string; color: number; created_at: number; updated_at: number }
export interface CollectionSummary extends Collection { count: number; favorites: number }
export interface WritingQuery { text?: string; category?: string; kind?: 'poetry' | 'prose'; collectionId?: string; favoritesOnly?: boolean; sort?: SortOrder; limit?: number }
