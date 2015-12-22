var $str_example, $arr_example;

$str_example = "reid mitchell";

$arr_example = [1,0,2,4,100,8,-10,47];

var input1 = "( $str_example | uppercase )";

var input2 = "( $arr_example | sort )";

var input3 = "( $arr_example | sort \"descending\" )";


var filters = {
    uppercase: function(input) {
        return input.toString().toUpperCase();
    },
    lowercase: function(input) {
        return input.toString().toUpperCase();
    },
    sort: function(a, direction) {
        //todo: typecheck array
        var b = a.slice(0);
        var ascending = !(direction && direction=="descending");
        if (ascending) {
            return b.sort(function(x,y){return x - y;});
        } else {
            return b.sort(function(x,y){return y - x;});
        }
    }
}