import Ember from 'ember';
const { Mixin, K, A, tryInvoke } = Ember;

export default Mixin.create({

  didInsertParent: K,
  willDestroyParent: K,

  init() {
    this._super(...arguments);
    this.childComponents = new A();
  },

  didInsertElement() {
    this._super(...arguments);

    // If we are a top-level parent, we should start
    // the `didInsertParent` call chain, starting with ourselves
    if (!this.get('parentComponent')) {
      this.didInsertParent();
      this._didInsert = true;
      this.invokeChildDidInsertHooks();
    }
  },

  willDestroyElement() {

    // this wook will be called depth-first from the top-level component
    // since we must destroy childs first, the first parent will
    // be responsible for destroying the children. `this._didInsert` guards
    // that we don't redestroy already destroyed children
    if (this._didInsert) {
      this.destroySelfAndChildren();
    }

    this._super(...arguments);
  },

  invokeChildDidInsertHooks() {
    this.childComponents.invoke('didInsertParent');
    this.childComponents.setEach('_didInsert', true);
    this.childComponents.invoke('invokeChildDidInsertHooks');
  },

  destroySelfAndChildren() {
    this.destroyChildren();
    this.willDestroyParent();
    this._didInsert = false;
  },

  destroyChildren() {
    this.childComponents.reverseObjects();
    // if we have child-parents, destroy their children as well
    this.childComponents.invoke('destroyChildren');
    // destroy children
    this.childComponents.invoke('willDestroyParent');
    this.childComponents.setEach('_didInsert', false);
    this.childComponents.clear();
  },

  registerChild(childComponent) {
    this.childComponents.addObject(childComponent);

    // If parent already setup, setup child immediately
    if (this._didInsert) {
      childComponent.didInsertParent();
      childComponent._didInsert = true;
      tryInvoke(childComponent, 'invokeChildDidInsertHooks');
    }
  },

  unregisterChild(childComponent) {
    this.childComponents.removeObject(childComponent);

    // If parent already setup, teardown child immediately
    if (childComponent._didInsert) {
      tryInvoke(childComponent, 'destroySelfAndChildren');
    }
  }
});
