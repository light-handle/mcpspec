import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Loader2, Code, FormInput } from 'lucide-react';

interface SchemaFormProps {
  schema: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => void;
  loading?: boolean;
}

interface PropertySchema {
  type?: string;
  description?: string;
  default?: unknown;
  enum?: string[];
  format?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  properties?: Record<string, PropertySchema>;
  items?: PropertySchema;
}

function getDefaultValue(prop: PropertySchema, required: boolean): unknown {
  if (prop.default !== undefined) return prop.default;
  if (prop.type === 'boolean') return false;
  if (prop.type === 'number' || prop.type === 'integer') return required ? 0 : '';
  if (prop.type === 'object' || prop.type === 'array') return '';
  return '';
}

function buildInitialValues(
  properties: Record<string, PropertySchema>,
  requiredFields: string[],
): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const [key, prop] of Object.entries(properties)) {
    values[key] = getDefaultValue(prop, requiredFields.includes(key));
  }
  return values;
}

function coerceValue(value: unknown, prop: PropertySchema): unknown {
  if (prop.type === 'number' || prop.type === 'integer') {
    const str = String(value);
    if (str === '') return undefined;
    const num = Number(str);
    return isNaN(num) ? undefined : num;
  }
  if (prop.type === 'boolean') {
    return Boolean(value);
  }
  if (prop.type === 'object' || prop.type === 'array') {
    const str = String(value).trim();
    if (!str) return undefined;
    try {
      return JSON.parse(str);
    } catch {
      return undefined;
    }
  }
  // string
  const str = String(value);
  return str === '' ? undefined : str;
}

function isLongString(prop: PropertySchema): boolean {
  if (prop.maxLength && prop.maxLength > 200) return true;
  if (prop.format === 'textarea') return true;
  return false;
}

function getInputType(prop: PropertySchema): string {
  if (prop.format === 'uri' || prop.format === 'url') return 'url';
  if (prop.format === 'email') return 'email';
  if (prop.format === 'date') return 'date';
  if (prop.format === 'date-time') return 'datetime-local';
  return 'text';
}

interface FieldProps {
  name: string;
  prop: PropertySchema;
  required: boolean;
  value: unknown;
  onChange: (name: string, value: unknown) => void;
}

function SchemaField({ name, prop, required, value, onChange }: FieldProps) {
  const id = `field-${name}`;
  const label = (
    <Label htmlFor={id}>
      {name}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </Label>
  );
  const description = prop.description ? (
    <p className="text-xs text-muted-foreground mt-1">{prop.description}</p>
  ) : null;

  // Enum → select dropdown
  if (prop.enum && prop.enum.length > 0) {
    return (
      <div className="space-y-1.5">
        {label}
        <Select value={String(value ?? '')} onValueChange={(v) => onChange(name, v)}>
          <SelectTrigger id={id}>
            <SelectValue placeholder={`Select ${name}`} />
          </SelectTrigger>
          <SelectContent>
            {prop.enum.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {description}
      </div>
    );
  }

  // Boolean → checkbox
  if (prop.type === 'boolean') {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Checkbox
            id={id}
            checked={Boolean(value)}
            onChange={(e) => onChange(name, e.target.checked)}
          />
          <Label htmlFor={id}>
            {name}
            {required && <span className="text-red-500 ml-0.5">*</span>}
          </Label>
        </div>
        {description}
      </div>
    );
  }

  // Number / integer
  if (prop.type === 'number' || prop.type === 'integer') {
    return (
      <div className="space-y-1.5">
        {label}
        <Input
          id={id}
          type="number"
          value={value === undefined ? '' : String(value)}
          onChange={(e) => onChange(name, e.target.value)}
          min={prop.minimum}
          max={prop.maximum}
          step={prop.type === 'integer' ? 1 : undefined}
          required={required}
        />
        {description}
      </div>
    );
  }

  // Object / array / unknown → JSON textarea
  if (prop.type === 'object' || prop.type === 'array' || (prop.type && !['string', 'number', 'integer', 'boolean'].includes(prop.type))) {
    return (
      <div className="space-y-1.5">
        {label}
        <Textarea
          id={id}
          value={String(value ?? '')}
          onChange={(e) => onChange(name, e.target.value)}
          className="font-mono text-xs"
          rows={3}
          placeholder={prop.type === 'array' ? '["item1", "item2"]' : '{"key": "value"}'}
          required={required}
        />
        {description}
      </div>
    );
  }

  // String with long text → textarea
  if (isLongString(prop)) {
    return (
      <div className="space-y-1.5">
        {label}
        <Textarea
          id={id}
          value={String(value ?? '')}
          onChange={(e) => onChange(name, e.target.value)}
          rows={3}
          minLength={prop.minLength}
          maxLength={prop.maxLength}
          required={required}
        />
        {description}
      </div>
    );
  }

  // Default string → input
  return (
    <div className="space-y-1.5">
      {label}
      <Input
        id={id}
        type={getInputType(prop)}
        value={String(value ?? '')}
        onChange={(e) => onChange(name, e.target.value)}
        minLength={prop.minLength}
        maxLength={prop.maxLength}
        required={required}
      />
      {description}
    </div>
  );
}

export function SchemaForm({ schema, onSubmit, loading }: SchemaFormProps) {
  const properties = (schema.properties ?? {}) as Record<string, PropertySchema>;
  const requiredFields = (schema.required ?? []) as string[];
  const propertyNames = Object.keys(properties);

  const [values, setValues] = useState<Record<string, unknown>>(() =>
    buildInitialValues(properties, requiredFields),
  );
  const [rawMode, setRawMode] = useState(false);
  const [rawJson, setRawJson] = useState('{}');

  const handleFieldChange = useCallback((name: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (rawMode) {
      try {
        onSubmit(JSON.parse(rawJson));
      } catch {
        // Invalid JSON — let the user fix it
      }
      return;
    }

    // Coerce and filter values
    const result: Record<string, unknown> = {};
    for (const [key, prop] of Object.entries(properties)) {
      const coerced = coerceValue(values[key], prop);
      if (coerced !== undefined) {
        result[key] = coerced;
      }
    }
    onSubmit(result);
  }

  function switchToRaw() {
    // Serialize current form values to JSON for editing
    const result: Record<string, unknown> = {};
    for (const [key, prop] of Object.entries(properties)) {
      const coerced = coerceValue(values[key], prop);
      if (coerced !== undefined) {
        result[key] = coerced;
      }
    }
    setRawJson(JSON.stringify(result, null, 2));
    setRawMode(true);
  }

  function switchToForm() {
    // Try to parse raw JSON back into form values
    try {
      const parsed = JSON.parse(rawJson);
      if (typeof parsed === 'object' && parsed !== null) {
        setValues((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // Leave form values as-is
    }
    setRawMode(false);
  }

  // No properties in schema → raw JSON fallback
  if (propertyNames.length === 0) {
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Input (JSON)</Label>
          <Textarea
            value={rawJson}
            onChange={(e) => setRawJson(e.target.value)}
            className="font-mono text-xs"
            rows={4}
          />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
          Call Tool
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {rawMode ? (
        <div className="space-y-1.5">
          <Label>Input (JSON)</Label>
          <Textarea
            value={rawJson}
            onChange={(e) => setRawJson(e.target.value)}
            className="font-mono text-xs"
            rows={8}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {propertyNames.map((key) => (
            <SchemaField
              key={key}
              name={key}
              prop={properties[key]}
              required={requiredFields.includes(key)}
              value={values[key]}
              onChange={handleFieldChange}
            />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
          Call Tool
        </Button>

        <button
          type="button"
          onClick={rawMode ? switchToForm : switchToRaw}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {rawMode ? (
            <>
              <FormInput className="h-3.5 w-3.5" />
              Form view
            </>
          ) : (
            <>
              <Code className="h-3.5 w-3.5" />
              Raw JSON
            </>
          )}
        </button>
      </div>
    </form>
  );
}
