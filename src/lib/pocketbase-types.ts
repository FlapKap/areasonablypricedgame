/**
* This file was @generated using pocketbase-typegen
*/

export enum Collections {
	BillboardPosts = "billboard_posts",
	Games = "games",
	ListItems = "list_items",
	Reviews = "reviews",
	Secrets = "secrets",
	Users = "users",
}

// Alias types for improved usability
export type IsoDateString = string
export type RecordIdString = string

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
}

export type ListItemsRecord = {
	user: RecordIdString
	game: RecordIdString
	position?: number
}

export type ReviewsRecord = {
	user: RecordIdString
	game: RecordIdString
	text?: string
	playtime_seconds?: number
}

export type SecretsRecord<Tcontent = unknown> = {
	name?: string
	content?: null | Tcontent
}

export type UsersRecord = {
	avatar?: string
}

// Response types include system fields and match responses from the PocketBase API
export type BillboardPostsResponse = BillboardPostsRecord & BaseSystemFields
export type GamesResponse = GamesRecord & BaseSystemFields
export type ListItemsResponse<Texpand = unknown> = ListItemsRecord & BaseSystemFields<Texpand>
export type ReviewsResponse<Texpand = unknown> = ReviewsRecord & BaseSystemFields<Texpand>
export type SecretsResponse<Tcontent = unknown> = SecretsRecord<Tcontent> & BaseSystemFields
export type UsersResponse = UsersRecord & AuthSystemFields

export type CollectionRecords = {
	billboard_posts: BillboardPostsRecord
	games: GamesRecord
	list_items: ListItemsRecord
	reviews: ReviewsRecord
	secrets: SecretsRecord
	users: UsersRecord
}