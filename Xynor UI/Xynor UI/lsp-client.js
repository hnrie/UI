function createrobloxcompletions(monaco) {
  const robloxapi = {
    globals: ['print', 'warn', 'wait', 'spawn', 'delay', 'tick', 'time', 'typeof', 'type', 'tostring', 'tonumber', 'pairs', 'ipairs', 'next', 'pcall', 'xpcall', 'error', 'assert', 'select', 'unpack', 'getmetatable', 'setmetatable', 'rawget', 'rawset', 'rawequal', 'game', 'workspace', 'script'],
    services: ['Players', 'Workspace', 'ReplicatedStorage', 'ServerStorage', 'ServerScriptService', 'StarterGui', 'StarterPack', 'StarterPlayer', 'Lighting', 'SoundService', 'Chat', 'LocalizationService', 'TestService'],
    instancemethods: ['FindFirstChild', 'FindFirstChildOfClass', 'FindFirstChildWhichIsA', 'FindFirstAncestor', 'WaitForChild', 'GetChildren', 'GetDescendants', 'IsA', 'Clone', 'Destroy', 'GetPropertyChangedSignal'],
    instanceprops: ['Name', 'Parent', 'ClassName'],
    task: ['wait', 'spawn', 'defer', 'delay', 'cancel'],
    string: ['byte', 'char', 'find', 'format', 'gmatch', 'gsub', 'len', 'lower', 'match', 'rep', 'reverse', 'sub', 'upper', 'split'],
    table: ['concat', 'insert', 'remove', 'sort', 'find', 'pack', 'unpack', 'move', 'clear'],
    math: ['abs', 'acos', 'asin', 'atan', 'ceil', 'cos', 'deg', 'exp', 'floor', 'fmod', 'log', 'max', 'min', 'modf', 'pi', 'pow', 'rad', 'random', 'randomseed', 'sin', 'sqrt', 'tan', 'clamp', 'sign', 'round']
  };

  return {
    providecompletionitems: function(model, position) {
      const word = model.getWordUntilPosition(position);
      const range = {
        startlinenumber: position.lineNumber,
        endlinenumber: position.lineNumber,
        startcolumn: word.startColumn,
        endcolumn: word.endColumn
      };

      const textbefore = model.getValueInRange({
        startlinenumber: 1,
        startcolumn: 1,
        endlinenumber: position.lineNumber,
        endcolumn: position.column
      });

      const suggestions = [];

      robloxapi.globals.forEach(func => {
        suggestions.push({
          label: func,
          kind: monaco.languages.CompletionItemKind.Function,
          inserttext: func,
          documentation: `Global: ${func}`,
          range: range
        });
      });

      if (textbefore.match(/game:GetService\(["']$/)) {
        robloxapi.services.forEach(service => {
          suggestions.push({
            label: service,
            kind: monaco.languages.CompletionItemKind.Constant,
            inserttext: service,
            documentation: `Service: ${service}`,
            range: range
          });
        });
      }

      if (textbefore.match(/:\s*$/)) {
        robloxapi.instancemethods.forEach(method => {
          suggestions.push({
            label: method,
            kind: monaco.languages.CompletionItemKind.Method,
            inserttext: method + '(${1})',
            inserttextrules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: `Method: ${method}`,
            range: range
          });
        });
      }

      if (textbefore.match(/\.\s*$/)) {
        robloxapi.instanceprops.forEach(prop => {
          suggestions.push({
            label: prop,
            kind: monaco.languages.CompletionItemKind.Property,
            inserttext: prop,
            documentation: `Property: ${prop}`,
            range: range
          });
        });
      }

      if (textbefore.match(/task\.\s*$/)) {
        robloxapi.task.forEach(func => {
          suggestions.push({
            label: func,
            kind: monaco.languages.CompletionItemKind.Function,
            inserttext: func + '(${1})',
            inserttextrules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: `task.${func}`,
            range: range
          });
        });
      }

      if (textbefore.match(/string\.\s*$/)) {
        robloxapi.string.forEach(func => {
          suggestions.push({
            label: func,
            kind: monaco.languages.CompletionItemKind.Function,
            inserttext: func + '(${1})',
            inserttextrules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: `string.${func}`,
            range: range
          });
        });
      }

      if (textbefore.match(/table\.\s*$/)) {
        robloxapi.table.forEach(func => {
          suggestions.push({
            label: func,
            kind: monaco.languages.CompletionItemKind.Function,
            inserttext: func + '(${1})',
            inserttextrules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: `table.${func}`,
            range: range
          });
        });
      }

      if (textbefore.match(/math\.\s*$/)) {
        robloxapi.math.forEach(func => {
          suggestions.push({
            label: func,
            kind: monaco.languages.CompletionItemKind.Function,
            inserttext: func + '(${1})',
            inserttextrules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: `math.${func}`,
            range: range
          });
        });
      }

      ['function', 'local', 'if', 'then', 'else', 'elseif', 'end', 'for', 'while', 'repeat', 'until', 'do', 'return', 'break', 'continue', 'and', 'or', 'not', 'in'].forEach(keyword => {
        suggestions.push({
          label: keyword,
          kind: monaco.languages.CompletionItemKind.Keyword,
          inserttext: keyword,
          documentation: `Keyword: ${keyword}`,
          range: range
        });
      });

      return { suggestions: suggestions };
    }
  };
}
