import {toOnigurumaAst} from '../dist/index.js';
import {createCharacter} from '../dist/parser/parse.js';
import {singleAltAst, traversed} from './utils.js';

describe('Traverser', () => {
  describe('traverse', () => {
    describe('replaceWithMultiple', () => {
      it('should replace a node with multiple nodes', () => {
        const visitor = {
          Group({node, replaceWithMultiple}) {
            replaceWithMultiple(node.alternatives[0].elements, {traverse: true});
          },
        };
        expect(traversed(toOnigurumaAst('(?:a(?:b))'), visitor)).toEqual(singleAltAst([
          createCharacter(97),
          createCharacter(98),
        ]));
        expect(traversed(toOnigurumaAst('(?:a(?:bc))'), visitor)).toEqual(singleAltAst([
          createCharacter(97),
          createCharacter(98),
          createCharacter(99),
        ]));
      });
    });
  });
});
