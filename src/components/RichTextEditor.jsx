import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { List, Bold, Type, X, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

const BULLET_STYLES = {
  dot: '•',
  dash: '–',
  number: 'number'
};

const RichTextEditor = ({ value, onChange, placeholder, className, isDarkMode }) => {
  const [isBulletActive, setBulletActive] = useState(false);
  const [bulletStyle, setBulletStyle] = useState('dot');
  const [bulletCounter, setBulletCounter] = useState(1);
  const editorRef = useRef(null);

  // Sync external value with contentEditable
  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  // Handle focus management
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const handleFocus = () => {
      if (editor.innerHTML === '') {
        editor.innerHTML = isBulletActive ? '<div>• &nbsp;</div>' : '';
      }
    };

    editor.addEventListener('focus', handleFocus);
    return () => editor.removeEventListener('focus', handleFocus);
  }, [isBulletActive]);

  const getBulletPrefix = () => {
    if (bulletStyle === 'number') {
      const count = bulletCounter;
      setBulletCounter(prev => prev + 1);
      return `${count}. `;
    }
    return `${BULLET_STYLES[bulletStyle]} `;
  };

  const insertBulletPoint = () => {
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    const newLine = document.createElement('div');
    newLine.innerHTML = `${getBulletPrefix()}&nbsp;`;
    range.insertNode(newLine);
    range.setStartAfter(newLine);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    editorRef.current.normalize(); // Normalize the DOM
  };

  const handleBulletClick = () => {
    setBulletActive(!isBulletActive);
    if (editorRef.current) {
      editorRef.current.focus();
      if (!isBulletActive && editorRef.current.innerHTML.trim() === '') {
        insertBulletPoint();
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      if (isBulletActive) {
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        const currentLine = range.startContainer.parentElement;
        
        // Check if current line is empty (except for bullet point)
        if (currentLine.textContent.trim() === '•') {
          // Remove bullet point and exit bullet mode if line is empty
          setBulletActive(false);
          currentLine.remove();
          const newLine = document.createElement('div');
          newLine.innerHTML = '<br>';
          range.insertNode(newLine);
        } else {
          insertBulletPoint();
        }
      } else {
        // Normal line break
        document.execCommand('insertLineBreak', false, null);
      }
    } else if (e.key === 'Backspace') {
      const selection = window.getSelection();
      const range = selection.getRangeAt(0);
      const currentLine = range.startContainer.parentElement;
      
      // If at start of line and line has bullet point
      if (range.startOffset === 0 && currentLine.textContent.startsWith('•')) {
        e.preventDefault();
        currentLine.textContent = currentLine.textContent.substring(2);
      }
    }
  };

  const handleBoldClick = () => {
    document.execCommand('bold', false, null);
    editorRef.current?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    const lines = text.split('\n');
    
    const fragment = document.createDocumentFragment();
    lines.forEach((line, index) => {
      const div = document.createElement('div');
      if (isBulletActive && line.trim()) {
        if (bulletStyle === 'number') {
          div.textContent = `${bulletCounter + index}. ${line}`;
        } else {
          div.textContent = `${BULLET_STYLES[bulletStyle]} ${line}`;
        }
      } else {
        div.textContent = line;
      }
      fragment.appendChild(div);
    });

    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(fragment);
    
    // Update bullet counter if using numbers
    if (isBulletActive && bulletStyle === 'number') {
      setBulletCounter(prev => prev + lines.filter(line => line.trim()).length);
    }
    
    // Move cursor to end
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const handleInput = () => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      onChange(content === '<br>' ? '' : content);
    }
  };

  const clearFormat = () => {
    if (editorRef.current) {
      const text = editorRef.current.innerText;
      editorRef.current.innerHTML = text;
      setBulletActive(false);
      onChange(text);
      editorRef.current.focus();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1 p-1 rounded-md bg-gray-50 dark:bg-slate-800">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 px-2 flex items-center gap-1",
                isBulletActive && "bg-gray-200 dark:bg-slate-700",
                isDarkMode ? "hover:bg-slate-700" : "hover:bg-gray-200"
              )}
              title="Toggle bullet points"
            >
              <List className="h-4 w-4" />
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => { setBulletStyle('dot'); handleBulletClick(); }}>
              • Bullet Point
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setBulletStyle('dash'); handleBulletClick(); }}>
              – Dash
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setBulletStyle('number'); handleBulletClick(); }}>
              1. Numbering
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleBoldClick}
          className={cn(
            "h-8 w-8 p-0",
            isDarkMode ? "hover:bg-slate-700" : "hover:bg-gray-200"
          )}
          title="Toggle bold text"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <div className="flex-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clearFormat}
          className={cn(
            "h-8 w-8 p-0",
            isDarkMode ? "hover:bg-slate-700 hover:text-red-400" : "hover:bg-gray-200 hover:text-red-500"
          )}
          title="Clear formatting"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        placeholder={placeholder}
        className={cn(
          "min-h-[140px] rounded-lg border p-3 focus:outline-none focus:ring-2 focus:ring-offset-2",
          isDarkMode 
            ? "bg-slate-900 border-slate-700 focus:ring-slate-700 focus:ring-offset-slate-900" 
            : "bg-white border-gray-200 focus:ring-gray-200 focus:ring-offset-white",
          "text-base",
          "[&:empty]:before:content-[attr(placeholder)] [&:empty]:before:text-gray-400",
          "[&>div]:min-h-[1.5em]", // Ensure consistent line height
          className
        )}
      />
    </div>
  );
};

export default RichTextEditor;