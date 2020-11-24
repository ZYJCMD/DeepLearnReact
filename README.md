# DeepLearnReact

项目 1: build my own React-> follow **Diact（Hooks 版本）** <br>
构建流程总结：<br>
在这部分可能涉及到算法的就是：递归和迭代，从上到下与从下到上递归与循环<br>

### 主要是以下几点如何实现：

0. 首先要理解 fiber，fiber 就是一个工作单元，流程图，如果从父到子，到兄弟节点，在返回到根节点
1. createElement 如何实现-踩坑的点主要有以下几点：

- 子元素 child 是否是对象，若不是需要转换为文本对象（createTextElement）

2. render 函数如何实现
3. 虚拟 DOM 如何对比-reconcileChildren

- 分类为：标签一致，更新属性；标签不一致，创建新 DOM；便签不一致，去掉旧 DOM（注意这里是三个并行的 if）
- 每一个 fiber 是一个对象，且要注意的是，每一个对象的属性上有创建好的 DOM 元素（未挂载）

4. 实际 DOM 如何实现改变-updateDom 函数的实现

- 事件的对比-添加、删除
- DOM 属性的对比-添加、删除

5. 如何实现 hook

- 在使用已有的 react 的时候就在想框架如何知道我使用的是哪个通过 useState 返回的函数，核心点一个是 index，一个是将传入的 action 放入一个队列中，在下轮 render 的时候，按顺序执行这每一个 action
