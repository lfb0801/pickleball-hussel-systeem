(function () {
  'use strict';

  // Language choice for the laptop and the phone. Code reads T.key at the
  // moment it draws, so pointing globalThis.T at another locale switches
  // the language everywhere; screens redraw through onChange.

  const STORAGE_KEY = 'hussel.language';
  const LANGUAGES = ['nl', 'en'];
  const DEFAULT = 'nl';
  const NAMES = { nl: 'Nederlands', en: 'English' };
  const DATE_LOCALES = { nl: 'nl-NL', en: 'en-GB' };

  const listeners = [];
  const switchers = [];
  const built = {};

  function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  // Builds a locale over the Dutch one, so a key that is missing in another
  // language shows Dutch rather than "undefined". Nested groups (statuses,
  // reasons, presets) are merged one level deep for the same reason.
  function build(language) {
    if (built[language]) return built[language];
    const locales = globalThis.Locales || {};
    const base = locales[DEFAULT] || {};
    const own = locales[language] || {};
    let result = base;
    if (language !== DEFAULT) {
      result = {};
      for (const key of Object.keys(base)) result[key] = base[key];
      for (const key of Object.keys(own)) {
        if (isPlainObject(own[key]) && isPlainObject(base[key])) {
          result[key] = Object.assign({}, base[key], own[key]);
        } else {
          result[key] = own[key];
        }
      }
    }
    built[language] = result;
    return result;
  }

  function readStored() {
    try {
      if (typeof localStorage === 'undefined') return null;
      return localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      return null;
    }
  }

  function store(language) {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, language);
    } catch (error) { /* private window or blocked storage: the choice just isn't remembered */ }
  }

  function hasDocument() {
    return typeof document !== 'undefined' && Boolean(document.documentElement);
  }

  function setHtmlLang(language) {
    if (hasDocument()) document.documentElement.lang = language;
  }

  function fill(root, selector, attribute, apply) {
    const elements = Array.prototype.slice.call(root.querySelectorAll(selector));
    if (root.matches && root.matches(selector)) elements.unshift(root);
    for (const element of elements) {
      const value = T[element.getAttribute(attribute)];
      if (typeof value === 'string') apply(element, value);
    }
  }

  function apply(root) {
    if (!root && hasDocument()) root = document;
    if (!root || typeof root.querySelectorAll !== 'function') return;
    fill(root, '[data-t]', 'data-t', function (element, value) { element.textContent = value; });
    fill(root, '[data-t-placeholder]', 'data-t-placeholder', function (element, value) { element.placeholder = value; });
    fill(root, '[data-t-title]', 'data-t-title', function (element, value) { element.title = value; });
    fill(root, '[data-t-aria-label]', 'data-t-aria-label', function (element, value) { element.setAttribute('aria-label', value); });
  }

  function syncSwitcher(container) {
    container.setAttribute('aria-label', T.language);
    for (const button of container.querySelectorAll('button[lang]')) {
      button.setAttribute('aria-pressed', button.getAttribute('lang') === I18n.language ? 'true' : 'false');
    }
  }

  function renderSwitcher(container) {
    if (!container) return;
    container.textContent = '';
    container.classList.add('lang-switch');
    container.setAttribute('role', 'group');
    for (const language of LANGUAGES) {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('lang', language);
      button.title = NAMES[language];
      button.textContent = language.toUpperCase();
      button.addEventListener('click', function () { I18n.set(language); });
      container.appendChild(button);
    }
    // Remember the container once, so redrawing it does not pile up work.
    if (switchers.indexOf(container) === -1) switchers.push(container);
    syncSwitcher(container);
  }

  function set(language) {
    if (LANGUAGES.indexOf(language) === -1) return;
    I18n.language = language;
    globalThis.T = build(language);
    store(language);
    setHtmlLang(language);
    if (hasDocument()) apply(document);
    for (const container of switchers) syncSwitcher(container);
    for (const listener of listeners.slice()) listener(language);
  }

  const stored = readStored();
  const initial = LANGUAGES.indexOf(stored) !== -1 ? stored : DEFAULT;

  const I18n = {
    LANGUAGES: LANGUAGES.slice(),
    DEFAULT: DEFAULT,
    language: initial,
    locale: function () { return DATE_LOCALES[I18n.language]; },
    compare: function (a, b) { return String(a).localeCompare(String(b), I18n.language); },
    set: set,
    apply: apply,
    onChange: function (fn) { if (typeof fn === 'function') listeners.push(fn); },
    renderSwitcher: renderSwitcher,
  };

  globalThis.I18n = I18n;
  globalThis.T = build(initial);
  setHtmlLang(initial);
})();
