
//Map the configure({}) call to loader-specific call.
var config = kerneljs,

//Map the top-level entry point to start loading to loader-specific call.
  go = define,

//Indicate what levels of the API are implemented by this loader,
//and therefore which tests to run.
  implemented = {
    basic: true,
    css: true,
    dynamic: true,
    require: true,
    //plugins: false,
    //pathsConfig: false,
    //packagesConfig: false
    mapConfig: true
    //moduleConfig: false,
    //shimConfig: false

    //Does NOT support pluginDynamic in 1.0
    //pluginDynamic: true
  };

//Remove the global require, to make sure a global require is not assumed
//in the tests
//kerneljs = undefined;
