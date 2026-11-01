export function togglePasswordVisibility(isVisible: boolean): boolean {
  return !isVisible;
}

export function getPasswordToggleProps(isVisible: boolean) {
  return {
    inputType: isVisible ? 'text' : 'password',
    label: isVisible ? 'Ocultar contraseña' : 'Mostrar contraseña',
    pressed: isVisible,
    iconName: isVisible ? 'eye-slash' : 'eye',
  } as const;
}
