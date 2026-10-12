import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const repositoryRoot = resolve(import.meta.dirname, '../..');

describe('Android Firebase client configuration', () => {
  it('includes the tracked Firebase client file in managed Android builds', () => {
    const appConfig = JSON.parse(readFileSync(resolve(repositoryRoot, 'apps/mobile/app.json'), 'utf8')) as {
      expo?: { android?: { googleServicesFile?: string; package?: string } };
    };
    const gitignore = readFileSync(resolve(repositoryRoot, '.gitignore'), 'utf8');

    expect(appConfig.expo?.android).toMatchObject({
      package: 'com.esau01s.turnify',
      googleServicesFile: './google-services.json',
    });
    expect(gitignore).toContain('!apps/mobile/google-services.json');
    expect(gitignore).toContain('**/*service-account*.json');
  });

  it('configures the production EAS profile for APKPure-ready Android builds', () => {
    const easConfig = JSON.parse(readFileSync(resolve(repositoryRoot, 'apps/mobile/eas.json'), 'utf8')) as {
      build?: {
        development?: { developmentClient?: boolean; distribution?: string };
        preview?: { distribution?: string };
        production?: {
          distribution?: string;
          android?: { buildType?: string };
          environment?: string;
          autoIncrement?: boolean;
        };
      };
    };

    expect(easConfig.build?.development).toMatchObject({
      developmentClient: true,
      distribution: 'internal',
    });
    expect(easConfig.build?.preview).toMatchObject({ distribution: 'internal' });
    expect(easConfig.build?.production).toMatchObject({
      distribution: 'store',
      android: { buildType: 'apk' },
      environment: 'production',
      autoIncrement: true,
    });
  });
});
