define(function(require, exports, module) {
    //Dependencies
    var one = require('./one.css');
    module.exports = {
        size: "small",
        color: "redtwo",
        doSomething: function() {
            return {
                size: 'small',
                color: 'red'
            }
        }
    };
});
