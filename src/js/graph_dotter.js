import * as escodegen from 'escodegen';
var handlers = {
    // FunctionDeclaration : funcDeclHandler,
    VariableDeclaration : varDeclHandler,
    // ExpressionStatement : exspStatHandler,
    // UpdateExpression: updateStatHandler,
    // WhileStatement : whileHandler,
    // ForStatement : forHandler,
    // IfStatement : ifHandler,
    // ReturnStatement : retHandler
};
function dot(cfg) {
    const source =undefined
    const counter = 0;
    const output = [];
    const nodes_not_merged = cfg[2].filter(x=> x.type!='entry' &&x.type!='exit');
    // print all the nodes:
    const nodes = mergeCUses(nodes_not_merged);
    handleNodes(nodes, counter, source, output);

    // print all the edges:
    for (const [i, node] of nodes.entries()) {
        for (const type of ['normal', 'true', 'false']) {
            const next = node[type];
            if (!next) continue;
            output.push(`n${counter + i} -> n${counter + nodes.indexOf(next)} [`);
            if (['true', 'false'].includes(type)) output.push(`label="${type}"`);

            output.push(']\n');
        }
    }
    return output.join('');
}

function handleNodes(nodes, counter, source, output) {
    for (const [i, node] of nodes.entries()) {
        let { label = node.type } = node;
        const ast = node.astNode;
        if(ast !=undefined && ast.type in handlers){
            handlers[ast.type](node, counter, source, output, i);
        }else{
            if (!label && source && node.astNode.range) {
                const ast = node.astNode;
                let { range } = ast;
                let add = '';

                // special case some statements to get them properly printed
                if (ast.type === 'SwitchCase') {
                    if (ast.test) {
                        range = [range[0], ast.test.range[1]];
                        add = ':';
                    } else {
                        range = [range[0], range[0]];
                        add = 'default:';
                    }
                } else if (ast.type === 'ForInStatement') {
                    range = [range[0], ast.right.range[1]];
                    add = ')';
                } else if (ast.type === 'CatchClause') {
                    range = [range[0], ast.param.range[1]];
                    add = ')';
                }

                label =
                    source
                        .slice(range[0], range[1])
                        .replace(/\n/g, '\\n')
                        .replace(/\t/g, '    ')
                        .replace(/"/g, '\\"') + add;
            }

            if (!label && node.astNode) {
                label = getNodeLabel(node, counter+i);
            }
            output.push(`n${counter + i} [label="${label}"`);
            if (['entry', 'exit'].includes(node.type)) output.push(', style="rounded"');
            output.push(']\n');
        }

    }
}

function getNodeLabel(node, param2) {
    var ans = '';
    ans = ans.concat(param2, '\n');
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
    return true;
}

function varDeclHandler(nodes, counter, source, output, i){
    var label = 'hey';
    output.push(`n${counter + i} [label="${label}"`);
    output.push(', shape = box');
    output.push(']\n');
}

export {dot, convertASTtoArray, mergeCUses,mergeNodes, needToMerge};