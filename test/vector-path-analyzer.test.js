import assert from 'assert';
import $ from 'jquery';
import {parseCode} from '../src/js/code-analyzer';
import * as esgraph from 'esgraph/lib';
import * as esprima from 'esprima';

let codeToParse = $('#codePlaceholder').val();
let parsedCode = parseCode(codeToParse);
const cfg = esgraph(esprima.parse(codeToParse, { range: true }));
const graph = esgraph.dot(cfg);


