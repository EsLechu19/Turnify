import { useEffect, useRef, useState, type FormEvent } from 'react';

import { Button, Card, CardHead, PageHeader } from '@/components/common';
import { changeMyPassword, fetchMyAccount, updateMyAccountName, uploadMyAccountPhoto } from '@/data/live';
import { useAuth } from '@/state/AuthContext';

/** The admin's own account: photo, name and password. Nothing operational. */
export function AccountPage() {
  const { refreshProfile } = useAuth();
  const [name, setName] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingName, setSavingName] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;

    fetchMyAccount()
      .then((account) => {
        if (!active) return;
        setName(account.name ?? '');
        setPhotoUrl(account.photoUrl);
        setEmail(account.email);
        setLoading(false);
      })
      .catch(() => {
        if (active) {
          setError('No pudimos traer tu cuenta.');
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  async function saveName(event: FormEvent) {
    event.preventDefault();
    if (savingName) return;
    setSavingName(true);
    setError(null);
    setNotice(null);

    try {
      await updateMyAccountName(name);
      await refreshProfile();
      setNotice('Nombre actualizado en tu cuenta y el panel.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No pudimos guardar tu nombre.');
    } finally {
      setSavingName(false);
    }
  }

  async function pickPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || uploadingPhoto) return;
    setUploadingPhoto(true);
    setError(null);
    setNotice(null);

    try {
      setPhotoUrl(await uploadMyAccountPhoto(file));
      setNotice('Foto actualizada.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No pudimos subir tu foto.');
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault();
    if (savingPassword) return;
    setSavingPassword(true);
    setError(null);
    setNotice(null);

    try {
      if (password !== passwordConfirm) throw new Error('Las contraseñas no coinciden.');
      await changeMyPassword(password);
      setPassword('');
      setPasswordConfirm('');
      setNotice('Contraseña actualizada.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No pudimos cambiar tu contraseña.');
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <>
      <PageHeader title="Mi cuenta" subtitle={email || 'Tu acceso de administrador'} />

      {loading ? (
        <p className="muted" role="status">
          Trayendo tu cuenta…
        </p>
      ) : null}

      {error ? (
        <p className="auth__error" role="alert">
          {error}
        </p>
      ) : null}

      {notice ? (
        <p role="status" style={{ color: 'var(--success-ink)', font: 'var(--text-body)', margin: 0 }}>
          {notice}
        </p>
      ) : null}

      <Card>
        <CardHead detail="Se muestra en el panel junto a tu nombre." title="Foto" />
        <div style={{ alignItems: 'center', display: 'flex', gap: 14 }}>
          {photoUrl ? (
            <img alt="Tu foto" src={photoUrl} style={{ borderRadius: '50%', height: 64, objectFit: 'cover', width: 64 }} />
          ) : (
            <span className="muted">Sin foto todavía.</span>
          )}
          <Button disabled={uploadingPhoto} onClick={() => fileInput.current?.click()} variant="secondary">
            {uploadingPhoto ? 'Subiendo…' : photoUrl ? 'Cambiar foto' : 'Subir foto'}
          </Button>
          <input accept="image/*" hidden onChange={pickPhoto} ref={fileInput} type="file" />
        </div>
      </Card>

      <Card>
        <CardHead detail="Así te ve el equipo en el panel." title="Nombre" />
        <form onSubmit={saveName}>
          <label className="field">
            <span>Tu nombre</span>
            <input
              autoComplete="name"
              maxLength={80}
              onChange={(event) => setName(event.target.value)}
              placeholder="Tu nombre"
              type="text"
              value={name}
            />
          </label>
          <div style={{ marginTop: 12 }}>
            <Button disabled={savingName || !name.trim()} type="submit">
              {savingName ? 'Guardando…' : 'Guardar nombre'}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHead detail="Mínimo 6 caracteres. Queda efectiva al instante." title="Contraseña" />
        <form onSubmit={savePassword}>
          <label className="field">
            <span>Nueva contraseña</span>
            <input
              autoComplete="new-password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Nueva contraseña"
              type="password"
              value={password}
            />
          </label>
          <label className="field">
            <span>Repite la contraseña</span>
            <input
              autoComplete="new-password"
              onChange={(event) => setPasswordConfirm(event.target.value)}
              placeholder="Repite la contraseña"
              type="password"
              value={passwordConfirm}
            />
          </label>
          <div style={{ marginTop: 12 }}>
            <Button disabled={savingPassword || password.length < 6} type="submit">
              {savingPassword ? 'Guardando…' : 'Cambiar contraseña'}
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
