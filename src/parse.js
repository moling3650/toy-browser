var currentToken = null; // 当前Token
var canEmit = false;  // 能否提交当前Token

// 状态函数
function dataState (char) { // 当前状态
  if (char === '<') {
    // 满足特定条件后，状态转移
    return tagOpenState;
  } else {
    // 执行状态动作
    currentToken = { type: 'character', data: char };
    canEmit = true;
    return dataState;
  }
}

function tagOpenState (char) {
  if (char === '/') {
    return endTagOpenState;
  } else if (/^[a-zA-Z]$/.test(char)) {
    currentToken = { type: 'start tag', tagName: '', attributes: [] };
    return tagNameState(char);
  } else {
    throw Error('parse error: invalid-first-character-of-tag-name');
  }
}

function endTagOpenState (char) {
  if (/^[a-zA-Z]$/.test(char)) {
    currentToken = { type: 'end tag', tagName: '', attributes: [] };
    return tagNameState(char);
  } else {
    throw Error('parse error: invalid-first-character-of-tag-name');
  }
}

function tagNameState (char) {
  if (/^[\t\n\f ]$/.test(char)) {
    return beforeAttributeNameState;
  } else if (char === '>') {
    canEmit = true;
    return dataState;
  } else {
    currentToken.tagName += char.toLowerCase();
    return tagNameState;
  }
}

function beforeAttributeNameState(char) {
  if (/^[\t\n\f ]$/.test(char)) {
    return beforeAttributeNameState;
  } else if (char === '>') {
    return afterAttributeNameState(char);
  } else {
    currentAttribte = { name: '', value: '' }
    currentToken.attributes.push(currentAttribte)
    return attributeNameState(char);
  }
}

function attributeNameState(char) {
  if (char === '=') {
    currentToken.attributes[currentAttribte.name] = currentAttribte;
    return beforeAttributeValueState;
  } else {
    currentAttribte.name += char;
    return attributeNameState;
  }
}

function afterAttributeNameState(char) {
  if (char === '>') {
    canEmit = true;
    return dataState;
  } else {
    currentAttribte = { name: '', value: '' }
    currentToken.attributes.push(currentAttribte)
    return attributeNameState(char);
  }
}

function beforeAttributeValueState(char) {
  if (char === '"') {
    return attributeValueDoubleQuotedState;
  } else {
    return attributeValueUnquotedState(char);
  }
}

function attributeValueDoubleQuotedState(char) {
  if (char === '"') {
    return afterAttributeValueQuotedState;
  } else {
    currentAttribte.value += char;
    return attributeValueDoubleQuotedState;
  }
}

function afterAttributeValueQuotedState(char) {
  if (/^[\t\n\f ]$/.test(char)) {
    return beforeAttributeNameState;
  } else if (char === '>') {
    canEmit = true;
    return dataState;
  } else {
    throw Error('parse error: missing-whitespace-between-attributes');
  }
}

function attributeValueUnquotedState(char) {
  if (/^[\t\n\f ]$/.test(char)) {
    return beforeAttributeNameState;
  } else if (char === '>') {
    canEmit = true;
    return dataState;
  } else {
    currentAttribte.value += char;
    return attributeValueUnquotedState;
  }
}

// 词法分析
function tokenization (html) {
  var state = dataState;
  var tokens = [];
  for (const char of html) {    
    state = state(char);
    if (canEmit) {
      tokens.push(currentToken);
      canEmit = false;
    }
  }
  return tokens;
}

// 语法分析
function parse(tokens) {
  var stack = [{ nodeName: 'document', childNodes: [] }]; // 默认添加文档根元素
  let textNode = null;
  for (const token of tokens) {
    var topElemnt = stack[stack.length - 1]; // 栈顶是当前打开的元素
    if (token.type === 'character') {
      if (!textNode) { 
        // 创建文本节点
        textNode = { nodeName: '#text', nodeValue: '' };
        topElemnt.childNodes.push(textNode); // 建立父子节点关系
      }
      textNode.nodeValue += token.data;
    } else {
      textNode = null;
    }
    if (token.type === 'start tag') {
      // 创建元素节点
      var elementNode = { nodeName: token.tagName, attributes: token.attributes, childNodes: [] }
      topElemnt.childNodes.push(elementNode); // 建立父子节点关系
      stack.push(elementNode); // 把新打开的元素入栈。成为当前打开元素
    } else if (token.type === 'end tag') {
      stack.pop(); // 把当前关闭的元素弹出栈，父级元素成为当前打开元素
    }
  }
  return stack[0];
}

var html = '<p id="p1" class="text t-2">hello <span class="word">world</span></p>';
var tokens = tokenization(html);
var dom = parse(tokens);

console.log(JSON.stringify(dom, null, 2));
