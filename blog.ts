import * as h from "virtual-dom/h";
import * as toHTML from "vdom-to-html";

type Pair<A, B> = [A, B];

type Result<A> = Done<A> | Blocked<A>;

class Done<A> {
  constructor(public a: A) {}
}

class Blocked<A> {
  constructor(public brs: BlockedRequest[], public cont: Fetch<A>) {}
}

class BlockedRequest {
  constructor(
    public request: Request<any>,
    public ref: Ref<FetchStatus<any>>
  ) {}
}

type FetchStatus<A> = NotFetched | FetchSuccess<A>;

class NotFetched {}

class FetchSuccess<A> {
  constructor(public a: A) {}
}

class Ref<A> {
  constructor(public value: A) {}
}

class Fetch<A> {
  constructor(public run: () => Result<A>) {}

  map<B>(f: (a: A) => B): Fetch<B> {
    return this.flatMap(a => Fetch.pure(f(a)));
  }

  flatMap<B>(f: (a: A) => Fetch<B>): Fetch<B> {
    return new Fetch(() => {
      let r = this.run();
      if (r instanceof Done) {
        return f(r.a).run();
      } else if (r instanceof Blocked) {
        return new Blocked(r.brs, r.cont.flatMap(f));
      }
    });
  }

  static pure<A>(a: A): Fetch<A> {
    return new Fetch(() => new Done(a));
  }

  ap<B, C>(this: Fetch<(b: B) => C>, b: Fetch<B>): Fetch<C> {
    return new Fetch(() => {
      let ff = this.run();
      let aa = b.run();
      if (ff instanceof Done) {
        if (aa instanceof Done) {
          return new Done(ff.a(aa.a));
        } else if (aa instanceof Blocked) {
          return new Blocked(aa.brs, aa.cont.map(ff.a));
        }
      } else if (ff instanceof Blocked) {
        if (aa instanceof Done) {
          return new Blocked(ff.brs, ff.cont.ap(Fetch.pure(aa.a)));
        } else if (aa instanceof Blocked) {
          return new Blocked(ff.brs.concat(aa.brs), ff.cont.ap(aa.cont));
        }
      }
    });
  }

  static liftA2<A, B, C>(
    f: (a: A, b: B) => C,
    a: Fetch<A>,
    b: Fetch<B>
  ): Fetch<C> {
    return Fetch.pure(curry(f))
      .ap(a)
      .ap(b);
  }

  static traverse<A, B>(f: (a: A) => Fetch<B>, as: A[]): Fetch<B[]> {
    if (as.length == 0) return Fetch.pure([]);
    else
      return Fetch.liftA2<B, B[], B[]>(
        cons,
        f(as[0]),
        Fetch.traverse(f, as.slice(1))
      );
  }
}

// [HAXL 5.1]
// given `fetch`, running `Fetch` computation
function runFetch<A>(f: Fetch<A>): A {
  let r = f.run();
  if (r instanceof Done) {
    return r.a;
  } else if (r instanceof Blocked) {
    fetch(r.brs);
    return runFetch(r.cont);
  }
}

// [HAXL 5]
// In order to fetch some data, we need a primitive that takes a
// description of the data to fetch, and returns the data itself.
function dataFetch<A>(request: Request<A>): Fetch<A> {
  return new Fetch<A>(() => {
    let box = new Ref(new NotFetched());
    let br = new BlockedRequest(request, box);
    let cont = new Fetch(() => {
      let result = (box.value as FetchSuccess<A>).a;
      return new Done(result);
    });
    return new Blocked([br], cont);
  });
}

// Blog example

type PostId = number;

type PostInfo = { id: PostId; date: Date; topic: string };

type PostContent = string;

// [HAXL 5.1]
// Requests are parameterised by their result type
class Request<A> {}

class FetchPosts extends Request<PostId[]> {}

class FetchPostInfo extends Request<PostInfo> {
  constructor(public id: PostId) {
    super();
  }
}

class FetchPostContent extends Request<PostContent> {
  constructor(public id: PostId) {
    super();
  }
}

class FetchPostViews extends Request<number> {
  constructor(public id: PostId) {
    super();
  }
}

// implementations for the data-fetching operations

function getPostIds(): Fetch<PostId[]> {
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
function fetch(brs: BlockedRequest[]) {
  const posts = [
    {
      info: {
        date: new Date("2016-06-25"),
        id: 1,
        topic: "haskell",
      },
      content: "haskell content",
      views: 2,
    },
    {
      info: {
        date: new Date("2016-06-26"),
        id: 3,
        topic: "applicative",
      },
      content: "applicative content",
      views: 9,
    },
    {
      info: {
        date: new Date("2016-06-27"),
        id: 6,
        topic: "haxl",
      },
      content: "haxl content",
      views: 7,
    },
    {
      info: {
        date: new Date("2016-06-23"),
        id: 4,
        topic: "haskell",
      },
      content: "another haskell content",
      views: 8,
    },
    {
      info: {
        date: new Date("2016-06-21"),
        id: 5,
        topic: "functional",
      },
      content: "functional content",
      views: 10,
    },
  ];
  function findPost(id: PostId) {
    for (let i = 0; i < posts.length; i++) {
      if (posts[i].info.id === id) return posts[i];
    }
  }
  function dispatch(request: Request<any>): any {
    if (request instanceof FetchPosts) return posts.map(p => p.info.id);
    if (request instanceof FetchPostInfo) return findPost(request.id).info;
    if (request instanceof FetchPostContent)
      return findPost(request.id).content;
    if (request instanceof FetchPostViews) return findPost(request.id).views;
  }
  brs.forEach(br => {
    let result = dispatch(br.request);
    br.ref.value = new FetchSuccess(result);
  });
}

// [HAXL 2.1]
function blog(): Fetch<Html> {
  return Fetch.liftA2(renderPage, leftPane(), mainPane());
}

function mainPane(): Fetch<Html> {
  return getAllPostsInfo()
    .flatMap(posts => {
      posts.sort((a, b) => +b.date - +a.date);
      const ordered = posts.slice(0, 5);
      return Fetch.traverse(p => getPostContent(p.id), ordered).map(content =>
        zip(ordered, content)
      );
    })
    .map(renderPosts);
}

function getAllPostsInfo(): Fetch<PostInfo[]> {
  return getPostIds().flatMap(ids => Fetch.traverse(getPostInfo, ids));
}

function leftPane(): Fetch<Html> {
  return Fetch.liftA2(renderSidePane, popularPosts(), topics());
}

function getPostDetails(id: PostId): Fetch<Pair<PostInfo, PostContent>> {
  return Fetch.liftA2<PostInfo, PostContent, Pair<PostInfo, PostContent>>(
    makePair,
    getPostInfo(id),
    getPostContent(id)
  );
}

function popularPosts(): Fetch<Html> {
  return getPostIds()
    .flatMap(pids => {
      return Fetch.traverse(getPostViews, pids).flatMap(views => {
        let paired = zip(pids, views);
        paired.sort((a, b) => b[1] - a[1]);
        let ordered = paired.slice(0, 5).map(pair => pair[0]);
        return Fetch.traverse(getPostDetails, ordered);
      });
    })
    .map(renderPostList);
}

function topics(): Fetch<Html> {
  return getAllPostsInfo()
    .map(posts => count(posts, p => p.topic))
    .map(renderTopics);
}

type Html = any;

function renderTopics(topics: { [word: string]: number }): Html {
  return h(
    "ul",
    {},
    Object.keys(topics).map(topic => {
      return h("li", {}, `${topic} - ${topics[topic]}`);
    })
  );
}

function renderSidePane(popular: Html, topics: Html): Html {
  return h("section", {}, [
    h("div#popular", {}, [h("h2", {}, "Popular"), popular]),
    h("div#topics", {}, [h("h2", {}, "Topics"), topics]),
  ]);
}

function renderPostList(posts: Pair<PostInfo, PostContent>[]): Html {
  return h("ul", {}, posts.map(p => h("li", {}, p[1])));
}

function renderPosts(posts: Pair<PostInfo, PostContent>[]): Html {
  return h(
    "div",
    {},
    posts.map(p =>
      h("div", {}, [h("h2", {}, String(p[0].date)), h("div", {}, p[1])])
    )
  );
}

function renderPage(left: Html, main: Html): Html {
  return h("div", { style: { display: "flex" } }, [
    h("div#left", { style: { width: 200 } }, [left]),
    h("div#main", { style: { flex: 2 } }, [main]),
  ]);
}

function zip<A, B>(as: A[], bs: B[]): Pair<A, B>[] {
  let result: Pair<A, B>[] = [];
  let length = Math.min(as.length, bs.length);
  for (let i = 0; i < length; i++) {
    result.push([as[i], bs[i]]);
  }
  return result;
}

function curry<A, B, C>(f: (a: A, b: B) => C): (a: A) => ((b: B) => C) {
  return a => b => f(a, b);
}

function makePair<A, B>(a: A, b: B): Pair<A, B> {
  return [a, b];
}

function cons<A>(a: A, as: A[]): A[] {
  return [a, ...as];
}

function count<A>(as: A[], f: (a: A) => string): { [s: string]: number } {
  let counts: { [s: string]: number } = {};
  as.map(f).forEach(key => {
    counts[key] = 1 + (counts[key] || 0);
  });
  return counts;
}

function main() {
  let html = runFetch(blog());
  console.log(toHTML(html));
}

main();
