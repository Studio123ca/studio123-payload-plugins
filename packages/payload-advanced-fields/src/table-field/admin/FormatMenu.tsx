import { useState } from 'react';
import { FiChevronRight } from 'react-icons/fi';
import { BackgroundChoices } from './Appearance.js';
import { ToolbarMenu } from './TableMenu.js';
import type { ResolvedTablePresentation } from '../shared/types.js';

type Props = {
  applyCell: (key?: string) => void;
  applyRow: (key?: string) => void;
  options: ResolvedTablePresentation;
};

/** Keeps palette choices in a second level without crowding the toolbar's Format menu. */
export function FormatMenu({ applyCell, applyRow, options }: Props) {
  const [section, setSection] = useState<'cells' | 'rows' | null>(null);

  const palette = section && (
    <div className="advanced-table__submenu" role="menu" aria-label={section === 'cells' ? 'Cell styles' : 'Row styles'}>
      <BackgroundChoices
        apply={(key) => {
          (section === 'cells' ? applyCell : applyRow)(key);
          setSection(null);
        }}
        label={section === 'cells' ? 'Cell styles' : 'Row styles'}
        options={options}
      />
    </div>
  );

  return (
    <ToolbarMenu label="Format">
      <div className="advanced-table__format-menu" onMouseLeave={() => setSection(null)}>
        <button data-menu-keep-open type="button" onClick={() => setSection(section === 'cells' ? null : 'cells')}>
          <span className="advanced-table__menu-label">Cell styles</span>
          <FiChevronRight aria-hidden className="advanced-table__menu-chevron" />
        </button>
        <button data-menu-keep-open type="button" onClick={() => setSection(section === 'rows' ? null : 'rows')}>
          <span className="advanced-table__menu-label">Row styles</span>
          <FiChevronRight aria-hidden className="advanced-table__menu-chevron" />
        </button>
        {palette}
      </div>
    </ToolbarMenu>
  );
}
