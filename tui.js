const blessed = require('blessed');
const contrib = require('blessed-contrib');

let uiInstance = null;

const createTerminalUI = () => {
  if (uiInstance) return uiInstance;

  const screen = blessed.screen({
    smartCSR: true,
    title: 'Terminal UI',
    fullUnicode: true,
    dockBorders: true
  });

  const grid = new contrib.grid({ rows: 1, cols: 1, screen });
  const logBox = grid.set(0, 0, 0.75, 1, blessed.log, {
    label: ' Log ',
    tags: true,
    scrollable: true,
    alwaysScroll: true,
    scrollbar: { ch: '▓', track: { bg: 'grey' }, style: { bg: 'lightblue' } },
    border: { type: 'line', fg: 'blue' },
    style: { fg: 'white', border: { fg: '#f0f0f0' } }
  });

  const inputBox = grid.set(0, 0, 0.25, 1, blessed.textbox, {
    bottom: 0,
    height: 3,
    width: '100%',
    label: ' Input ',
    inputOnFocus: true,
    border: { type: 'line', fg: 'green' },
    style: { fg: 'yellow', bg: 'black', focus: { bg: '#333333' }, border: { fg: '#a0a0a0' } }
  });

  logBox.add('{bold}Terminal UI Initialized{/bold}');
  logBox.add('┌─────────────────────────────────────┐');
  logBox.add('│ Type text and press {blue-fg}Enter{/} to submit │');
  logBox.add('│ Press {blue-fg}Esc{/} to clear input            │');
  logBox.add('│ Use {blue-fg}↑/↓{/} keys to scroll logs         │');
  logBox.add('└─────────────────────────────────────┘');

  const inputCallbacks = [];
  inputBox.on('submit', text => {
    const timestamp = new Date().toISOString().substring(11, 19);
    logBox.add(`{cyan-fg}[${timestamp}]{/} ${text}`);
    inputCallbacks.forEach(cb => cb(text));
    inputBox.clearValue();
    inputBox.focus();
    screen.render();
  });

  inputBox.key('escape', () => {
    inputBox.clearValue();
    screen.render();
  });

  screen.key(['up', 'down', 'pageup', 'pagedown'], (_, key) => {
    const h = logBox.height - 2;
    switch (key.name) {
      case 'up': logBox.scroll(-1); break;
      case 'down': logBox.scroll(1); break;
      case 'pageup': logBox.scroll(-h); break;
      case 'pagedown': logBox.scroll(h); break;
    }
    screen.render();
  });

  screen.key('enter', () => {
    inputBox.focus();
    screen.render();
  });

  screen.key(['C-c', 'escape'], () => process.exit(0));

  const resize = () => {
    logBox.height = Math.max(3, Math.floor(screen.height * 0.75));
    inputBox.height = 3;
    inputBox.top = screen.height - 3;
    screen.render();
  };
  screen.on('resize', resize);
  resize();

  inputBox.focus();
  screen.render();

  return uiInstance = {
    log(...args) {
      const content = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      const timestamp = new Date().toISOString().substring(11, 19)
      logBox.log(`{cyan-fg}[${timestamp}]{/} ${content}`);
      screen.render();
    },
    onInput(cb) {
      inputCallbacks.push(cb);
    },
    getHistory() {
      return logBox.getText().split('\n');
    },
    getScrollPosition() {
      return logBox.getScroll();
    },
    destroy() {
      screen.destroy();
      uiInstance = null;
    }
  };
};

module.exports = createTerminalUI;