import assert from 'assert';
import {mergeCUses, convertASTtoArray, mergeNodes, needToMerge} from '../src/js/graph_dotter';
import * as esprima from 'esprima';
import * as esgraph from 'esgraph';

const code_0 = 'function foo(w){\n    let a = w;\n    w = a +1;\n    if(a < w){\n        a = a+5;\n    }\n    return a;\n}';
const nodes_0 =  getNodes(code_0);
const filtered_nodes_0 =  filterNodes(nodes_0.slice());
const merged_c_uses = mergeCUses(filtered_nodes_0.slice());
describe('The graph dotter ', () => {
    it('is merging nodes properly', () => {
        assert.equal(merged_c_uses[0].astNode.length, 3);
        assert.equal(merged_c_uses.length, 4);
    });
});
describe('The graph dotter ', () => {
    it('sets the right next node ro each node', () => {
        assert.equal(merged_c_uses[0].next.parent.type, 'IfStatement');
    });
});
describe('The graph dotter ', () => {
    it('is decideing right what nodes need to be megred', () => {
        assert.equal(needToMerge(filtered_nodes_0[0],filtered_nodes_0[1]), true);
        assert.equal(needToMerge(filtered_nodes_0[1],filtered_nodes_0[2]), false);
        assert.equal(needToMerge(filtered_nodes_0[2],filtered_nodes_0[3]), false);
    });
});
describe('The graph dotter ', () => {
    var tmp_nodes = filtered_nodes_0.slice();
    mergeNodes(tmp_nodes[0],tmp_nodes[1])
    it('merging nodes properly', () => {
        assert.equal(tmp_nodes[0].astNode.length, 3);
    });
});
function getNodes(code_1) {
    var ast = esprima.parse(code_1);
    var nodes = esgraph(ast.body[0].body, { loc: true })[2];
    convertASTtoArray( nodes);
    return nodes;
}

function filterNodes(nodes) {
    return nodes.filter(x=> x.type!='entry' &&x.type!='exit');
}