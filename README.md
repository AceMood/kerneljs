## Kerneljs
kerneljs是一个符合CommonJS规范的前端模块加载器。目前处于第二版本，重构了第一版本对于AMD官方的测试用例的部分支持，
不再支持package和paths等配置，而是通过resourceMap配置项提前指定资源表。与工程化工具[soi](https://github.com/Saber-Team/soi)
共同配合完成前端任何项目的构建、打包、部署工作。

测试用例部分基于RequireJS编写，修改了大部分测试用例，目前保证最小功能子集, 不轻易添加api和插件的实现，
是因为要尽量做到向后兼容最好从最小子集开始。

## Browser Support Range:
* IE 6.0+
* Chrome 1.0+
* FF 3.5+
* Safari 6.1+
