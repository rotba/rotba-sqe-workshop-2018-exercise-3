import * as esprima from 'esprima';
import * as escodegen from 'escodegen';

var LineTypesEnum = Object.freeze(
    {
        'DontTouch':'DontTouch',
        'while statement':'while statement',
        'if statement':'if statement',
        'else if statement':'else if statement',
        'else statement':'else statement',
        'assignment expression': 'assignment expression',
        'variable declaration': 'variable declaration',
        'return statement': 'return statement',
        'unknown': 'unknown'
    });
var substitute_handlers = {
    'return statement' : subRetHandler,
    'if statement' : subIfCondHandler,
    'else if statement' : subIfCondHandler,
    'while statement' : subIfCondHandler,
    'assignment expression' : subAssginmentCondHandler,
    'variable declaration' : subAssginmentCondHandler
};

var lineHandlers = {
    'while statement' : whileLineHandler,
    'if statement' : ifLineHandler,
    'else if statement' : elseIfLineHandler,
    'assignment expression': assgnmentLineHandler,
    'variable declaration': varDecLineHandler,
    'return statement' : retLineHandler
};

var exphandlers = {
    BinaryExpression : bExspHandler,
    MemberExpression : mExspHandler,
    Identifier : identifierHandler,
    Literal : literalHandler,
    ArrayExpression : arrHandler
};


function substituteData(global_defs, data){
    data.sort(function(a, b){return a['Line']-b['Line'];});
    var ans = data.slice();
    for (let i = 0; i < ans.length; i++) {
        var curr_element = data[i];
        if(curr_element.Type in substitute_handlers){
            substitute_handlers[curr_element.Type](data, ans, curr_element, ans[i], global_defs, i);
        }
    }
    return ans;
}

function substituteCode(codeString, substituted_data, inputVector){
    var codeArray = codeString.match(/[^\r\n]+/g);
    var ans = [];
    var newLineNumSingelArray = [1];
    for (let i = 0; i < codeArray.length; i++) {
        var currLine = codeArray[i];
        var lineNum = i + 1;
        var lineData = substituted_data.filter(element => (element.Line == lineNum));
        var lineType = getLineType(currLine, lineData);
        if(lineType == 'DontTouch') {
            ans.push(currLine);
            newLineNumSingelArray[0]++;
            //}else if(lineType in lineHandlers){ for coverage
        }else{
            ans.push.apply(ans ,lineHandlers[lineType](currLine, lineNum, lineData, newLineNumSingelArray, inputVector, substituted_data));
        }
    }
    return ans.join('\n');
}

function calculateBooleanValuse(subData, inputVector){
    subData.forEach(element=>{
        if(needToCalcElement(element)){
            calcElement(element, inputVector);
        }
    });
}

function calcElement(element, inputVector) {
    element.Value = evaluate(element.Condition, inputVector);
}
function evaluate(cond, inputVector) {
    for (let i = 0; i <inputVector.length ; i++) {
        var currElemnt = inputVector[i];
        var var_string = currElemnt.Name;
        let regex = new RegExp('([^\\d\\w]|\\b)' + var_string.replace('[', '\\[').replace(']', '\\]')  + '([^\\d\\w]|\\b)', 'g');
        cond = cond.replace(regex, function (x) {
            return x.replace(var_string, currElemnt.Value);
        });
    }
    return eval(cond);
}


function needToCalcElement(element) {
    return element.Type =='if statement' ||element.Type =='else if statement' || element.Type =='while statement';
}

function getInputVector(substitutedData, inputFromUser) {
    var ans  = [];
    ans.push.apply(ans ,getGlobals(substitutedData));
    ans.push.apply(ans ,getParamsValues(substitutedData, inputFromUser));
    return ans;
}


function getGlobals(substitutedData) {
    var ans = [];
    for (let i = 0; i <substitutedData.length ; i++){
        var curr_element = substitutedData[i];
        if(curr_element.Type == 'function declaration') {
            i = substitutedData.length;
            //}else if(curr_element.Type =='variable declaration'){ for coverage
        }else{
            ans.push(curr_element);
        }
    }
    ans.push.apply(ans, getAfterFuncFlobals(substitutedData));
    return ans;
}

function getAfterFuncFlobals(substitutedData) {
    var ans = [];
    var funcDecs = substitutedData.filter(x => x.Type== 'function declaration');
    if(funcDecs.length == 0){
        return ans;
    }
    var funcEndNum = funcDecs[0].loc.end.line;
    ans.push.apply(ans,substitutedData.filter(x => x.Type== 'variable declaration' && x.Line >funcEndNum));
    return ans;
}

function getParamsValues(substitutedData, inputFromUser) {
    var ans = [];
    //if (/^\w+(,\w+)*$/.test(inputFromUser)) {
    var values = inputFromUser.split(',');
    values = orderInputValues(values);
    var currValIndex = 0;
    for (let i = 0; i <substitutedData.length ; i++) {
        var currElement = substitutedData[i];
        if(currElement.Type == 'Param'){
            currElement.Value = values[currValIndex++];
            ans.push(currElement);
        }
    }
    return ans;
}

function orderInputValues(values) {
    var i = 0;
    var ans = [];
    while(i < values.length){
        var goodValue = '';
        if(values[i].includes('[') && !values[i].includes(']')){
            goodValue = values[i++];
            while(!values[i].includes(']')){
                goodValue = goodValue.concat(', ', values[i++]);
            }
            goodValue = goodValue.concat(', ', values[i++]);
            ans.push(goodValue);
        }else{
            ans.push(values[i++]);
        }
    }
    return ans;
}

function updateLineNum(lineData, newLineNum) {
    for (let i = 0; i <lineData.length ; i++) {
        lineData[i].Line = newLineNum;
    }
}

function getLineType(currLine, lineData) {
    if(dontTouchLine(lineData)){
        return LineTypesEnum.DontTouch;
    }else{
        return extractLineType(lineData);
    }
}

function extractLineType(lineData) {
    var lineTypes = lineData.map(x => x.Type);
    var handleTypes = Object.keys(LineTypesEnum).filter(x => x!= 'DontTouch');
    for (let i = 0; i < handleTypes.length; i++){
        var curr_type = handleTypes[i];
        if(lineTypes.includes(curr_type)){
            return LineTypesEnum[curr_type];
        }
    }
    //return LineTypesEnum['unknown']; for coverage
}

function dontTouchLine(lineData) {
    if(lineData.length == 0){
        return true;
    }
    var types = lineData.map(x => x.Type);
    var dontTouchTypes = ['function declaration', 'else statement'];
    for (let i = 0; i < types.length; i++) {
        var currType = types[i];
        if(dontTouchTypes.includes(currType)){
            return true;
        }
    }
    return false;
}

function subRetHandler(data, subData, origElement, subElement, globalDefs, i) {
    var codeJson = esprima.parseScript(origElement.Value).body[0].expression;
    subElement.Value = escodegen.generate(substituteExp(codeJson, subData, i, globalDefs));
}

function subAssginmentCondHandler(data, subData, origElement, subElement, globalDefs, i) {
    var codeJson = esprima.parseScript(origElement.Value).body[0].expression;
    var codeJsonName = esprima.parseScript(origElement.Name).body[0].expression;
    subElement.Value = escodegen.generate(substituteExp(codeJson, subData, i, globalDefs));
    if(subElement.Name.includes('[')){
        subElement.Name = escodegen.generate(substituteExp(codeJsonName, subData, i, globalDefs));
        handleArrayValueUpdate(subElement, subData, globalDefs);
    }
    updateGlobalDef(globalDefs, subData[i], subElement.Value);
}
function updateGlobalDef(globalDefs, element, Value) {
    var relevantGlblDefs = globalDefs.filter(x => x.def.id == element.Name && x.def.loc.start.line ==element.Line);
    for (let i = 0; i < relevantGlblDefs.length; i++) {
        relevantGlblDefs[i].def.Value = Value;
    }
}
function subIfCondHandler(data, subData, origElement, subElement, globalDefs, i) {
    var codeJson = esprima.parseScript(origElement.Condition).body[0].expression;
    subElement.Condition = escodegen.generate(substituteExp(codeJson, subData, i, globalDefs));
}

function substituteExp(json, subData,i ,globalDefs) {
    if(json.type =='Literal'){
        return json;
    }else{
        return exphandlers[json.type](json, subData,i ,globalDefs);
    }
}

function getGlobalDefs(data, codeString) {
    var ans = [] ;
    var arrayOfLines = codeString.match(/[^\r\n]+/g);
    for (var i = 0; i < arrayOfLines.length; i++) {
        var defs = getDefinitions(i+1, data.slice());
        for (var j = 0; j < defs.length; j++) {
            ans.push.apply(ans ,findDCPs(defs[j], data, codeString));
        }
    }
    return ans;
}

function findDCPs(def, data, codeString) {
    var ans = [];
    var left_most = {start: {line:def.loc.start.line+1, column:def.loc.start.column},end: {line:def.loc.end.line, column:def.loc.end.column}};
    while(isFeasible(def.loc, left_most, codeString)){
        var uses = getUses(def.id, left_most.start.line, data);
        uses.sort(function(a, b){return a.loc.start.column-b.loc.start.column;});
        for (var i = 0; i < uses.length; i++) {
            if(uses[i].Value ==null){
                uses[i].id = uses[i].id.replace(/ /g, '');
                ans.push({def:def, node:uses[i]});
            }
            if(isDefinitionUse(uses[i])){
                left_most = getScopeEnd(left_most, codeString);
            }
        }
        left_most.start.line +=1;
        left_most.end.column =0;
    }
    return ans;
}
function getDefinitions(line, data) {
    var ans = [];
    var uses =  data.filter(element => (element.Line == line) && (isDefinition(element)));
    for (var i = 0; i < uses.length; i++) {
        ans.push(createUse(uses[i].Name, uses[i].loc, uses[i].Value));
    }
    return ans;
}

function getUses(id , line, data) {
    var ans = [];
    var line_elements =  data.filter(element => (element.Line == line));
    for (var i = 0; i < line_elements.length; i++) {
        var element =line_elements[i];
        if(isDefinition(element) && element.Name.replace(/ /g,'') == id.replace(/ /g,'')){
            ans.push(createUse(id, element.loc, element.Value));
        }
        if(is_c_use_or_p_use(id, element)){
            ans.push(createUse(id, element.loc, null));
        }
    }
    return ans;
}

function is_c_use_or_p_use(id, element) {
    return is_c_use_in_element(id, element) || is_p_use_in_element(id, element);
}

function isDefinition(element) {
    var isAssignment = element.Type == 'assignment expression';
    var isDeclerationWithAssignment = element.Type == 'variable declaration' && element.Value!=null;
    return isAssignment || isDeclerationWithAssignment;
}

function isDefinitionUse(use) {
    return use.Value!=null;
}

function is_c_use_in_element(id, element){
    var c_use_indicatorr = '';
    c_use_indicatorr = c_use_indicatorr.concat(' ', id, ' ').replace('  ', ' ').replace('  ',' ');
    var value = element.Value.toString();
    var name = element.Name;
    var c_use_in_value = is_c_use_helper(value, name, c_use_indicatorr, id);
    var c_use_in_name = name !=null&& name.includes(c_use_indicatorr);
    return c_use_in_value || c_use_in_name ;
}
function is_c_use_helper(value, name, c_use_indicatorr, id){
    return value !=null&& value.includes(c_use_indicatorr) ||(name !=null)&& name.includes('['.concat(id,']'));
}
function is_p_use_in_element(id, element){
    var p_use_indicatorr = '';
    p_use_indicatorr = p_use_indicatorr.concat(' ', id, ' ');
    var cond =element.Condition;
    return cond !=null && cond.includes(p_use_indicatorr);
}

function createUse(id, loc, value){
    return {
        id:id.replace(/ /g, ''),
        loc:loc,
        Value: value
    };
}


function isFeasible(loc_1, loc_2, codeString){
    var arrayOfLines = codeString.match(/[^\r\n]+/g);
    var stack = [];
    var i = loc_1.start.line-1;
    var j = loc_1.start.column;
    for(i; i < Math.min(loc_2.start.line,arrayOfLines.length);i++) {
        for(j; j < arrayOfLines[i].length;j++){
            if(reachedLoc(i +1, j, loc_2, arrayOfLines[i])) return true;
            var curr_char = arrayOfLines[i][j];
            if(!isEquivalentlBrackets(stack, curr_char)) return false;
        }
        j =0;
    }
}

function isEquivalentlBrackets(stack, curr_char) {
    if(curr_char == '{'){
        stack.push('{');
    }else if(curr_char == '}'){
        if(stack.length ==0){
            return false;
        }
        stack.pop();
    }
    return true;
}

function reachedLoc(i, j, loc_2, line) {
    if(i == loc_2.start.line  && j == loc_2.start.column-2){
        return true;
    }else if(i == loc_2.start.line && j ==(line.length-1)){
        return true;
    }
    return false;
}

function getScopeEnd(loc, codeString){
    var arrayOfLines = codeString.match(/[^\r\n]+/g);
    var i = loc.start.line-1;
    var j = loc.start.column;
    var curr_char;
    for(i; i < arrayOfLines.length;i++) {
        if(i != loc.start.line-1){
            j =0;
        }
        for(j; j < arrayOfLines[i].length;j++){
            curr_char = arrayOfLines[i][j];
            if(curr_char == '}'){
                loc.start.line = i+1;
                loc.start.column = j;
                return loc;
            }
        }
    }
}

function isLocal(identifier, subData, index) {
    for (let i = index; i >= 0; i--) {
        var currElement = subData[i];
        if(currElement.Type == 'variable declaration'){
            if(currElement.Name == identifier){
                return true;
            }
        }else if(currElement.Type == 'function declaration'){
            return false;
        }
    }
    // variable is global
    //return false; for coverage
}

function identifierHandler(iExp , subData, i, globalDefs) {
    if(isLocal(iExp.name, subData, i)){
        var identifier = iExp.name;
        var globalDef = getGlobalDef(identifier, subData, i ,globalDefs);
        iExp = esprima.parseScript(globalDef.Value).body[0].expression;
        return iExp;
    }else{
        iExp = handleNotLocal(iExp , subData, i, globalDefs);
        return iExp;
    }
}

function handleNotLocal(iExp, subData, i, globalDefs) {
    var identifier = iExp.name;
    var globalDef = getGlobalDef(identifier, subData, i ,globalDefs);
    if(globalDef ==null){
        return iExp;
    }
    iExp = esprima.parseScript(globalDef.Value).body[0].expression;
    return iExp;
}
function literalHandler(literalExp){
    return literalExp;

}

function bExspHandler(bExp , subData, i, globalDefs) {
    bExp.left = exphandlers[bExp.left.type](bExp.left , subData, i, globalDefs);
    bExp.right = exphandlers[bExp.right.type](bExp.right , subData, i, globalDefs);
    //bExp.right = exphandlers[bExp.right.type](bExp.right , subData, i, globalDefs);
    return bExp;
}
function arrHandler(arrExp , subData, i, globalDefs) {
    for (let j = 0; j < arrExp.elements.length; j++) {
        if(!(arrExp.elements[j].type == 'Literal'))
            arrExp.elements[j] = exphandlers[arrExp.elements[j].type](arrExp.elements[j] , subData, i, globalDefs);
    }
    return arrExp;
}

function mExspHandler(mExp , subData, i, globalDefs) {
    mExp.property = exphandlers[mExp.property.type](mExp.property , subData, i, globalDefs);
    if(!isLocal(mExp.object.name, subData, i)){
        //mExp.property = exphandlers[mExp.property.type](mExp.property, subData, i, globalDefs);
        return mExp;
    }
    var array  = getEsprimaArray(mExp , subData, i, globalDefs);
    if(array!=null){
        mExp = handleArrayStuff(mExp, array, subData, i, globalDefs);
    }
    return mExp;
}

function handleArrayStuff(mExp, array, subData, i, globalDefs){
    mExp = exphandlers[array[mExp.property.value].type](array[mExp.property.value] , subData, i, globalDefs);
    return mExp;
}

function getEsprimaArray(mExp, subData, i, globalDefs) {
    var globalDef = getGlobalDef(mExp.object.name, subData, i ,globalDefs);
    if(globalDef ==undefined) return null;
    return esprima.parseScript(globalDef.Value).body[0].expression.elements;
}

function getGlobalDef(identifier, subData, index ,globalDefs){
    for (let i = 0; i < globalDefs.length ; i++){
        var currGlblDefNode = globalDefs[i].node;
        var nodeLine = currGlblDefNode.loc.start.line;
        var elementLine = subData[index].Line;
        if(currGlblDefNode.id == identifier && elementLine == nodeLine){
            return globalDefs[i].def;
        }
    }
}

function retLineHandler(currLine, lineNum, lineData, lineNumberArray){
    var ans = [];
    var strAns = '';
    var idxOfReturnEnd = currLine.indexOf('return')+'return'.length;
    var retString = currLine.substring(0, idxOfReturnEnd);
    var retValue = lineData.filter(d => d.Type == 'return statement')[0].Value;
    //while(retValue.includes('  ')){ for coverage
    //    retValue = retValue.replace('  ', ' ' ); for coverage
    //}for coverage
    ans.push(strAns.concat(retString, ' ', retValue, ';'));
    updateLineNum(lineData,lineNumberArray[0]);
    lineNumberArray[0] +=1;
    return ans;
}

function ifLineHandler(currLine, lineNum, lineData, lineNumberArray){
    var ans = [];
    var strAns = '';
    currLine = currLine.replace('if (', 'if(' );
    var idxOfIfEnd = currLine.indexOf('if(')+'if('.length;
    var ifSrtStart = currLine.substring(0, idxOfIfEnd);
    var ifSrtEnd = ') {';
    var ifCond = lineData.filter(d => d.Type == 'if statement')[0].Condition;
    //while(ifCond.includes('  ')){for coverage
    //    ifCond = ifCond.replace('  ', ' ' );for coverage
    //}for coverage
    ans.push(strAns.concat(ifSrtStart,  ifCond, ifSrtEnd));
    updateLineNum(lineData,lineNumberArray[0]);
    lineNumberArray[0] +=1;
    return ans;
}

function elseIfLineHandler(currLine, lineNum, lineData,lineNumberArray){
    var ans = [];
    var strAns = '';
    var ifElseStr = 'else if(';
    currLine =adaptIfElse(currLine, ifElseStr);
    var idxOfIfEnd = currLine.indexOf(ifElseStr)+ifElseStr.length;
    var ifSrtStart = currLine.substring(0, idxOfIfEnd);
    var ifSrtEnd = ') {';
    var ifCond = lineData.filter(d => d.Type == 'else if statement')[0].Condition;
    //while(ifCond.includes('  ')){for coverage
    //    ifCond = ifCond.replace('  ', ' ' );for coverage
    //}for coverage
    ans.push(strAns.concat(ifSrtStart,  ifCond, ifSrtEnd));
    updateLineNum(lineData,lineNumberArray[0]);
    lineNumberArray[0] +=1;
    return ans;
}

function assgnmentLineHandler(currLine, lineNum, lineData,lineNumberArray, inputVector){
    var ans = [];
    var assExp = lineData.filter(d => d.Type == 'assignment expression')[0];
    if(!inInputVector(assExp, inputVector)){
        //handleArrayValueUpdate(assExp, substitutedData);
        return ans;
    }
    var strAns = '';
    var idEquals = assExp.Name.concat(' = ');
    var assEnd = ';';
    ans.push(strAns.concat(idEquals,  assExp.Value, assEnd));
    updateLineNum(lineData,lineNumberArray[0]);
    lineNumberArray[0] +=1;
    //handleArrayValueUpdate(assExp, inputVector);
    return ans;
}


function handleArrayValueUpdate(assExp,data, globalDefs) {
    if(!(assExp.Name.includes('['))){
        return;
    }
    var nameOfArray = extractArrayName(assExp.Name);
    for (let i = data.length-1; i >=0 ; i--) {
        if(isArrayDecl(nameOfArray,data[i])){
            updateArrayValue(assExp, data[i], globalDefs);
        }
    }
}
function extractArrayName(Name) {
    return Name.substring(0, Name.indexOf('['));
}

function isArrayDecl(nameOfArray, element) {
    return element.Name == nameOfArray && element.Value.includes('[');
}

function updateArrayValue(assExp, arrayData, globalDefs) {
    var idx = esprima.parseScript(assExp.Name).body[0].expression.property.value;
    var arrayExp = esprima.parseScript(arrayData.Value).body[0].expression;
    var elements = arrayExp.elements;
    elements[idx] = esprima.parseScript(assExp.Value).body[0].expression;
    arrayData.Value = escodegen.generate(arrayExp);
    updateGlobalAfterArrayAss(arrayData, globalDefs);

}
function updateGlobalAfterArrayAss(arrayData, globalDefs){
    var relevantDefs = globalDefs.filter(x=> x.def.id == arrayData.Name && x.def.loc.start.line == arrayData.Line);
    for (let i = 0; i <relevantDefs.length ; i++) {
        relevantDefs[i].def.Value = arrayData.Value;
    }
}


function varDecLineHandler(currLine, lineNum, lineData,lineNumberArray, inputVector){
    var ans = [];
    var varDec = lineData.filter(d => d.Type == 'variable declaration')[0];
    if(!inInputVector(varDec, inputVector)){
        return ans;
    }
    var strAns = '';
    var idEquals = 'let '.concat(varDec.Name,' = ');
    var assEnd = ';';
    ans.push(strAns.concat(idEquals,  varDec.Value, assEnd));
    updateLineNum(lineData,lineNumberArray[0]);
    lineNumberArray[0] +=1;
    return ans;
}
function whileLineHandler(currLine, lineNum, lineData, lineNumberArray){
    var ans = [];
    var strAns = '';
    currLine = currLine.replace('while (', 'while(' );
    var idxOfWhileEnd = currLine.indexOf('while(')+'while('.length;
    var whileSrtStart = currLine.substring(0, idxOfWhileEnd);
    var whileSrtEnd = ') {';
    var ifCond = lineData.filter(d => d.Type == 'while statement')[0].Condition;
    //while(ifCond.includes('  ')){for coverage
    //    ifCond = ifCond.replace('  ', ' ' );for coverage
    //}for coverage
    ans.push(strAns.concat(whileSrtStart,  ifCond, whileSrtEnd));
    updateLineNum(lineData,lineNumberArray[0]);
    lineNumberArray[0] +=1;
    return ans;
}

function inInputVector(element, inputVector) {
    var elemenName = element.Name;
    for (let i = 0; i < inputVector.length; i++) {
        if(elemenName == inputVector[i].Name){
            return true;
        }
    }
    return false;
}

function adaptIfElse(currLine, ifElseStr) {
    currLine = currLine.replace('else if (', ifElseStr);
    return currLine;
}

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
export {getGlobalDefs};
export {findDCPs};
export {getDefinitions};
export {substituteData};
export {substituteCode};
export {isFeasible};
export {getUses};
export {getInputVector};
export {calculateBooleanValuse};
