import { SchemaTypes } from 'mongoose'
import {
  After,
  Before,
  Entity,
  Field,
  Repository,
  repository,
  Timestamp,
} from '../../src'

@Entity({ id: true })
export class User implements Timestamp {
  readonly id?: any
  readonly _id?: any

  @Field(String)
  name: string

  @Field({ type: String })
  username: string

  readonly createdAt?: Date
  readonly updatedAt?: Date
}

@repository(User)
export class UserRepository extends Repository<User> {
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
