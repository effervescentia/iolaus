import { Configuration, Context } from 'semantic-release';
import { Sink } from './types';

// tslint:disable-next-line: no-let
let GLOBAL_SINK: Sink = {
  initialized: false
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
  // tslint:disable-next-line: no-object-mutation
  GLOBAL_SINK = {
    config,
    context,
    initialized: true
  };
}

// export function analyzeCommits() {
//   console.log('analyzing commits!');
// }

// export function verifyRelease() {
//   console.log('verifying release!');
// }

// export function generateNotes() {
//   console.log('generating notes!');
// }

// export function prepare() {
//   console.log('preparing!');
// }

// export function publish() {
//   console.log('publishing!');
// }

// export function success() {
//   console.log('success!');
// }

// export function fail() {
//   console.log('success!');
// }
