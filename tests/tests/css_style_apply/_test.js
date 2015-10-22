go(["_reporter", "one", "two"], function (amdJS, one, two) {
    var args = two.doSomething(),
        cssMod = two.getCssModule();

    amdJS.assert('large' === one.size, 'css_module: one.size');
    amdJS.assert('small' === two.size, 'css_module: two.size');
    amdJS.assert('small' === args.size, 'css_module: args.size');
    amdJS.assert('redtwo' === args.color, 'css_module: args.color');
    amdJS.assert('object' === typeof cssMod, 'css_module: cssMod is an object');
    amdJS.print('DONE', 'done');
});
