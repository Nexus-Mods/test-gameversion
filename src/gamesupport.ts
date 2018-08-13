import getVersion from 'exe-version';
import * as path from 'path';
import { types, util } from 'vortex-api';

const gameSupport = {

};

export function getGameVersion(api: types.IExtensionApi, gameMode: string): Promise<string> {
  // allow games to have specific functions to get at the version
  if ((gameSupport[gameMode] !== undefined) && (gameSupport[gameMode].getGameVersion !== undefined)) {
    return gameSupport[gameMode].getGameVersion(api);
  }

  // otherwise take the version stored in the executable
  const state: types.IState = api.store.getState();
  const discovery: types.IDiscoveryResult = util.getSafe(state, ['settings', 'gameMode', 'discovered', gameMode], undefined);
  if ((discovery === undefined) || (discovery.path === undefined)) {
    return Promise.resolve(undefined);
  }
  const game = util.getGame(gameMode);
  const exePath = path.join(discovery.path, discovery.executable || game.executable());
  const version = getVersion(exePath);
  return Promise.resolve(version);
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
  if ((gameSupport[gameMode] !== undefined) && (gameSupport[gameMode].versionCompare !== undefined)) {
    return gameSupport[gameMode].versionCompare(lhs, rhs);
  }

  return compareQuadVer(lhs, rhs);
}
