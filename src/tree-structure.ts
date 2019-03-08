import { computed, observable, action } from 'mobx';

export type MonoidObj<T> = {
  operation: (a: T, b: T) => T;
  getCacheValue: (leaf: Leaf<any>) => T;
  identity: T;
};

export class MonoidalCache<T> {
  constructor(private node: BaseNode<any>, private monoid: MonoidObj<T>) {}

  @computed
  get value() {
    if (this.node instanceof Leaf) {
      return this.monoid.getCacheValue(this.node);
    } else if (this.node instanceof INode) {
      let result: T = this.monoid.identity;
      for (let i = 0; i < 4; ++i) {
        const n = this.node.childAt(i as ChildIndex);
        if (n) {
          result = this.monoid.operation(result, n.getField(this.monoid));
        } else {
          break;
        }
      }
      return result;
    }
  }
}

/**
 * The possible values of a node's index within it's parent node.
 * The value 3 is possible, but only temporarily before the parent is rebalanced.
 */
export type ChildIndex = 0 | 1 | 2 | 3;

/**
 * Base node class for the internal tree structure.
 */
export class BaseNode<T> {
  private monoidMap: WeakMap<MonoidObj<any>, MonoidalCache<any>> = new WeakMap();

  parent: INode<T> = null;

  /**
   * Node's index within its parent
   */
  index: ChildIndex = null;

  /**
   * Lazily cache and get cached value.
   */
  getField<T>(monoid: MonoidObj<T>): T {
    let s = this.monoidMap.get(monoid);
    if (!s) {
      s = new MonoidalCache(this, monoid);
      this.monoidMap.set(monoid, s);
    }
    return s.value;
  }

  /**
   * Returns this node's previous sibling, or `null` if first
   */
  @computed
  get prevSibling(): BaseNode<T> {
    if (this.index > 0 && this.index < 3) {
      return this.parent.childAt((this.index - 1) as ChildIndex);
    }
    return null;
  }

  /**
   * Returns this node's next sibling, or `null` if last
   */
  @computed
  get nextSibling(): BaseNode<T> {
    if (this.index > -1 && this.index < 2) {
      return this.parent.childAt((this.index + 1) as ChildIndex);
    }
    return null;
  }

  /**
   * Returns the first encountered node at the same level to the left
   */
  @computed
  get prevNodeAtSameLevel(): BaseNode<T> {
    if (!this.parent) {
      return null;
    }

    let target = this.prevSibling;
    if (target) {
      return target;
    }

    let counter = 0;
    target = this;
    while (true) {
      counter += 1;
      target = target.parent;
      if (!target.parent) {
        return null;
      }
      const sib = target.prevSibling as INode<T>;
      if (sib) {
        target = sib;
        while (counter > 0) {
          target = (target as INode<T>).last;
          counter -= 1;
        }
        return target;
      }
    }
  }

  /**
   * Returns the first encountered node at the same level to the right
   */
  @computed
  get nextNodeAtSameLevel(): BaseNode<T> {
    if (!this.parent) {
      return null;
    }

    let target = this.nextSibling;
    if (target) {
      return target;
    }

    let counter = 0;
    target = this;
    while (true) {
      counter += 1;
      target = target.parent;
      if (!target.parent) {
        return null;
      }
      const sib = target.nextSibling as INode<T>;
      if (sib) {
        target = sib;
        while (counter > 0) {
          target = (target as INode<T>).first;
          counter -= 1;
        }
        return target;
      }
    }
  }
}

/**
 * Internal node class for the tree structure.
 */
export class INode<T> extends BaseNode<T> {
  @observable
  private _0: BaseNode<T>;

  @observable
  private _1: BaseNode<T>;

  @observable
  private _2: BaseNode<T>;

  @observable
  private _3: BaseNode<T>;

  set a(nu: BaseNode<T>) {
    this._0 = nu;
    if (nu) {
      nu.index = 0;
      nu.parent = this;
    }
  }

  @computed
  get a() {
    return this._0;
  }

  set b(nu: BaseNode<T>) {
    this._1 = nu;
    if (nu) {
      nu.index = 1;
      nu.parent = this;
    }
  }

  @computed
  get b() {
    return this._1;
  }

  set c(nu: BaseNode<T>) {
    this._2 = nu;
    if (nu) {
      nu.index = 2;
      nu.parent = this;
    }
  }

  @computed
  get c() {
    return this._2;
  }

  set d(nu: BaseNode<T>) {
    this._3 = nu;
    if (nu) {
      nu.index = 3;
      nu.parent = this;
    }
  }

  @computed
  get d() {
    return this._3;
  }

  @computed
  get size() {
    return this.d ? 4 : this.c ? 3 : this.b ? 2 : this.a ? 1 : 0;
  }

  @computed
  get first() {
    return this.a;
  }

  @computed
  get last() {
    return this.d || this.c || this.b || this.a;
  }

  constructor(_0: BaseNode<T> = null, _1: BaseNode<T> = null, _2: BaseNode<T> = null) {
    super();
    this.a = _0;
    this.b = _1;
    this.c = _2;
    this.d = null;
  }

  childAt(index: ChildIndex) {
    switch (index) {
      case 0:
        return this.a;
      case 1:
        return this.b;
      case 2:
        return this.c;
      case 3:
        return this.d;
      default:
        throw new Error('Invalid child index');
    }
  }

  @action
  push(child: BaseNode<T>, pos: ChildIndex = this.size as ChildIndex) {
    if (this.size === 4) {
      throw new Error('Can not add more than 4 children to a node');
    }

    if (pos - this.size > 0) {
      throw new Error('Cannot skip nodes when pushing');
    }

    switch (pos) {
      case 0: {
        this.d = this.c;
        this.c = this.b;
        this.b = this.a;
        this.a = child;
        break;
      }
      case 1: {
        this.d = this.c;
        this.c = this.b;
        this.b = child;
        break;
      }
      case 2: {
        this.d = this.c;
        this.c = child;
        break;
      }
      default: {
        this.d = child;
      }
    }
  }

  @action
  pop(pos: ChildIndex = (this.size - 1) as ChildIndex) {
    let popped: BaseNode<T> = null;
    switch (pos) {
      case 0: {
        popped = this.a;
        this.a = this.b;
        this.b = this.c;
        this.c = this.d;
        this.d = null;
        break;
      }
      case 1: {
        popped = this.b;
        this.b = this.c;
        this.c = this.d;
        this.d = null;
        break;
      }
      case 2: {
        popped = this.c;
        this.c = this.d;
        this.d = null;
        break;
      }
      default: {
        popped = this.d;
        this.d = null;
      }
    }

    if (popped) {
      popped.index = null;
      popped.parent = null;
    }
    return popped;
  }

  /**
   * Rebalances an INode by doing the following:
   *  - If the INode has no children, it gets destroyed
   *  - If it has only one children it gets merged with its left or right sibling
   *    depending on which one has 2 children (right if both have 2)
   *
   * Rebalancing works recursively up to the root.
   *
   * De-optimization pitfall. This might seem like a good idea, but it's not:
   * Instead of immediately splitting the node when it gets to 4 children,
   * move the last child into the next cousin, if it has only 2 children.
   * This will tend to create nodes with 3 children too often, and will result
   * in more frequent calls to rebalance().
   */
  @action
  rebalance() {
    if (this.size === 0) {
      if (!this.parent) {
        return;
      }
      const parent = this.parent;
      parent.pop(this.index);
      parent.rebalance();
    } else if (this.size === 1) {
      if (!this.parent) {
        const only = this.a;
        if (only instanceof INode) {
          // Handle the case where rebalancing has left the root node
          // with only a single child. This won't happen for non-root inodes.
          this.pop();
          this.a = only.a;
          this.b = only.b;
          this.c = only.c;
          this.d = only.d;
          only.parent = null;
          only.index = null;
          this.rebalance();
        }
        return;
      }

      const moved = this.pop(0);
      let left = this.prevNodeAtSameLevel as INode<T>;
      let right = this.nextNodeAtSameLevel as INode<T>;

      if (!left && !right) {
        // This is the only node in the tree, and it's deeper
        const parent = this.parent;
        parent.pop(this.index);
        parent.push(moved);
        parent.rebalance();
      } else if (!left || (right && right.size < left.size)) {
        // No place to the left, or the right side has more room
        right.push(moved, 0);
        this.rebalance();
        right.rebalance();
      } else {
        // All else being equal, prefer merging to the left
        left.push(moved);
        this.rebalance();
        left.rebalance();
      }
    } else if (this.size === 4) {
      const second = this.pop();
      const first = this.pop();
      const newNode = new INode(first, second);

      // If this is the root node, replace it with a new root
      // that contains this node and the new node as children.
      if (!this.parent) {
        const second = this.pop();
        const first = this.pop();
        this.push(new INode(first, second));
        this.push(newNode);
      } else {
        this.parent.push(newNode, (this.index + 1) as ChildIndex);
        this.parent.rebalance();
      }
    }
  }
}

/**
 * Leaf node.
 */
export class Leaf<T> extends BaseNode<T> {
  data: T;

  constructor(data: T) {
    super();
    this.data = data;
  }
}