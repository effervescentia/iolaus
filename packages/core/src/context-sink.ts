import { Configuration, Context } from 'semantic-release';
import { Signale } from 'signale';
import { PKG_NAME } from './constants';
import { Sink } from './types';

// tslint:disable-next-line: no-let
let GLOBAL_SINK: Sink = {
  initialized: false,
};

export function getSink(): Sink {
  if (GLOBAL_SINK.initialized) {
    return GLOBAL_SINK;
  }

  throw new Error('sink has not been initialized');
}

export const getContext = () => getSink().context;
export const getConfig = () => getSink().config;

export function verifyConditions(
  { dryRun, plugins, ...config }: Configuration,
  context: Context
): void {
  // tslint:disable: no-object-mutation
  (context as any).logger = new Signale({ scope: PKG_NAME });
  GLOBAL_SINK = {
    config,
    context,
    initialized: true,
  };
  // tslint:enable: no-object-mutation
}

export function analyzeCommits(): null {
  return null;
}
