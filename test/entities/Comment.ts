import {
  Entity,
  Field,
  Index,
  Reposiory,
  repository,
  Timestamp,
} from '../../src'

@Entity({ id: true, timestamps: true, autoIndex: true })
@Index({ commentId: 1 })
export class Comment implements Timestamp {
  id?: any
  _id?: any

  @Field({ type: String })
  commentId: string

  @Field(String)
  content: string

  readonly createdAt?: Date
  readonly updatedAt?: Date
}

@repository(Comment)
export class CommentRepository extends Reposiory<Comment> {}
