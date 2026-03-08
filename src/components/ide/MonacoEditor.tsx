"use client";

import { useRef, useCallback } from "react";
import Editor, { type OnMount, type OnChange } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import { registerLanguages } from "@/lib/languages/register";
import { useIDEStore, getLanguageFromFilename } from "@/stores/ideStore";

export function MonacoEditor() {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);

  const activeTabId = useIDEStore((s) => s.activeTabId);
  const openTabs = useIDEStore((s) => s.openTabs);
  const fileContents = useIDEStore((s) => s.fileContents);
  const setFileContent = useIDEStore((s) => s.setFileContent);
  const setCursorPosition = useIDEStore((s) => s.setCursorPosition);
  const setEditorRef = useIDEStore((s) => s.setEditorRef);

  const activeTab = openTabs.find((t) => t.id === activeTabId);
  const language = activeTab ? getLanguageFromFilename(activeTab.title) : "plaintext";
  const content = activeTabId ? fileContents[activeTabId] ?? "" : "";

  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    setEditorRef(editor);

    registerLanguages(monaco);

    // Define dark theme matching CSS variables
    monaco.editor.defineTheme("qsim-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "6A9955" },
        { token: "keyword", foreground: "569CD6" },
        { token: "type.identifier", foreground: "4EC9B0" },
        { token: "string", foreground: "CE9178" },
        { token: "number", foreground: "B5CEA8" },
        { token: "number.float", foreground: "B5CEA8" },
        { token: "type", foreground: "4EC9B0" },
        { token: "identifier", foreground: "9CDCFE" },
        { token: "operator", foreground: "D4D4D4" },
        { token: "delimiter", foreground: "D4D4D4" },
      ],
      colors: {
        "editor.background": "#1e1e2e",
        "editor.foreground": "#d4d4d4",
        "editorCursor.foreground": "#ffffff",
        "editor.lineHighlightBackground": "#ffffff08",
        "editor.selectionBackground": "#264f78",
        "editorLineNumber.foreground": "#858585",
        "editorLineNumber.activeForeground": "#c6c6c6",
      },
    });
    monaco.editor.setTheme("qsim-dark");

    // Track cursor position
    editor.onDidChangeCursorPosition((e) => {
      setCursorPosition({
        lineNumber: e.position.lineNumber,
        column: e.position.column,
      });
    });

    editor.focus();
  }, [setCursorPosition, setEditorRef]);

  const handleChange: OnChange = useCallback(
    (value) => {
      if (activeTabId && value !== undefined) {
        setFileContent(activeTabId, value);
      }
    },
    [activeTabId, setFileContent]
  );

  if (!activeTabId) return null;

  return (
    <Editor
      key={activeTabId}
      defaultValue={content}
      language={language}
      theme="qsim-dark"
      onMount={handleMount}
      onChange={handleChange}
      options={{
        fontSize: 13,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, monospace",
        minimap: { enabled: true, scale: 1 },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 4,
        wordWrap: "off",
        lineNumbers: "on",
        renderLineHighlight: "line",
        cursorBlinking: "smooth",
        cursorSmoothCaretAnimation: "on",
        smoothScrolling: true,
        padding: { top: 8 },
        bracketPairColorization: { enabled: true },
      }}
    />
  );
}
