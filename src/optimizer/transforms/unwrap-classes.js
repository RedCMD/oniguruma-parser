import {AstCharacterClassKinds, AstTypes} from '../../parser/parse.js';

/**
Unwrap unnecessary character classes, not including nested classes.
*/
const transform = {
  CharacterClass({node, parent, replaceWith}) {
    const {kind, negate, elements} = node;
    const firstEl = elements[0];
    if (
      parent.type !== AstTypes.CharacterClass &&
      !negate &&
      kind === AstCharacterClassKinds.union &&
      elements.length === 1 &&
      (firstEl.type === AstTypes.Character || firstEl.type === AstTypes.CharacterSet)
    ) {
      replaceWith(firstEl, {traverse: true});
    }
  },
};

export default transform;
