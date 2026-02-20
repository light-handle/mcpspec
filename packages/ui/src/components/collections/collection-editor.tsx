import { useState } from 'react';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-yaml';
import { Button } from '@/components/ui/button';

interface CollectionEditorProps {
  value: string;
  onChange: (value: string) => void;
  onValidate?: () => void;
  onSave?: () => void;
  onRun?: () => void;
  validating?: boolean;
  saving?: boolean;
}

export function CollectionEditor({ value, onChange, onValidate, onSave, onRun, validating, saving }: CollectionEditorProps) {
  return (
    <div className="space-y-2">
      <div className="rounded-md border bg-background">
        <Editor
          value={value}
          onValueChange={onChange}
          highlight={(code) => Prism.highlight(code, Prism.languages['yaml']!, 'yaml')}
          padding={16}
          style={{
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
            fontSize: 13,
            minHeight: 300,
          }}
        />
      </div>
      <div className="flex gap-2">
        {onValidate && (
          <Button size="sm" variant="outline" onClick={onValidate} disabled={validating}>
            {validating ? 'Validating...' : 'Validate'}
          </Button>
        )}
        {onSave && (
          <Button size="sm" onClick={onSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        )}
        {onRun && (
          <Button size="sm" variant="secondary" onClick={onRun}>
            Run
          </Button>
        )}
      </div>
    </div>
  );
}
