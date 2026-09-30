'use client';

import type { Extension } from '@codemirror/state';
import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import type { EditorView } from '@codemirror/view';
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { useField } from '@payloadcms/ui/forms/useField';
import { FieldDescription } from '@payloadcms/ui/fields/FieldDescription';
import { FieldError } from '@payloadcms/ui/fields/FieldError';
import { FieldLabel } from '@payloadcms/ui/fields/FieldLabel';
import { fieldBaseClass } from '@payloadcms/ui/fields/shared';
import { useLocale } from '@payloadcms/ui/providers/Locale';
import { useTranslation } from '@payloadcms/ui/providers/Translation';
import type { TextareaFieldClientProps } from 'payload';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { CodeLanguage } from '../shared/types.js';
import {
  DEFAULT_CODE_LANGUAGE,
  isCodeLanguage,
  normalizeCodeFieldHeight,
  normalizeCodeFieldRows,
  normalizeCodeLength,
  normalizeCodeValue,
  resolveCodeLanguage,
} from '../shared/utils.js';

export type CodeFieldClientProps = {
  height?: number;
  language?: CodeLanguage;
  rows?: number;
};

type Props = TextareaFieldClientProps & CodeFieldClientProps;

const languageExtensions: Record<CodeLanguage, () => Extension[]> = {
  html: () => [html()],
  css: () => [css()],
  javascript: () => [javascript()],
  typescript: () => [javascript({ typescript: true })],
  jsx: () => [javascript({ jsx: true })],
  tsx: () => [javascript({ jsx: true, typescript: true })],
  json: () => [json()],
  markdown: () => [markdown()],
  text: () => [],
};

const resolveLocalizedLabel = (value: unknown, localeCode: string, fallback: string) => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const localizedValue = (value as Record<string, unknown>)[localeCode];
    if (typeof localizedValue === 'string') return localizedValue;

    const firstStringValue = Object.values(value).find((item) => typeof item === 'string');
    if (typeof firstStringValue === 'string') return firstStringValue;
  }

  return fallback;
};

const CodeField = ({ path, field, readOnly, height, language = DEFAULT_CODE_LANGUAGE, rows }: Props) => {
  const locale = useLocale();
  const localeCode = locale?.code || 'en';
  const { t } = useTranslation();
  const minLength = normalizeCodeLength(field.minLength);
  const maxLength = normalizeCodeLength(field.maxLength);
  const validate = useCallback(
    (nextValue: unknown): true | string => {
      const text = normalizeCodeValue(nextValue);
      if (field.required && text.length === 0) return t('validation:required');
      if (minLength !== undefined && text.length < minLength) {
        return t('validation:longerThanMin', { minLength });
      }
      if (maxLength !== undefined && text.length > maxLength) {
        return t('validation:shorterThanMax', { maxLength });
      }
      return true;
    },
    [field.required, maxLength, minLength, t],
  );
  const { value, setValue, showError, disabled } = useField<unknown>({ path, validate });
  const editorValue = normalizeCodeValue(value);
  const resolvedLanguage = resolveCodeLanguage(language, 'text');
  const resolvedRows = normalizeCodeFieldRows(rows ?? field.admin?.rows);
  const resolvedHeight = normalizeCodeFieldHeight(height, resolvedRows);
  const extensions = useMemo(() => languageExtensions[resolvedLanguage](), [resolvedLanguage]);
  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const fieldKey = path.replace(/\./g, '__');
  const fieldId = `field-${fieldKey}`;
  const labelId = `${fieldId}-label`;
  const editorId = `${fieldId}-editor`;
  const descriptionId = `field-description-${fieldKey}`;
  const label = resolveLocalizedLabel(field.label, localeCode, field.name);
  const description = resolveLocalizedLabel(field.admin?.description, localeCode, '');
  const isLocalized = Boolean(field.localized);
  const isReadOnly = Boolean(readOnly || disabled || field.admin?.readOnly);

  const applyEditorAccessibility = useCallback(
    (view: EditorView) => {
      const contentDOM = view.contentDOM;
      contentDOM.id = editorId;
      contentDOM.setAttribute('aria-labelledby', labelId);
      contentDOM.setAttribute('aria-multiline', 'true');
      contentDOM.setAttribute('aria-required', String(Boolean(field.required)));
      contentDOM.setAttribute('aria-invalid', String(Boolean(showError)));

      if (description) contentDOM.setAttribute('aria-describedby', descriptionId);
      else contentDOM.removeAttribute('aria-describedby');

      if (minLength !== undefined) contentDOM.setAttribute('minlength', String(minLength));
      else contentDOM.removeAttribute('minlength');

      if (maxLength !== undefined) contentDOM.setAttribute('maxlength', String(maxLength));
      else contentDOM.removeAttribute('maxlength');
    },
    [description, descriptionId, editorId, field.required, labelId, maxLength, minLength, showError],
  );

  useEffect(() => {
    const view = editorRef.current?.view;
    if (view) applyEditorAccessibility(view);
  }, [applyEditorAccessibility]);

  useEffect(() => {
    if (isCodeLanguage(language)) return;
    if (typeof console !== 'undefined') {
      console.warn(`Unsupported code language "${String(language)}". Falling back to plain text.`);
    }
  }, [language]);

  const handleChange = useCallback(
    (nextValue: string) => {
      if (isReadOnly) return;
      const normalizedValue = normalizeCodeValue(nextValue);
      setValue(maxLength === undefined ? normalizedValue : normalizedValue.slice(0, maxLength));
    },
    [isReadOnly, maxLength, setValue],
  );

  const className = [fieldBaseClass, 'textarea', showError && 'error', isReadOnly && 'read-only']
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={className}
      data-size="large"
      data-code-language={resolvedLanguage}
      data-code-height={resolvedHeight}
      data-maxlength={maxLength}
      data-minlength={minLength}
      id={fieldId}
    >
      <div id={labelId} style={{ whiteSpace: 'nowrap' }}>
        <FieldLabel htmlFor={editorId} label={label} localized={isLocalized} path={path} required={field.required} />
      </div>
      <div className={`${fieldBaseClass}__wrap`}>
        <FieldError path={path} showError={showError} />
        <div
          style={{
            border: '1px solid var(--theme-elevation-200)',
            borderRadius: '4px',
            overflow: 'hidden',
            background: 'var(--theme-elevation-50)',
          }}
        >
          <CodeMirror
            ref={editorRef}
            aria-invalid={showError || undefined}
            aria-labelledby={labelId}
            aria-multiline="true"
            aria-required={field.required || undefined}
            height={`${resolvedHeight}px`}
            id={`${editorId}-container`}
            value={editorValue}
            extensions={extensions}
            editable={!isReadOnly}
            basicSetup={{ lineNumbers: true, foldGutter: true, bracketMatching: true }}
            onChange={handleChange}
            onCreateEditor={applyEditorAccessibility}
            style={{ fontSize: '0.9rem' }}
          />
        </div>
        <FieldDescription description={description} path={path} />
      </div>
    </div>
  );
};

export default CodeField;
