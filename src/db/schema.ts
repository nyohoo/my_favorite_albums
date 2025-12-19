import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// ユーザーテーブル
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// アルバムテーブル
export const albums = sqliteTable('albums', {
  id: text('id').primaryKey(),
  spotifyId: text('spotify_id').notNull().unique(),
  name: text('name').notNull(),
  artist: text('artist').notNull(),
  imageUrl: text('image_url').notNull(),
  releaseDate: text('release_date'),
  spotifyUrl: text('spotify_url'),
  artistId: text('artist_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// 投稿テーブル（9枚のアルバムリスト）
export const posts = sqliteTable('posts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  title: text('title'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// 投稿とアルバムの中間テーブル
export const postAlbums = sqliteTable('post_albums', {
  id: text('id').primaryKey(),
  postId: text('post_id').notNull().references(() => posts.id),
  albumId: text('album_id').notNull().references(() => albums.id),
  position: integer('position').notNull(), // 1-9の位置
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Album = typeof albums.$inferSelect;
export type NewAlbum = typeof albums.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type PostAlbum = typeof postAlbums.$inferSelect;
export type NewPostAlbum = typeof postAlbums.$inferInsert;

