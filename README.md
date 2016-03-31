## Kerneljs
kerneljs是一个符合CommonJS规范的前端模块加载器。目前处于第二版本，重构了第一版本对于AMD官方的测试用例的部分支持，
不再支持package和paths等配置，而是通过resourceMap配置项提前指定资源表。与工程化工具[soi](https://github.com/Saber-Team/soi)
共同配合完成前端任何项目的构建、打包、部署工作。

## 构建
确保安装了grunt和grunt-cli。项目目录下通过npm install安装所有依赖模块。运行grunt完成代码构建，目标路径dist/。

## 测试
测试用例部分基于RequireJS编写，修改了大部分测试用例，目前保证最小功能子集, 不轻易添加api和插件的实现，
是因为要尽量做到向后兼容最好从最小子集开始。
进入tests目录，确保安装了express模块，运行`node server/server.js`，浏览器中打开`http://localhost:4000`看到测试结果。
最终希望重构成自动化兼容测试，基于karma来做，调起客户机上所有浏览器程序。

## 使用
前端代码中可以像CommonJS一样写代码，用工具[soi](https://github.com/Saber-Team/soi)打包构建，也可以开发时直接写上模块定义：
```
define(function(require, exports, module) {
  var moduleA = require('./A');  
  export.name = 'AceMood' + moduleA.name;
})
```
A模块的代码如下：
```
define(function(require, exports) {
  exports.name = 'moduleA';
});
```
kernel.js向全局导出两个对象`define|__d`函数用于定义模块。kerneljs对象用于管理模块加载器，其中`kerneljs.exec`方法同define
的参数一样，只不过定义的模块在依赖加载完毕后立即执行，通常用作页面（或页面一部分）功能的入口。而`define|__d`函数定义的模块不会被立即执行，
只有当代码require的时候才会执行模块的代码导出exports对象。

## Browser Support Range:
* IE 6.0+
* Chrome 1.0+
* FF 3.5+
* Safari 6.1+
