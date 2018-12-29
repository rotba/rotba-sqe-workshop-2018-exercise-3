import assert from 'assert';
import {calculateVectorPath,inPath, calc_type, getCondLine, getCondValue} from '../src/js/vector-path-analyzer';
import * as esprima from 'esprima';
import * as esgraph from 'esgraph';
import {extractData, parseCode} from '../src/js/code-analyzer';
import {calculateBooleanValuse, getGlobalDefs, getInputVector, substituteData} from '../src/js/dataflow-analyzer';

const code_0 = 'function foo(w){\n    let a = w;\n    w = a -1;\n    if(a < w){\n        a = a+5;\n    }\n    return a;\n}';

describe('Vector path analyzer ', () => {
    var data = setupData();
    var graph = setupGraph();
    calculateVectorPath(graph, data);
    it('is setting properly the inVectorPath field', () => {
        assert.equal(graph[2][1].inVectorPath, true);
        assert.equal(graph[2][4].inVectorPath, false);
    });
});

describe('Vector path analyzer ', () => {
    var data = setupData();
    var graph = setupGraph();
    inPath(graph[2][1], data);
    it('is setting properly the inVectorPath field\'', () => {
        assert.equal(graph[2][1].inVectorPath, true);
        assert.equal(graph[2][4].inVectorPath, false);
    });
});

describe('Vector path analyzer ', () => {
    var graph = setupGraph();
    it('is setting properly determining the node type\'', () => {
        assert.equal(calc_type(graph[2][1]), 'normal');
    });
});

describe('Vector path analyzer ', () => {
    var data = setupData();
    var graph = setupGraph();
    var nodeCond = graph[2][3];
    it('is calculating properly the node line\'', () => {
        assert.equal(getCondLine(nodeCond, data), 4);
    });
});

describe('Vector path analyzer ', () => {
    var data = setupData();
    it('is calculating properly the node line\'', () => {
        assert.equal(getCondValue(4, data), false);
    });
});

function setupData(){
    let parsedCode = parseCode(code_0,{loc: true});
    let data_array = extractData(parsedCode);
    data_array.sort(function(a, b){return a['Line']-b['Line'];});
    var globalDefs = getGlobalDefs(data_array, code_0);
    var substitutedData = substituteData(globalDefs, data_array);
    var inputVector = getInputVector(substitutedData, '1');
    calculateBooleanValuse(substitutedData, inputVector);
    return substitutedData;
}
function setupGraph(){
    var json = esprima.parse(code_0,{ loc: true });
    return esgraph(json.body[0].body, { loc: true });
}