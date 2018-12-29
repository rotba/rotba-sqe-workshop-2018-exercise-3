import $ from 'jquery';
import {parseCode, extractData} from './code-analyzer';
import {getInputVector, substituteData, getGlobalDefs, calculateBooleanValuse} from './dataflow-analyzer';
import {calculateVectorPath} from './vector-path-analyzer';
import {dot} from './graph_dotter';
import * as esprima from 'esprima';
import * as esgraph from 'esgraph';
import Viz from 'viz.js';
import {Module, render} from 'viz.js/full.render';

$(document).ready(function () {
    $('#codeSubmissionButton').click(() => {
        var substituted_data = getSubstitutedData($('#codePlaceholder').val(), $('#inputVector').val());
        var ast = esprima.parse($('#codePlaceholder').val(),{ loc: true });
        const cfg = esgraph(ast.body[0].body, { loc: true });
        var calculated_cfg = calculateVectorPath(cfg, substituted_data);
        const graph_dot = dot(calculated_cfg);
        var viz = new Viz({ Module, render });
        let graphElement = document.getElementById('graph');
        viz.renderSVGElement('digraph G {\n'.concat(graph_dot, '\n}'))
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
    calculateBooleanValuse(substitutedData, inputVector);
    return substitutedData;
}

export {getSubstitutedData};