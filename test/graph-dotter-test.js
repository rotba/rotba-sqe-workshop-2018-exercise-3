import assert from 'assert';
import {mergeCUses, convertASTtoArray, mergeNodes, needToMerge, dot} from '../src/js/graph_dotter';
import {calculateVectorPath} from '../src/js/vector-path-analyzer';
import * as esprima from 'esprima';
import * as esgraph from 'esgraph';
import {extractData, parseCode} from '../src/js/code-analyzer';
import {calculateBooleanValuse, getGlobalDefs, getInputVector, substituteData} from '../src/js/dataflow-analyzer';

const code_0 = 'function foo(w){\n    let a = w;\n    w = a +1;\n    if(a < w){\n        a = a+5;\n    }\n    return a;\n}';
const code_1 = 'function foo(w){\n' +'    let a = 2;\n' +'    return a + w;\n' +'}';
const code_2 = 'function foo(w){\n' +'    let a = 2;\n' +'    if(w < a){\n' +'       w--;\n' +'    }\n' +'    return a + w;\n' +'}';
const code_array = [code_0, code_1, code_2];
const nodes_0 =  getNodes(code_0);
const filtered_nodes_0 =  filterNodes(nodes_0.slice());
const merged_c_uses = mergeCUses(filtered_nodes_0.slice());
describe('The graph dotter ', () => {
    var merged = mergeCUses(getTestFilteredNodes(0));
    it('is merging nodes properly', () => {
        assert.equal(merged[0].astNode.length, 2);
        assert.equal(merged.length, 4);
    });
});
describe('The graph dotter ', () => {
    it('sets the right next node ro each node', () => {
        assert.equal(merged_c_uses[0].next.parent.type, 'IfStatement');
    });
});
describe('The graph dotter ', () => {
    var test_nodes = getTestFilteredNodes(0);
    it('is decideing right what nodes need to be megred', () => {
        assert.equal(needToMerge(test_nodes[0],test_nodes[1]), true);
        assert.equal(needToMerge(test_nodes[1],test_nodes[2]), false);
        assert.equal(needToMerge(test_nodes[2],test_nodes[3]), false);
    });
});
describe('The graph dotter ', () => {
    var tmp_nodes = getTestFilteredNodes(0);
    mergeNodes(tmp_nodes[0],tmp_nodes[1])
    it('merging nodes properly', () => {
        assert.equal(tmp_nodes[0].astNode.length, 2);
    });
});

describe('The graph dotter ', () => {
    it('generating the proper dot for a simple code', () => {
        assert.equal(dot(getVectorCalculatedGraph(1, '1')), 'n0 [label="-0-\n' +
            'let a = 2;\n' +
            'return a + w;\n"' +
            ', shape=diamond, fillcolor=darkolivegreen3, style=filled]\n');
    });
});

describe.only('The graph dotter ', () => {
    it('generating the proper dot for a complex code', () => {
        assert.equal(dot(getVectorCalculatedGraph(2, '3')), 'n0 [label="-0-\n' +
            'let a = 2;\n' +
            '", shape=box, fillcolor=darkolivegreen3, style=filled]\n' +
            'n1 [label="-1-\n' +
            'w < a\n' +
            '", shape=diamond, fillcolor=darkolivegreen3, style=filled]\n' +
            'n2 [label="-2-\n' +
            'w--\n' +
            '", shape=box]\n' +
            'n3 [label="-3-\n' +
            'return a + w;\n' +
            '", shape=box, fillcolor=darkolivegreen3, style=filled]\n' +
            'n0 -> n1 []\n' +
            'n1 -> n2 [label="true"]\n' +
            'n1 -> n3 [label="false"]\n' +
            'n2 -> n3 []\n');
    });
});


function getNodes(code) {
    var ast = esprima.parse(code);
    var nodes = esgraph(ast.body[0].body, { loc: true })[2];
    convertASTtoArray( nodes);
    return nodes;
}

function getVectorCalculatedGraph(i, inVec) {
    var ast = esprima.parse(code_array[i], { loc: true });
    let parsedCode = parseCode(code_array[i],{loc: true});
    let data_array = extractData(parsedCode);
    data_array.sort(function(a, b){return a['Line']-b['Line'];});
    var globalDefs = getGlobalDefs(data_array, code_array[i]);
    var substitutedData = substituteData(globalDefs, data_array);
    var inputVector = getInputVector(substitutedData, inVec);
    calculateBooleanValuse(substitutedData, inputVector);
    var graph = esgraph(ast.body[0].body, { loc: true });
    return calculateVectorPath(graph, substitutedData);
}

function filterNodes(nodes) {
    return nodes.filter(x=> x.type!='entry' &&x.type!='exit');
}
function getTestFilteredNodes(i){
    var nodes = getNodes(code_array[i]);
    var filtered_nodes = filterNodes(nodes);
    return filtered_nodes;
}
