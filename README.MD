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

## Actions

### - create (ctx: ContextCreate\<E>): Promise\<E\>

```typescript
interface ContextCreate<E = any, M = { cascadeContext?: CascadeContext }>
  extends Context<M> {
  // Query for check existed, if set then check entity existed with query before
  // If Exist throw error
  query?: FilterQuery<E>
  data: E
  session?: any
  safe?: boolean
  populates?: (keyof E)[] | Array<PopulateOptions>
}
```

### - createMany (ctx: ContextCreate\<E>): Promise\<E[]\>

```typescript
interface ContextCreateMany<E = any, M = { cascadeContext?: CascadeContext }>
  extends Context<M>,
    ContextOptions<E> {
  // Query for check existed, if set then check entity existed with query before
  // If Exist throw error
  query?: FilterQuery<E>
  data: E[]
  safe?: boolean
  session?: any
  populates?: (keyof E)[] | Array<PopulateOptions>
}
```
