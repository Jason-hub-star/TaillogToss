import React, { useState, useCallback, useMemo } from 'react';
import { ProUpgradeSheet } from 'components/features/training/ProUpgradeSheet';

export function useProUpgradeSheet() {
  const [visible, setVisible] = useState(false);

  const show = useCallback(() => setVisible(true), []);
  const hide = useCallback(() => setVisible(false), []);

  const SheetNode = useMemo(
    () => <ProUpgradeSheet visible={visible} onClose={hide} />,
    [visible, hide]
  );

  return { show, hide, SheetNode };
}
