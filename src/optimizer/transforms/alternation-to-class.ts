import {alternativeContainerTypes, universalCharacterSetKinds} from '../../parser/node-utils.js';
import {createAlternative, createCharacterClass, NodeTypes} from '../../parser/parse.js';
import type {AlternativeContainerNode, AlternativeNode, CharacterClassNode, CharacterNode, CharacterSetNode} from '../../parser/parse.js';
import type {Path, Visitor} from '../../traverser/traverse.js';

/**
Use character classes for adjacent alternatives with single-length values.
*/
const alternationToClass: Visitor = {
  '*'(path: Path) {
    const {node} = path as Path & {node: AlternativeContainerNode};
    if (!alternativeContainerTypes.has(node.type)) {
      return;
    }
    const newAlts = [];
    let ccNodes = [];
    for (const alt of node.alternatives) {
      const kid = alt.elements[0];
      if (
        alt.elements.length === 1 &&
        ( kid.type === NodeTypes.Character ||
          kid.type === NodeTypes.CharacterClass ||
          (kid.type === NodeTypes.CharacterSet && universalCharacterSetKinds.has(kid.kind))
        )
      ) {
        ccNodes.push(kid);
      } else {
        if (ccNodes.length) {
          newAlts.push(createAlternativeWithCombinedNodes(ccNodes));
          ccNodes = [];
        }
        newAlts.push(alt);
      }
    }
    if (ccNodes.length) {
      newAlts.push(createAlternativeWithCombinedNodes(ccNodes));
    }
    node.alternatives = newAlts;
  },
};

function createAlternativeWithCombinedNodes(nodes: Array<CharacterNode | CharacterClassNode | CharacterSetNode>): AlternativeNode {
  const alt = createAlternative();
  let node = nodes[0];
  if (nodes.length > 1) {
    const cc = createCharacterClass();
    cc.elements = nodes;
    node = cc;
  }
  if (node) {
    alt.elements.push(node);
  }
  return alt;
}

export {
  alternationToClass,
};
