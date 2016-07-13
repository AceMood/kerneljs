# kerneljs
**kerneljs** 是一个符合 CommonJS 规范的前端模块加载器。目前处于第二版本，测试用例基于AMD官方的测试用例，重构了部分代码的支持，
不再支持 package 和 paths 等配置，而是通过 **resourceMap** 配置项提前指定资源表。与工程化工具 [soi](https://github.com/Saber-Team/soi) 
共同配合完成前端项目的构建、打包、部署工作。

# 本地构建
确保安装了grunt和grunt-cli。项目目录下通过npm install安装所有依赖模块。运行grunt完成代码构建，目标路径 dist/。

# 测试
测试用例部分基于 RequireJS 编写，修改了大部分测试用例，目前保证最小功能子集, 不轻易添加api和插件的实现，
是因为要尽量做到向后兼容最好从最小子集开始。
进入tests目录，确保安装了express模块，运行`node server/server.js`，浏览器中打开`http://localhost:4000`看到测试结果。
最终希望重构成自动化兼容测试，基于karma来做，调起客户机上所有浏览器程序。

# 使用
前端代码中可以像 CommonJS 一样写代码，用工具 [soi](https://github.com/Saber-Team/soi) 打包构建，也可以开发时直接写上模块定义：

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

**kerneljs** 向全局导出两个对象`define|__d`函数用于定义模块。kerneljs对象用于管理模块加载器，其中`kerneljs.exec`方法同define
的参数一样，只不过定义的模块在依赖加载完毕后立即执行，通常用作页面（或页面一部分）功能的入口。而`define|__d`函数定义的模块不会被立即执行，
只有当代码 require 的时候才会执行模块的代码导出 exports 对象。

# 浏览器支持范围
* IE 6.0+
* Chrome 1.0+
* FF 3.5+
* Safari 6.1+

# 一点说明
基于资源表的工程化方案最早被 Facebook 证明为 **future proof**，后 Baidu.Inc 团队依据己有业务形态产出 FIS 是同样的思路。
该方案可灵活支持普通页面加载、Bigpipe、Quickling、Bigrender等多种实现方式。在工程化方案中，应站在前端架构的角度考虑问题，
由整体解决方案决定模块加载器的实现，而不是依赖于模块加载器的实现去构建生态环境。这么说可能有点反模式，可能有人会说已经存在
的 AMD 和 CMD 规范，加载器应依据于此。从已有经验来讲，自顶向下的方式会构建出更灵活的解决方案，其实在最终的实现上模块定义规范
的实现很容易。
