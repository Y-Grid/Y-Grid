/* global window */
import en from './en';

declare global {
  interface Window {
    yGrid?: {
      $messages?: Record<string, LocaleMessages>;
    };
  }
}

export interface LocaleMessages {
  toolbar?: {
    undo?: string;
    redo?: string;
    print?: string;
    paintformat?: string;
    clearformat?: string;
    format?: string;
    fontName?: string;
    font?: string;
    fontSize?: string;
    fontBold?: string;
    fontItalic?: string;
    underline?: string;
    strike?: string;
    color?: string;
    bgcolor?: string;
    textColor?: string;
    fillColor?: string;
    border?: string;
    merge?: string;
    align?: string;
    valign?: string;
    textwrap?: string;
    freeze?: string;
    autofilter?: string;
    formula?: string;
    more?: string;
  };
  contextmenu?: {
    copy?: string;
    cut?: string;
    paste?: string;
    pasteValue?: string;
    pasteFormat?: string;
    hide?: string;
    insertRow?: string;
    insertColumn?: string;
    deleteSheet?: string;
    deleteRow?: string;
    deleteColumn?: string;
    deleteCell?: string;
    deleteCellText?: string;
    validation?: string;
    cellprintable?: string;
    cellnonprintable?: string;
    celleditable?: string;
    cellnoneditable?: string;
  };
  print?: {
    size?: string;
    orientation?: string;
    orientations?: string[];
  };
  format?: {
    normal?: string;
    text?: string;
    number?: string;
    percent?: string;
    rmb?: string;
    usd?: string;
    eur?: string;
    date?: string;
    time?: string;
    datetime?: string;
    duration?: string;
  };
  formula?: {
    sum?: string;
    average?: string;
    max?: string;
    min?: string;
    _if?: string;
    and?: string;
    or?: string;
    concat?: string;
  };
  validation?: {
    required?: string;
    notMatch?: string;
    between?: string;
    notBetween?: string;
    notIn?: string;
    equal?: string;
    notEqual?: string;
    lessThan?: string;
    lessThanEqual?: string;
    greaterThan?: string;
    greaterThanEqual?: string;
  };
  error?: {
    pasteForMergedCell?: string;
  };
  calendar?: {
    weeks?: string[];
    months?: string[];
  };
  button?: {
    next?: string;
    cancel?: string;
    remove?: string;
    save?: string;
    ok?: string;
  };
  sort?: {
    desc?: string;
    asc?: string;
  };
  filter?: {
    empty?: string;
  };
  dataValidation?: {
    mode?: string;
    range?: string;
    criteria?: string;
    modeType?: {
      cell?: string;
      column?: string;
      row?: string;
    };
    type?: {
      list?: string;
      number?: string;
      date?: string;
      phone?: string;
      email?: string;
    };
    operator?: {
      be?: string;
      nbe?: string;
      lt?: string;
      lte?: string;
      gt?: string;
      gte?: string;
      eq?: string;
      neq?: string;
    };
  };
  [key: string]: unknown;
}

// Defines the fallback language as English
let $languages: string[] = ['en'];
const $messages: Record<string, LocaleMessages> = {
  en,
};

function translate<T = string>(
  key: string,
  messages: Record<string, LocaleMessages>
): T | undefined {
  if (messages) {
    // Return the translation from the first language in the languages array
    // that has a value for the provided key.
    for (const lang of $languages) {
      if (!messages[lang]) break;

      let message: Record<string, unknown> = messages[lang] as Record<string, unknown>;

      // Splits the key at '.' except where escaped as '\.'
      const keys = key.match(/(?:\\.|[^.])+/g);
      if (!keys) break;

      for (let i = 0; i < keys.length; i += 1) {
        const property = keys[i];
        const value = message[property];

        // If value doesn't exist, try next language
        if (!value) break;

        if (i === keys.length - 1) return value as T;

        // Move down to the next level of the messages object
        message = value as Record<string, unknown>;
      }
    }
  }

  return undefined;
}

// Function overloads for type inference
// returnType: 1 = string (default), 2 = string[]
function t(key: string, returnType: 2): string[];
function t(key: string, returnType?: 1): string;
function t(key: string, returnType: 1 | 2 = 1): string | string[] {
  if (returnType === 2) {
    let v = translate<string[]>(key, $messages);
    if (!v && typeof window !== 'undefined' && window.yGrid?.$messages) {
      v = translate<string[]>(key, window.yGrid.$messages);
    }
    return v || [];
  }
  let v = translate<string>(key, $messages);
  if (!v && typeof window !== 'undefined' && window.yGrid?.$messages) {
    v = translate<string>(key, window.yGrid.$messages);
  }
  return v || '';
}

function tf(key: string): () => string {
  return () => t(key);
}

// If clearLangList is set to false, lang will be added to the front of the
// languages array. The languages in the language array are searched in order
// to find a translation. This allows the use of other languages as a fallback
// if lang is missing some keys. The language array is preloaded with English.
// To set the languages array to only include lang, set clearLangList to true.
function locale(lang: string, message?: LocaleMessages, clearLangList = false): void {
  if (clearLangList) {
    $languages = [lang];
  } else {
    // Append to front of array.
    // Translation method will use the first language in the list that has a
    // matching key.
    $languages.unshift(lang);
  }

  if (message) {
    $messages[lang] = message;
  }
}

export default {
  t,
};

export { locale, t, tf };
