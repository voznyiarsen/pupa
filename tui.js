// terminal-ui.js
const blessed = require('blessed');
const contrib = require('blessed-contrib');

module.exports = createTerminalUI = () => {
  const screen = blessed.screen({
    smartCSR: true,
    title: 'Terminal UI',
    fullUnicode: true,
    dockBorders: true
  });

  const grid = new contrib.grid({ rows: 1, cols: 1, screen: screen });
  
  // Create log box using blessed.log
  const logBox = grid.set(0, 0, 0.75, 1, blessed.log, {
    label: ' Log ',
    tags: true,
    scrollable: true,
    alwaysScroll: true,
    scrollbar: {
      ch: '▓',
      track: { bg: 'grey' },
      style: { bg: 'lightblue' }
    },
    border: { type: 'line', fg: 'blue' },
    style: { 
      fg: 'white',
      border: { fg: '#f0f0f0' }
    }
  });

  // Create input box
  const inputBox = grid.set(0, 0, 0.25, 1, blessed.textbox, {
    bottom: 0,
    height: 3,
    width: '100%',
    label: ' Input ',
    inputOnFocus: true,
    border: { type: 'line', fg: 'green' },
    style: {
      fg: 'yellow',
      bg: 'black',
      focus: { bg: '#333333' },
      border: { fg: '#a0a0a0' }
    }
  });

  // Initial log messages
  logBox.add('{bold}Terminal UI Initialized{/bold}');
  logBox.add('┌─────────────────────────────────────┐');
  logBox.add('│ Type text and press {blue-fg}Enter{/} to submit │');
  logBox.add('│ Press {blue-fg}Esc{/} to clear input            │');
  logBox.add('│ Use {blue-fg}↑/↓{/} keys to scroll logs         │');
  logBox.add('└─────────────────────────────────────┘');

  // Handle input submission
  const inputCallbacks = [];
  inputBox.on('submit', text => {
    const timestamp = new Date().toLocaleTimeString();
    const formatted = `{cyan-fg}[${timestamp}]{/} ${text}`;
    
    // Add to log box
    logBox.add(formatted);
    
    // Notify listeners
    inputCallbacks.forEach(cb => cb(text));
    inputBox.clearValue();
    inputBox.focus();
    screen.render();
  });

  // Handle escape key
  inputBox.key('escape', () => {
    inputBox.clearValue();
    screen.render();
  });

  // Arrow key scrolling for log content
  screen.key(['up', 'down', 'pageup', 'pagedown'], (ch, key) => {
    switch (key.name) {
      case 'up':
        logBox.scroll(-1);
        break;
      case 'down':
        logBox.scroll(1);
        break;
      case 'pageup':
        logBox.scroll(-(logBox.height - 2));
        break;
      case 'pagedown':
        logBox.scroll(logBox.height - 2);
        break;
    }
    screen.render();
  });

  screen.key('enter', () => {
    inputBox.focus();
    screen.render();
  });

  // Quit handling
  screen.key(['C-c', 'escape'], () => process.exit(0));

  // Handle resize
  screen.on('resize', () => {
    logBox.height = Math.max(3, Math.floor(screen.height * 0.75));
    inputBox.height = 3;
    inputBox.top = screen.height - 3;
    screen.render();
  });

  // UI init
  logBox.height = Math.max(3, Math.floor(screen.height * 0.75));
  inputBox.height = 3;
  inputBox.top = screen.height - 3;
  inputBox.focus();
  screen.render();

  // Public API
  return {
    /**
     * Log content to the terminal UI
     * @param {string} content - Text to display (supports blessed tags)
     */
    log: (content) => {
      logBox.log(content);
      screen.render();
    },

    /**
     * Register input handler
     * @param {function} callback - Receives submitted text
     */
    onInput: (callback) => {
      inputCallbacks.push(callback);
    },

    /**
     * Get scrollback history
     * @returns {string[]} Array of logged entries
     */
    getHistory: () => logBox.getText().split('\n'),

    /**
     * Get current scroll position
     * @returns {number} Current scroll index
     */
    getScrollPosition: () => logBox.getScroll(),

    /**
     * Destroy UI and clean up
     */
    destroy: () => {
      screen.destroy();
    }
  };
};