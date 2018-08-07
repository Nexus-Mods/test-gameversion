import { getGameVersion, versionCompare } from './gamesupport';

import * as Bluebird from 'bluebird';
import { selectors, types } from 'vortex-api';

function isCompatible(gameId: string, mod: types.IMod, version: string): boolean {
  if (mod.attributes === undefined) {
    return true;
  }
  if ((mod.attributes.minGameVersion !== undefined) &&
      (versionCompare(gameId, mod.attributes.minGameVersion, version) > 0)) {
    return false;
  }
  if ((mod.attributes.maxGameVersion !== undefined) &&
      (versionCompare(gameId, mod.attributes.maxGameVersion, version) < 0)) {
    return false;
  }

  return true;
}

async function testGameVersions(api: types.IExtensionApi): Promise<types.ITestResult> {
  const t = api.translate;
  const state: types.IState = api.store.getState();
  const gameMode = selectors.activeGameId(state);
  const currentGameVersion: string = await getGameVersion(api, gameMode);

  const mods = state.persistent.mods[gameMode];

  const incompatible = Object.keys(mods || {})
    .filter(modId => !isCompatible(gameMode, mods[modId], currentGameVersion));
  
  if (incompatible.length === 0) {
    return Promise.resolve(undefined);
  }

  return {
    severity: 'warning',
    description: {
      short: t('Incompatible mods'),
      long: t('Some mods are incompatible with the current game version, please check if updates are available:') + '\n'
          + incompatible.join('\n'),
    },
  };
}

function init(context: types.IExtensionContext) {
  context.registerTest('game-version', 'gamemode-activated',
    () => Bluebird.resolve(testGameVersions(context.api)));
  context.registerTest('game-version', 'mod-installed',
    () => Bluebird.resolve(testGameVersions(context.api)));
}

export default init;
