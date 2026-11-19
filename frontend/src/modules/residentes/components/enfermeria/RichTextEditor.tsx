import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { renderRichText, sanitizeRichHtml } from "../../utils/richText";
import { Bold, Italic, Underline, ListEnd } from "lucide-react";

type RichTextEditorProps = {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
};

const RichTextEditor = ({ value, onChange, placeholder }: RichTextEditorProps) => {
    const editorRef = useRef<HTMLDivElement | null>(null);
    const lastSyncedValueRef = useRef<string>(value);

    useEffect(() => {
        const editor = editorRef.current;

        if (!editor) return;

        if (document.activeElement === editor) {
            lastSyncedValueRef.current = value;
            return;
        }

        if (lastSyncedValueRef.current === value && editor.innerHTML) {
            return;
        }

        const nextHtml = renderRichText(value);

        if (editor.innerHTML !== nextHtml) {
            editor.innerHTML = nextHtml;
        }

        lastSyncedValueRef.current = value;
    }, [value]);

    const emitChange = () => {
        const editor = editorRef.current;

        if (!editor) return;

        const nextValue = sanitizeRichHtml(editor.innerHTML);
        lastSyncedValueRef.current = nextValue;
        onChange(nextValue);
    };

    const applyCommand = (command: "bold" | "italic" | "underline" | "lineBreak") => {
        const editor = editorRef.current;

        if (!editor) return;

        editor.focus();

        if (command === "lineBreak") {
            document.execCommand("insertLineBreak");
        } else {
            document.execCommand(command);
        }

        emitChange();
    };

    return (
        <div className="rounded-2xl border border-border/60 bg-background shadow-sm">
            <div className="flex flex-wrap justify-center gap-2 border-b border-border/60 bg-muted/30 px-3 py-2">
                <Button type="button" variant="outline" size="sm" onMouseDown={(event) => event.preventDefault()} onClick={() => applyCommand("bold")}>
                    <Bold />
                </Button>
                <Button type="button" variant="outline" size="sm" onMouseDown={(event) => event.preventDefault()} onClick={() => applyCommand("italic")}>
                    <Italic />
                </Button>
                <Button type="button" variant="outline" size="sm" onMouseDown={(event) => event.preventDefault()} onClick={() => applyCommand("underline")}>
                    <Underline />
                </Button>
                <Button type="button" variant="outline" size="sm" onMouseDown={(event) => event.preventDefault()} onClick={() => applyCommand("lineBreak")}>
                    <ListEnd />
                </Button>
            </div>

            <div
                ref={editorRef}
                role="textbox"
                aria-multiline="true"
                contentEditable
                suppressContentEditableWarning
                data-placeholder={placeholder ?? "Escribe aquí la nota..."}
                onInput={emitChange}
                onPaste={(event) => {
                    event.preventDefault();
                    const text = event.clipboardData.getData("text/plain");
                    document.execCommand("insertText", false, text);
                    emitChange();
                }}
                onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        document.execCommand("insertLineBreak");
                        emitChange();
                    }
                }}
                className="min-h-[180px] w-full rounded-b-2xl px-4 py-3 text-sm leading-relaxed outline-none transition-colors placeholder:text-muted-foreground focus:bg-background"
            />
            <style>{`
        [contenteditable="true"]:empty::before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground));
          pointer-events: none;
        }
      `}</style>
        </div>
    );
};

export default RichTextEditor;