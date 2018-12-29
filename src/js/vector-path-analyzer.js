const nodeHandlers  = {
    return : retHandler,
    normal : normHandler,
    condition : condHandler
};

function calculateVectorPath(cfg, data){
    inPath(cfg[2][[0]], data);
    return cfg;
}

function inPath(node, data) {
    node.inVectorPath = true;
    var node_type = calc_type(node);
    nodeHandlers[node_type](node, data);
}

function calc_type(node) {
    if(node.astNode.type == 'ReturnStatement'){
        return 'return';
    }
    if(node.normal){
        return 'normal';
    }
    return 'condition';
}

function retHandler(){
    return;
}
function normHandler(node, data){
    inPath(node.normal, data);
}

function condHandler(node, data){
    const condLine = getCondLine(node);
    const test_val = getCondValue(condLine, data);
    if(test_val){
        inPath(node.true,data);
    }else{
        inPath(node.false,data);
    }
}

function getCondLine(node) {
    return node.astNode.loc.start.line;
}

function getCondValue(condLine, data) {
    const element = data.filter(x=> x.Line == condLine)[0];
    return element.Value;
}

export {calculateVectorPath, inPath, calc_type, getCondLine, getCondValue};