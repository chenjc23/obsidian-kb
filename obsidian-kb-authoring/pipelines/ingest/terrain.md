# terrain — 仓库地形扫描

产出:`repos/{repo}/overview.md` + `repos/{repo}/architecture.md`(先 `scaffold overview` / `scaffold architecture` 拿骨架)。

1. 信号驱动的快速地形扫描:先读顶层目录 + manifest/构建文件 + 入口文件,再沿 manifest/build 指向的源码根深入。跳过 `vendor`/`node_modules`/`build`/`dist`/`third_party`/`.git`。`generated/` 默认不深读实现,但 C/C++/通信仓要读其中的协议标识、service 接口、message/enum 定义与自动生成的 dispatch 元数据。目标是建立仓库形状、技术栈、分层、入口区域的认知,不遍历整棵树。
2. 优先读构建/元数据文件(C/C++ 优先):`CMakeLists.txt`、`Makefile`、`conanfile.*`、`vcpkg.json`、Bazel `BUILD`、`README`、`package.json`、`go.mod`、`Cargo.toml`、`pyproject.toml`、`pom.xml`、`build.gradle`、`Dockerfile`。
3. 识别并读入口:`main.c`/`main.cpp`/`src/main.*`/`app/main.cpp`/`main.go`/`index.ts`/`app.py`/`cmd/*`/框架引导模块。
4. 读装配/初始化代码:`main()`、`wire.go`、`container.ts`、`AppModule`、服务注册、路由装配、工厂/单例。
5. `overview.md`:本仓定位、模块定义、职责边界、上下文与依赖边界。
6. `architecture.md`:本仓逻辑视图 + 仓库路由(链向 overview / submodules / flows / 关键 contracts / data-models),含一张 mermaid 架构图(`graph`/`flowchart TD`,呈现分层与核心模块依赖)。
