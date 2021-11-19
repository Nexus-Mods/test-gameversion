import getVersion from 'exe-version';
import * as path from 'path';
import semver from 'semver';
import { log, types, util } from 'vortex-api';
export type UpdateInvalidate = 'never' | 'always' | 'some';

function gamebryoUpdate(seName: string) {
  return `"${seName}" in particular and all plugins for it will need to be updated. `
        + 'If this update was released only recently, you may have to wait for '
        + `${seName} to be updated as well.`;
}

const gameSupport = {
  oblivion: {
    updateInvalidationText: gamebryoUpdate('obse'),
  },
  skyrim: {
    updateInvalidationText: gamebryoUpdate('skse'),
  },
  skyrimse: {
    updateInvalidationText: gamebryoUpdate('skse64'),
  },
  fallout3: {
    updateInvalidationText: gamebryoUpdate('fose'),
  },
  falloutnv: {
    updateInvalidationText: gamebryoUpdate('nvse'),
  },
  fallout4: {
    updateInvalidationText: gamebryoUpdate('f4se'),
  },
};

export function getGameVersion(api: types.IExtensionApi, gameMode: string): Promise<string> {
  // allow games to have specific functions to get at the version
  if ((gameSupport[gameMode] !== undefined)
      && (gameSupport[gameMode].getGameVersion !== undefined)) {
    return gameSupport[gameMode].getGameVersion(api);
  }

  // otherwise take the version stored in the executable
  const state: types.IState = api.store.getState();
  const discovery: types.IDiscoveryResult =
    util.getSafe(state, ['settings', 'gameMode', 'discovered', gameMode], undefined);
  if (discovery?.path === undefined) {
    return Promise.resolve(undefined);
  }
  const game: types.IGame = util.getGame(gameMode);
  const getExecGameVersion = () => {
    const exePath = path.join(discovery.path, discovery.executable || game.executable());
    try {
      const version: string = getVersion(exePath);
      return Promise.resolve(version);
    } catch (err) {
      return Promise.resolve('Unknown');
    }
  };

  const getExtGameVersion = async () => {
    try {
      const version: string =
        await game.getGameVersion(discovery.path, discovery.executable || game.executable());
      if (typeof version !== 'string') {
        return Promise.reject(new Error('getGameVersion functor returned an invalid type'));
      }

      return version;
    } catch (err) {
      return Promise.reject(err);
    }
  };

  return (game?.getGameVersion === undefined)
    ? getExecGameVersion()
    : getExtGameVersion()
      .catch(err => {
        log('warn', 'getGameVersion call failed', {
          message: err.message,
          gameMode,
        });
        return getExecGameVersion();
      });
}

function compareQuadVer(lhs: string, rhs: string) {
  const lhsArr = lhs.split('.').map(iter => parseInt(iter, 10));
  const rhsArr = rhs.split('.').map(iter => parseInt(iter, 10));

  // by default use the 4-integer version scheme that windows uses for its executables
  for (let i = 0; i < Math.min(lhsArr.length, rhsArr.length); ++i) {
    const d = (lhsArr[i] || 0) - (rhsArr[i] || 0);
    if (d !== 0) {
      return d;
    }
  }
  return 0;
}

export function versionCompare(gameMode: string, lhs: string, rhs: string): number {
  // allow games to have specific functions to compare versions
  if ((gameSupport[gameMode] !== undefined)
      && (gameSupport[gameMode].versionCompare !== undefined)) {
    return gameSupport[gameMode].versionCompare(lhs, rhs);
  }

  return compareQuadVer(lhs, rhs);
}

export function updateInvalidatesMods(gameMode: string): UpdateInvalidate {
  if ((gameSupport[gameMode] !== undefined)
      && (gameSupport[gameMode].updateInvalidatesMods !== undefined)) {
    return gameSupport[gameMode].updateInvalidatesMods;
  }
  // usually game updates invalidate some mods but not all
  return 'some';
}

export function updateInvalidationText(gameMode: string): string {
  return util.getSafe(gameSupport, [gameMode, 'updateInvalidationText'], undefined);
}
