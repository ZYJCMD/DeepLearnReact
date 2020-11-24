//一个element主要包含两个属性-》标签+props
//里面的props有children属性-》而children属性是数组，所以是树结构

// createElment方法把格式变成下面这种element格式=》之后在生成DOM

/**
 * const element = {
  type: "h1",
  props: {
    title: "foo",
    children: "Hello",
  },
};

const container = document.getElementById("root");
const node = document.createElement(element.type);
node["title"] = element.props.title;
const text = document.createTextNode("");
text["nodeValue"] = element.props.children;

node.appendChild(text);
container.appendChild(node);
 */

const Didact = {
  createElement,
  render,
};

const element = Didact.createElement(
  "div",
  { id: "foo" },
  Didact.createElement("a", null, null),
  Didact.createElement("b")
);
const container = document.getElementById("root");
Didact.render(element, container);

//转换方法
function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map(
        (child) =>
          typeof child === "object" ? child : createTextElement(child) //即为不是Diact.createElment()返回的对象就用文本创建节点的方法
      ),
    },
  };
}
function createTextElement(text) {
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue: text,
      children: [],
    },
  };
}

function createDom(fiber) {
  //1.分类文本节点还是普通节点 2.递归创建每个节点 3. 每个节点的属性设置
  const dom =
    element.type === "TEXT_ELEMENT"
      ? document.createTextNode("")
      : document.createElement(fiber.type);

  const isProperty = (key) => key !== "children";
  Object.keys(fiber.props)
    .filter(isProperty)
    .forEach((name) => {
      dom[name] = fiber.props[name];
    });

  return dom;
}

const isEvent = (key) => key.startWith("on");
const isProperty = (key) => key !== "children" && !isEvent(Key);
const isNew = (prev, next) => (key) => prev[key] !== next[key]; //箭头函数版本的闭包
const isGone = (prev, next) => (key) => !(key in next);
// const isNew = (prev, next) => {
//   return function (key) {
//     return prev[key] !== next[key];
//   };
// };

function updateDom(dom, prevProps, nextProps) {
  //Remove old or changed event listeners //如果事件不同直接移除这个node
  Object.keys(prevProps)
    .filter(isEvent)
    .filter((key) => !(key in nextProps) || isNew(prevProps, nextProps)) //新的无此种事件&&旧的和新的对应的事件的函数不一样
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2);
      dom.removeEventListener(eventType, prevProps[name]);
    });

  //Add new Events
  Object.keys(prevProps)
    .filter(isEvent)
    .filter(isNew(prevProps, nextProps))
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2);
      dom.addEventListener(eventType, nextProps[name]);
    });

  //Remove old properties
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach((name) => {
      dom[name] = "";
    });

  //Set new or changed properties
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach((name) => {
      dom[name] = nextProps[name];
    });
}

function commitRoot() {
  //TODO add nodes to DOM
  deletions.forEach(commitWork);
  commitWork(wipRoot.child);
  currentRoot = wipRoot;
  wipRoot = null;
}

function commitWork(fiber) {
  if (!fiber) {
    return;
  }

  const domParentFiber = fiber.parent; //有了function组件后这里要进行修改,网上找直到有DOM节点
  while (!domParentFiber.dom) {
    domParentFiber = domParentFiber.parent;
  }
  const domParent = domParentFiber.dom;

  if (fiber.effectTag === "PLACEMENT" && fiber.dom !== null) {
    domParent.appendChild(fiber.dom);
  } else if (fiber.effectTag === "UPDATE" && fiber.dom !== null) {
    updateDom(fiber.dom, fiber.alternate.props, fiber.props);
  } else if (fiber.effectTag === "DELETION") {
    domParent.removeChild(fiber.dom);
  }
  commitWork(fiber.child); //递归插入真实DOM
  commitWork(fiber.sibling);
}

function commitDeletion(fiber, domParent) {
  if (fiber.dom) {
    domParent.removeChild(fiber.dom);
  } else {
    commitDeletion(fiber.child, domParent); //递归调用，直到子组件有DOM
  }
}

function render(element, container) {
  //nextunitOfWork设置为fiber树的根节点
  //TODO set next unit of work
  wipRoot = {
    dom: container,
    props: {
      children: [element],
    },
    alternate: currentRoot, //上一轮的DOM（已经显现出来的DOM）
  };
  deletions = [];
  nextUnitOfWork = wipRoot;
}

let nextUnitOfWork = null;
let currentRoot = null;
let wipRoot = null;
let deletions = null;

function workLoop(deadline) {
  let shouldYiled = false;
  while (nextUnitOfWork && !wipRoot) {
    //递归创建fiber
    nextUnitOfWork = performUnitOfwork(nextUnitOfWork); //这里应该做的就是render，并返下一个工作单元=》直到root结束
    shouldYiled = deadline.timeRemaining() < 1; //判断剩余时间
  }

  if (!nextUnitOfWork && wipRoot) {
    commitRoot(); //上部分只是生层了fiber属性有DOM，但在这里我才是插入到实际文本的DOM上去的
  }
  requestIdleCallback(workLoop);
}

function performUnitOfwork(fiber) {
  //这里开始使用fiber来构建tree，相比之前的最初版本fiber对象有了更多的属性-》如本身实体DOM作为属性，关系如sibling,parent,child等

  const isFunctionComponent = fiber.type instanceof Function;
  if (isFunctionComponent) {
    updateFunctionComponent(fiber);
  } else {
    updateHostComponent(fiber);
  }

  //Todo 返回 下一个工作单元 【这里画图-多个兄弟节点都有子节点整个流程是如何的】
  if (fiber.child) {
    return fiber.child; //找孩子
  }
  let nextFiber = fiber;
  while (nextFiber) {
    //找uncle
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }
    nextFiber = nextFiber.parent; //父级找uncle
  }
}

let wipFiber = null;
let hookIndex = null;
function updateFunctionComponent(fiber) {
  wipFiber = fiber;
  hookIndex = 0;
  wipFiber.hooks = []; //目的是支持使用useState多次在同一组件
  const children = [fiber.type(fiber.props)]; //eg: fiber.type返回的是APP function
  reconcileChildren(fiber, children);
}

function useState(initial) {
  //TODO 如果有旧的，将旧的hook复制到新的hook中去，如果还没有初始化状态
  //想一下使用过程中，我们定义多个useState->框架如何知道我们使用的是第几个方法-》hookIndex
  //
  const oldHook =
    wipFiber.alternate &&
    wipFiber.alternate.hooks &&
    wipFiber.alternate.hooks[hookIndex];
  const hook = {
    state: oldHook ? oldHook.state : initial,
    queue: [], //存储action
  };

  //下次rendering的时候渲染这部分
  const actions = oldHook ? oldHook.queue : [];
  actions.forEach((action) => {
    hook.state = action(hooks.state);
  });

  const setState = (action) => {
    hook.queue.push(action);
    wipRoot = {
      dom: currentRoot.dom,
      props: currentRoot.props,
      alternate: currentRoot,
    };
    nextUnitOfWork = wipRoot;
    deletions = [];
  };

  wipFiber.hooks.push(hook);
  hookIndex++;
  return [hook.state, setState];
}

function updateHostComponent(fiber) {
  //Todo 添加本身dom节点
  if (!fiber.dom) {
    fiber.dom = createDom(fiber); //追踪DOM节点在fiber.dom属性;或者说fiber既存储真实的DOM也存储虚拟DOM那些属性
  }
  reconcileChildren(fiber, iber.props.children); //创建fiber并把自己的第一个子节点且同级的兄弟节点都关联好
}

function reconcileChildren(wipFiber, elements) {
  //wip means working in process
  //在这部分进行新旧的比对
  //比对原则：
  /**
   * 1.如果标签一致，则更新属性
   * 2.如果标签不同，则创建一个新的DOM
   * 3.如果标签不同，则移除旧的
   * React使用keys，比对children在数组中的位置
   */

  let index = 0;
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child;

  let prevSibling = null;
  while (index < elements.length || oldFiber !== null) {
    const element = elements[index];

    let newFiber = null;

    //TODO compare oldFiber to element
    const sameType = oldFiber && element && element.type === oldFiber.type;
    if (sameType) {
      //TODO update the node
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom, //【注意这里是三个并行的if】
        parent: wipFiber,
        alternate: oldFiber,
        effectTag: "UPDATE",
      };
    }
    if (element && !sameType) {
      //TODO add this node
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        parent: wipFiber,
        alternate: null,
        effectTag: "PLACEMENT",
      };
    }
    if (oldFiber && !sameType) {
      //TODO delete the oldFiber's node
      oldFiber.effectTag = "DELETION";
      deletions.push(oldFiber);
    }

    if (index === 0) {
      fiber.child = newFiber; //第一个子元素
    } else {
      prevSibling.sibling = newFiber; //prevSibling是上一个newFiber,对象的引用
    }

    prevSibling = newFiber;
    index++;
  }
}

//每个元素是一个fiber，每个fiber是一个工作单元
/**
 * 初期//递归是核心 =》问题：如果tree太大，会占用线程太久，因此需要去分割为小块去加载
  //这里做循环的函数可以看作是setTimeout,因此再次加载的时候，主线程已经空闲了，React当然没有使用这种方法，使用的是调度包，但是概念上是一致的
  //但是打断也会出现问题：打断我们渲染出整个树的过程会导致显示出来的UI不完整=》因此我们需要移除更改DOM的部分
 * 1.添加元素到DOM
 * 2.创建每个子元素的fiber
 * 3.选取下一个工作单元
 *
 * 每一个fiber都链接这第一个子元素，父元素，和下一个兄弟元素
 * 讨论递归的顺序：父-》子-》兄弟（子无子时候）
 */

/**
 * 接下来处理function组件-》这里还存在疑问-》修改的就是进行一个循环解决APP无DOM的问题
 *1.fiber中的function组件没有DOM节点
 2.children来自于运行的function组件而不是从props参数中拿到
 */
/**
 * 状态量的改变 Hooks state
 */
