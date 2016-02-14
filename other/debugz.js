var evaluators = {};

function Scope() {
    var env = [{}];
    this.open = function() {
        env.unshift({});
    }
    this.close = function() {
        env.shift();
    }
    this.add = function(key,value) {
        if (env[0][key]) {
            console.log(JSON.stringify(env, null, 4));
            throw Error("Variable '"+key+"' is already defined in this scope. It has value: "+
                JSON.stringify(env[0][key],null,4)+", but you're trying to give it value: "+
                JSON.stringify(value,null,4)+" and the whole scope looks like: "+JSON.stringify(env,null,4));
        }
        env[0][key] = value;
    }
    this.addAll = function(obj) {
        var keys = Object.keys(obj);
        for (var i=0; i<keys.length; i++) {
            this.add(keys[i], obj[keys[i]]);
        }
    }
    this.find = function(key) {
        for (var i=0; i<env.length; i++) {
            for (var k in env[i]) {
                if (k==key) {
                    return env[i][key];
                }
            }
        }
        return;
    }
    this.state = function() { return env; }
}

var ctx = {
    name: "reid",
    age: 22
}

evaluators.html = function(context,n) {

    var scope = new Scope();

    scope.addAll(context);

    scope.add("hey","nice");

    console.log(JSON.stringify(scope.state(),null,4));

    return true;
}

new evaluators.html(ctx,1);
new evaluators.html(ctx,2);
