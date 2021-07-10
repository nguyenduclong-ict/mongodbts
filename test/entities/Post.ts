import { SchemaTypes } from 'mongoose'
import {
  Cascade,
  Entity,
  Field,
  Reposiory,
  repository,
  Timestamp,
} from '../../src'
import { Comment } from './Comment'
import { User } from './User'

@Entity({ id: true, timestamps: true })
export class Post implements Timestamp {
  id?: any
  _id?: any

  @Field(String)
  title: string

  @Field(String)
  content: string

  @Field([{ type: SchemaTypes.ObjectId, ref: 'Comment' }])
  @Cascade()
  comments?: Comment[]

  @Field({ type: SchemaTypes.ObjectId, ref: 'User' })
  @Cascade({ create: true, update: true, delete: true, onDelete: 'null' })
  user?: User

  readonly createdAt?: Date
  readonly updatedAt?: Date
}

@repository(Post)
export class PostRepository extends Reposiory<Post> {}
