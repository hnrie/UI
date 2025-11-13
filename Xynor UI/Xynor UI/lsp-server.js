const { WebSocketServer } = require('ws');
const { spawn } = require('child_process');
const path = require('path');

const port = 8080;
const wss = new WebSocketServer({ port });

wss.on('connection', (ws) => {
  const lspprocess = spawn(path.join(__dirname, 'server', 'luau-lsp.exe'), ['lsp', '--docs=./server/en-us.json', '--definitions=./server/globalTypes.d.lua', '--base-luaurc=./server/.luaurc']);

  lspprocess.stdout.on('data', (data) => {
    const message = data.toString();
    const contentlength = message.match(/Content-Length: (\d+)/);
    if (contentlength) {
      const length = parseInt(contentlength[1]);
      const jsonstart = message.indexOf('\r\n\r\n') + 4;
      const jsondata = message.substring(jsonstart, jsonstart + length);
      try {
        ws.send(jsondata);
      } catch (e) {}
    }
  });

  ws.on('message', (message) => {
    const msg = message.toString();
    const contentlength = `Content-Length: ${msg.length}\r\n\r\n`;
    lspprocess.stdin.write(contentlength + msg);
  });

  ws.on('close', () => {
    lspprocess.kill();
  });

  lspprocess.on('exit', () => {
    ws.close();
  });
});
