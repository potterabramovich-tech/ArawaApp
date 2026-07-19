export type UserId = string & { readonly __brand: 'UserId' };
export interface UserProfile { id: UserId; displayName: string; handle: string; avatarUrl?: string; bio?: string; }
export interface FeedItem { id: string; creator: UserProfile; mediaUrl: string; caption?: string; createdAt: string; }

