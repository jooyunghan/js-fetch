
function Fetch() {  
}

function Done(a) {
  this.a = a;
} 

Done.prototype = new Fetch();

Done.prototype.map = function map(f) {
  return new Done(f(this.a));
}

function Blocked(cont) {
  this.cont = cont;
} 

Blocked.prototype = new Fetch();

Blocked.prototype.map = function map(f) {
  return new Blocked(this.cont.map(f));
} 

function interleave(tasks) {
  while (tasks.length > 0) {
    const t = tasks.shift();
    if (t instanceof Done) {
      console.log("Done with value " + t.a);
    } else if (t instanceof Blocked) {
      console.log("Resume " + t);
      tasks.push(t.cont);
    }
  }
}

function test() {
  const task1 = new Blocked(new Blocked(new Done(3)));
  const task2 = new Blocked(new Blocked(new Done(4)));
  interleave([task1, task2]);
}

test();
