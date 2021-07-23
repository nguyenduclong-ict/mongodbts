import { SchemaType, SchemaTypes } from 'mongoose'
import {
  Entity,
  Field,
  Index,
  Repository,
  repository,
  Timestamp,
} from '../../src'

@Entity({ id: true, timestamps: true, autoIndex: true })
@Index({ commentId: 1 })
export class Comment implements Timestamp {
  id?: any
  _id?: any

  @Field({ type: String, unique: true })
  commentId: string

  @Field(SchemaTypes.Mixed)
  content: string

  readonly createdAt?: Date
  readonly updatedAt?: Date
}

@repository(Comment)
export class CommentRepository extends Repository<Comment> {}
