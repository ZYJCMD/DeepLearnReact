const TEXT_ELEMENT = "TEXT ELEMENT";
let rootInstance = null;

function render(element, container) {
  const prevInstance = rootInstance;
  const nextInstance = reconcile(container, prevInstance, element);
  rootInstance = nextInstance;
}

function reconcile(parentDom, instance, element) {
  if (instance === null) {
    // Create instance
    const newInstance = instantiate(element);
    parentDom.appendChild(newInstance.dom);
    return newInstance;
  } else if (element === null) {
    //Remove Instance
    parentDom.removeChild(instance.dom);
    return null;
  } else if (instance.element.type !== element.type) {
    //Replace instance
    const newInstance = instantiate(element);
    parentDom.replaceChild(newInstance.dom, instance.dom);
    return newInstance;
  } else if (typeof element.type === "string") {
    //Update dom instance
    updateDomProperties(instance.dom, instance.element.props, element.props); //属性只更新了一层
    instance.childInstances = reconcileChildren(instance, element); //将子组件属性也更新
    instance.element = element;
    return instance; //instance为对象的好处显示出来了
  } else {
    //Update composite instance //只有一个instance 所以单独领出来
    instance.publicInstance.props = element.props; //=>component实例多出来publicInstance,这里看来publicInstance.render()存储的是新的
    const childElement = instance.publicInstance.render(); //JSX ; instance={ dom, element, childInstance, publicInstance }
    const oldChildInstance = instance.ChildInstance;
    const childInstance = reconcile(parentDom, oldChildInstance, childElement);
    instance.dom = childInstance.dom;
    instance.ChildInstance = childInstance;
    instance.element = element;
    return instance;
  }
}

function reconcileChildren(instance, element) {
  const dom = instance.dom;
  const childInstances = instance.childInstances;
  const nextChildElements = element.props.children || []; //先处理一层，最后需要递归处理每一层
  const newChildInstances = [];
  const count = Math.max(childInstances.length, nextChildElements.length);
  for (let i = 0; i < count; i++) {
    const childInstance = childInstances[i];
    const childElement = nextChildElements[i];
    const newChildInstance = reconcile(dom, childInstance, childElement); //返回的是一层的每一个子实例
    newChildInstances.push(newChildInstance);
  }
  return newChildInstances.filter((instance) => instance !== null);
}

//真实dom创建和挂载
function instantiate(element) {
  //其实这部分已经转换为JSX转移后的语言特点，然后再去创建实体DOM

  //？？？应该在这里判断一下，作为递归的终止条件
  const { type, props } = element;
  const isDomElement = typeof type === "string";

  if (isDomElement) {
    //instantiate DOM element
    const isTextElement = type === "TEXT ELEMENT";
    const dom = isTextElement
      ? document.createTextNode("")
      : document.createElement(type);

    updateDomProperties(dom, [], props); //把属性，事件挂载上去，并把公共方法抽离出来

    //递归&挂载到实体DOM
    const childElements = props.children || [];
    const childInstances = childElements.map(instantiate); //递归子元素=》问题:递归的宗旨条件，报错也会停止吗，因为如果是[]的话，解构也会报错
    const childDoms = childInstances.map((childInstance) => childInstance.dom);
    childDoms.forEach((childDom) => dom.appendChild(childDom));

    const instance = { dom, element, childInstances };
    return instance;
  } else {
    //Instantiate component element
    //component 只有一个child从render返回的
    //组件内部实例需要引用公共实例，所以要调用render
    const instance = {};
    const publicInstance = createPublicInstance(element, instance); //？？？那这里的element是啥，如何结构出element
    const childElement = publicInstance.render(); //返回的是JSX=>babel会进行处理
    const childInstance = instantiate(childElement);
    const dom = childInstance.dom;

    Object.assign(instance, { dom, element, childInstance, publicInstance });
    return instance;
  }
}

//属性更新
function updateDomProperties(dom, prevProps, nexProps) {
  const isListener = (name) => name.startsWith("on");
  const isAttribute = (name) => !isListener(name) && name !== "children";

  //移除旧的
  //1.事件
  Object.keys(prevProps)
    .filter(isListener)
    .forEach((name) => {
      const eventType = name.substring(2).toLowerCase();
      dom.addEventListener(eventType, props[name]);
    });
  //2.属性
  Object.keys(prevProps)
    .filter(isAttribute)
    .forEach((name) => {
      dom[name] = null;
    });

  //添加新的
  //1.事件
  Object.keys(nexProps)
    .filter(isListener)
    .forEach((name) => {
      const eventType = name.substring(2).toLowerCase();
      dom.addEventListener(eventType, nexProps[name]);
    });
  //2.属性
  Object.keys(nexProps)
    .filter(isAttribute)
    .forEach((name) => {
      dom[name] = nexProps[name];
    });
}

class Component {
  //希望公共实例更新时候，仅更新子树
  constructor(props) {
    this.props = props;
    this.state = this.state || {};
  }
  setState(partialState) {
    this.state = Object.assign({}, partialState, this.state);
    updateInstance(this.__internalInstance); //保持对内部实例的引用=》创建组件的实例化
  }
}

function updateInstance(internalInstance) {
  const parentDom = internalInstance.dom.parentDom;
  const element = internalInstance.element;
  reconcile(parentDom, internalInstance, element);
}

//function 创造 component实例
function createPublicInstance(element, internalInstance) {
  const { type, props } = element;
  const publicInstance = new type(props); //new 一个实例出来
  publicInstance.__internalInstance = internalInstance;
  return publicInstance;
}

//浏览器babel后调用的方法
function createElement(type, config, ...args) {
  //浏览器babel后会自动调用=》应该是这样的-》然后这里调用完返回的东西再拿给render处理
  //这里是被哪里调用???
  const props = Object.assign({}, config);
  const hasChildren = args.length > 0;
  const rawChildren = hasChildren ? [].concat(...args) : [];
  props.children = rawChildren
    .filter((c) => c !== null && c !== false) //exclude false,null,undefined
    .map((c) => (c instanceof Object ? c : createElement(c)));
  return { type, props };
}
function createTextElement(value) {
  return createElement(TEXT_ELEMENT, { nodevalue: value });
}

//bable会把JSX语法转换为createElement 中(参数的形式)，然后我们用createElement返回的形式，再使用render函数生层真实的DOM
//每次处理都需要单独考虑文本的问题
//接下来处理新旧对比的问题
//让每个node的属性上都有自己真实的dom=》好处是减少改变和删除真实dom的次数-》对代码进行refactoring
//instance为对象的好处在reconcile重复利用dom的时候显示出来了
//接下来解决reconcile子元素的问题
//检查element=null；并且在reconcileChildren过滤掉这种情况
//->DOM节点更新-》基于此的属性更新
//每次渲染都是把整个虚拟DOM进行比对，state是全局的=》希望call render after changes to state
