import { Reposiory } from '../src'
import { createMongoConnection } from '../src/utils'
import { CommentRepository } from './entities'
import { Post, PostRepository } from './entities/Post'
import { UserRepository } from './entities/User'

const { connection, ready } = createMongoConnection(
  'mongodb://localhost:27018',
  {
    dbName: 'test',
    user: 'testuser',
    pass: 'abc123',
    authSource: 'test',
  }
)

Reposiory.addBefore(/.*/, (ctx: any) => {
  if (ctx.meta) {
    ctx.meta.globalBeforeIsCall = true
  }
})

Reposiory.addAfter(/.*/, (ctx: any, ...args: any[]) => {
  if (ctx.meta) {
    ctx.meta.globalAfterIsCall = true
  }
  return args[args.length - 1]
})

const userRepository = new UserRepository(connection)
const postRepository = new PostRepository(connection)
const commentRepository = new CommentRepository(connection)

beforeAll(async () => {
  await ready
  await userRepository.create({
    data: {
      username: 'longnd',
      name: 'Nguyễn Đức Long',
    },
  })
})

describe('Repository', () => {
  it('repository property', () => {
    expect(userRepository.name).toEqual('UserRepository')
  })

  it('create', async () => {
    const post = await postRepository.create({
      data: {
        title: 'Lorem Ipsum is simply dummy text',
        content:
          'Lorem Ipsum is simply dummy text of the printing and typesetting industry.',
      },
    })

    expect(post).not.toBeNull()
  })

  it('findOne & hook before, after', async () => {
    const meta = {
      beforeIsCall: false,
      afterIsCall: false,
    }

    const find = await userRepository.findOne({
      query: { username: 'longnd' },
      meta,
    })

    expect(find).not.toBeUndefined()
    expect(find).not.toBeNull()
    expect(meta.beforeIsCall).toEqual(true)
    expect(meta.afterIsCall).toEqual(true)
  })

  it('global hook before & after', async () => {
    const payload = {
      meta: {
        globalBeforeIsCall: false,
        globalAfterIsCall: false,
      },
    }

    await userRepository.findOne(payload)

    expect(payload.meta.globalBeforeIsCall).toBe(true)
    expect(payload.meta.globalAfterIsCall).toBe(true)
  })

  it('create & cascade', async () => {
    const post = await postRepository.create({
      data: {
        title:
          'when an unknown printer took a galley of type and scrambled it to make a type specimen book',
        content:
          'Lorem Ipsum is simply dummy text of the printing and typesetting industry. ',
        comments: [
          {
            commentId: 'test_create',
            content: 'Hello everyone',
          },
        ],
        user: {
          name: 'Test Cascade',
          username: 'testcascade',
        },
      },
      populates: ['comments', 'user'],
    })

    expect(post.comments[0].id).not.toBeNull()
    expect(post.comments[0].content).toEqual('Hello everyone')
    expect(post.user.id).not.toBeNull()
    expect(post.user.name).toEqual('Test Cascade')
  })

  it('create & cascade & rollback', async () => {
    try {
      await postRepository.create({
        data: {
          title:
            'when an unknown printer took a galley of type and scrambled it to make a type specimen book',
          content:
            'Lorem Ipsum is simply dummy text of the printing and typesetting industry. ',
          comments: [
            {
              commentId: 'create_rollback',
              content: 'Hello everyone 1',
            },
            {
              commentId: 'create_rollback',
              content: 'Hello everyone 2',
            },
          ],
          user: {
            name: 'Test Cascade',
            username: 'testcascade_rollback',
          },
        },
      })
    } catch (error) {}

    const comment = await commentRepository.findOne({
      query: { commentId: 'create_rollback' },
    })

    expect(comment).toBeNull()

    const user = await userRepository.findOne({
      query: {
        username: 'testcascade_rollback',
      },
    })

    expect(user).toBeNull()
  })

  it('createMany', async () => {
    const posts = await postRepository.createMany({
      data: [
        {
          title: 'create many title 1',
          content: 'create many content 1',
        },
        {
          title: 'create many title 2',
          content: 'create many content 2',
        },
      ],
    })

    expect(posts.length).toEqual(2)
  })

  it('createMany & cascade', async () => {
    const posts = await postRepository.createMany({
      data: [
        {
          title: 'create many title 1',
          content: 'create many content 1',
          comments: [
            {
              commentId: 'create_many_cascade_1',
              content: 'create_many_cascade_1',
            },
          ],
        },
        {
          title: 'create many title 2',
          content: 'create many content 2',
          comments: [
            {
              commentId: 'create_many_cascade_2',
              content: 'create_many_cascade_2',
            },
          ],
        },
      ],
      populates: ['comments'],
    })

    expect(posts.length).toEqual(2)
    expect(posts[0].comments[0].id).not.toBeNull()
    expect(posts[0].comments[0].commentId).toEqual('create_many_cascade_1')
  })

  it('createMany & cascade & rollback', async () => {
    try {
      const posts = await postRepository.createMany({
        data: [
          {
            title: 'create many cascade rollback title 1',
            content: 'create many content 1',
            comments: [
              {
                commentId: 'create_many_cascade_rollback_1',
                content: 'create_many_cascade_rollback_1',
              },
            ],
          },
          {
            title: 'create many title 2',
            content: 'create many content 2',
            comments: [
              {
                commentId: 'create_many_cascade_rollback_1', // dupplicate here
                content: 'create_many_cascade_rollback_1',
              },
            ],
          },
        ],
        populates: ['comments'],
      })
    } catch (error) {}

    const post = await postRepository.findOne({
      query: { title: 'create many cascade rollback title 1' },
    })

    expect(post).toBeNull()

    const comment = await commentRepository.findOne({
      query: { commentId: 'create_many_cascade_rollback_1' },
    })

    expect(comment).toBeNull()
  })

  /** UpdateOne */
  it('updateOne', async () => {
    const meta: any = {}
    const user = await userRepository.updateOne({
      query: {
        username: 'longnd',
      },
      data: {
        name: 'Nguyen Duc Long 2',
      },
      meta,
    })

    expect(user).not.toBeNull()
    expect(user.name).toEqual('Nguyen Duc Long 2')
  })

  it('updateOne & cascade', async () => {
    const post1 = await postRepository.create({
      data: {
        title: 'updateOne cascade',
        content: 'updateOne cascade',
        comments: [
          { commentId: 'updateOne cascade 1', content: 'updateOne cascade 1' },
        ],
      },
      populates: ['comments'],
    })

    const post = await postRepository.updateOne({
      query: {
        _id: post1.id,
      },
      data: {
        title: 'updated',
        content: 'updated',
        comments: [
          {
            id: post1.comments[0].id,
            commentId: 'updateOne cascade 1:updated',
          } as any,
          { commentId: 'updateOne cascade 2', content: 'updateOne cascade 2' },
        ],
      },
      populates: ['comments'],
    })

    expect(post.comments.length).toEqual(2)
    expect(post.comments[0].id).toEqual(post1.comments[0].id)
    expect(post.comments[0].commentId).toEqual('updateOne cascade 1:updated')
    expect(post).not.toBeNull()
  })

  it('updateOne & cascade & rollback', async () => {
    const post = await postRepository.create({
      data: {
        title: 'updateOne & cascade & rollback',
        content: 'updateOne & cascade & rollback',
        comments: [
          {
            commentId: 'updateOne & cascade & rollback',
            content: 'updateOne & cascade & rollback',
          },
        ],
      },
      populates: ['comments'],
    })

    expect(post.comments.length).toEqual(1)

    try {
      await postRepository.updateOne({
        query: {
          _id: post.id,
        },
        data: {
          title: 'post updateOne & cascade & rollback:updated',
          comments: [
            {
              id: post.comments[0].id,
              commentId: 'updateOne & cascade & rollback:updated',
            } as any,
            {
              commentId: 'updateOne & cascade & rollback:updated',
              content: 'updateOne cascade 2',
            },
          ],
        },
        populates: ['comments'],
      })
    } catch (error) {}

    const find = await postRepository.findOne({
      query: { id: post.id },
      populates: ['comments'],
    })

    const comment = await commentRepository.findOne({
      query: {
        commentId: 'updateOne & cascade & rollback:updated',
      },
    })

    const comment1 = await commentRepository.findOne({
      query: {
        id: post.comments[0].id,
      },
    })

    expect(comment).toBeNull()
    expect(comment1.commentId).toBe('updateOne & cascade & rollback')
    expect(find.title).toEqual('updateOne & cascade & rollback')
    expect(find.comments.length).toEqual(1)
    expect(find.comments[0].commentId).toEqual('updateOne & cascade & rollback')
  })
  /** End UpdateOne */

  /**
   * UpdateMany
   * */
  it('UpdateMany', async () => {
    const meta: any = {}
    await userRepository.createMany({
      data: [
        {
          username: 'updatemany1',
          name: 'Nguyen Duc Long 1',
        },
        {
          username: 'updatemany2',
          name: 'Nguyen Duc Long 2',
        },
      ],
      meta,
    })

    const [user1, user2] = await userRepository.update({
      query: {
        username: {
          $in: ['updatemany1', 'updatemany2'],
        },
      },
      data: {
        name: 'updateMany success',
      },
    })

    expect(user1.name).toEqual('updateMany success')
    expect(user2.name).toEqual('updateMany success')
  })

  it('updateMany & cascade', async () => {
    const posts = await postRepository.createMany({
      data: [
        {
          title: 'updateMany & cascade 1',
          content: 'updateMany & cascade 1',
          comments: [
            {
              commentId: 'updateMany & cascade 1',
              content: 'updateMany & cascade 1',
            },
          ],
        },
        {
          title: 'updateMany & cascade 2',
          content: 'updateMany & cascade 2',
          comments: [
            {
              commentId: 'updateMany & cascade 2',
              content: 'updateMany & cascade 2',
            },
          ],
        },
      ],
      populates: ['comments'],
    })

    const _posts = await postRepository.update({
      query: {
        _id: { $in: posts.map((e) => e.id) },
      },
      data: {
        title: 'updateMany & cascade 2 <success>',
        content: 'updateMany & cascade 2 <success>',
        user: {
          username: 'updateMany & cascade 2',
          name: 'updateMany & cascade 2',
        },
      },
      populates: ['comments', 'user'],
    })

    _posts.forEach((post) => {
      expect(post.user).not.toBeNull()
      expect(post.user.username).toEqual('updateMany & cascade 2')
    })
  })

  it('updateMany & cascade & rollback', async () => {
    const posts = await postRepository.createMany({
      data: [
        {
          title: 'updateMany & cascade & rollback1',
          content: 'updateMany & cascade & rollback1',
          comments: [
            {
              commentId: 'updateMany & cascade & rollback1',
              content: 'updateMany & cascade & rollback1',
            },
          ],
        },
        {
          title: 'updateMany & cascade & rollback2',
          content: 'updateMany & cascade & rollback2',
          comments: [
            {
              commentId: 'updateMany & cascade & rollback2',
              content: 'updateMany & cascade & rollback2',
            },
          ],
        },
      ],
      populates: ['comments'],
    })

    expect(posts.length).toEqual(2)

    try {
      await postRepository.update({
        query: {
          _id: { $in: posts.map((post) => post.id) },
        },
        data: {
          title: 'post updateMany & cascade & rollback:updated',
          comments: [
            {
              commentId: 'updateMany & cascade & rollback2',
            } as any,
          ],
        },
        populates: ['comments'],
      })
    } catch (error) {
      // console.log('error when updateMany => check rollback work')
    }

    const _posts = await postRepository.find({
      query: { _id: { $in: posts.map((post) => post.id) } },
      populates: ['comments'],
    })

    _posts.forEach((post, index) => {
      // check rollback work
      expect(post.comments.length).toBe(1)
      expect(post.title).toEqual(`updateMany & cascade & rollback${index + 1}`)
      expect(post.comments[0].commentId).toEqual(
        `updateMany & cascade & rollback${index + 1}`
      )
    })
  })
  /**
   * End UpdateMany
   */

  it('delete cascade', async () => {
    const post = await postRepository.create({
      data: {
        title: 'delete cascade',
        content: 'delete cascade',
        user: {
          name: 'delete cascade',
          username: 'delete cascade',
        },
      },
    })

    await postRepository.deleteOne({ query: { _id: post._id } })

    expect(
      await userRepository.findOne({ query: { _id: post.user.id } })
    ).toBeNull()
  })
})

afterAll(async () => {
  for (const key in connection.collections) {
    const collection = connection.collections[key]
    await collection.deleteMany({})
  }
  return connection.close()
})
