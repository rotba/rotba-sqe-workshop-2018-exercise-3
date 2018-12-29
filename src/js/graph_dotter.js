import * as escodegen from 'escodegen';
var nodeHandlers = {
    normal : normalHandler,
    test : testHandler

};

function dot(cfg) {
    const source =undefined
    const counter = 0;
    const output = [];
    const nodes_not_merged = cfg[2].filter(x=> x.type!='entry' &&x.type!='exit');
    const nodes = mergeCUses(nodes_not_merged);
    handleNodes(nodes, counter, source, output);
    handleEdges(nodes, counter, source, output);
    return output.join('');
}

function handleEdges(nodes, counter, source, output) {
    for (const [i, node] of nodes.entries()) {
        for (const type of ['normal', 'true', 'false']) {
            const next = node[type];
            if (ignoeNext(node, next ,nodes)) continue;
            output.push(`n${counter + i} -> n${counter + nodes.indexOf(next)} [`);
            if (['true', 'false'].includes(type)) output.push(`label="${type}"`);
            output.push(']\n');
        }
    }
}

function ignoeNext(node, next, nodes) {
    return !next || (nodes.indexOf(next)==-1);
}

function handleNodes(nodes, counter, source, output) {
    for (const [i, node] of nodes.entries()) {
        const noedType = getNodeType(node);
        nodeHandlers[noedType](node, counter, source, output, i);
    }
}

function getNodeType(node) {
    if(!node.normal){
        return 'test';
    }else{
        return 'normal';
    }
}

function normalHandler(node, counter, source, output, i){
    const label = getNodeLabel(node, counter+i);
    output.push(`n${counter + i} [label="${label}", shape=box`);
    if(node.inVectorPath) output.push(', fillcolor=darkolivegreen3, style=filled');
    output.push(']\n');
}

function testHandler(node, counter, source, output, i){
    const label = getNodeLabel(node, counter+i);
    output.push(`n${counter + i} [label="${label}", shape=diamond`);
    if(node.inVectorPath) output.push(', fillcolor=darkolivegreen3, style=filled');
    output.push(']\n');
}

function getNodeLabel(node, number) {
    var ans = '';
    ans = ans.concat('-',number,'-', '\n');
    node.astNode.forEach(function(element) {
        ans = ans.concat(escodegen.generate(element), '\n');
    });
    return ans;
}

function mergeCUses(nodes) {
    convertASTtoArray(nodes);
    var i = 0;
    while( i  < nodes.length-1){
        if(needToMerge(nodes[i], nodes[i+1])){
            mergeNodes(nodes[i], nodes[i+1]);
            nodes = arrayRemove(nodes, nodes[i+1]);
        }else{
            i++;
        }
    }
    return nodes;
}
function arrayRemove(arr, value) {
    return arr.filter(function(ele){
        return ele != value;
    });
}

function mergeNodes(node, node2) {
    node.next = getRegulareNext(node2);
    node.normal= getRegulareNext(node2);
    node.astNode = node.astNode.concat(node2.astNode);
}

function getRegulareNext(node2) {
    var ans  = null;
    var tmp_array = [];
    if(!(node2.next.constructor === Array)){
        tmp_array.push(node2.next);
    }else{
        tmp_array =node2.next;
    }
    tmp_array.forEach(function(element) {
        if(!(element.type && element.type=='exit')){
            ans =  element;
        }
    });
    return ans;
}

function convertASTtoArray(nodes) {
    for (const [ ,node] of nodes.entries()) {
        if(node.astNode){
            node.astNode = [node.astNode];
        }
    }
}

function needToMerge(node1, node2) {
    if((!node1.normal || !node2.normal)){
        return false;
    }
    if(node2.prev.length!=1){
        return false;
    }

    return isNextOf(node1, node2);
}

function isNextOf(node1, node2) {
    if(!node1.next){
        return false;
    }
    if(node1.next.constructor ===Array){
        return node1.next.includes(node2);
    }else{
        return node1.next ==node2;
    }
}

export {dot, convertASTtoArray, mergeCUses,mergeNodes, needToMerge};