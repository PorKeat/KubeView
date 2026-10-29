"use client";

import * as React from "react";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import { yaml } from "@codemirror/lang-yaml";
import {
  bracketMatching,
  foldGutter,
  foldKeymap,
  HighlightStyle,
  indentOnInput,
  syntaxHighlighting,
} from "@codemirror/language";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import { Compartment, EditorState } from "@codemirror/state";
import {
  crosshairCursor,
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  rectangularSelection,
} from "@codemirror/view";
import { tags } from "@lezer/highlight";
import { cn } from "@/lib/utils";

const yamlHighlightStyle = HighlightStyle.define([
  {
    tag: [tags.propertyName, tags.definition(tags.propertyName)],
    color: "var(--yaml-key)",
    fontWeight: "500",
  },
  { tag: tags.string, color: "var(--yaml-string)" },
  { tag: tags.number, color: "var(--yaml-number)" },
  { tag: tags.bool, color: "var(--yaml-bool)" },
  { tag: tags.null, color: "var(--yaml-null)", fontStyle: "italic" },
  { tag: tags.comment, color: "var(--yaml-comment)", fontStyle: "italic" },
  { tag: tags.meta, color: "var(--yaml-meta)" },
  { tag: tags.punctuation, color: "var(--yaml-punctuation)" },
  { tag: tags.invalid, color: "var(--status-critical)" },
]);

const editorTheme = EditorView.theme({
  "&": {
    height: "100%",
    backgroundColor: "var(--editor-bg)",
    color: "var(--editor-fg)",
    fontFamily: "var(--font-mono)",
  },
  ".cm-scroller": {
    overflow: "auto",
    fontFamily: "var(--font-mono)",
    fontSize: "11.5px",
    lineHeight: "1.7",
  },
  ".cm-content": {
    minHeight: "100%",
    padding: "12px 0",
    caretColor: "var(--accent)",
    userSelect: "text",
  },
  ".cm-line": {
    padding: "0 16px 0 10px",
  },
  ".cm-gutters": {
    backgroundColor: "var(--editor-gutter-bg)",
    color: "var(--editor-muted)",
    borderRight: "1px solid var(--editor-border)",
    userSelect: "none",
  },
  ".cm-gutterElement": {
    padding: "0 8px 0 10px",
  },
  ".cm-activeLine": {
    backgroundColor: "var(--editor-active-line)",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "var(--editor-active-line)",
    color: "var(--editor-fg)",
  },
  "&.cm-focused": {
    outline: "none",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
    {
      backgroundColor: "var(--editor-selection) !important",
    },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "var(--accent)",
  },
  ".cm-foldPlaceholder": {
    backgroundColor: "var(--surface-active)",
    color: "var(--muted)",
    border: "none",
    borderRadius: "3px",
    padding: "0 4px",
  },
  ".cm-panels": {
    backgroundColor: "var(--surface)",
    color: "var(--foreground)",
    borderColor: "var(--border)",
  },
  ".cm-panel.cm-search": {
    padding: "8px 10px",
    fontSize: "11px",
  },
  ".cm-panel.cm-search .cm-textfield": {
    backgroundColor: "var(--editor-bg)",
    border: "1px solid var(--border)",
    borderRadius: "4px",
    color: "var(--foreground)",
    padding: "3px 6px",
    outline: "none",
  },
  ".cm-panel.cm-search .cm-button": {
    backgroundColor: "var(--surface-hover)",
    backgroundImage: "none",
    border: "1px solid var(--border)",
    borderRadius: "4px",
    color: "var(--foreground)",
    padding: "3px 7px",
    fontSize: "10px",
  },
  ".cm-panel.cm-search label": {
    color: "var(--muted)",
    fontSize: "10px",
  },
  ".cm-tooltip": {
    backgroundColor: "var(--surface-elevated)",
    border: "1px solid var(--border)",
    color: "var(--foreground)",
  },
  ".cm-selectionMatch": {
    backgroundColor: "var(--editor-selection)",
  },
  ".cm-matchingBracket, .cm-nonmatchingBracket": {
    backgroundColor: "var(--editor-active-line)",
    outline: "1px solid var(--accent)",
  },
});

export interface YamlEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  ariaLabel: string;
  testId?: string;
  className?: string;
  readOnly?: boolean;
}

export function YamlEditor({
  value,
  onChange,
  onSubmit,
  ariaLabel,
  testId,
  className,
  readOnly = false,
}: YamlEditorProps) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const viewRef = React.useRef<EditorView | null>(null);
  const valueRef = React.useRef(value);
  const onChangeRef = React.useRef(onChange);
  const onSubmitRef = React.useRef(onSubmit);
  const ariaLabelRef = React.useRef(ariaLabel);
  const testIdRef = React.useRef(testId);
  const initialReadOnlyRef = React.useRef(readOnly);
  const syncingExternalValueRef = React.useRef(false);
  const readOnlyCompartment = React.useRef(new Compartment()).current;

  valueRef.current = value;
  onChangeRef.current = onChange;
  onSubmitRef.current = onSubmit;
  ariaLabelRef.current = ariaLabel;
  testIdRef.current = testId;

  React.useEffect(() => {
    const parent = hostRef.current;
    if (!parent) return;

    const contentAttributes: Record<string, string> = {
      "aria-label": ariaLabelRef.current,
      "aria-multiline": "true",
      spellcheck: "false",
      autocapitalize: "off",
      autocomplete: "off",
    };
    if (testIdRef.current) {
      contentAttributes["data-testid"] = testIdRef.current;
    }

    const state = EditorState.create({
      doc: valueRef.current,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        foldGutter(),
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        syntaxHighlighting(yamlHighlightStyle),
        bracketMatching(),
        rectangularSelection(),
        crosshairCursor(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        yaml(),
        editorTheme,
        readOnlyCompartment.of([
          EditorState.readOnly.of(initialReadOnlyRef.current),
          EditorView.editable.of(!initialReadOnlyRef.current),
        ]),
        EditorView.contentAttributes.of(contentAttributes),
        keymap.of([
          {
            key: "Mod-Enter",
            preventDefault: true,
            run: () => {
              onSubmitRef.current?.();
              return true;
            },
          },
          ...defaultKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...searchKeymap,
          indentWithTab,
        ]),
        EditorView.updateListener.of((update) => {
          if (!update.docChanged || syncingExternalValueRef.current) return;
          onChangeRef.current(update.state.doc.toString());
        }),
      ],
    });

    const view = new EditorView({ state, parent });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [readOnlyCompartment]);

  React.useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentValue = view.state.doc.toString();
    if (currentValue === value) return;

    syncingExternalValueRef.current = true;
    view.dispatch({
      changes: {
        from: 0,
        to: currentValue.length,
        insert: value,
      },
    });
    syncingExternalValueRef.current = false;
  }, [value]);

  React.useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: readOnlyCompartment.reconfigure([
        EditorState.readOnly.of(readOnly),
        EditorView.editable.of(!readOnly),
      ]),
    });
  }, [readOnly, readOnlyCompartment]);

  React.useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.contentDOM.setAttribute("aria-label", ariaLabel);
  }, [ariaLabel]);

  return (
    <div
      data-yaml-editor="true"
      className={cn(
        "relative flex min-h-0 flex-1 overflow-hidden rounded-lg border border-[var(--editor-border)] bg-[var(--editor-bg)]",
        "transition-[border-color,box-shadow] duration-150 focus-within:border-[var(--accent)]/60 focus-within:ring-1 focus-within:ring-[var(--accent)]/15",
        className,
      )}
    >
      <div ref={hostRef} className="min-h-0 min-w-0 flex-1" />
    </div>
  );
}
