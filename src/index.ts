import { getGameVersion, updateInvalidatesMods,
         updateInvalidationText, versionCompare } from './gamesupport';
import persistentReducer from './reducers';

import Bluebird from 'bluebird';
import { selectors, types, util } from 'vortex-api';
import { setGameVersion } from './actions';

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

  let res: types.ITestResult;

  if (incompatible.length !== 0) {
    res = {
      severity: 'warning',
      description: {
        short: t('Incompatible mods'),
        long: t('Some mods are incompatible with the current game version, '
          + 'please check if updates are available:') + '[br][/br][br][/br]'
          + incompatible.map(inc => `"${inc}"[br][/br]`),
      },
    };
  }

  const previousGameVersion =
    util.getSafe(state.persistent.gameMode, ['versions', gameMode], undefined);

  const invalidates = updateInvalidatesMods(gameMode);
  if ((res === undefined)
      && (invalidates !== 'never')
      && (previousGameVersion !== undefined)
      && (currentGameVersion !== undefined)
      && (previousGameVersion !== currentGameVersion)) {
    let text = 'The game has been updated from {{before}} to {{after}}.';

    if (invalidates === 'some') {
      text += '<br/><br/>You may have to update mods to be compatible.';
    } else if (invalidates === 'always') {
      text += '<br/><br/>With this game mods need to be updated with every game update.';
    }
    const add = updateInvalidationText(gameMode);
    if (add !== undefined) {
      text += '<br/><br/>' + add;
    }

    res = {
      severity: 'warning',
      description: {
        short: t('Game updated'),
        long: t(text, {
                replace: {
                  before: previousGameVersion,
                  after: currentGameVersion,
                },
              }),
      },
    };
  }

  api.store.dispatch(setGameVersion(gameMode, currentGameVersion));

  return Promise.resolve(res);
}

function init(context: types.IExtensionContext) {
  context.registerTest('game-version', 'gamemode-activated',
    () => Bluebird.resolve(testGameVersions(context.api)));
  context.registerTest('game-version', 'mod-installed',
    () => Bluebird.resolve(testGameVersions(context.api)));

  context.registerReducer(['persistent', 'gameMode'], persistentReducer);
}

export default init;
