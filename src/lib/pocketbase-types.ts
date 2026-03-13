/**
* This file was @generated using pocketbase-typegen
*/

export enum Collections {
	BillboardPosts = "billboard_posts",
	Games = "games",
	ListItems = "list_items",
	NowPlaying = "now_playing",
	Secrets = "secrets",
	UserSettings = "user_settings",
	Users = "users",
}

export type ListMode =
	| "column-grid"
	| "row-grid"
	| "list"
	| "position-drag"
	| "binary-tree"
	| "spiral";

// Alias types for improved usability
export type IsoDateString = string
export type RecordIdString = string
export type HTMLString = string

// System fields
export type BaseSystemFields<T = never> = {
	id: RecordIdString
	created: IsoDateString
	updated: IsoDateString
	collectionId: string
	collectionName: Collections
	expand?: T
}

export type AuthSystemFields<T = never> = {
	email: string
	emailVisibility: boolean
	username: string
	verified: boolean
} & BaseSystemFields<T>

// Record types for each collection

export type BillboardPostsRecord = {
	message?: string
	display?: boolean
}

export type GamesRecord = {
	name: string
	igdb_url?: string
	cover_art?: string
	cover_art_url?: string
}

export type ListItemsRecord = {
	user?: RecordIdString
	game?: RecordIdString
	position?: number
}

export type NowPlayingRecord = {
	it_user?: RecordIdString
	game?: RecordIdString
}

export type NowPlayingResponse<Texpand = unknown> = Required<NowPlayingRecord> & BaseSystemFields<Texpand>

export type SecretsRecord<Tcontent = unknown> = {
	name?: string
	content?: null | Tcontent
}

export type UserSettingsRecord = {
	user?: RecordIdString
	list_mode?: ListMode
}

export type UsersRecord = {
	name?: string
	avatar?: string
}

// Response types include system fields and match responses from the PocketBase API
export type UserSettingsResponse = Required<UserSettingsRecord> & BaseSystemFields
export type BillboardPostsResponse = Required<BillboardPostsRecord> & BaseSystemFields
export type GamesResponse = Required<GamesRecord> & BaseSystemFields
export type ListItemsResponse<Texpand = unknown> = Required<ListItemsRecord> & BaseSystemFields<Texpand>
export type SecretsResponse<Tcontent = unknown> = Required<SecretsRecord<Tcontent>> & BaseSystemFields
export type UsersResponse = Required<UsersRecord> & AuthSystemFields

// Types containing all Records and Responses, useful for creating typing helper functions

export type CollectionRecords = {
	billboard_posts: BillboardPostsRecord
	games: GamesRecord
	list_items: ListItemsRecord
	now_playing: NowPlayingRecord
	secrets: SecretsRecord
	user_settings: UserSettingsRecord
	users: UsersRecord
}

export type CollectionResponses = {
	billboard_posts: BillboardPostsResponse
	games: GamesResponse
	list_items: ListItemsResponse
	now_playing: NowPlayingResponse
	secrets: SecretsResponse
	user_settings: UserSettingsResponse
	users: UsersResponse
}