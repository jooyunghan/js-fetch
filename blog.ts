let h = require('virtual-dom/h')
let toHTML = require('vdom-to-html');


class Result<A> {

}

class Done<A> extends Result<A> {
  constructor(public a: A) {
    super()
  }
}

class Blocked<A> extends Result<A> {
  constructor(public brs: Array<BlockedRequest<any>>, public cont: Fetch<A>) {
    super()
  }
}


class BlockedRequest<A> {
  constructor(public request: Request<A>, public ref: Ref<FetchStatus<A>>) {
  }
}

type FetchStatus<A> = NotFetched | FetchSuccess<A>

class NotFetched {
}

class FetchSuccess<A>  {
  constructor(public a: A) {
  }
}

class Ref<A> {
  constructor(public value: A) { }
  read(): A {
    return this.value
  }
  write(a: A) {
    this.value = a
  }
}

class Fetch<A> {
  constructor(public run: () => Result<A>) {
  }

  ap<B, C>(b: Fetch<B>): Fetch<C> {
    return Fetch.ap(this as any, b);
  }

  map<B>(f: (a: A) => B): Fetch<B> {
    return new Fetch(() => {
      let r = this.run()
      if (r instanceof Done) {
        return new Done(f(r.a))
      } else if (r instanceof Blocked) {
        return new Blocked(r.brs, r.cont.map(f))
      }
    })
  }

  flatMap<B>(f: (a: A) => Fetch<B>): Fetch<B> {
    return new Fetch(() => {
      let r = this.run()
      if (r instanceof Done) {
        return f(r.a).run()
      } else if (r instanceof Blocked) {
        return new Blocked(r.brs, r.cont.flatMap(f))
      }
    })
  }


  static ap<A, B>(f: Fetch<(a: A) => B>, a: Fetch<A>): Fetch<B> {
    return new Fetch(() => {
      let ff = f.run()
      let aa = a.run()
      if (ff instanceof Done) {
        if (aa instanceof Done) {
          return new Done(ff.a(aa.a))
        } else if (aa instanceof Blocked) {
          return new Blocked(aa.brs, aa.cont.map(ff.a))
        }
      } else if (ff instanceof Blocked) {
        if (aa instanceof Done) {
          return new Blocked(ff.brs, ff.cont.ap(Fetch.pure(aa.a)))
        } else if (aa instanceof Blocked) {
          return new Blocked(ff.brs.concat(aa.brs), ff.cont.ap(aa.cont))
        }
      }
    })
  }

  static pure<A>(a: A): Fetch<A> {
    return new Fetch(() => new Done(a));
  }

  static liftA2<A, B, C>(f: (a: A, b: B) => C): (a: Fetch<A>, b: Fetch<B>) => Fetch<C> {
    return (a: Fetch<A>, b: Fetch<B>) => {
      return Fetch.pure(curry(f)).ap(a).ap(b)
    }
  }

  static traverse<A, B>(f: (a: A) => Fetch<B>, as: Array<A>): Fetch<Array<B>> {
    if (as.length == 0) return Fetch.pure([])
    else return Fetch.liftA2((a: B, as: B[]) => [a].concat(as))(f(as[0]), Fetch.traverse(f, as.slice(1)))
  }
}

// [HAXL 5.1]
// given `fetch`, running `Fetch` computation
function runFetch<A>(f: Fetch<A>): A {
  let r = f.run()
  if (r instanceof Done) {
    return r.a
  } else if (r instanceof Blocked) {
    fetch(r.brs)
    return runFetch(r.cont)
  }
}

// [HAXL 5]
// In order to fetch some data, we need a primitive that takes a
// description of the data to fetch, and returns the data itself.
function dataFetch<A>(request: Request<A>): Fetch<A> {
  return new Fetch<A>(() => {
    let box = new Ref(new NotFetched())
    let br = new BlockedRequest(request, box)
    let cont = new Fetch(() => {
      let result = (<FetchSuccess<A>>box.read()).a;
      //console.log(request, "=>", result)
      return new Done(result)
    })
    return new Blocked([br], cont)
  })
}

// Blog example

type PostId = number

type PostInfo = { postId: PostId, postDate: Date, postTopic: String }

type PostContent = string

// [HAXL 5.1]
// Requests are parameterised by their result type
class Request<A> {
}

class FetchPosts extends Request<Array<PostId>> {
}

class FetchPostInfo extends Request<PostInfo> {
  constructor(public id: PostId) {
    super()
  }
}

class FetchPostContent extends Request<PostContent> {
  constructor(public id: PostId) {
    super()
  }
}

class FetchPostViews extends Request<number> {
  constructor(public id: PostId) {
    super()
  }
}

// implementations for the data-fetching operations

function getPostIds(): Fetch<Array<PostId>> {
  return dataFetch(new FetchPosts());
}

function getPostInfo(id: PostId): Fetch<PostInfo> {
  return dataFetch(new FetchPostInfo(id));
}

function getPostContent(id: PostId): Fetch<PostContent> {
  return dataFetch(new FetchPostContent(id));
}

function getPostViews(id: PostId): Fetch<number> {
  return dataFetch(new FetchPostViews(id));
}

// [HAXL 5.1]
// application-specific data-fetching
// The job of `fetch` is to fill in the `Ref` in each `BlockedRequest`
// with the data fetched. Ideally, `fetch` will take full advantage of
// concurrency where possible, and will batch together requests for
// data from the same source.
function fetch(brs: Array<BlockedRequest<any>>) {
  const posts = [
    {
      info: {
        postDate: new Date("2016-06-25"),
        postId: 1,
        postTopic: "haskell"
      },
      content: "haskell content",
      views: 2
    },
    {
      info: {
        postDate: new Date("2016-06-26"),
        postId: 3,
        postTopic: "applicative"
      },
      content: "applicative content",
      views: 9
    },
    {
      info: {
        postDate: new Date("2016-06-27"),
        postId: 6,
        postTopic: "haxl"
      },
      content: "haxl content",
      views: 7
    },
    {
      info: {
        postDate: new Date("2016-06-23"),
        postId: 4,
        postTopic: "haskell"
      },
      content: "another haskell content",
      views: 8
    },
    {
      info: {
        postDate: new Date("2016-06-21"),
        postId: 5,
        postTopic: "functional"
      },
      content: "functional content",
      views: 10
    },
  ]
  function findPost(id: PostId) {
    for (let i = 0; i < posts.length; i++) {
      if (posts[i].info.postId === id) return posts[i]
    }
  }
  function dispatch(request: Request<any>): any {
    if (request instanceof FetchPosts)
      return posts.map((p) => p.info.postId)
    if (request instanceof FetchPostInfo)
      return findPost(request.id).info
    if (request instanceof FetchPostContent)
      return findPost(request.id).content
    if (request instanceof FetchPostViews)
      return findPost(request.id).views
  }
  brs.forEach(br => {
    let result = dispatch(br.request)
    br.ref.write(new FetchSuccess(result))
  })
}

// [HAXL 2.1]
function blog(): Fetch<Html> {
  return Fetch.liftA2(renderPage)(leftPane(), mainPane());
}

function mainPane(): Fetch<Html> {
  return getAllPostsInfo().map(posts => {
    posts.sort((p1, p2) => p2.postDate.getTime() - p1.postDate.getTime())
    return posts.slice(0, 5)
  }).flatMap(ordered => {
    return Fetch.traverse(p => getPostContent(p.postId), ordered)
      .map(content => renderPosts(zip(ordered, content)))
  })
}

function getAllPostsInfo(): Fetch<Array<PostInfo>> {
  return getPostIds()
    .flatMap(ids => Fetch.traverse(getPostInfo, ids))
}

function leftPane(): Fetch<Html> {
  return Fetch.liftA2(renderSidePane)(popularPosts(), topics());
}

function getPostDetails(id: PostId): Fetch<[PostInfo, PostContent]> {
  return Fetch.liftA2((a, b) => [a, b])(getPostInfo(id), getPostContent(id))
}

function popularPosts(): Fetch<Html> {
  return getPostIds()
    .flatMap(pids => {
      return Fetch.traverse(getPostViews, pids)
        .map(views => {
          let paired = zip(pids, views)
          paired.sort((a, b) => b[1] - a[1])
          return paired.slice(0, 5).map(pair => pair[0]);
        })
    })
    .flatMap(ordered => Fetch.traverse(getPostDetails, ordered))
    .map(content => renderPostList(content))
}

function topics(): Fetch<Html> {
  return getAllPostsInfo()
    .map(posts => {
      let topics = posts.map(p => p.postTopic)
      let map: { [s: string]: number } = {}
      topics.forEach((topic: string) => {
        map[topic] = 1 + (map[topic] as number || 0)
      })
      return map
    })
    .map(renderTopics)
}

type Html = any

function renderTopics(topics: { [word: string]: number }): Html {
  return h('ul', {}, Object.keys(topics).map(topic => {
    return h('li', {}, `${topic} - ${topics[topic]}`)
  }))
}

function renderSidePane(popular: Html, topics: Html): Html {
  return h('section', {}, [
    h('div#popular', {}, [h('h2', {}, "Popular"), popular]),
    h('div#topics', {}, [h('h2', {}, "Topics"), topics])
  ])
}

function renderPostList(posts: Array<[PostInfo, PostContent]>): Html {
  return h('ul', {}, posts.map(p => {
    return h('li', {}, p[1])
  }))
}

function renderPosts(posts: Array<[PostInfo, PostContent]>): Html {
  return h('div', {}, posts.map(p => {
    return h('div', {}, [
      h('h2', {}, String(p[0].postDate)),
      h('div', {}, p[1])
    ])
  }))
}

function renderPage(left: Html, main: Html): Html {
  return h('div', {style: {display: 'flex'}}, [
    h('div#left', {style: {width: 200}}, [left]),
    h('div#main', {style: {flex: 2}}, [main])
  ])
}

function zip<A, B>(as: Array<A>, bs: Array<B>): Array<[A, B]> {
  let result: Array<[A, B]> = []
  let length = Math.min(as.length, bs.length)
  for (let i = 0; i < length; i++) {
    result.push([as[i], bs[i]])
  }
  return result;
}

function curry<A, B, C>(f: (a: A, b: B) => C): (a: A) => ((b: B) => C) {
  return a => b => f(a, b)
}

function main() {
  let html = runFetch(blog())
  console.log(toHTML(html))
}

main()