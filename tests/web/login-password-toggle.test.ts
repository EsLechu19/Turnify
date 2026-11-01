import { describe, expect, it } from 'vitest';

import {
  getPasswordToggleProps,
  togglePasswordVisibility,
} from '../../apps/web/src/features/auth/passwordVisibility';

describe('login password visibility control', () => {
  it('toggles the input type and accessible control state on each activation', () => {
    const hidden = getPasswordToggleProps(false);
    expect(hidden).toEqual({
      inputType: 'password',
      label: 'Mostrar contraseña',
      pressed: false,
      iconName: 'eye',
    });

    const visibleState = togglePasswordVisibility(false);
    const visible = getPasswordToggleProps(visibleState);
    expect(visible).toEqual({
      inputType: 'text',
      label: 'Ocultar contraseña',
      pressed: true,
      iconName: 'eye-slash',
    });

    expect(getPasswordToggleProps(togglePasswordVisibility(visibleState))).toEqual(hidden);
  });
});
