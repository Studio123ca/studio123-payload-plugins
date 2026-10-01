import assert from 'node:assert/strict';
import test from 'node:test';

import { messageField } from '../dist/message-field/server/field.js';

test('message field creates a UI-only field and stores its display config in admin custom data', () => {
  const field = messageField({
    name: 'publishingNotice',
    label: 'Publishing',
    message: { en: 'Changes are reviewed.' },
    admin: {
      custom: { source: 'workflow' },
      width: '50%',
    },
  });

  assert.equal(field.type, 'ui');
  assert.equal(field.name, 'publishingNotice');
  assert.equal(field.label, 'Publishing');
  assert.equal(field.admin.width, '50%');
  assert.deepEqual(field.admin.custom, {
    source: 'workflow',
    message: { en: 'Changes are reviewed.' },
    tone: 'info',
    banner: false,
  });
  assert.deepEqual(field.admin.components.Field, {
    path: '@studio123/payload-advanced-fields/message/client',
    exportName: 'MessageField',
  });
});

test('message field preserves custom components and supports every tone', () => {
  for (const tone of ['info', 'success', 'warning', 'error']) {
    const field = messageField({
      name: `notice-${tone}`,
      message: 'Message',
      tone,
      admin: { components: { Cell: 'custom-cell' } },
    });

    assert.equal(field.admin.custom.tone, tone);
    assert.equal(field.admin.custom.banner, false);
    assert.equal(field.admin.components.Cell, 'custom-cell');
  }

  assert.equal(messageField({ name: 'banner-notice', message: 'Message', banner: true }).admin.custom.banner, true);
});
