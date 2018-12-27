import $ from 'jquery';
import {parseCode} from './code-analyzer';
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
        let codeToParse = $('#codePlaceholder').val();
        let parsedCode = parseCode(codeToParse);
        const cfg = esgraph(esprima.parse(codeToParse, { range: true }));
        const graph = esgraph.dot(cfg);
        var str_1 = 'digraph G {\n';
        str_1 = str_1.concat(graph,'}');
        var viz = new Viz({ Module, render });
        let graphElement = document.getElementById('graph');
        viz.renderSVGElement(str)
            .then(function(element) {
                graphElement.innerHTML = '';
                graphElement.append(element);
            });
        $('#parsedCode').val(JSON.stringify(parsedCode, null, 2));
    });
});
