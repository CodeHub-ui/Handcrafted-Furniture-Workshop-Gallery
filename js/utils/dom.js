export function h(tag, attributes = {}, ...children) {
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) {
    if (value === null || value === undefined || value === false) continue;
    if (name === 'class') element.className = value;
    else if (name === 'text') element.textContent = value;
    else if (name.startsWith('on') && typeof value === 'function') element.addEventListener(name.slice(2), value);
    else element.setAttribute(name, value === true ? '' : value);
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    element.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return element;
}

export function clearChildren(node) {
  node.replaceChildren();
}
export function populateSelect(select, options, placeholder) {
  clearChildren(select);
  if (placeholder !== undefined) select.append(h('option', { value: '', text: placeholder }));
  for (const option of options) {
    const { value, label } = typeof option === 'string' ? { value: option, label: option } : option;
    select.append(h('option', { value, text: label }));
  }
}
