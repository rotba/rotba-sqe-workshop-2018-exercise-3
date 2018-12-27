import $ from 'jquery';
import {parseCode, extractData} from './code-analyzer';
import {getInputVector, substituteData, getGlobalDefs, calculateBooleanValuse} from './dataflow-analyzer';
import {calculateVectorPath} from './vector-path-analyzer';
import * as esprima from 'esprima';
import * as esgraph from 'esgraph';
import Viz from 'viz.js';
import {Module, render} from 'viz.js/full.render';

var str = 'digraph G {\n' +
    '\tn1[shape = box, label ="1\\na = x + 1"];\n' +
    '\tn2[shape = diamond, label ="2\\nb < z"];\n' +
    '\tn3[shape = box, label ="3\\nc = c + 5"];\n' +
    '\tn4[shape = box, label ="4\\nc = c + 5 + z"];\n' +
    '\tn5[label =""];\n' +
    '\tend [shape=box, label = "6\\nreturn"];\n' +
    '\tn1 -> n2;\n' +
    '\tn2 -> n3;\n' +
    '\tn2 -> n4;\n' +
    '\tn3 -> n5;\n' +
    '\tn4 -> n5;\n' +
    '\tn5 -> end;\n' +
    '}';


$(document).ready(function () {
    $('#codeSubmissionButton').click(() => {
        var substituted_data = getSubstitutedData($('#codePlaceholder').val(), $('#inputVector').val());
        const cfg = esgraph(esprima.parse($('#codePlaceholder').val(), { loc: true }));
        var calculated_cfg = calculateVectorPath(cfg, substituted_data);
        const graph_dot = esgraph.dot(cfg);
        var viz = new Viz({ Module, render });
        let graphElement = document.getElementById('graph');
        viz.renderSVGElement(graph_dot)
            .then(function(element) {
                graphElement.innerHTML = '';
                graphElement.append(element);
            });
    });
});

function getSubstitutedData(codeToParse, inputVectorString) {
    let parsedCode = parseCode(codeToParse,{loc: true});
    let data_array = extractData(parsedCode);
    data_array.sort(function(a, b){return a['Line']-b['Line'];});
    var globalDefs = getGlobalDefs(data_array, codeToParse);
    var substitutedData = substituteData(globalDefs, data_array);
    var inputVector = getInputVector(substitutedData, inputVectorString);
    return calculateBooleanValuse(substitutedData, inputVector);
}