import {createCharacterSet, createUnicodeProperty, NodeCharacterClassKinds, NodeCharacterSetKinds, NodeTypes} from '../../parser/parse.js';

/**
Use shorthands (`\d`, `\h`, `\s`, etc.) when possible.
- `\d` from `\p{Decimal_Number}`, `\p{Nd}`, `\p{digit}`, `[[:digit:]]`
- `\h` from `\p{ASCII_Hex_Digit}`, `\p{AHex}`, `\p{xdigit}`, `[[:xdigit:]]`, `[0-9A-Fa-f]`
- `\s` from `\p{White_Space}`, `\p{WSpace}`, `\p{space}`, `[[:space:]]`
- `\w` from `[\p{L}\p{M}\p{N}\p{Pc}]` - Not the same as `\p{word}`!
- `\p{Any}` from `[0-\x{10FFFF}]`
- `\p{Cc}` from `\p{cntrl}`, `[[:cntrl:]]`
See also `useUnicodeAliases`.
*/
const useShorthands = {
  CharacterSet({node, root, replaceWith}) {
    const {kind, negate, value} = node;
    let newNode;
    if (
      ( kind === NodeCharacterSetKinds.property &&
        (value === 'Decimal_Number' || value === 'Nd') &&
        // [TODO] Also need to check whether these flags are set in local context, when the parser
        // supports these flags on mode modifiers
        !root.flags.digitIsAscii &&
        !root.flags.posixIsAscii
      ) ||
      ( kind === NodeCharacterSetKinds.posix &&
        value === 'digit'
      )
    ) {
      newNode = createCharacterSet(NodeCharacterSetKinds.digit, {negate});
    } else if (
      ( kind === NodeCharacterSetKinds.property &&
        (value === 'ASCII_Hex_Digit' || value === 'AHex')
      ) ||
      ( kind === NodeCharacterSetKinds.posix &&
        value === 'xdigit'
      )
    ) {
      newNode = createCharacterSet(NodeCharacterSetKinds.hex, {negate});
    } else if (
      ( kind === NodeCharacterSetKinds.property &&
        (value === 'White_Space' || value === 'WSpace') &&
        // [TODO] Also need to check whether these flags are set in local context, when the parser
        // supports these flags on mode modifiers
        !root.flags.spaceIsAscii &&
        !root.flags.posixIsAscii
      ) ||
      ( kind === NodeCharacterSetKinds.posix &&
        value === 'space'
      )
    ) {
      newNode = createCharacterSet(NodeCharacterSetKinds.space, {negate});
    } else if (
      kind === NodeCharacterSetKinds.posix &&
      value === 'cntrl' &&
      // [TODO] Also need to check whether this flag is set in local context, when the parser
      // supports this flag on mode modifiers
      !root.flags.posixIsAscii
    ) {
      newNode = createUnicodeProperty('Cc', {negate});
    }

    if (newNode) {
      replaceWith(newNode);
    }
  },

  CharacterClass({node, root}) {
    if (node.kind !== NodeCharacterClassKinds.union) {
      return;
    }
    const has = {
      range0To10FFFF: false,
      rangeDigit0To9: false,
      rangeAToFLower: false,
      rangeAToFUpper: false,
      unicodeL: false,
      unicodeM: false,
      unicodeN: false,
      unicodePc: false,
    }
    for (const kid of node.elements) {
      if (kid.type === NodeTypes.CharacterClassRange) {
        has.range0To10FFFF ||= isRange(kid, 0, 0x10FFFF);
        has.rangeDigit0To9 ||= isRange(kid, 48, 57); // '0' to '9'
        has.rangeAToFLower ||= isRange(kid, 97, 102); // 'a' to 'f'
        has.rangeAToFUpper ||= isRange(kid, 65, 70); // 'A' to 'F'
      } else if (kid.type === NodeTypes.CharacterSet) {
        has.unicodeL ||= isUnicode(kid, 'L');
        has.unicodeM ||= isUnicode(kid, 'M');
        has.unicodeN ||= isUnicode(kid, 'N');
        has.unicodePc ||= isUnicode(kid, 'Pc', {supercategories: true});
      }
    }
    if (has.rangeDigit0To9 && has.rangeAToFUpper && has.rangeAToFLower) {
      node.elements = node.elements.filter(kid => !(
        isRange(kid, 48, 57) || isRange(kid, 97, 102) || isRange(kid, 65, 70)
      ));
      node.elements.push(createCharacterSet(NodeCharacterSetKinds.hex));
    }
    if (has.range0To10FFFF) {
      node.elements = node.elements.filter(kid => !isRange(kid, 0, 0x10FFFF));
      node.elements.push(createUnicodeProperty('Any'));
    }
    if (
      (has.unicodeL && has.unicodeM && has.unicodeN && has.unicodePc) &&
      // [TODO] Also need to check whether these flags are set in local context, when the parser
      // supports these flags on mode modifiers
      !root.flags.wordIsAscii &&
      !root.flags.posixIsAscii
    ) {
      node.elements = node.elements.filter(kid => !isUnicode(kid, ['L', 'M', 'N', 'Pc'], {
        subcategories: true,
      }));
      node.elements.push(createCharacterSet(NodeCharacterSetKinds.word));
    }
  },
};

function isRange(node, min, max) {
  return (
    node.type === NodeTypes.CharacterClassRange &&
    node.min.value === min &&
    node.max.value === max
  );
}

function isUnicode(node, value, options = {}) {
  const names = Array.isArray(value) ? value : [value];
  const expanded = [];
  for (const v of names) {
    expanded.push(v);
    if (fullNames[v]) {
      expanded.push(fullNames[v]);
    }
    if (options.supercategories && supercategories[v]) {
      expanded.push(supercategories[v]);
      if (fullNames[supercategories[v]]) {
        expanded.push(fullNames[supercategories[v]]);
      }
    }
    if (options.subcategories && subcategories[v]) {
      expanded.push(...subcategories[v]);
    }
  }
  return (
    node.type === NodeTypes.CharacterSet &&
    node.kind === NodeCharacterSetKinds.property &&
    !node.negate &&
    expanded.includes(node.value)
  );
}

const fullNames = {
  L: 'Letter',
  M: 'Mark',
  N: 'Number',
  P: 'Punctuation',
};

const supercategories = {
  Pc: 'P',
};

const subcategories = {
  L: ['Ll', 'Lm', 'Lo', 'Lt', 'Lu'],
  M: ['Mc', 'Me', 'Mn'],
  N: ['Nd', 'Nl', 'No'],
};

export {
  useShorthands,
};
