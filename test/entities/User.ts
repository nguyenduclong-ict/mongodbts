import { SchemaTypes } from 'mongoose'
import {
  Field,
  Reposiory,
  repository,
  Entity,
  Timestamp,
  Before,
  After,
} from '../../src'

@Entity({ id: true })
export class User implements Timestamp {
  readonly id?: any
  readonly _id?: any

  @Field(String)
  name: string

  @Field(String)
  username: string

  readonly createdAt?: Date
  readonly updatedAt?: Date
}

@repository(User)
export class UserRepository extends Reposiory<User> {
  @Before('findOne')
  beforeFindOne(ctx: any) {
    ctx.meta.beforeIsCall = true
  }

  @After('findOne')
  afterFindOne(ctx: any, rs: any) {
    ctx.meta.afterIsCall = true
    return rs
  }
}
