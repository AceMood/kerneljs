define(function (require, exports, module) {
    //Dependencies
    var css = require('./one.css');
    module.exports = {
        size: "small",
        color: "redtwo",
        doSomething: function() {
            return {
                size: 'small',
                color: 'redtwo'
            }
        },
        getCssModule: function() {
            return css;
        }
    };
});
