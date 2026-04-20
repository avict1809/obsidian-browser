const { ipcRenderer } = require('electron');

window.addEventListener('DOMContentLoaded', () => {
  const handleMouseOver = (e) => {
    let target = e.target;
    while (target && target.tagName !== 'A') {
      target = target.parentElement;
    }
    if (target && target.tagName === 'A') {
      const href = target.href;
      if (href) {
        ipcRenderer.sendToHost('hover-link', href);
      }
    }
  };

  const handleMouseOut = (e) => {
    let target = e.target;
    while (target && target.tagName !== 'A') {
      target = target.parentElement;
    }
    if (target && target.tagName === 'A') {
      ipcRenderer.sendToHost('hover-link', null);
    }
  };

  window.addEventListener('mouseover', handleMouseOver);
  window.addEventListener('mouseout', handleMouseOut);
});
