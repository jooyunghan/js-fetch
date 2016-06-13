
function Fetch() {  
}

function Done(a) {
  this.a = a;
} 

Done.prototype = new Fetch();

Done.prototype.map = function map(f) {
  return new Done(f(this.a));
}

Done.prototype.flatMap = function flatMap(k) {
  return k(this.a);
}

Done.prototype.toString = function toString() {
  return "Done " + this.a;
}

var bid = 0;
function Blocked(cont) {
  this.cont = cont;
  this.bid = bid++;
}

Blocked.prototype = new Fetch();

Blocked.prototype.map = function map(f) {
  return new Blocked(() => this.cont().map(f));
}

Blocked.prototype.flatMap = function flatMap(k) {
  return new Blocked(() => this.cont().flatMap(k));
}

Blocked.prototype.toString = function toString() {
  return "Blocked " + this.bid;
}

// Node doesn't support TCO yet
function interleave(...tasks) {
  let i = 0;
  while (tasks.length > 0) {
    tasks.forEach((x,i) => console.log(i + ": " + x.toString()));
    const t = tasks.shift(); // const in block scope needs >= Node 6
    console.log("[" + (i++) + "]>>> " + t.toString());
    if (t instanceof Blocked) {
      tasks.push(t.cont());
    }
  }
}

const task1 = new Blocked(() => new Blocked(() => new Done(3)));
const task2 = new Blocked(() => new Blocked(() => new Done(4)));
const task3 = task1.flatMap(a => task2.map(b => a + b));
interleave(task1, task2, task3);

//var loop = new Blocked(() => loop);
//interleave(loop)
