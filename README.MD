```typescript
import { SchemaTypes } from 'mongoose'
import {
  Field,
  Reposiory,
  repository,
  Entity,
  Timestamp,
  Before,
  After,
} from 'mongodbts'

/** Declare for User schema */
@Entity({ id: true })
class User implements Timestamp {
  @Field(String)
  name: string

  @Field(String)
  username: string

  @Field([{ type: SchemaTypes.ObjectId }])
  posts?: []
}

/** Here is Repository for User model */
@repository(User)
export class UserRepository extends Reposiory<User> {
  @Before('findOne')
  beforeFindOne(ctx: any) {
    // Hook call before findOne
    ctx.meta.beforeIsCall = true
  }

  @After('findOne')
  afterFindOne(ctx: any, result: any) {
    // Hook call after findOne
    // result is return of action findOne or prev afterHook
    // In afterHook, must be return result to next afterHook
    ctx.meta.afterIsCall = true
    return rs
  }

  @Action()
  hello() {
    // Declare action
    return 'Hello'
  }
}
```
